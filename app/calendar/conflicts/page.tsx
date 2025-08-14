'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertCircle, 
  ChevronRight, 
  Calendar, 
  Clock, 
  MapPin, 
  FileText,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface EventConflict {
  id: string;
  localEvent: {
    id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    location?: string;
    updatedAt: string;
  };
  remoteEvent: {
    id: string;
    summary: string;
    description?: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    location?: string;
    updated: string;
  };
  conflictType: 'both-modified' | 'deleted-remotely' | 'deleted-locally';
}

export default function ConflictsPage() {
  const [conflicts, setConflicts] = useState<EventConflict[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedCount, setResolvedCount] = useState(0);

  // Mock data for development - replace with actual API call
  useEffect(() => {
    loadConflicts();
  }, []);

  const loadConflicts = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call to get conflicts
      // const response = await fetch('/api/calendar/conflicts');
      // const data = await response.json();
      // setConflicts(data.conflicts);
      
      // Mock data for now
      const mockConflicts: EventConflict[] = [
        {
          id: '1',
          localEvent: {
            id: 'local-1',
            title: 'Team Meeting',
            description: 'Weekly team sync',
            startDate: '2025-01-15T10:00:00Z',
            endDate: '2025-01-15T11:00:00Z',
            location: 'Conference Room A',
            updatedAt: '2025-01-14T15:30:00Z',
          },
          remoteEvent: {
            id: 'google-1',
            summary: 'Team Meeting - Rescheduled',
            description: 'Weekly team sync (moved to new time)',
            start: { dateTime: '2025-01-15T14:00:00Z' },
            end: { dateTime: '2025-01-15T15:00:00Z' },
            location: 'Zoom',
            updated: '2025-01-14T16:00:00Z',
          },
          conflictType: 'both-modified',
        },
      ];
      
      setConflicts(mockConflicts);
    } catch (error) {
      console.error('Error loading conflicts:', error);
      toast.error('Failed to load conflicts');
    } finally {
      setIsLoading(false);
    }
  };

  const resolveConflict = async (resolution: 'local' | 'remote') => {
    if (!conflicts[currentIndex]) return;

    setIsResolving(true);
    try {
      const conflict = conflicts[currentIndex];
      
      // TODO: Replace with actual API call
      const response = await fetch('/api/calendar/conflicts/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conflictId: conflict.id,
          resolution,
          localEventId: conflict.localEvent.id,
          googleEventId: conflict.remoteEvent.id,
        }),
      });

      if (response.ok) {
        toast.success(`Conflict resolved - kept ${resolution === 'local' ? 'local' : 'Google'} version`);
        setResolvedCount(prev => prev + 1);
        
        // Move to next conflict
        if (currentIndex < conflicts.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          // All conflicts resolved
          toast.success('All conflicts resolved!');
          setTimeout(() => {
            window.location.href = '/calendar';
          }, 2000);
        }
      } else {
        throw new Error('Failed to resolve conflict');
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast.error('Failed to resolve conflict');
    } finally {
      setIsResolving(false);
    }
  };

  const currentConflict = conflicts[currentIndex];

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading conflicts...</p>
          </div>
        </div>
      </div>
    );
  }

  if (conflicts.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">No Conflicts</h2>
              <p className="text-muted-foreground mb-4">
                All events are synchronized successfully!
              </p>
              <Button onClick={() => window.location.href = '/calendar'}>
                Back to Calendar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Resolve Sync Conflicts</h1>
            <p className="text-muted-foreground mt-1">
              Review and resolve conflicts between local and Google Calendar events
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {resolvedCount} / {conflicts.length} Resolved
          </Badge>
        </div>

        {/* Progress */}
        <div className="bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary rounded-full h-2 transition-all duration-300"
            style={{ width: `${((resolvedCount) / conflicts.length) * 100}%` }}
          />
        </div>

        {/* Conflict Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Conflict Type: {currentConflict.conflictType.replace('-', ' ').toUpperCase()}</AlertTitle>
          <AlertDescription>
            This event has been modified in both locations. Choose which version to keep.
          </AlertDescription>
        </Alert>

        {/* Conflict Comparison */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Local Event */}
          <Card className={`border-2 ${isResolving ? 'opacity-50' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Local Version</CardTitle>
                <Badge variant="outline">Your Calendar</Badge>
              </div>
              <CardDescription>
                Last modified: {format(new Date(currentConflict.localEvent.updatedAt), 'MMM d, h:mm a')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h3 className="font-semibold text-lg">{currentConflict.localEvent.title}</h3>
              </div>
              
              {currentConflict.localEvent.description && (
                <div className="flex gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm">{currentConflict.localEvent.description}</p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-sm">
                  {format(new Date(currentConflict.localEvent.startDate), 'MMM d, yyyy')}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-sm">
                  {format(new Date(currentConflict.localEvent.startDate), 'h:mm a')}
                  {currentConflict.localEvent.endDate && (
                    <> - {format(new Date(currentConflict.localEvent.endDate), 'h:mm a')}</>
                  )}
                </p>
              </div>
              
              {currentConflict.localEvent.location && (
                <div className="flex gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm">{currentConflict.localEvent.location}</p>
                </div>
              )}
              
              <Button 
                className="w-full mt-4" 
                onClick={() => resolveConflict('local')}
                disabled={isResolving}
              >
                Keep Local Version
              </Button>
            </CardContent>
          </Card>

          {/* Remote Event */}
          <Card className={`border-2 ${isResolving ? 'opacity-50' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Google Version</CardTitle>
                <Badge variant="outline">Google Calendar</Badge>
              </div>
              <CardDescription>
                Last modified: {format(new Date(currentConflict.remoteEvent.updated), 'MMM d, h:mm a')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h3 className="font-semibold text-lg">{currentConflict.remoteEvent.summary}</h3>
              </div>
              
              {currentConflict.remoteEvent.description && (
                <div className="flex gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm">{currentConflict.remoteEvent.description}</p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-sm">
                  {format(
                    new Date(currentConflict.remoteEvent.start.dateTime || currentConflict.remoteEvent.start.date!),
                    'MMM d, yyyy'
                  )}
                </p>
              </div>
              
              {currentConflict.remoteEvent.start.dateTime && (
                <div className="flex gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm">
                    {format(new Date(currentConflict.remoteEvent.start.dateTime), 'h:mm a')}
                    {currentConflict.remoteEvent.end.dateTime && (
                      <> - {format(new Date(currentConflict.remoteEvent.end.dateTime), 'h:mm a')}</>
                    )}
                  </p>
                </div>
              )}
              
              {currentConflict.remoteEvent.location && (
                <div className="flex gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm">{currentConflict.remoteEvent.location}</p>
                </div>
              )}
              
              <Button 
                className="w-full mt-4" 
                variant="secondary"
                onClick={() => resolveConflict('remote')}
                disabled={isResolving}
              >
                Keep Google Version
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0 || isResolving}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <span className="text-muted-foreground">
            Conflict {currentIndex + 1} of {conflicts.length}
          </span>
          
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(prev => Math.min(conflicts.length - 1, prev + 1))}
            disabled={currentIndex === conflicts.length - 1 || isResolving}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}