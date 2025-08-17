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
  
  // Modals
  isEventModalOpen: boolean;
  isCreateModalOpen: boolean;
  showEventModal: boolean;
  
  // Drag and drop
  isDragging: boolean;
  draggedEvent?: CalendarEvent;
  
  // Actions
  setView: (view: ViewType) => void;
  setCurrentDate: (date: Date) => void;
  navigateMonth: (direction: 'next' | 'prev') => void;
  selectDate: (date: Date | null) => void;
  selectEvent: (event: CalendarEvent | null) => void;
  fetchEvents: (startDate?: Date, endDate?: Date) => Promise<void>;
  addEvent: (event: Partial<CalendarEvent>) => Promise<{ success: boolean; event: CalendarEvent | null }>;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<{ success: boolean }>;
  deleteEvent: (id: string) => Promise<{ success: boolean }>;
  setFilters: (filters: Partial<CalendarFilter>) => void;
  clearFilters: () => void;
  setEventModalOpen: (isOpen: boolean) => void;
  setCreateModalOpen: (isOpen: boolean) => void;
  setSelectedEvent: (event: any) => void;
  setShowEventModal: (show: boolean) => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openEventModal: (event: any) => void;
  closeEventModal: () => void;
  searchEvents: (query: string) => void;
  getFilteredEvents: () => CalendarEvent[];
  setIsDragging: (isDragging: boolean) => void;
  setDraggedEvent: (event: CalendarEvent | undefined) => void;
  setEvents: (events: CalendarEvent[]) => void;
  clearError: () => void;
}

const initialFilters: CalendarFilter = {
  categories: [],
  searchQuery: '',
  showOnlyConfirmed: false,
};

// Create the store with SSR safety
const storeCreator = (set: any, get: any) => ({
  // Initial state
  currentView: 'month' as ViewType,
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
  setDraggedEvent: (event: CalendarEvent | undefined) => set({ draggedEvent: event }),

  // View actions
  setView: (view: ViewType) => set({ currentView: view }),
  
  setCurrentDate: (date: Date) => set({ currentDate: date }),
  
  navigateMonth: (direction: 'next' | 'prev') => {
    const { currentDate } = get();
    const newDate = direction === 'next' 
      ? addMonths(currentDate, 1)
      : subMonths(currentDate, 1);
    set({ currentDate: newDate });
    get().fetchEvents(startOfMonth(newDate), endOfMonth(newDate));
  },
  
  selectDate: (date: Date | null) => set({ selectedDate: date }),
  
  selectEvent: (event: CalendarEvent | null) => set({ selectedEvent: event }),

  // Event actions
  fetchEvents: async (startDate?: Date, endDate?: Date) => {
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
        throw new Error('Failed to fetch events');
      }
      
      const data = await response.json();
      
      // Extract events array from the API response
      const eventsData = data.data?.events || data.events || [];
      
      // Convert date strings to Date objects
      const events = eventsData.map((event: any) => ({
        ...event,
        startTime: new Date(event.startTime),
        endTime: event.endTime ? new Date(event.endTime) : undefined,
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
  
  addEvent: async (eventData: Partial<CalendarEvent>) => {
    set({ loading: true, error: null });
    
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(eventData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create event');
      }
      
      const data = await response.json();
      const newEvent = data.data?.event || data.event || data;
      
      // Convert dates
      newEvent.startTime = new Date(newEvent.startTime);
      if (newEvent.endTime) {
        newEvent.endTime = new Date(newEvent.endTime);
      }
      newEvent.createdAt = new Date(newEvent.createdAt);
      newEvent.updatedAt = new Date(newEvent.updatedAt);
      
      set((state: CalendarState) => ({
        events: [...state.events, newEvent],
        loading: false,
      }));
      
      return { success: true, event: newEvent };
    } catch (error) {
      console.error('Error adding event:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add event',
        loading: false 
      });
      return { success: false, event: null };
    }
  },
  
  updateEvent: async (id: string, updates: Partial<CalendarEvent>) => {
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
      
      const data = await response.json();
      const updatedEvent = data.data?.event || data.event || data;
      
      // Convert dates
      updatedEvent.startTime = new Date(updatedEvent.startTime);
      if (updatedEvent.endTime) {
        updatedEvent.endTime = new Date(updatedEvent.endTime);
      }
      updatedEvent.createdAt = new Date(updatedEvent.createdAt);
      updatedEvent.updatedAt = new Date(updatedEvent.updatedAt);
      
      set((state: CalendarState) => ({
        events: state.events.map(event => 
          event.id === id ? updatedEvent : event
        ),
        loading: false,
      }));
      
      return { success: true };
    } catch (error) {
      console.error('Error updating event:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update event',
        loading: false 
      });
      return { success: false };
    }
  },
  
  deleteEvent: async (id: string) => {
    set({ loading: true, error: null });
    
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete event');
      }
      
      set((state: CalendarState) => ({
        events: state.events.filter(event => event.id !== id),
        loading: false,
        selectedEvent: null,
      }));
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting event:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete event',
        loading: false 
      });
      return { success: false };
    }
  },
  
  // Filter actions
  setFilters: (filters: Partial<CalendarFilter>) => {
    set((state: CalendarState) => ({
      filters: { ...state.filters, ...filters }
    }));
  },
  
  clearFilters: () => set({ filters: initialFilters }),
  
  // Modal actions  
  setEventModalOpen: (isOpen: boolean) => set({ isEventModalOpen: isOpen }),
  setCreateModalOpen: (isOpen: boolean) => set({ isCreateModalOpen: isOpen }),
  setSelectedEvent: (event: any) => set({ selectedEvent: event }),
  setShowEventModal: (show: boolean) => set({ showEventModal: show }),
  openCreateModal: () => set({ isCreateModalOpen: true }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),
  openEventModal: (event: any) => set({ selectedEvent: event, isEventModalOpen: true }),
  closeEventModal: () => set({ selectedEvent: null, isEventModalOpen: false }),
  searchEvents: (query: string) => set((state: CalendarState) => ({
    filters: { ...state.filters, searchQuery: query }
  })),
  
  // Drag and drop actions
  setIsDragging: (isDragging: boolean) => set({ isDragging }),
  
  // Direct state updates
  setEvents: (events: CalendarEvent[]) => set({ events }),
  clearError: () => set({ error: null }),
  
  // Computed values (as getter functions to avoid SSR issues)
  getFilteredEvents: () => {
    const state = get();
    return state.events.filter((event: CalendarEvent) => {
      // Category filter
      if (state.filters.categories.length > 0 && 
          !state.filters.categories.includes(event.category)) {
        return false;
      }
      
      // Search filter
      if (state.filters.searchQuery) {
        const query = state.filters.searchQuery.toLowerCase();
        const matchesSearch = 
          event.title.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.location?.toLowerCase().includes(query);
        
        if (!matchesSearch) return false;
      }
      
      // Date range filter
      if (state.filters.startDate && event.startTime < state.filters.startDate) {
        return false;
      }
      if (state.filters.endDate && event.startTime > state.filters.endDate) {
        return false;
      }
      
      // Confidence filter
      if (state.filters.showOnlyConfirmed && 
          event.confidence && event.confidence < 0.8) {
        return false;
      }
      
      return true;
    });
  },
});

// Create store without persist for SSR compatibility
const useCalendarStoreBase = create<CalendarState>()(
  devtools(storeCreator)
);

// Create persisted store for client side only
let persistedStore: any;

// Export store with SSR safety
export const useCalendarStore = ((selector?: any) => {
  // During SSR, return base store without persistence
  if (typeof window === 'undefined') {
    return useCalendarStoreBase(selector);
  }
  
  // On client side, use persisted store
  if (!persistedStore) {
    persistedStore = create<CalendarState>()(
      devtools(
        persist(
          storeCreator,
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
  }
  
  return persistedStore(selector);
}) as typeof useCalendarStoreBase;