import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import Footer from './Footer';
import { Calendar, Clock, MapPin, ExternalLink, Bell, Search, ArrowLeft, Users, Phone, Mail,  PhoneCall,  AlertCircle, User } from 'lucide-react';
import { useEventsNews } from '../context/EventsNewsContext';
import { formatDate } from '../utils/formatters';
import { useLocation, useNavigate } from 'react-router-dom';
import { Event as BaseEvent, fetchEventDetails } from '../lib/woocommerce/events-news';

// Extend the base Event type with additional fields for the detailed view
interface EventWithDetails extends BaseEvent {
  presenter?: string;
  price?: number;
  seats?: number;
  seatsAvailable?: number;
  cancellationPolicy?: string;
  organizer?: string;
  contactEmail?: string;
  contactPhone?: string;
}

// Use the enhanced Event type for our component
type Event = EventWithDetails;

// Define a type for combined content items
interface CombinedContentItem {
  id: number;
  title: string;
  date: string;
  image: string;
  type: 'event' | 'news';
  sortDate: Date;
  time?: string;
  location?: string;
  description?: string;
  registrationLink?: string;
  author?: string;
  summary?: string;
  readMoreLink?: string;
}

const EventsNewsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state as { activeTab?: 'all' | 'events' | 'news', selectedEventId?: number } | null;
  
  const [activeTab, setActiveTab] = useState<'all' | 'events' | 'news'>(
    locationState?.activeTab || 'all'
  );
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<number | null>(
    locationState?.selectedEventId || null
  );
  const [showEventDetails, setShowEventDetails] = useState<boolean>(!!locationState?.selectedEventId);
  const [eventDetail, setEventDetail] = useState<Event | null>(null);
  const [loadingEventDetails, setLoadingEventDetails] = useState(false);
  const [eventDetailsError, setEventDetailsError] = useState<string | null>(null);
  
  const { events, news, loading, error } = useEventsNews();
  
  // Find the currently selected event
  const currentEvent = useMemo(() => {
    if (!selectedEvent) return null;
    return eventDetail || events.find(event => event.id === selectedEvent) as Event | null;
  }, [selectedEvent, events, eventDetail]);
  
  // Scroll to selected event if passed in location state
  useEffect(() => {
    if (selectedEvent && !showEventDetails) {
      const eventElement = document.getElementById(`event-${selectedEvent}`);
      if (eventElement) {
        eventElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight the event card temporarily
        eventElement.classList.add('ring-4', 'ring-[#2bcd82]', 'ring-opacity-70');
        setTimeout(() => {
          eventElement.classList.remove('ring-4', 'ring-[#2bcd82]', 'ring-opacity-70');
        }, 2000);
      }
    }
  }, [selectedEvent, loading, showEventDetails]);
  
  // Fetch event details when an event is selected
  useEffect(() => {
    if (selectedEvent && showEventDetails) {
      const fetchDetails = async () => {
        setLoadingEventDetails(true);
        setEventDetailsError(null);
        
        try {
          console.log(`Fetching details for event ID: ${selectedEvent}`);
          const details = await fetchEventDetails(selectedEvent);
          if (details) {
            console.log('Event details retrieved successfully:', details);
            
            // Log each field to verify what's available
            console.log('Event fields available:');
            Object.keys(details).forEach(key => {
              console.log(`${key}: ${JSON.stringify(details[key as keyof Event])}`);
            });
            
            setEventDetail(details);
          } else {
            console.error("No event details found for ID:", selectedEvent);
            setEventDetailsError("Event details not found.");
          }
        } catch (error) {
          console.error("Error fetching event details:", error);
          setEventDetailsError("Failed to load event details. Please try again.");
        } finally {
          setLoadingEventDetails(false);
        }
      };
      
      fetchDetails();
    } else {
      // Reset event detail when no event is selected
      setEventDetail(null);
    }
  }, [selectedEvent, showEventDetails]);
  
  // Filter content based on active tab and search term
  const filteredEvents = useMemo(() => {
    // First, deduplicate events that have the same core info but different attendee counts
    const eventsMap = new Map();
    
    events.forEach(event => {
      // Extract the base title (removing the attendee count part)
      // For example: "Which Phonological Intervention Should I Choose? - Canberra 10+ Attendees"
      // becomes: "Which Phonological Intervention Should I Choose? - Canberra"
      const baseTitle = event.title.replace(/\s+\d+(?:-\d+)?\+?\s+Attendees$/, '');
      
      // If we haven't seen this base title before, or this event is on a different date
      // than a previously seen event with the same base title, add it to our map
      const key = `${baseTitle}-${event.date.split('T')[0]}`;
      
      if (!eventsMap.has(key) || new Date(event.date) > new Date(eventsMap.get(key).date)) {
        // Store a clean version of the event with the attendee count removed from the title
        const cleanEvent = {
          ...event,
          title: baseTitle
        };
        eventsMap.set(key, cleanEvent);
      }
    });
    
    // Convert the map values back to an array
    const deduplicatedEvents = Array.from(eventsMap.values());
    
    // Then apply the search filter
    return deduplicatedEvents.filter(event => 
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [events, searchTerm]);
  
  const filteredNews = useMemo(() => {
    return news.filter(news => 
      news.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      news.summary.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [news, searchTerm]);
  
  // Combined and sorted content for "All" tab
  const combinedContent: CombinedContentItem[] = useMemo(() => {
    return [...filteredEvents.map(event => ({
      ...event,
      type: 'event' as const,
      sortDate: new Date(event.date)
    })), ...filteredNews.map(news => ({
      ...news,
      type: 'news' as const,
      sortDate: new Date(news.date)
    }))].sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
  }, [filteredEvents, filteredNews]);

  // Handle event selection
  const handleEventSelect = (eventId: number) => {
    setSelectedEvent(eventId);
    setShowEventDetails(true);
    // Update URL without reloading page
    navigate('/events-news', { 
      state: { 
        activeTab: 'events',
        selectedEventId: eventId 
      }, 
      replace: true 
    });
    window.scrollTo(0, 0);
  };

  // Back to events list
  const handleBackToEvents = () => {
    setShowEventDetails(false);
    setSelectedEvent(null);
    navigate('/events-news', { 
      state: { activeTab: 'events' }, 
      replace: true 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Event Details View */}
        {showEventDetails && currentEvent ? (
          <div>
            {/* Back Button - positioned above the content */}
            <div className="mb-4">
              <button 
                onClick={handleBackToEvents}
                className="flex items-center text-gray-600 hover:text-[#2bcd82] transition-colors font-medium"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Events
              </button>
            </div>
            
            {loadingEventDetails ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <div className="animate-spin w-12 h-12 border-4 border-[#2bcd82] border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading event details...</p>
              </div>
            ) : eventDetailsError ? (
              <div className="bg-white rounded-lg shadow-md p-8">
                <div className="text-red-500 mb-4 text-center">{eventDetailsError}</div>
                <button 
                  onClick={() => handleEventSelect(selectedEvent!)}
                  className="mx-auto block bg-[#2bcd82] hover:bg-[#25b975] text-white font-medium py-2 px-4 rounded"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
                {/* Event Header with Small Image and Title */}
                <div className="relative bg-gradient-to-r from-[#2bcd82]/10 to-[#2bcd82]/5 p-6">
                  <div className="flex flex-col md:flex-row gap-6 items-center">
                    {/* Smaller Event Image */}
                    <div className="relative w-full md:w-1/4 lg:w-1/5 aspect-[4/3] rounded-lg overflow-hidden shadow-md">
                      <img 
                        src={currentEvent.image || "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80"} 
                        alt={currentEvent.title} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#2bcd82] text-white inline-block">
                          Event
                        </span>
                      </div>
                    </div>
                    
                    {/* Event Title and Basic Info */}
                    <div className="flex-1">
                      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">{currentEvent.title}</h1>
                      
                      {/* Event Summary Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm md:text-base">
                        <div className="flex items-center text-gray-700">
                          <Calendar className="w-4 h-4 mr-2 text-[#2bcd82]" />
                          <span>{formatDate(currentEvent.date, 'long')}</span>
                        </div>
                        <div className="flex items-center text-gray-700">
                          <Clock className="w-4 h-4 mr-2 text-[#2bcd82]" />
                          <span>{currentEvent.time || 'Time not specified'}</span>
                        </div>
                        <div className="flex items-center text-gray-700">
                          <MapPin className="w-4 h-4 mr-2 text-[#2bcd82]" />
                          <span>{currentEvent.location || 'Location not specified'}</span>
                        </div>
                        <div className="flex items-center text-gray-700">
                          <Users className="w-4 h-4 mr-2 text-[#2bcd82]" />
                          <span>{currentEvent.seatsAvailable !== undefined ? `${currentEvent.seatsAvailable} seats available` : 
                                 currentEvent.seats !== undefined ? `${currentEvent.seats} total seats` : 'Seating info not available'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - About This Event */}
                    <div className="lg:col-span-2">
                      {/* About This Event - Enhanced Design */}
                      <div className="mb-8">
                        <div className="flex items-center mb-4">
                          <div className="h-6 w-1 bg-[#2bcd82] rounded mr-3"></div>
                          <h2 className="text-xl font-bold text-gray-800">About this Event</h2>
                        </div>
                        <div className="prose max-w-none text-gray-700 bg-gray-50 p-5 rounded-lg border-l-4 border-[#2bcd82]/30">
                          <p className="mb-4">{currentEvent.description || 'No description available.'}</p>
                        </div>
                      </div>
                      
                      {/* Presenter Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-white rounded-lg p-5 border border-gray-100">
                          <div className="flex items-center mb-3">
                            <div className="mr-3 bg-[#2bcd82]/10 p-2 rounded-full">
                              <User className="w-5 h-5 text-[#2bcd82]" />
                            </div>
                            <h3 className="font-bold text-gray-800">Presenter</h3>
                          </div>
                          <p className="text-gray-700">{currentEvent.presenter || 'Presenter information not available'}</p>
                          {currentEvent.organizer && (
                            <p className="text-gray-600 text-sm mt-2">Organized by: {currentEvent.organizer}</p>
                          )}
                        </div>
                        
                        {/* Contact Information */}
                        <div className="bg-white rounded-lg p-5 border border-gray-100">
                          <div className="flex items-center mb-3">
                            <div className="mr-3 bg-[#2bcd82]/10 p-2 rounded-full">
                              <PhoneCall className="w-5 h-5 text-[#2bcd82]" />
                            </div>
                            <h3 className="font-bold text-gray-800">Contact</h3>
                          </div>
                          {currentEvent.contactEmail && (
                            <div className="flex items-center mb-2">
                              <Mail className="w-4 h-4 mr-2 text-gray-500" />
                              <a 
                                href={`mailto:${currentEvent.contactEmail}`}
                                className="text-gray-700 hover:text-[#2bcd82] transition-colors"
                              >
                                {currentEvent.contactEmail}
                              </a>
                            </div>
                          )}
                          {currentEvent.contactPhone && (
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 mr-2 text-gray-500" />
                              <a 
                                href={`tel:${currentEvent.contactPhone}`}
                                className="text-gray-700 hover:text-[#2bcd82] transition-colors"
                              >
                                {currentEvent.contactPhone}
                              </a>
                            </div>
                          )}
                          {!currentEvent.contactEmail && !currentEvent.contactPhone && (
                            <p className="text-gray-600">Contact information not available</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Cancellation Policy */}
                      <div className="bg-white rounded-lg p-5 border border-gray-100">
                        <div className="flex items-center mb-3">
                          <div className="mr-3 bg-[#2bcd82]/10 p-2 rounded-full">
                            <AlertCircle className="w-5 h-5 text-[#2bcd82]" />
                          </div>
                          <h3 className="font-bold text-gray-800">Cancellation Policy</h3>
                        </div>
                        <p className="text-gray-700">{currentEvent.cancellationPolicy || 'Cancellation policy not specified'}</p>
                      </div>
                    </div>
                    
                    {/* Right Column - Registration */}
                    <div className="lg:col-span-1">
                      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 sticky top-4">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Registration</h3>
                        
                        <div className="flex justify-between items-center mb-5 pb-5 border-b border-gray-100">
                          <span className="text-gray-700">Registration Fee</span>
                          <span className="text-2xl font-bold text-[#2bcd82]">
                            {currentEvent.price !== undefined ? `$${currentEvent.price}` : 'Free'}
                          </span>
                        </div>
                        
                        {currentEvent.registrationLink ? (
                          <a
                            href={currentEvent.registrationLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full bg-[#2bcd82] hover:bg-[#25b975] text-white font-medium py-3 px-4 rounded-lg text-center transition-colors"
                          >
                            Register Now
                          </a>
                        ) : (
                          <button
                            className="block w-full bg-gray-300 text-gray-600 font-medium py-3 px-4 rounded-lg text-center cursor-not-allowed"
                            disabled
                          >
                            Registration Unavailable
                          </button>
                        )}
                        
                        <div className="mt-3 text-center text-gray-500 text-sm">
                          Secure checkout with PayPal or credit card
                        </div>
                        
                        {/* Additional Event Information */}
                        {(currentEvent.seats !== undefined || currentEvent.seatsAvailable !== undefined) && (
                          <div className="mt-5 pt-5 border-t border-gray-100">
                            <h4 className="font-medium text-gray-800 mb-2">Capacity Information</h4>
                            <div className="flex flex-col gap-2">
                              {currentEvent.seats !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Total Capacity:</span>
                                  <span className="font-medium">{currentEvent.seats} seats</span>
                                </div>
                              )}
                              {currentEvent.seatsAvailable !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Available Seats:</span>
                                  <span className="font-medium">{currentEvent.seatsAvailable} seats</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Page Header */}
            <div className="text-center mb-12 bg-white rounded-2xl p-8 shadow-sm">
              <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#2bcd82] to-[#25b975]">Events & News</h1>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Stay updated with the latest events, workshops, and news in the speech pathology community.
              </p>
              <div className="mt-6 max-w-sm mx-auto h-1 bg-gradient-to-r from-[#2bcd82] to-transparent rounded-full"></div>
            </div>
            
            {/* Search and Filter */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex space-x-2">
                <button 
                  className={`px-4 py-2 rounded-full font-medium transition-colors ${
                    activeTab === 'all' 
                      ? 'bg-[#2bcd82] text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setActiveTab('all')}
                >
                  All
                </button>
                <button 
                  className={`px-4 py-2 rounded-full font-medium transition-colors ${
                    activeTab === 'events' 
                      ? 'bg-[#2bcd82] text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setActiveTab('events')}
                >
                  Events
                </button>
                <button 
                  className={`px-4 py-2 rounded-full font-medium transition-colors ${
                    activeTab === 'news' 
                      ? 'bg-[#2bcd82] text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setActiveTab('news')}
                >
                  News
                </button>
              </div>
              
              <div className="relative w-full md:w-72">
                <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#2bcd82] focus:border-transparent"
                  placeholder="Search events & news..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              </div>
            </div>
            
            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#2bcd82]"></div>
              </div>
            )}
            
            {/* Error State */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 my-8">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Content */}
            {!loading && !error && (
              <div className="grid grid-cols-1 gap-8">
                {/* All Content */}
                {activeTab === 'all' && combinedContent.length > 0 && (
                  <>
                    {combinedContent.map(item => (
                      <div 
                        key={`${item.type}-${item.id}`}
                        id={item.type === 'event' ? `event-${item.id}` : `news-${item.id}`}
                        className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100"
                        onClick={item.type === 'event' ? () => handleEventSelect(item.id) : undefined}
                        style={{ cursor: item.type === 'event' ? 'pointer' : 'default' }}
                      >
                        <div className="md:flex h-full">
                          <div className="md:w-1/4 h-36 md:h-auto max-w-[220px]">
                            <img 
                              src={item.image} 
                              alt={item.title} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-6 md:w-3/4 flex flex-col h-full relative">
                            <div className="flex justify-between items-start mb-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                item.type === 'event' 
                                  ? 'bg-[#2bcd82]/10 text-[#2bcd82]' 
                                  : 'bg-[#fb6a69]/10 text-[#fb6a69]'
                              }`}>
                                {item.type === 'event' ? 'Event' : 'News'}
                              </span>
                              <span className="text-gray-500 text-sm">{formatDate(item.date, 'medium')}</span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">{item.title}</h2>
                            {item.type === 'event' ? (
                              <>
                                <div className="flex items-center text-gray-600 mb-1">
                                  <Clock className="w-4 h-4 mr-2" />
                                  <span>{item.time}</span>
                                </div>
                                <div className="flex items-center text-gray-600 mb-4">
                                  <MapPin className="w-4 h-4 mr-2" />
                                  <span>{item.location}</span>
                                </div>
                                <p className="text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                                <div className="mt-auto flex justify-end">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEventSelect(item.id);
                                    }}
                                    className="inline-flex items-center bg-[#2bcd82] text-white hover:bg-[#25b975] font-medium py-2 px-4 rounded"
                                  >
                                    View Details
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center text-gray-600 mb-4">
                                  <span className="font-medium">By: {item.author}</span>
                                </div>
                                <p className="text-gray-600 mb-4 line-clamp-2">{item.summary}</p>
                                <div className="mt-auto flex justify-end">
                                  <a 
                                    href={item.readMoreLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center bg-[#fb6a69] text-white hover:bg-[#f5514f] font-medium py-2 px-4 rounded"
                                  >
                                    Read Full Article <ExternalLink className="w-4 h-4 ml-1" />
                                  </a>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {combinedContent.length === 0 && (
                      <div className="text-center py-16">
                        <p className="text-gray-500 text-lg">No results found matching "{searchTerm}"</p>
                      </div>
                    )}
                  </>
                )}
                
                {/* Events Only */}
                {activeTab === 'events' && (
                  <>
                    {filteredEvents.length > 0 ? (
                      <div className="grid grid-cols-1 gap-8">
                        {filteredEvents.map(event => (
                          <div 
                            key={event.id} 
                            id={`event-${event.id}`}
                            className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 cursor-pointer"
                            onClick={() => handleEventSelect(event.id)}
                          >
                            <div className="md:flex h-full">
                              <div className="md:w-1/4 h-36 md:h-auto max-w-[220px]">
                                <img 
                                  src={event.image} 
                                  alt={event.title} 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="p-6 md:w-3/4 flex flex-col h-full relative">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#2bcd82]/10 text-[#2bcd82]">
                                    Event
                                  </span>
                                  <span className="text-gray-500 text-sm">{formatDate(event.date, 'medium')}</span>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800 mb-2">{event.title}</h2>
                                <div className="flex items-center text-gray-600 mb-1">
                                  <Clock className="w-4 h-4 mr-2" />
                                  <span>{event.time}</span>
                                </div>
                                <div className="flex items-center text-gray-600 mb-4">
                                  <MapPin className="w-4 h-4 mr-2" />
                                  <span>{event.location}</span>
                                </div>
                                <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>
                                <div className="mt-auto flex justify-end">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEventSelect(event.id);
                                    }}
                                    className="inline-flex items-center bg-[#2bcd82] text-white hover:bg-[#25b975] font-medium py-2 px-4 rounded"
                                  >
                                    View Details
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        {searchTerm ? (
                          <p className="text-gray-500 text-lg">No events found matching "{searchTerm}"</p>
                        ) : (
                          <p className="text-gray-500 text-lg">No events currently scheduled</p>
                        )}
                      </div>
                    )}
                  </>
                )}
                
                {/* News Only */}
                {activeTab === 'news' && (
                  <>
                    {filteredNews.length > 0 ? (
                      <div className="grid grid-cols-1 gap-8">
                        {filteredNews.map(newsItem => (
                          <div 
                            key={newsItem.id}
                            id={`news-${newsItem.id}`}
                            className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100"
                          >
                            <div className="md:flex h-full">
                              <div className="md:w-1/4 h-36 md:h-auto max-w-[220px]">
                                <img 
                                  src={newsItem.image} 
                                  alt={newsItem.title} 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="p-6 md:w-3/4 flex flex-col h-full relative">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#fb6a69]/10 text-[#fb6a69]">
                                    News
                                  </span>
                                  <span className="text-gray-500 text-sm">{formatDate(newsItem.date, 'medium')}</span>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800 mb-2">{newsItem.title}</h2>
                                <div className="flex items-center text-gray-600 mb-4">
                                  <span className="font-medium">By: {newsItem.author}</span>
                                </div>
                                <p className="text-gray-600 mb-4 line-clamp-2">{newsItem.summary}</p>
                                <div className="mt-auto flex justify-end">
                                  <a 
                                    href={newsItem.readMoreLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center bg-[#fb6a69] text-white hover:bg-[#f5514f] font-medium py-2 px-4 rounded"
                                  >
                                    Read Full Article <ExternalLink className="w-4 h-4 ml-1" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        {searchTerm ? (
                          <p className="text-gray-500 text-lg">No news found matching "{searchTerm}"</p>
                        ) : (
                          <p className="text-gray-500 text-lg">No news articles available</p>
                        )}
                      </div>
                    )}
                  </>
                )}
                
                {/* Subscribe Section */}
                <div className="bg-gradient-to-r from-[#2bcd82]/10 to-[#fb6a69]/10 p-8 rounded-lg mt-12">
                  <div className="max-w-3xl mx-auto text-center">
                    <Bell className="w-12 h-12 text-[#2bcd82] mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Stay Updated</h2>
                    <p className="text-gray-600 mb-6">
                      Subscribe to our newsletter to receive updates about upcoming events and latest news in speech pathology.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                      <input
                        type="email"
                        placeholder="Your email address"
                        className="flex-grow px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2bcd82] focus:border-transparent"
                      />
                      <button className="bg-[#2bcd82] hover:bg-[#25b975] text-white font-medium px-6 py-2 rounded-full transition-colors">
                        Subscribe
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default EventsNewsPage; 