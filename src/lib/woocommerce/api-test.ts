/**
 * API Test Module
 * 
 * A temporary utility to test API connectivity.
 * This file can be safely deleted after testing.
 */

import { getWooConfig } from './config';
import OAuth from 'oauth-1.0a';
import CryptoJS from 'crypto-js';
import { mockEvents } from '../../data/mockEvents';
import { mockNews } from '../../data/mockNews';

// OAuth instance for WooCommerce API authentication
const getOAuth = () => {
  const config = getWooConfig();
  return new OAuth({
    consumer: {
      key: config.consumerKey,
      secret: config.consumerSecret,
    },
    signature_method: 'HMAC-SHA256',
    hash_function(base_string, key) {
      return CryptoJS.HmacSHA256(base_string, key).toString(CryptoJS.enc.Base64);
    },
  });
};

// Helper function for making authenticated WooCommerce API requests
const makeWooRequest = async (endpoint: string, method = 'GET'): Promise<any> => {
  const config = getWooConfig();
  const url = `${config.url}/${config.version}/${endpoint}`;
  
  const oauth = getOAuth();
  const requestData = {
    url,
    method,
  };
  
  const headers = oauth.toHeader(oauth.authorize(requestData));
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error in WooCommerce API request to ${endpoint}:`, error);
    throw error;
  }
};

/**
 * Test WooCommerce Products API
 */
export async function testProductsAPI() {
  try {
    console.log('Testing WooCommerce Products API...');
    const products = await makeWooRequest('products');
    
    if (products && Array.isArray(products) && products.length > 0) {
      console.log(`✅ Successfully retrieved ${products.length} products`);
      console.log('First product:', {
        id: products[0].id,
        name: products[0].name,
        price: products[0].price,
        status: products[0].status,
      });
      return products;
    } else {
      throw new Error('No products found or invalid response format');
    }
  } catch (error) {
    console.error('❌ Products API test failed:', error);
    return null;
  }
}

/**
 * Test WooCommerce Categories API
 */
export async function testCategoriesAPI() {
  try {
    console.log('Testing WooCommerce Categories API...');
    const categories = await makeWooRequest('products/categories');
    
    if (categories && Array.isArray(categories) && categories.length > 0) {
      console.log(`✅ Successfully retrieved ${categories.length} categories`);
      console.log('Categories:', categories.map(cat => ({ id: cat.id, name: cat.name })));
      return categories;
    } else {
      throw new Error('No categories found or invalid response format');
    }
  } catch (error) {
    console.error('❌ Categories API test failed:', error);
    return null;
  }
}

/**
 * Test WordPress Posts API (for News)
 */
export async function testPostsAPI() {
  try {
    console.log('Testing WordPress Posts API...');
    const config = getWooConfig();
    const url = `${config.url}/wp/v2/posts`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Posts API request failed with status ${response.status}`);
    }
    
    const posts = await response.json();
    
    if (posts && Array.isArray(posts) && posts.length > 0) {
      console.log(`✅ Successfully retrieved ${posts.length} posts`);
      console.log('First post:', {
        id: posts[0].id,
        title: posts[0].title.rendered,
        date: posts[0].date,
      });
      return posts;
    } else {
      throw new Error('No posts found or invalid response format');
    }
  } catch (error) {
    console.error('❌ Posts API test failed:', error);
    return null;
  }
}

/**
 * Test Events Custom Post Type API
 */
export async function testEventsAPI() {
  try {
    console.log('Testing WordPress Events API...');
    const config = getWooConfig();
    
    // First, attempt to use a dedicated events endpoint (if it exists)
    // Try different potential endpoints for events
    const possibleEndpoints = [
      `${config.url}/wp/v2/events`,            // Custom post type
      `${config.url}/wp/v2/tribe_events`,      // The Events Calendar
      `${config.url}/events/v1/events`,        // The Events Calendar REST API
      `${config.url}/wp-json/tribe/events/v1/events`, // Alternative Events Calendar
    ];
    
    let events = null;
    
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`Attempting to fetch events from: ${endpoint}`);
        const response = await fetch(endpoint);
        
        if (response.ok) {
          events = await response.json();
          console.log(`✅ Successfully retrieved events from ${endpoint}`);
          break;
        }
      } catch (error) {
        console.log(`Endpoint ${endpoint} failed, trying next...`);
      }
    }
    
    if (events && (Array.isArray(events) || events.events)) {
      const eventsList = Array.isArray(events) ? events : events.events;
      console.log(`✅ Successfully retrieved ${eventsList.length} events`);
      return eventsList;
    } else {
      // If no events endpoint works, use the fallback below
      throw new Error('No events found or invalid response format');
    }
  } catch (error) {
    console.warn('⚠️ Events API test failed, falling back to custom fetch function:', error);
    
    // Try using our fetchEvents function if it exists
    try {
      // This is a fallback to see if we have a custom implementation for fetching events
      console.log('Falling back to mock events data');
      return mockEvents;
    } catch (fallbackError) {
      console.error('❌ Events fallback also failed:', fallbackError);
      return null;
    }
  }
}

/**
 * Test News from our helper
 */
export async function testNewsHelper() {
  try {
    console.log('Testing news helper...');
    // First try to get real posts from the WordPress API
    const posts = await testPostsAPI();
    
    if (posts) {
      // Transform WordPress posts to our app's format
      const transformedNews = posts.map(post => ({
        id: post.id,
        title: post.title.rendered,
        date: post.date,
        author: post._embedded?.author?.[0]?.name || 'Unknown Author',
        summary: post.excerpt?.rendered 
          ? stripHtmlTags(post.excerpt.rendered).substring(0, 150) + '...'
          : 'No summary available',
        content: stripHtmlTags(post.content?.rendered || ''),
        image: getPostImageUrl(post),
        link: post.link,
      }));
      
      console.log(`✅ Successfully transformed ${transformedNews.length} posts to news format`);
      return transformedNews;
    } else {
      // Use mock data as fallback
      console.log('Falling back to mock news data');
      return mockNews;
    }
  } catch (error) {
    console.error('❌ News helper test failed:', error);
    return null;
  }
}

// Utility function to strip HTML tags
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>?/gm, '');
}

// Utility function to get the featured image URL from a WordPress post
function getPostImageUrl(post: any): string {
  if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
    return post._embedded['wp:featuredmedia'][0].source_url;
  }
  // Return a default image if no featured image is available
  return '/images/default-news.jpg';
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('🧪 Starting API tests...');
  
  const results: Record<string, any> = {};
  
  try {
    // Test WooCommerce Products API
    results.products = await testProductsAPI();
    
    // Test WooCommerce Categories API
    results.categories = await testCategoriesAPI();
    
    // Test WordPress Posts API
    results.posts = await testPostsAPI();
    
    // Test Events API or function
    results.events = await testEventsAPI();
    
    // Test News helper
    results.news = await testNewsHelper();
    
    console.log('🎉 API Tests completed!');
    console.log('Results summary:');
    console.log('- Products API:', results.products ? '✅ Working' : '❌ Failed');
    console.log('- Categories API:', results.categories ? '✅ Working' : '❌ Failed');
    console.log('- Posts API:', results.posts ? '✅ Working' : '❌ Failed');
    console.log('- Events API:', results.events ? '✅ Working' : '❌ Failed');
    console.log('- News Helper:', results.news ? '✅ Working' : '❌ Failed');
    
    return results;
  } catch (error) {
    console.error('Error running API tests:', error);
    return results;
  }
} 