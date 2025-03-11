/**
 * Events and News API Module
 * 
 * Handles fetching and transforming events and news data:
 * - Uses the WordPress REST API or custom endpoints
 * - Transforms API data to our app format
 * - Provides error handling and data validation
 */

import { getWooConfig } from './config';
import { mockEvents } from '../../data/mockEvents';
import { mockNews } from '../../data/mockNews';

// Types for events and news
export interface Event {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  image: string;
  registrationLink: string;
  price?: number;
  presenter?: string;
  seats?: number;
  seatsAvailable?: number;
  cancellationPolicy?: string;
  organizer?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface News {
  id: number;
  title: string;
  date: string;
  author: string;
  summary: string;
  content?: string; // Full content (optional)
  image: string;
  readMoreLink: string;
}

// WordPress REST API response types
interface WPEvent {
  id: number;
  title: { rendered: string };
  content: { rendered: string };
  date: string;
  acf?: {
    event_time?: string;
    event_location?: string;
    registration_link?: string;
    presenter?: string;
    seats?: string;
    seats_available?: string;
    cancellation_policy?: string;
    organizer?: string;
    contact_email?: string;
    contact_phone?: string;
  };
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
    }>;
  };
}

interface WPPost {
  id: number;
  title: { rendered: string };
  excerpt: { rendered: string };
  content?: { rendered: string };
  date: string;
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
    }>;
    author?: Array<{
      name: string;
    }>;
  };
  link: string;
}

/**
 * Strip HTML tags from content and decode HTML entities
 */
function stripHtmlTags(html: string): string {
  if (!html) return '';
  
  // First remove HTML tags
  const withoutTags = html.replace(/<[^>]*>?/gm, '');
  
  // Then decode HTML entities
  const decoded = decodeHtmlEntities(withoutTags);
  
  return decoded;
}

/**
 * Decode HTML entities to their corresponding characters
 */
function decodeHtmlEntities(html: string): string {
  if (!html) return '';
  
  try {
    // Try browser-specific method first
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = html;
      return textarea.value;
    }
  } catch (e) {
    console.warn('Browser-specific HTML entity decoding failed, using fallback', e);
  }
  
  // Fallback for common HTML entities
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8211;/g, '-')  // en-dash
    .replace(/&#8212;/g, '--')  // em-dash
    .replace(/&#8216;/g, "'")  // left single quote
    .replace(/&#8217;/g, "'")  // right single quote
    .replace(/&#8220;/g, '"')  // left double quote
    .replace(/&#8221;/g, '"')  // right double quote
    .replace(/&nbsp;/g, ' ')   // non-breaking space
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '--');
}

/**
 * Get featured image URL from WordPress post or event
 */
function getImageUrl(item: WPPost | WPEvent, defaultImage: string): string {
  if (item._embedded && item._embedded['wp:featuredmedia'] && item._embedded['wp:featuredmedia'][0]) {
    return item._embedded['wp:featuredmedia'][0].source_url;
  }
  return defaultImage;
}

/**
 * Transform WordPress event to our app format
 */
function transformEvent(wpEvent: WPEvent): Event {
  // Default image if none is available
  const defaultImage = '/images/events/default-event.jpg';
  
  // Extract the base title by removing any attendee count information
  const baseTitle = stripHtmlTags(wpEvent.title.rendered).replace(/\s+\d+(?:-\d+)?\+?\s+Attendees$/, '');
  
  // Extract price from content if available
  const priceMatch = wpEvent.content.rendered.match(/\$(\d+(?:\.\d{2})?)/);
  const price = priceMatch ? parseFloat(priceMatch[1]) : undefined;

  return {
    id: wpEvent.id,
    title: baseTitle,
    date: wpEvent.date,
    time: wpEvent.acf?.event_time || '9:00 AM - 5:00 PM',
    location: wpEvent.acf?.event_location || 'Online Event',
    description: stripHtmlTags(wpEvent.content.rendered).substring(0, 300) + '...',
    image: getImageUrl(wpEvent, defaultImage),
    registrationLink: wpEvent.acf?.registration_link || '#',
    price: price,
    presenter: wpEvent.acf?.presenter || undefined,
    seats: wpEvent.acf?.seats ? parseInt(wpEvent.acf.seats) : undefined,
    seatsAvailable: wpEvent.acf?.seats_available ? parseInt(wpEvent.acf.seats_available) : undefined,
    cancellationPolicy: wpEvent.acf?.cancellation_policy || undefined,
    organizer: wpEvent.acf?.organizer || undefined,
    contactEmail: wpEvent.acf?.contact_email || undefined,
    contactPhone: wpEvent.acf?.contact_phone || undefined
  };
}

/**
 * Transform WordPress post to our app news format
 */
function transformNews(wpPost: WPPost): News {
  // Default image if none is available
  const defaultImage = '/images/news/default-news.jpg';
  
  return {
    id: wpPost.id,
    title: stripHtmlTags(wpPost.title.rendered),
    date: wpPost.date,
    author: wpPost._embedded?.author?.[0]?.name || 'Staff Writer',
    summary: stripHtmlTags(wpPost.excerpt.rendered),
    content: wpPost.content ? stripHtmlTags(wpPost.content.rendered) : undefined,
    image: getImageUrl(wpPost, defaultImage),
    readMoreLink: wpPost.link
  };
}

/**
 * Fetch events from WordPress
 */
export async function fetchEvents(): Promise<Event[]> {
  try {
 
    const config = getWooConfig();
    
    // Try different potential endpoints for events
    const possibleEndpoints = [
      `${config.url}/wp-json/wp/v2/events?_embed`,            // Custom post type
      `${config.url}/wp-json/wp/v2/tribe_events?_embed`,      // The Events Calendar
      `${config.url}/wp-json/tribe/events/v1/events`,        // The Events Calendar REST API
      `${config.url}/wp-json/tribe/events/v1/events`         // Alternative Events Calendar
    ];
    
    let events = null;
    let error = null;
    
    // Try each endpoint until one works
    for (const endpoint of possibleEndpoints) {
      try {
       
        const response = await fetch(endpoint);
        
        if (response.ok) {
          const data = await response.json();
          // Handle different response formats
          events = Array.isArray(data) ? data : (data.events || data);
         
          break;
        }
      } catch (err) {
        error = err;
       
      }
    }
    
    if (events && Array.isArray(events) && events.length > 0) {
      return events.map(transformEvent);
    }
    
    console.warn('No events found from API, using mock data', error);
    return mockEvents;
  } catch (error) {
    console.error('Error fetching events:', error);
    return mockEvents; // Fallback to mock data
  }
}

/**
 * Fetch news from WordPress
 */
export async function fetchNews(): Promise<News[]> {
  try {
   
    const config = getWooConfig();
    const url = `${config.url}/wp-json/wp/v2/posts?_embed`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Posts API request failed with status ${response.status}`);
    }
    
    const posts = await response.json();
    if (posts && Array.isArray(posts) && posts.length > 0) {
     
      return posts.map(transformNews);
    } else {
      throw new Error('No posts found or invalid response format');
    }
  } catch (error) {
    console.error('Error fetching news:', error);
    // Map mockNews to match our News interface
    return mockNews.map(item => ({
      ...item,
      readMoreLink: item.link
    }));
  }
}

/**
 * Fetch detailed information for a specific event
 */
export async function fetchEventDetails(eventId: number): Promise<Event | null> {
  try {
  
    const config = getWooConfig();
    
    // Try different potential endpoints for the event
    const possibleEndpoints = [
      `${config.url}/wp-json/wp/v2/events/${eventId}?_embed`,
      `${config.url}/wp-json/wp/v2/tribe_events/${eventId}?_embed`,
      `${config.url}/wp-json/tribe/events/v1/events/${eventId}`,
    ];
    
    let eventData = null;
    
    // Try each endpoint until one works
    for (const endpoint of possibleEndpoints) {
      try {
     
        const response = await fetch(endpoint);
        
        if (response.ok) {
          const data = await response.json();
          eventData = data;
         
          break;
        }
      } catch (err) {
     
      }
    }
    
    if (eventData) {
      // Handle different formats
      const event = transformEvent(eventData);
      
      // Add full description for detailed view
      if (eventData.content?.rendered) {
        event.description = stripHtmlTags(eventData.content.rendered);
      }
      
      return event;
    }
    
    // If API fails, try to find the event in mock data
    console.warn(`No event details found from API for ID ${eventId}, checking mock data`);
    const mockEvent = mockEvents.find(event => event.id === eventId);
    
    if (mockEvent) {
      return {
        ...mockEvent,
        price: mockEvent.price || Math.floor(Math.random() * 400) + 100, // Random price between $100-$500
        presenter: mockEvent.presenter || "Dr. Rebecca Reinking",
        seats: mockEvent.seats || 50,
        seatsAvailable: mockEvent.seatsAvailable || Math.floor(Math.random() * 30) + 1,
        cancellationPolicy: mockEvent.cancellationPolicy || "Full refund up to 7 days before the event. No refunds within 7 days of the event.",
        organizer: mockEvent.organizer || "Adventures in Speech Pathology",
        contactEmail: mockEvent.contactEmail || "events@speechpathology.com",
        contactPhone: mockEvent.contactPhone || "(555) 123-4567"
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching event details:', error);
    return null;
  }
} 