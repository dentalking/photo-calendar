'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowUpDown, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Calendar,
  Clock,
  Cloud
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

type ConflictStrategy = 'local-wins' | 'remote-wins' | 'newest-wins' | 'manual';

interface SyncStatus {
  lastSync: string | null;
  pendingSync: number;
  syncedEvents: number;
  conflicts: number;
  isConnected: boolean;
}

interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  deleted: number;
  conflicts: any[];
  errors: any[];
  requiresManualResolution?: boolean;
  message: string;
}

export function BidirectionalSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>('newest-wins');
  const [progress, setProgress] = useState(0);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  // Fetch sync status
  const fetchSyncStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const response = await fetch('/api/calendar/sync/bidirectional');
      const data = await response.json();
      
      if (data.success) {
        setSyncStatus(data.data);
      } else {
        toast.error('Failed to fetch sync status');
      }
    } catch (error) {
      console.error('Error fetching sync status:', error);
      toast.error('Failed to fetch sync status');
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Perform bidirectional sync
  const performSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/calendar/sync/bidirectional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conflictStrategy,
          timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
          timeMax: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // Next 90 days
        }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();
      
      if (data.success) {
        setSyncResult(data.data);
        
        if (data.data.requiresManualResolution) {
          toast.warning('Sync completed with conflicts', {
            description: 'Some events require manual resolution',
          });
        } else {
          toast.success('Sync completed successfully');
        }
        
        // Refresh status
        await fetchSyncStatus();
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to perform sync');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  // Load status on mount
  useState(() => {
    fetchSyncStatus();
  });

  return (
    <div className="space-y-6">
      {/* Sync Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Google Calendar Sync Status
          </CardTitle>
          <CardDescription>
            Bidirectional synchronization with Google Calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingStatus ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : syncStatus ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Connection</p>
                  <div className="flex items-center gap-2">
                    {syncStatus.isConnected ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-medium">
                      {syncStatus.isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Last Sync</p>
                  <p className="font-medium">
                    {syncStatus.lastSync 
                      ? format(new Date(syncStatus.lastSync), 'MMM d, h:mm a')
                      : 'Never'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Synced Events</p>
                  <p className="font-medium">{syncStatus.syncedEvents}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Pending Sync</p>
                  <p className="font-medium">{syncStatus.pendingSync}</p>
                </div>
              </div>

              {syncStatus.conflicts > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Conflicts Detected</AlertTitle>
                  <AlertDescription>
                    {syncStatus.conflicts} events have conflicts that need resolution
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Unable to load sync status
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sync Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Settings</CardTitle>
          <CardDescription>
            Configure how conflicts are resolved during synchronization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Conflict Resolution Strategy</Label>
            <RadioGroup 
              value={conflictStrategy} 
              onValueChange={(value) => setConflictStrategy(value as ConflictStrategy)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="newest-wins" id="newest" />
                <Label htmlFor="newest" className="font-normal cursor-pointer">
                  <span className="font-medium">Newest Wins</span> - Keep the most recently modified version
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="local-wins" id="local" />
                <Label htmlFor="local" className="font-normal cursor-pointer">
                  <span className="font-medium">Local Wins</span> - Always keep your local changes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="remote-wins" id="remote" />
                <Label htmlFor="remote" className="font-normal cursor-pointer">
                  <span className="font-medium">Remote Wins</span> - Always keep Google Calendar changes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual" className="font-normal cursor-pointer">
                  <span className="font-medium">Manual</span> - Review each conflict manually
                </Label>
              </div>
            </RadioGroup>
          </div>

          {progress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Syncing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={performSync}
              disabled={isSyncing || !syncStatus?.isConnected}
              className="flex-1"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  Sync Now
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={fetchSyncStatus}
              disabled={isLoadingStatus}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingStatus ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync Results */}
      {syncResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {syncResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              Sync Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{syncResult.message}</p>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{syncResult.created}</p>
                  <p className="text-sm text-muted-foreground">Created</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{syncResult.updated}</p>
                  <p className="text-sm text-muted-foreground">Updated</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{syncResult.deleted}</p>
                  <p className="text-sm text-muted-foreground">Deleted</p>
                </div>
              </div>

              {syncResult.conflicts.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Conflicts Found</AlertTitle>
                  <AlertDescription>
                    {syncResult.conflicts.length} conflicts need manual resolution.
                    <Button variant="link" className="pl-0" onClick={() => {
                      // Navigate to conflict resolution page
                      window.location.href = '/calendar/conflicts';
                    }}>
                      Review Conflicts →
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {syncResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Errors Occurred</AlertTitle>
                  <AlertDescription>
                    {syncResult.errors.length} errors occurred during sync.
                    Check the console for details.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}