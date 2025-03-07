import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { fetchEvents, fetchNews, Event, News } from '../lib/woocommerce/events-news';
import { getCached, setCache } from '../lib/woocommerce/cache';

interface EventsNewsContextType {
  events: Event[];
  news: News[];
  loading: boolean;
  error: string | null;
  refreshEvents: () => Promise<void>;
  refreshNews: () => Promise<void>;
}

const EventsNewsContext = createContext<EventsNewsContextType | undefined>(undefined);

interface EventsNewsProviderProps {
  children: ReactNode;
}

export const EventsNewsProvider: React.FC<EventsNewsProviderProps> = ({ children }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Try to get data from cache first
        const cachedEvents = getCached('events');
        const cachedNews = getCached('news');
        
        // Fetch data in parallel if not in cache
        const eventsPromise = cachedEvents ? Promise.resolve(cachedEvents) : fetchEvents();
        const newsPromise = cachedNews ? Promise.resolve(cachedNews) : fetchNews();
        
        const [eventsData, newsData] = await Promise.all([eventsPromise, newsPromise]);
        
        setEvents(eventsData);
        setNews(newsData);
        
        // Update cache if we fetched fresh data
        if (!cachedEvents) setCache('events', eventsData);
        if (!cachedNews) setCache('news', newsData);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching events and news:', err);
        setError('Failed to load events and news. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const refreshEvents = async () => {
    setLoading(true);
    try {
      const eventsData = await fetchEvents();
      setEvents(eventsData);
      setCache('events', eventsData);
      setError(null);
    } catch (err) {
      console.error('Error refreshing events:', err);
      setError('Failed to refresh events. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const refreshNews = async () => {
    setLoading(true);
    try {
      const newsData = await fetchNews();
      setNews(newsData);
      setCache('news', newsData);
      setError(null);
    } catch (err) {
      console.error('Error refreshing news:', err);
      setError('Failed to refresh news. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <EventsNewsContext.Provider
      value={{
        events,
        news,
        loading,
        error,
        refreshEvents,
        refreshNews
      }}
    >
      {children}
    </EventsNewsContext.Provider>
  );
};

export const useEventsNews = () => {
  const context = useContext(EventsNewsContext);
  if (context === undefined) {
    throw new Error('useEventsNews must be used within an EventsNewsProvider');
  }
  return context;
}; 