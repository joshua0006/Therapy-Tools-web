import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchEvents, fetchNews, Event, News } from '../lib/woocommerce/events-news';

// Define context type
interface EventsNewsContextType {
  events: Event[];
  news: News[];
  featuredEvent: Event | null;
  featuredNews: News | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

// Create context
const EventsNewsContext = createContext<EventsNewsContextType | undefined>(undefined);

// Provider props
interface EventsNewsProviderProps {
  children: ReactNode;
}

export const EventsNewsProvider: React.FC<EventsNewsProviderProps> = ({ children }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch all events and news
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventsData, newsData] = await Promise.all([
        fetchEvents(),
        fetchNews()
      ]);
      
      // Ensure we're handling the correct types
      setEvents(eventsData as Event[]);
      setNews(newsData as News[]);
    } catch (err) {
      console.error('Error loading events and news data:', err);
      setError('Failed to load events and news. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Get featured event (most recent upcoming event)
  const getFeaturedEvent = (): Event | null => {
    if (events.length === 0) return null;
    
    const now = new Date();
    const upcomingEvents = events
      .filter(event => new Date(event.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return upcomingEvents.length > 0 ? upcomingEvents[0] : events[0];
  };

  // Get featured news (most recent news)
  const getFeaturedNews = (): News | null => {
    if (news.length === 0) return null;
    
    return news.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
  };

  // Context value
  const value = {
    events,
    news,
    featuredEvent: getFeaturedEvent(),
    featuredNews: getFeaturedNews(),
    loading,
    error,
    refreshData: fetchData
  };

  return (
    <EventsNewsContext.Provider value={value}>
      {children}
    </EventsNewsContext.Provider>
  );
};

// Hook for using the context
export const useEventsNews = (): EventsNewsContextType => {
  const context = useContext(EventsNewsContext);
  if (context === undefined) {
    throw new Error('useEventsNews must be used within an EventsNewsProvider');
  }
  return context;
}; 