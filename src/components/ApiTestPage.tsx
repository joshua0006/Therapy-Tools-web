import React, { useEffect, useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import {  fetchEventDetails, Event } from '../lib/woocommerce/events-news';
import { useEventsNews } from '../context/EventsNewsContext';
import { useWooCommerce } from '../context/WooCommerceContext';

const ApiTestPage: React.FC = () => {
  const { events, news, loading: contextLoading } = useEventsNews();
  const { products, categories, loading: wooLoading } = useWooCommerce();
  
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [eventDetails, setEventDetails] = useState<Event | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Fetch event details when selected
  useEffect(() => {
    if (selectedEventId) {
      const getEventDetails = async () => {
        setLoadingDetails(true);
        try {
          const details = await fetchEventDetails(selectedEventId);
          setEventDetails(details);
        } catch (error) {
          console.error('Error fetching event details:', error);
        } finally {
          setLoadingDetails(false);
        }
      };
      
      getEventDetails();
    }
  }, [selectedEventId]);
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-8 text-center">API Data Test Page</h1>
        
        {/* Loading indicators */}
        {(contextLoading || wooLoading) && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            {contextLoading && <p className="text-blue-700">Loading Events & News data...</p>}
            {wooLoading && <p className="text-blue-700">Loading WooCommerce data...</p>}
          </div>
        )}
        
        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Events, News, Products */}
          <div>
            {/* Events data */}
            <div className="mb-10 bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-[#2bcd82] text-white p-4">
                <h2 className="text-xl font-bold">Events Data ({events.length})</h2>
              </div>
              <div className="p-4">
                <div className="mb-4">
                  <select 
                    className="w-full p-2 border rounded-md"
                    onChange={(e) => setSelectedEventId(Number(e.target.value))}
                    value={selectedEventId || ''}
                  >
                    <option value="">Select an event to view details</option>
                    {events.map(event => (
                      <option key={event.id} value={event.id}>{event.title}</option>
                    ))}
                  </select>
                </div>
                
                <div className="max-h-96 overflow-auto">
                  <pre className="text-xs bg-gray-50 p-4 rounded-md whitespace-pre-wrap">
                    {JSON.stringify(events, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
            
            {/* News data */}
            <div className="mb-10 bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-[#fb6a69] text-white p-4">
                <h2 className="text-xl font-bold">News Data ({news.length})</h2>
              </div>
              <div className="p-4">
                <div className="max-h-96 overflow-auto">
                  <pre className="text-xs bg-gray-50 p-4 rounded-md whitespace-pre-wrap">
                    {JSON.stringify(news, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
            
            {/* WooCommerce products data */}
            <div className="mb-10 bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-[#6a75fb] text-white p-4">
                <h2 className="text-xl font-bold">Products Data ({products.length})</h2>
              </div>
              <div className="p-4">
                <div className="max-h-96 overflow-auto">
                  <pre className="text-xs bg-gray-50 p-4 rounded-md whitespace-pre-wrap">
                    {JSON.stringify(products, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column - Event Details, Categories */}
          <div>
            {/* Event details */}
            <div className="mb-10 bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-[#25b975] text-white p-4">
                <h2 className="text-xl font-bold">Event Details</h2>
                {selectedEventId && <p className="text-sm mt-1">ID: {selectedEventId}</p>}
              </div>
              <div className="p-4">
                {loadingDetails ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin w-10 h-10 border-4 border-[#2bcd82] border-t-transparent rounded-full"></div>
                  </div>
                ) : selectedEventId ? (
                  eventDetails ? (
                    <div className="max-h-96 overflow-auto">
                      <pre className="text-xs bg-gray-50 p-4 rounded-md whitespace-pre-wrap">
                        {JSON.stringify(eventDetails, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-12">No details found for this event</p>
                  )
                ) : (
                  <p className="text-center text-gray-500 py-12">Select an event to view details</p>
                )}
              </div>
            </div>
            
            {/* WooCommerce categories data */}
            <div className="mb-10 bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-[#8a6afb] text-white p-4">
                <h2 className="text-xl font-bold">Categories Data ({categories.length})</h2>
              </div>
              <div className="p-4">
                <div className="max-h-96 overflow-auto">
                  <pre className="text-xs bg-gray-50 p-4 rounded-md whitespace-pre-wrap">
                    {JSON.stringify(categories, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
            
            {/* API Endpoint Info */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gray-800 text-white p-4">
                <h2 className="text-xl font-bold">API Endpoints</h2>
              </div>
              <div className="p-4">
                <ul className="list-disc pl-5 space-y-2">
                  <li><code className="bg-gray-100 px-2 py-1 rounded text-sm">/wp-json/wp/v2/events?_embed</code> - Events</li>
                  <li><code className="bg-gray-100 px-2 py-1 rounded text-sm">/wp-json/wp/v2/tribe_events?_embed</code> - Alternative Events</li>
                  <li><code className="bg-gray-100 px-2 py-1 rounded text-sm">/wp-json/wp/v2/posts?_embed</code> - News/Posts</li>
                  <li><code className="bg-gray-100 px-2 py-1 rounded text-sm">/wp-json/wc/v3/products</code> - WooCommerce Products</li>
                  <li><code className="bg-gray-100 px-2 py-1 rounded text-sm">/wp-json/wc/v3/products/categories</code> - WooCommerce Categories</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ApiTestPage; 