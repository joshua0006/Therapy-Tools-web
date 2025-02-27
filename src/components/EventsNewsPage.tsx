import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Button from './Button';
import { Calendar, Clock, MapPin, ExternalLink, Bell, FileText, ChevronRight, Search } from 'lucide-react';

// Mock data for events
const MOCK_EVENTS = [
  {
    id: 1,
    title: 'Annual Speech Pathology Conference',
    date: '2024-06-15',
    time: '9:00 AM - 5:00 PM',
    location: 'Boston Convention Center',
    description: 'Join us for the largest gathering of speech pathologists this year. Featuring keynote speakers, workshops, and networking opportunities.',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    registrationLink: 'https://example.com/register'
  },
  {
    id: 2,
    title: 'Pediatric Speech Therapy Workshop',
    date: '2024-07-22',
    time: '10:00 AM - 3:00 PM',
    location: 'Children\'s Hospital Auditorium',
    description: 'A hands-on workshop focused on innovative techniques for pediatric speech therapy. Limited spots available.',
    image: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    registrationLink: 'https://example.com/register'
  },
  {
    id: 3,
    title: 'Virtual SLP Networking Event',
    date: '2024-08-05',
    time: '6:00 PM - 8:00 PM',
    location: 'Online (Zoom)',
    description: 'Connect with fellow SLPs from around the country in this virtual networking event. Share experiences and build your professional network.',
    image: 'https://images.unsplash.com/photo-1609234656432-603fd648aeb7?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    registrationLink: 'https://example.com/register'
  },
  {
    id: 4,
    title: 'Speech Technology Innovation Summit',
    date: '2024-09-18',
    time: '9:30 AM - 4:30 PM',
    location: 'Tech Innovation Center',
    description: 'Explore the latest technological advancements in speech therapy and rehabilitation. Demonstrations and panel discussions.',
    image: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    registrationLink: 'https://example.com/register'
  }
];

// Mock data for news articles
const MOCK_NEWS = [
  {
    id: 1,
    title: 'New Research Shows Benefits of Early Intervention in Speech Therapy',
    date: '2024-05-28',
    author: 'Dr. Sarah Johnson',
    summary: 'A groundbreaking study published in the Journal of Speech Pathology demonstrates significant improvements in outcomes when speech therapy begins before age 3.',
    image: 'https://images.unsplash.com/photo-1551966775-a4ddc8df052b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    readMoreLink: 'https://example.com/article'
  },
  {
    id: 2,
    title: 'FDA Approves New Speech Therapy Device for Stroke Patients',
    date: '2024-05-15',
    author: 'Michael Chen',
    summary: 'The FDA has granted approval for a revolutionary new device designed to assist stroke patients in regaining speech capabilities through targeted neural stimulation.',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    readMoreLink: 'https://example.com/article'
  },
  {
    id: 3,
    title: 'Speech Pathologists Report Increased Demand Following Pandemic',
    date: '2024-05-02',
    author: 'Lisa Rodriguez',
    summary: 'A nationwide survey indicates a 35% increase in demand for speech pathology services, with experts attributing the rise to delayed treatments during the pandemic.',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    readMoreLink: 'https://example.com/article'
  },
  {
    id: 4,
    title: 'New Guidelines Released for Teletherapy Best Practices',
    date: '2024-04-20',
    author: 'Dr. Robert Williams',
    summary: 'The American Speech-Language-Hearing Association has published updated guidelines for conducting effective teletherapy sessions, emphasizing accessibility and engagement.',
    image: 'https://images.unsplash.com/photo-1587614382346-4ec70e388b28?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    readMoreLink: 'https://example.com/article'
  },
  {
    id: 5,
    title: 'State Expands Insurance Coverage for Speech Therapy Services',
    date: '2024-04-10',
    author: 'Jennifer Taylor',
    summary: 'New legislation requires insurance providers to cover a broader range of speech therapy services, including extended treatment periods for children with developmental disorders.',
    image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    readMoreLink: 'https://example.com/article'
  }
];

// Format date to readable format
const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

const EventsNewsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'events' | 'news'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter content based on active tab and search term
  const filteredEvents = MOCK_EVENTS.filter(event => 
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredNews = MOCK_NEWS.filter(news => 
    news.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    news.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Combined and sorted content for "All" tab
  const combinedContent = [...filteredEvents.map(event => ({
    ...event,
    type: 'event',
    sortDate: new Date(event.date)
  })), ...filteredNews.map(news => ({
    ...news,
    type: 'news',
    sortDate: new Date(news.date)
  }))].sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Events & News</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Stay updated with the latest events, workshops, and news in the speech pathology community.
          </p>
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
          
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#2bcd82] focus:border-transparent"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
        </div>
        
        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-6">
          {/* Show content based on active tab */}
          {activeTab === 'all' && combinedContent.map((item: any) => (
            item.type === 'event' ? (
              <EventCard key={`event-${item.id}`} event={item} showCategory={true} />
            ) : (
              <NewsCard key={`news-${item.id}`} news={item} showCategory={true} />
            )
          ))}
          
          {activeTab === 'events' && filteredEvents.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
          
          {activeTab === 'news' && filteredNews.map(news => (
            <NewsCard key={news.id} news={news} />
          ))}
          
          {/* No results message */}
          {((activeTab === 'all' && combinedContent.length === 0) ||
            (activeTab === 'events' && filteredEvents.length === 0) ||
            (activeTab === 'news' && filteredNews.length === 0)) && (
            <div className="col-span-full text-center py-12">
              <Bell className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-700 mb-2">No results found</h3>
              <p className="text-gray-500">
                Try adjusting your search or filter to find what you're looking for.
              </p>
            </div>
          )}
        </div>
        
      
      </main>
      
      <Footer />
    </div>
  );
};

// Event Card Component
interface EventProps {
  event: {
    id: number;
    title: string;
    date: string;
    time: string;
    location: string;
    description: string;
    image: string;
    registrationLink: string;
  };
  showCategory?: boolean;
}

const EventCard: React.FC<EventProps> = ({ event, showCategory = false }) => {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow flex flex-col md:flex-row">
      {/* Image on the left */}
      <div className="md:w-1/3 h-48 md:h-auto overflow-hidden relative">
        <img 
          src={event.image} 
          alt={event.title} 
          className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
        />
        {showCategory && (
          <div className="absolute top-3 left-3 bg-[#fb6a69] text-white text-xs font-bold px-2 py-1 rounded">
            EVENT
          </div>
        )}
      </div>
      
      {/* Content on the right */}
      <div className="md:w-2/3 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center text-[#fb6a69] text-sm mb-2">
            <Calendar className="w-4 h-4 mr-1" />
            <span>{formatDate(event.date)}</span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">{event.title}</h3>
          <div className="flex items-center text-gray-600 text-sm mb-2">
            <Clock className="w-4 h-4 mr-1" />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center text-gray-600 text-sm mb-3">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{event.location}</span>
          </div>
          <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>
        </div>
        
        <a 
          href={event.registrationLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-[#2bcd82] hover:text-[#25b975] font-medium transition-colors"
        >
          Register Now <ChevronRight className="w-4 h-4 ml-1" />
        </a>
      </div>
    </div>
  );
};

// News Card Component
interface NewsProps {
  news: {
    id: number;
    title: string;
    date: string;
    author: string;
    summary: string;
    image: string;
    readMoreLink: string;
  };
  showCategory?: boolean;
}

const NewsCard: React.FC<NewsProps> = ({ news, showCategory = false }) => {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow flex flex-col md:flex-row">
      {/* Image on the left */}
      <div className="md:w-1/3 h-48 md:h-auto overflow-hidden relative">
        <img 
          src={news.image} 
          alt={news.title} 
          className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
        />
        {showCategory && (
          <div className="absolute top-3 left-3 bg-[#2bcd82] text-white text-xs font-bold px-2 py-1 rounded">
            NEWS
          </div>
        )}
      </div>
      
      {/* Content on the right */}
      <div className="md:w-2/3 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[#fb6a69]">{formatDate(news.date)}</span>
            <span className="text-gray-600">By {news.author}</span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-3">{news.title}</h3>
          <p className="text-gray-600 mb-4 line-clamp-3">{news.summary}</p>
        </div>
        
        <a 
          href={news.readMoreLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-[#2bcd82] hover:text-[#25b975] font-medium transition-colors"
        >
          Read More <ExternalLink className="w-4 h-4 ml-1" />
        </a>
      </div>
    </div>
  );
};

export default EventsNewsPage; 