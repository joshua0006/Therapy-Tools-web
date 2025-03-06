import React, { useEffect, useState } from 'react';
import { runAllTests } from '../lib/woocommerce/api-test';
import Header from './Header';
import Footer from './Footer';

const ApiTestPage: React.FC = () => {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const testResults = await runAllTests();
        setResults(testResults);
      } catch (err) {
        console.error('Error running tests:', err);
        setError('An error occurred while running API tests');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">API Test Results</h1>
          <p className="text-gray-600">
            This page tests connectivity to the various APIs used by the application.
          </p>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#2bcd82]"></div>
            <span className="ml-4 text-lg text-gray-700">Running API tests...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && results && (
          <div className="space-y-8">
            {/* WooCommerce Products */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                WooCommerce Products 
                <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                  results.products ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {results.products ? 'Working' : 'Failed'}
                </span>
              </h2>
              
              {results.products ? (
                <div>
                  <p className="text-gray-600 mb-4">Successfully retrieved {results.products.length} products.</p>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {results.products.map((product: any) => (
                          <tr key={product.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${parseFloat(product.price).toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                product.status === 'publish' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {product.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-red-600">Failed to retrieve products.</p>
              )}
            </div>

            {/* WooCommerce Categories */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                WooCommerce Categories
                <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                  results.categories ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {results.categories ? 'Working' : 'Failed'}
                </span>
              </h2>
              
              {results.categories ? (
                <div>
                  <p className="text-gray-600 mb-4">Successfully retrieved {results.categories.length} categories.</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {results.categories.map((category: any) => (
                      <span key={category.id} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                        {category.name} (ID: {category.id})
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-red-600">Failed to retrieve categories.</p>
              )}
            </div>

            {/* WordPress Posts */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                WordPress Posts (News)
                <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                  results.posts ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {results.posts ? 'Working' : 'Failed'}
                </span>
              </h2>
              
              {results.posts ? (
                <div>
                  <p className="text-gray-600 mb-4">Successfully retrieved {results.posts.length} posts.</p>
                  
                  <div className="space-y-4">
                    {results.posts.map((post: any) => (
                      <div key={post.id} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-medium text-[#fb6a69]" dangerouslySetInnerHTML={{__html: post.title.rendered}}></h3>
                        <p className="text-sm text-gray-500">Date: {new Date(post.date).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-red-600">Failed to retrieve posts. Using fallback data.</p>
              )}
            </div>

            {/* WordPress Events */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                WordPress Events
                <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                  results.events ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {results.events ? 'Working' : 'Failed'}
                </span>
              </h2>
              
              {results.events ? (
                <div>
                  <p className="text-gray-600 mb-4">
                    {Array.isArray(results.events) 
                      ? `Successfully retrieved ${results.events.length} events.` 
                      : 'Using fallback data for events.'}
                  </p>
                  
                  <div className="space-y-4">
                    {results.events.map((event: any) => (
                      <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-medium text-[#2bcd82]">{event.title}</h3>
                        <p className="text-sm text-gray-500">Date: {new Date(event.date).toLocaleDateString()}</p>
                        {event.location && (
                          <p className="text-sm text-gray-600">Location: {event.location}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-red-600">Failed to retrieve events. Using fallback data.</p>
              )}
            </div>

            {/* News Helper */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                News Helper
                <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                  results.news ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {results.news ? 'Working' : 'Failed'}
                </span>
              </h2>
              
              {results.news ? (
                <div>
                  <p className="text-gray-600 mb-4">
                    Retrieved {results.news.length} news items (might be using fallback data).
                  </p>
                  
                  <div className="space-y-4">
                    {results.news.map((newsItem: any) => (
                      <div key={newsItem.id} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-medium text-[#fb6a69]">{newsItem.title}</h3>
                        <p className="text-sm text-gray-500">Date: {new Date(newsItem.date).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-600">By: {newsItem.author}</p>
                        <p className="text-gray-600 mt-2">{newsItem.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-red-600">News helper failed.</p>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ApiTestPage; 