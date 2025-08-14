import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { startOfMonth, endOfMonth, format, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';

export type ViewType = 'month' | 'week' | 'day' | 'list';
export type EventCategory = 'work' | 'personal' | 'health' | 'education' | 'social' | 'other';

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  location?: string;
  description?: string;
  category: EventCategory;
  color?: string;
  isAllDay?: boolean;
  isRecurring?: boolean;
  recurringPattern?: string;
  sourceImage?: string;
  confidence?: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarFilter {
  categories: EventCategory[];
  searchQuery: string;
  startDate?: Date;
  endDate?: Date;
  showOnlyConfirmed?: boolean;
}

interface CalendarState {
  // View state
  currentView: ViewType;
  currentDate: Date;
  selectedDate: Date | null;
  selectedEvent: any | null;
  
  // Events
  events: CalendarEvent[];
  loading: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Filters
  filters: CalendarFilter;
  
  // UI state
  isEventModalOpen: boolean;
  isCreateModalOpen: boolean;
  showEventModal: boolean;
  isDragging: boolean;
  draggedEvent: CalendarEvent | undefined;
  setDraggedEvent: (event: CalendarEvent | undefined) => void;
  
  // Actions
  setView: (view: ViewType) => void;
  setCurrentDate: (date: Date) => void;
  navigateMonth: (direction: 'prev' | 'next') => void;
  selectDate: (date: Date | null) => void;
  selectEvent: (event: CalendarEvent | null) => void;
  
  // Event actions
  fetchEvents: (startDate?: Date, endDate?: Date) => Promise<void>;
  createEvent: (event: Partial<CalendarEvent>) => Promise<void>;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  moveEvent: (eventId: string, newStartTime: Date, newEndTime?: Date) => Promise<void>;
  
  // Filter actions
  setFilters: (filters: Partial<CalendarFilter>) => void;
  clearFilters: () => void;
  searchEvents: (query: string) => void;
  
  // UI actions
  openEventModal: (event?: any) => void;
  closeEventModal: () => void;
  openCreateModal: (date?: Date) => void;
  closeCreateModal: () => void;
  startDragging: (event: CalendarEvent) => void;
  stopDragging: () => void;
  duplicateEvent: (eventId: string) => void;
  
  // Utility
  getEventsForDate: (date: Date) => any[];
  getEventsForMonth: (date: Date) => any[];
  getFilteredEvents: () => any[];
}

const initialFilters: CalendarFilter = {
  categories: ['work', 'personal', 'health', 'education', 'social', 'other'],
  searchQuery: '',
  showOnlyConfirmed: false,
};

export const useCalendarStore = create<CalendarState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentView: 'month',
        currentDate: new Date(),
        selectedDate: null,
        selectedEvent: null,
        events: [],
        loading: false,
        isLoading: false,
        error: null,
        filters: initialFilters,
        isEventModalOpen: false,
        isCreateModalOpen: false,
        showEventModal: false,
        isDragging: false,
        draggedEvent: undefined,
        setDraggedEvent: (event) => set({ draggedEvent: event }),

        // View actions
        setView: (view) => set({ currentView: view }),
        
        setCurrentDate: (date) => set({ currentDate: date }),
        
        navigateMonth: (direction) => {
          const { currentDate } = get();
          const newDate = direction === 'next' 
            ? addMonths(currentDate, 1)
            : subMonths(currentDate, 1);
          set({ currentDate: newDate });
          get().fetchEvents(startOfMonth(newDate), endOfMonth(newDate));
        },
        
        selectDate: (date) => set({ selectedDate: date }),
        
        selectEvent: (event) => set({ selectedEvent: event }),

        // Event actions
        fetchEvents: async (startDate, endDate) => {
          set({ loading: true, isLoading: true, error: null });
          
          try {
            const start = startDate || startOfMonth(get().currentDate);
            const end = endDate || endOfMonth(get().currentDate);
            
            const params = new URLSearchParams({
              startDate: start.toISOString(),
              endDate: end.toISOString(),
            });
            
            const response = await fetch(`/api/events?${params}`, {
              credentials: 'include',
            });
            
            if (!response.ok) {
              if (response.status === 401) {
                // Redirect to login if unauthorized
                window.location.href = '/auth/signin?callbackUrl=' + encodeURIComponent(window.location.pathname);
                return;
              }
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.message || 'Failed to fetch events');
            }
            
            const result = await response.json();
            
            // Handle the response structure from ApiResponse.success()
            const eventsData = result.data?.events || result.events || [];
            
            // Convert date strings to Date objects
            const events = eventsData.map((event: any) => ({
              ...event,
              startDate: new Date(event.startDate),
              endDate: event.endDate ? new Date(event.endDate) : undefined,
              createdAt: new Date(event.createdAt),
              updatedAt: new Date(event.updatedAt),
            }));
            
            set({ events, loading: false, isLoading: false });
          } catch (error) {
            console.error('Error fetching events:', error);
            set({ 
              error: error instanceof Error ? error.message : 'Failed to fetch events',
              loading: false,
              isLoading: false 
            });
          }
        },

        createEvent: async (eventData) => {
          set({ loading: true, error: null });
          
          try {
            const response = await fetch('/api/events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(eventData),
            });
            
            if (!response.ok) {
              if (response.status === 401) {
                window.location.href = '/auth/signin?callbackUrl=' + encodeURIComponent(window.location.pathname);
                return;
              }
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.message || 'Failed to create event');
            }
            
            const newEvent = await response.json();
            
            // Convert dates
            newEvent.startTime = new Date(newEvent.startTime);
            if (newEvent.endTime) {
              newEvent.endTime = new Date(newEvent.endTime);
            }
            newEvent.createdAt = new Date(newEvent.createdAt);
            newEvent.updatedAt = new Date(newEvent.updatedAt);
            
            set((state) => ({
              events: [...state.events, newEvent],
              loading: false,
              isCreateModalOpen: false,
            }));
          } catch (error) {
            console.error('Error creating event:', error);
            set({ 
              error: error instanceof Error ? error.message : 'Failed to create event',
              loading: false 
            });
          }
        },

        updateEvent: async (id, updates) => {
          set({ loading: true, error: null });
          
          try {
            const response = await fetch(`/api/events/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(updates),
            });
            
            if (!response.ok) {
              throw new Error('Failed to update event');
            }
            
            const updatedEvent = await response.json();
            
            // Convert dates
            updatedEvent.startTime = new Date(updatedEvent.startTime);
            if (updatedEvent.endTime) {
              updatedEvent.endTime = new Date(updatedEvent.endTime);
            }
            updatedEvent.createdAt = new Date(updatedEvent.createdAt);
            updatedEvent.updatedAt = new Date(updatedEvent.updatedAt);
            
            set((state) => ({
              events: state.events.map(event => 
                event.id === id ? updatedEvent : event
              ),
              loading: false,
              isEventModalOpen: false,
            }));
          } catch (error) {
            console.error('Error updating event:', error);
            set({ 
              error: error instanceof Error ? error.message : 'Failed to update event',
              loading: false 
            });
          }
        },

        deleteEvent: async (id) => {
          set({ loading: true, error: null });
          
          try {
            const response = await fetch(`/api/events/${id}`, {
              method: 'DELETE',
              credentials: 'include',
            });
            
            if (!response.ok) {
              throw new Error('Failed to delete event');
            }
            
            set((state) => ({
              events: state.events.filter(event => event.id !== id),
              loading: false,
              isEventModalOpen: false,
              selectedEvent: null,
            }));
          } catch (error) {
            console.error('Error deleting event:', error);
            set({ 
              error: error instanceof Error ? error.message : 'Failed to delete event',
              loading: false 
            });
          }
        },

        moveEvent: async (eventId, newStartTime, newEndTime) => {
          const event = get().events.find(e => e.id === eventId);
          if (!event) return;
          
          const duration = event.endTime && event.startTime
            ? event.endTime.getTime() - event.startTime.getTime()
            : 0;
          
          const endTime = newEndTime || (duration > 0 
            ? new Date(newStartTime.getTime() + duration)
            : undefined);
          
          // Update the event in the store immediately for optimistic UI
          set((state) => ({
            events: state.events.map(e => 
              e.id === eventId 
                ? { ...e, startTime: newStartTime, endTime }
                : e
            )
          }));
          
          // Then update on server
          try {
            await get().updateEvent(eventId, {
              startTime: newStartTime,
              endTime,
            });
          } catch (error) {
            // Revert on error
            await get().fetchEvents();
            throw error;
          }
        },

        // Filter actions
        setFilters: (filters) => {
          set((state) => ({
            filters: { ...state.filters, ...filters }
          }));
        },
        
        clearFilters: () => {
          set({ filters: initialFilters });
        },
        
        searchEvents: (query) => {
          set((state) => ({
            filters: { ...state.filters, searchQuery: query }
          }));
        },

        // UI actions
        openEventModal: (event) => {
          const convertedEvent = event ? {
            ...event,
            startDate: event.startDate || event.startTime,
            endDate: event.endDate || event.endTime,
            status: event.status || (event.confidence && event.confidence >= 0.8 ? 'CONFIRMED' : 'PENDING'),
            confidenceScore: event.confidenceScore || event.confidence || 1,
            createdAt: event.createdAt || new Date(),
            updatedAt: event.updatedAt || new Date(),
            isVisible: event.isVisible !== undefined ? event.isVisible : true,
            isUserVerified: event.isUserVerified || false,
          } : null;
          
          set({ 
            isEventModalOpen: true,
            showEventModal: true,
            selectedEvent: convertedEvent,
          });
        },
        
        closeEventModal: () => {
          set({ 
            isEventModalOpen: false,
            showEventModal: false,
            selectedEvent: null,
          });
        },
        
        openCreateModal: (date) => {
          set({ 
            isCreateModalOpen: true,
            selectedDate: date || null,
          });
        },
        
        closeCreateModal: () => {
          set({ isCreateModalOpen: false });
        },
        
        startDragging: (event) => {
          set({ isDragging: true, draggedEvent: event });
        },
        
        stopDragging: () => {
          set({ isDragging: false, draggedEvent: undefined });
        },
        
        duplicateEvent: (eventId) => {
          const { events } = get();
          const eventToDuplicate = events.find(e => e.id === eventId);
          
          if (eventToDuplicate) {
            const newEvent = {
              ...eventToDuplicate,
              id: `${eventId}-copy-${Date.now()}`,
              title: `${eventToDuplicate.title} (복사본)`,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            
            set((state) => ({
              events: [...state.events, newEvent],
            }));
          }
        },

        // Utility functions
        getEventsForDate: (date) => {
          const { events } = get();
          return events.filter(event => {
            const eventDate = format(event.startTime, 'yyyy-MM-dd');
            const targetDate = format(date, 'yyyy-MM-dd');
            return eventDate === targetDate;
          }).map(event => ({
            ...event,
            startDate: event.startTime,
            endDate: event.endTime,
            status: event.confidence && event.confidence >= 0.8 ? 'CONFIRMED' : 'PENDING',
            confidenceScore: event.confidence || 1,
          }));
        },
        
        getEventsForMonth: (date) => {
          const { events } = get();
          const start = startOfMonth(date);
          const end = endOfMonth(date);
          
          return events.filter(event => {
            return event.startTime >= start && event.startTime <= end;
          }).map(event => ({
            ...event,
            startDate: event.startTime,
            endDate: event.endTime,
            status: event.confidence && event.confidence >= 0.8 ? 'CONFIRMED' : 'PENDING',
            confidenceScore: event.confidence || 1,
          }));
        },
        
        getFilteredEvents: () => {
          const { events, filters } = get();
          
          return events.filter(event => {
            // Category filter
            if (!filters.categories.includes(event.category)) {
              return false;
            }
            
            // Search filter
            if (filters.searchQuery) {
              const query = filters.searchQuery.toLowerCase();
              const matchesTitle = event.title.toLowerCase().includes(query);
              const matchesLocation = event.location?.toLowerCase().includes(query);
              const matchesDescription = event.description?.toLowerCase().includes(query);
              
              if (!matchesTitle && !matchesLocation && !matchesDescription) {
                return false;
              }
            }
            
            // Date range filter
            if (filters.startDate && event.startTime < filters.startDate) {
              return false;
            }
            if (filters.endDate && event.startTime > filters.endDate) {
              return false;
            }
            
            // Confidence filter
            if (filters.showOnlyConfirmed && event.confidence && event.confidence < 0.8) {
              return false;
            }
            
            return true;
          }).map(event => ({
            ...event,
            startDate: event.startTime,
            endDate: event.endTime,
            status: event.confidence && event.confidence >= 0.8 ? 'CONFIRMED' : 'PENDING',
            confidenceScore: event.confidence || 1,
          }));
        },
      }),
      {
        name: 'calendar-storage',
        partialize: (state) => ({
          currentView: state.currentView,
          filters: state.filters,
        }),
      }
    )
  )
);