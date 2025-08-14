import { Event } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { GoogleCalendarService } from './google-calendar';
import { differenceInMinutes } from 'date-fns';

export type ConflictResolutionStrategy = 'local-wins' | 'remote-wins' | 'newest-wins' | 'manual';

export interface SyncConflict {
  localEvent: Event;
  remoteEvent: any; // Google Calendar event
  conflictType: 'both-modified' | 'deleted-remotely' | 'deleted-locally';
  localModifiedAt: Date;
  remoteModifiedAt: Date;
}

export interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  deleted: number;
  conflicts: SyncConflict[];
  errors: Array<{ message: string; event?: any }>;
}

export class CalendarSyncManager {
  private googleService: GoogleCalendarService;
  private userId: string;
  private conflictStrategy: ConflictResolutionStrategy;

  constructor(
    googleService: GoogleCalendarService,
    userId: string,
    conflictStrategy: ConflictResolutionStrategy = 'newest-wins'
  ) {
    this.googleService = googleService;
    this.userId = userId;
    this.conflictStrategy = conflictStrategy;
  }

  /**
   * Perform bidirectional sync between local database and Google Calendar
   */
  async performBidirectionalSync(
    timeMin?: Date,
    timeMax?: Date
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      created: 0,
      updated: 0,
      deleted: 0,
      conflicts: [],
      errors: [],
    };

    try {
      // Step 1: Get all local events
      const localEvents = await this.getLocalEvents(timeMin, timeMax);
      
      // Step 2: Get all remote events from Google Calendar
      const remoteEvents = await this.googleService.getEvents(timeMin, timeMax);
      
      // Step 3: Create maps for efficient lookup
      const localEventMap = new Map<string, Event>();
      const remoteEventMap = new Map<string, any>();
      
      localEvents.forEach(event => {
        if (event.googleEventId) {
          localEventMap.set(event.googleEventId, event);
        }
      });
      
      remoteEvents.forEach((event: any) => {
        remoteEventMap.set(event.id, event);
      });

      // Step 4: Process remote events (pull changes from Google)
      for (const remoteEvent of remoteEvents) {
        const localEvent = localEventMap.get(remoteEvent.id);
        
        if (!localEvent) {
          // New event from Google Calendar - create locally
          await this.createLocalEvent(remoteEvent);
          result.created++;
        } else {
          // Event exists in both - check for conflicts
          const conflict = await this.detectConflict(localEvent, remoteEvent);
          
          if (conflict) {
            const resolved = await this.resolveConflict(conflict);
            if (resolved) {
              result.updated++;
            } else {
              result.conflicts.push(conflict);
            }
          } else if (this.hasRemoteChanges(localEvent, remoteEvent)) {
            // Remote has newer changes - update local
            await this.updateLocalEvent(localEvent.id, remoteEvent);
            result.updated++;
          }
        }
      }

      // Step 5: Process local events (push changes to Google)
      for (const localEvent of localEvents) {
        if (!localEvent.googleEventId) {
          // New local event - create in Google
          const syncResult = await this.googleService.createEvent(localEvent);
          if (syncResult.success && syncResult.googleEventId) {
            await prisma.event.update({
              where: { id: localEvent.id },
              data: { 
                googleEventId: syncResult.googleEventId,
                syncedAt: new Date()
              }
            });
            result.created++;
          } else {
            result.errors.push({ 
              message: syncResult.error || 'Failed to create event in Google',
              event: localEvent 
            });
          }
        } else if (!remoteEventMap.has(localEvent.googleEventId)) {
          // Event deleted from Google - handle deletion
          if (localEvent.deletedAt) {
            // Already marked as deleted locally, skip
            continue;
          }
          
          if (this.conflictStrategy === 'remote-wins') {
            await this.deleteLocalEvent(localEvent.id);
            result.deleted++;
          } else {
            // Re-create in Google if local wins
            const syncResult = await this.googleService.createEvent(localEvent);
            if (syncResult.success) {
              await prisma.event.update({
                where: { id: localEvent.id },
                data: { 
                  googleEventId: syncResult.googleEventId,
                  syncedAt: new Date()
                }
              });
              result.created++;
            }
          }
        } else {
          // Event exists in both - check if local has newer changes
          const remoteEvent = remoteEventMap.get(localEvent.googleEventId);
          if (this.hasLocalChanges(localEvent, remoteEvent)) {
            const syncResult = await this.googleService.updateEvent(
              localEvent,
              localEvent.googleEventId
            );
            if (syncResult.success) {
              await prisma.event.update({
                where: { id: localEvent.id },
                data: { syncedAt: new Date() }
              });
              result.updated++;
            } else {
              result.errors.push({ 
                message: syncResult.error || 'Failed to update event in Google',
                event: localEvent 
              });
            }
          }
        }
      }

      // Step 6: Handle deletions
      await this.handleDeletions(localEventMap, remoteEventMap, result);

      result.success = result.errors.length === 0 && result.conflicts.length === 0;
      
      // Step 7: Update last sync timestamp
      await this.updateLastSyncTime();

    } catch (error) {
      console.error('Bidirectional sync error:', error);
      result.errors.push({ 
        message: error instanceof Error ? error.message : 'Unknown sync error' 
      });
    }

    return result;
  }

  /**
   * Get local events for sync
   */
  private async getLocalEvents(timeMin?: Date, timeMax?: Date): Promise<Event[]> {
    const where: any = {
      userId: this.userId,
      deletedAt: null,
    };

    if (timeMin) {
      where.startDate = { gte: timeMin };
    }

    if (timeMax) {
      where.startDate = { ...where.startDate, lte: timeMax };
    }

    return await prisma.event.findMany({
      where,
      orderBy: { startDate: 'asc' },
    });
  }

  /**
   * Create a local event from Google Calendar event
   */
  private async createLocalEvent(googleEvent: any): Promise<Event | null> {
    try {
      const startDate = googleEvent.start.dateTime 
        ? new Date(googleEvent.start.dateTime)
        : new Date(googleEvent.start.date);
      
      const endDate = googleEvent.end.dateTime
        ? new Date(googleEvent.end.dateTime)
        : googleEvent.end.date
        ? new Date(googleEvent.end.date)
        : null;

      return await prisma.event.create({
        data: {
          userId: this.userId,
          title: googleEvent.summary || 'Untitled Event',
          description: googleEvent.description,
          startDate,
          endDate,
          isAllDay: !googleEvent.start.dateTime,
          location: googleEvent.location,
          status: googleEvent.status === 'cancelled' ? 'REJECTED' : 'CONFIRMED',
          googleEventId: googleEvent.id,
          syncedAt: new Date(),
          confidenceScore: 1.0,
          isUserVerified: true,
          metadata: googleEvent,
        }
      });
    } catch (error) {
      console.error('Error creating local event:', error);
      return null;
    }
  }

  /**
   * Update a local event with Google Calendar data
   */
  private async updateLocalEvent(eventId: string, googleEvent: any): Promise<void> {
    try {
      const startDate = googleEvent.start.dateTime 
        ? new Date(googleEvent.start.dateTime)
        : new Date(googleEvent.start.date);
      
      const endDate = googleEvent.end.dateTime
        ? new Date(googleEvent.end.dateTime)
        : googleEvent.end.date
        ? new Date(googleEvent.end.date)
        : null;

      await prisma.event.update({
        where: { id: eventId },
        data: {
          title: googleEvent.summary || 'Untitled Event',
          description: googleEvent.description,
          startDate,
          endDate,
          isAllDay: !googleEvent.start.dateTime,
          location: googleEvent.location,
          status: googleEvent.status === 'cancelled' ? 'REJECTED' : 'CONFIRMED',
          syncedAt: new Date(),
          metadata: googleEvent,
        }
      });
    } catch (error) {
      console.error('Error updating local event:', error);
    }
  }

  /**
   * Delete a local event
   */
  private async deleteLocalEvent(eventId: string): Promise<void> {
    await prisma.event.update({
      where: { id: eventId },
      data: { deletedAt: new Date() }
    });
  }

  /**
   * Detect conflicts between local and remote events
   */
  private async detectConflict(
    localEvent: Event,
    remoteEvent: any
  ): Promise<SyncConflict | null> {
    const localModified = localEvent.updatedAt;
    const remoteModified = new Date(remoteEvent.updated || remoteEvent.created);
    const lastSync = localEvent.syncedAt || new Date(0);

    // Both modified since last sync
    if (localModified > lastSync && remoteModified > lastSync) {
      return {
        localEvent,
        remoteEvent,
        conflictType: 'both-modified',
        localModifiedAt: localModified,
        remoteModifiedAt: remoteModified,
      };
    }

    return null;
  }

  /**
   * Resolve a sync conflict based on the configured strategy
   */
  private async resolveConflict(conflict: SyncConflict): Promise<boolean> {
    switch (this.conflictStrategy) {
      case 'local-wins':
        // Update Google with local data
        const updateResult = await this.googleService.updateEvent(
          conflict.localEvent,
          conflict.localEvent.googleEventId!
        );
        if (updateResult.success) {
          await prisma.event.update({
            where: { id: conflict.localEvent.id },
            data: { syncedAt: new Date() }
          });
        }
        return updateResult.success;

      case 'remote-wins':
        // Update local with Google data
        await this.updateLocalEvent(conflict.localEvent.id, conflict.remoteEvent);
        return true;

      case 'newest-wins':
        // Compare timestamps and use the newer one
        if (conflict.localModifiedAt > conflict.remoteModifiedAt) {
          // Local is newer
          const result = await this.googleService.updateEvent(
            conflict.localEvent,
            conflict.localEvent.googleEventId!
          );
          if (result.success) {
            await prisma.event.update({
              where: { id: conflict.localEvent.id },
              data: { syncedAt: new Date() }
            });
          }
          return result.success;
        } else {
          // Remote is newer
          await this.updateLocalEvent(conflict.localEvent.id, conflict.remoteEvent);
          return true;
        }

      case 'manual':
        // Don't resolve automatically
        return false;

      default:
        return false;
    }
  }

  /**
   * Check if remote event has changes compared to local
   */
  private hasRemoteChanges(localEvent: Event, remoteEvent: any): boolean {
    const remoteModified = new Date(remoteEvent.updated || remoteEvent.created);
    const lastSync = localEvent.syncedAt || new Date(0);
    return remoteModified > lastSync;
  }

  /**
   * Check if local event has changes compared to last sync
   */
  private hasLocalChanges(localEvent: Event, remoteEvent: any): boolean {
    const lastSync = localEvent.syncedAt || new Date(0);
    return localEvent.updatedAt > lastSync;
  }

  /**
   * Handle deletion sync
   */
  private async handleDeletions(
    localEventMap: Map<string, Event>,
    remoteEventMap: Map<string, any>,
    result: SyncResult
  ): Promise<void> {
    // Find events marked as deleted locally but still exist in Google
    const deletedLocally = await prisma.event.findMany({
      where: {
        userId: this.userId,
        deletedAt: { not: null },
        googleEventId: { not: null },
      }
    });

    for (const event of deletedLocally) {
      if (event.googleEventId && remoteEventMap.has(event.googleEventId)) {
        // Delete from Google
        const deleteResult = await this.googleService.deleteEvent(event.googleEventId);
        if (deleteResult.success) {
          result.deleted++;
        }
      }
    }
  }

  /**
   * Update the last sync timestamp for the user
   */
  private async updateLastSyncTime(): Promise<void> {
    // You might want to store this in a user preferences table
    // For now, we'll update a metadata field or create a sync log
    await prisma.user.update({
      where: { id: this.userId },
      data: {
        lastCalendarSync: new Date(),
      }
    });
  }

  /**
   * Get sync status and statistics
   */
  async getSyncStatus(): Promise<{
    lastSync: Date | null;
    pendingSync: number;
    syncedEvents: number;
    conflicts: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: this.userId },
      select: { lastCalendarSync: true }
    });

    const [pending, synced] = await Promise.all([
      prisma.event.count({
        where: {
          userId: this.userId,
          googleEventId: null,
          deletedAt: null,
        }
      }),
      prisma.event.count({
        where: {
          userId: this.userId,
          googleEventId: { not: null },
          deletedAt: null,
        }
      })
    ]);

    return {
      lastSync: user?.lastCalendarSync || null,
      pendingSync: pending,
      syncedEvents: synced,
      conflicts: 0, // You might want to track this separately
    };
  }
}