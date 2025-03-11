import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Button from './Button';
import { BookOpen, Users, GraduationCap, Award, Download, ShoppingBag, ChevronLeft, ChevronRight, Clock, MapPin, ExternalLink, Tag, FileText, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEventsNews } from '../context/EventsNewsContext';
import { formatDate } from '../utils/formatters';
import { getFeaturedProducts } from '../lib/firebase/firestore';

// Add type definition for Product with categories
interface Product {
  id: string | number;
  name: string;
  description?: string;
  price?: number | string;
  thumbnail?: string;
  image?: string; // Used as a fallback for thumbnail
  category?: string;
  categories?: Array<string | Category>;
  downloads?: Array<{
    id: string;
    name: string;
    file: string;
    [key: string]: any;
  }>;
  fileUrl?: string; // PDF URL
  pdfUrl?: string; // Alternative PDF URL
  [key: string]: any;
}

// Category object structure
interface Category {
  id: string | number;
  name: string;
  slug?: string;
  [key: string]: any;
}

// Skeleton Loaders
const CarouselSkeleton = () => (
  <div className="bg-gray-100 animate-pulse rounded-lg h-full w-full">
    <div className="h-full w-full flex items-center justify-center">
      <div className="text-gray-400">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2bcd82]"></div>
      </div>
    </div>
  </div>
);

// Helper function to check if text contains HTML
const containsHtml = (text: string): boolean => {
  if (!text) return false;
  const regex = /<\/?[a-z][\s\S]*>/i;
  return regex.test(text);
};

// Function to check if product has PDF files
const hasPdfFiles = (product: Product): boolean => {
  // Check downloads array
  if (product.downloads && product.downloads.length > 0) {
    const pdfDownloads = product.downloads.filter(download => 
      download.file && download.file.toLowerCase().endsWith('.pdf')
    );
    if (pdfDownloads.length > 0) return true;
  }
  
  // Check direct PDF URL
  if (product.pdfUrl && product.pdfUrl.toLowerCase().endsWith('.pdf')) {
    return true;
  }
  
  // Check fileUrl
  if (product.fileUrl && product.fileUrl.toLowerCase().endsWith('.pdf')) {
    return true;
  }
  
  return false;
};

// Function to get PDF count
const getPdfCount = (product: Product): number => {
  let count = 0;
  
  // Count PDFs in downloads array
  if (product.downloads && product.downloads.length > 0) {
    const pdfDownloads = product.downloads.filter(download => 
      download.file && download.file.toLowerCase().endsWith('.pdf')
    );
    count += pdfDownloads.length;
  }
  
  // Add direct PDF URL if available
  if (product.pdfUrl && product.pdfUrl.toLowerCase().endsWith('.pdf')) {
    count += 1;
  }
  
  // Add fileUrl if available and not already counted
  if (product.fileUrl && product.fileUrl.toLowerCase().endsWith('.pdf') && product.fileUrl !== product.pdfUrl) {
    count += 1;
  }
  
  return count;
};

const HomePage: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  
  const { 
    news,
    events,
    featuredEvent,
    featuredNews, 
    loading: eventsNewsLoading 
  } = useEventsNews();
  
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  
  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Use news for the carousel instead of products
  const carouselNews = news.slice(0, 4);

  // Fetch featured products from Firebase
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        const products = await getFeaturedProducts(3); // Fetch 3 featured products
        setFeaturedProducts(products);
        console.log('Loaded featured products from Firebase:', products);
      } catch (error) {
        console.error('Error loading featured products:', error);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Mark page as loaded once data is ready
  useEffect(() => {
    if (!productsLoading && !eventsNewsLoading) {
      // Add a small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setIsPageLoaded(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [productsLoading, eventsNewsLoading]);

  // Auto-rotate carousel
  useEffect(() => {
    if (!isPageLoaded) return;
    
    const interval = setInterval(() => {
      if (carouselNews.length > 0) {
        setCurrentSlide((prev) => (prev + 1) % carouselNews.length);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [carouselNews.length, isPageLoaded]);

  // Manual navigation
  const prevSlide = () => {
    if (carouselNews.length > 0) {
      setCurrentSlide((prev) => (prev === 0 ? carouselNews.length - 1 : prev - 1));
    }
  };

  const nextSlide = () => {
    if (carouselNews.length > 0) {
      setCurrentSlide((prev) => (prev + 1) % carouselNews.length);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section - Improved for mobile */}
      <div className="bg-gradient-to-r from-[#2bcd82]/10 to-white min-h-[90vh] md:min-h-screen flex flex-col justify-between">
        <div className="container mx-auto px-4 sm:px-6 py-8 md:py-12 flex-grow flex items-center">
          <div className="flex flex-col md:flex-row items-center w-full gap-8 md:gap-4">
            <div className="md:w-1/2 mb-6 md:mb-0 pr-0 md:pr-8">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-4 md:mb-6">
                Speech Pathology <span className="text-[#2bcd82]">Resources</span> for SLPs
              </h1>
              <p className="text-base sm:text-lg text-gray-600 mb-6 md:mb-8">
                Discover premium activities, worksheets, and assessments designed by speech-language pathologists for speech-language pathologists.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                {isLoggedIn ? (
                  <Button 
                    variant="primary" 
                    size="large"
                    onClick={() => navigate('/catalog')}
                    className="w-full sm:w-auto"
                  >
                    Browse Catalogs
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="primary" 
                      size="large"
                      onClick={() => navigate('/plans')}
                      className="w-full sm:w-auto"
                    >
                      View Membership
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="large"
                      onClick={() => navigate('/catalog')}
                      className="w-full sm:w-auto"
                    >
                      Browse Catalog
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="md:w-1/2 w-full flex justify-center">
              {/* News Carousel - Enhanced for mobile */}
              <div className="relative w-full">
                <div className="rounded-lg overflow-hidden shadow-xl h-[250px] sm:h-[300px] md:h-[350px] lg:h-[28rem] w-full relative">
                  {eventsNewsLoading ? (
                    <CarouselSkeleton />
                  ) : (
                    carouselNews.map((newsItem, index) => (
                      <div 
                        key={newsItem.id}
                        className={`absolute inset-0 transition-opacity duration-1000 ${
                          index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                        }`}
                      >
                        <img 
                          src={newsItem.image || "https://images.unsplash.com/photo-1512758017271-d7b84c2113f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"} 
                          alt={newsItem.title} 
                          className="w-full h-full object-cover"
                        />
                        {/* News Info Overlay - Better for small screens */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 sm:p-6 text-white">
                          <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-[#2bcd82]/20 text-white mb-1 sm:mb-2 inline-block">
                            News
                          </span>
                          <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2 line-clamp-2">{newsItem.title}</h3>
                          <p className="text-xs sm:text-sm mb-2 sm:mb-4 line-clamp-2">{newsItem.summary}</p>
                          <a 
                            href={newsItem.readMoreLink}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-block bg-[#2bcd82] hover:bg-[#25b975] text-white font-medium py-1 px-3 sm:py-2 sm:px-4 text-sm rounded transition-colors relative z-20 cursor-pointer"
                          >
                            Read More
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                  
                  {/* Carousel Controls - More touch-friendly */}
                  <div className="absolute inset-0 flex items-center justify-between p-2 sm:p-4 z-30 pointer-events-none">
                    <button 
                      onClick={prevSlide}
                      className="p-2 sm:p-3 rounded-full bg-white/40 hover:bg-white/70 transition-colors text-gray-800 pointer-events-auto"
                      aria-label="Previous slide"
                    >
                      <ChevronLeft className="w-5 h-5 sm:w-7 sm:h-7" />
                    </button>
                    <button 
                      onClick={nextSlide}
                      className="p-2 sm:p-3 rounded-full bg-white/40 hover:bg-white/70 transition-colors text-gray-800 pointer-events-auto"
                      aria-label="Next slide"
                    >
                      <ChevronRight className="w-5 h-5 sm:w-7 sm:h-7" />
                    </button>
                  </div>
                  
                  {/* Carousel Indicators - Better positioning for mobile */}
                  <div className="absolute bottom-16 sm:bottom-20 md:bottom-24 left-0 right-0 flex justify-center space-x-2 z-30">
                    {carouselNews.map((_, index) => (
                      <button
                        key={index}
                        className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                          index === currentSlide ? 'bg-[#2bcd82]' : 'bg-white/40'
                        }`}
                        onClick={() => setCurrentSlide(index)}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Highlight Bar - Responsive improvements */}
        <div id="highlight-bar" className="w-full bg-[#2bcd82] text-white py-6 sm:py-8">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 text-center">
              <div className="flex flex-col items-center">
                <Award className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 mb-3 md:mb-4" />
                <h3 className="text-xl sm:text-2xl font-bold">Quality Catalogs</h3>
                <p className="text-base sm:text-lg">Expertly designed by SLPs for SLPs</p>
              </div>
              <div className="flex flex-col items-center">
                <Download className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 mb-3 md:mb-4" />
                <h3 className="text-xl sm:text-2xl font-bold">Instant Access</h3>
                <p className="text-base sm:text-lg">Unlock all resources with your subscription</p>
              </div>
              <div className="flex flex-col items-center">
                <ShoppingBag className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 mb-3 md:mb-4" />
                <h3 className="text-xl sm:text-2xl font-bold">Membership Benefits</h3>
                <p className="text-base sm:text-lg">Unlimited access to our complete library</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Products - Responsive grid improvements */}
      <div className="py-10 sm:py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-2">
            Featured <span className="text-[#fb6a69]">Catalogs</span>
          </h2>
          <p className="text-center text-gray-600 max-w-3xl mx-auto mb-8 sm:mb-12 px-4">
            Browse our collection of high-quality speech therapy resources
          </p>
          
          {/* Featured Products Section */}
          <section className="bg-white rounded-lg p-4 sm:p-6 md:p-8">
            {productsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                {[...Array(3)].map((_, idx) => (
                  <div key={idx} className="bg-white rounded-lg overflow-hidden shadow-md h-[340px] sm:h-[380px] md:h-96">
                    <div className="h-36 sm:h-40 md:h-48 bg-gray-200 animate-pulse"></div>
                    <div className="p-4 sm:p-5">
                      <div className="h-5 sm:h-6 bg-gray-200 rounded animate-pulse mb-3 sm:mb-4"></div>
                      <div className="h-20 sm:h-24 bg-gray-100 rounded animate-pulse mb-3 sm:mb-4"></div>
                      <div className="h-8 sm:h-10 w-28 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : featuredProducts.length === 0 ? (
              <div className="text-center py-8 sm:py-10">
                <div className="mb-4">
                  <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-400" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">No Featured Catalogs Found</h3>
                <p className="text-gray-500 mb-4 sm:mb-6 px-4">We couldn't find any featured catalogs at the moment.</p>
                <Button 
                  variant="primary" 
                  size="medium"
                  onClick={() => navigate('/catalog')}
                >
                  Browse All Catalogs
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                {featuredProducts.map((product) => (
                  <div 
                    key={product.id} 
                    className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:transform hover:scale-[1.02] flex flex-col h-full border border-gray-100"
                    onClick={() => navigate(`/catalog/${product.id}`)}
                  >
                    <div className="h-36 sm:h-40 md:h-48 overflow-hidden relative">
                      <img 
                        src={(product as any).thumbnail || (product as any).image || "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"} 
                        alt={product.name} 
                        className="w-full h-full object-cover transition-transform hover:scale-105"
                      />
                      
                      {/* Subscription Badge - Adjusted sizing */}
                      <div className="absolute top-0 right-0 bg-[#2bcd82] text-white px-2 sm:px-3 py-1 rounded-bl-lg text-xs sm:text-sm font-bold flex items-center">
                        <Tag className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        INCLUDED
                      </div>
                      
                      {/* Featured Tag - Adjusted for better visibility */}
                      {(product as any).featured && (
                        <div className="absolute bottom-0 left-0 bg-[#fb6a69] text-white px-2 sm:px-3 py-1 rounded-tr-lg text-xs sm:text-sm font-bold">
                          FEATURED
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 sm:p-5 flex flex-col flex-grow">
                      <div className="h-12 sm:h-14 mb-2 flex flex-col justify-center">
                        <h3 
                          className="text-base sm:text-lg font-bold text-gray-800 hover:text-[#2bcd82] transition-colors line-clamp-2 leading-tight"
                          title={product.name}
                        >
                          {product.name}
                        </h3>
                      </div>
                      
                      {/* Category Tags - Improved spacing */}
                      <div className="flex flex-wrap gap-1 mb-2 sm:mb-3">
                        {((product as any).categories && Array.isArray((product as any).categories) && (product as any).categories.length > 0) ? (
                          (product as any).categories.map((cat: any, idx: number) => (
                            <span 
                              key={idx} 
                              className="text-xs px-2 py-0.5 sm:py-1 bg-blue-50 text-blue-700 rounded-full shadow-sm"
                            >
                              {typeof cat === 'object' && cat !== null && 'name' in cat ? cat.name : cat}
                            </span>
                          ))
                        ) : product.category ? (
                          <span className="text-xs px-2 py-0.5 sm:py-1 bg-blue-50 text-blue-700 rounded-full shadow-sm">
                            {product.category}
                          </span>
                        ) : null}
                      </div>
                      
                      <div className="text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm flex-grow">
                        {product.description ? (
                          <>
                            {containsHtml(product.description) ? (
                              <div 
                                className="line-clamp-3 prose prose-sm max-w-none prose-p:my-1 prose-headings:my-1" 
                                dangerouslySetInnerHTML={{ 
                                  __html: product.description.length > 150 
                                    ? product.description.substring(0, 150) + '...' 
                                    : product.description 
                                }} 
                              />
                            ) : (
                              <p className="line-clamp-3">
                                {product.description.length > 120 
                                  ? product.description.substring(0, 120) + '...' 
                                  : product.description}
                              </p>
                            )}
                            {product.description.length > (containsHtml(product.description) ? 150 : 120) && (
                              <span className="text-blue-500 text-xs font-medium mt-1 inline-block">
                                Read more
                              </span>
                            )}
                          </>
                        ) : (
                          <p className="text-gray-400 italic">No description available</p>
                        )}
                      </div>
                      
                      <div className="mt-auto">
                        <button 
                          className="w-full sm:w-auto text-white bg-[#2bcd82] flex items-center justify-center gap-2 hover:bg-[#25b975] p-2 rounded-lg transition-colors text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/catalog/${product.id}`);
                          }}
                        >
                          {getPdfCount(product) > 1 ? (
                            <>
                              <FileText className="w-4 h-4" />
                              View {getPdfCount(product)} PDFs
                            </>
                          ) : hasPdfFiles(product) ? (
                            <>
                              <FileText className="w-4 h-4" />
                              View PDF
                            </>
                          ) : (
                            <>View Details</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          
          <div className="text-center mt-8 sm:mt-10">
            <Button 
              variant="secondary" 
              size="large"
              onClick={() => navigate('/catalog')}
              className="w-full sm:w-auto"
            >
              Browse All Catalogs
            </Button>
          </div>
        </div>
      </div>

      {/* Featured Section - Events & News - Responsive improvements */}
      <section className="py-10 sm:py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3 sm:mb-4">Stay Connected</h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto px-2">
              Keep up with the latest events, workshops, and news in the speech pathology community.
            </p>
          </div>
          
          {eventsNewsLoading ? (
            <div className="flex justify-center items-center py-10 sm:py-12">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-[#2bcd82]"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Events Card - Better on mobile */}
              {featuredEvent && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
                  <div className="md:flex h-full">
                    <div className="w-full md:w-1/4 h-48 md:h-auto md:max-w-[220px]">
                      <img 
                        src={featuredEvent.image || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"} 
                        alt={featuredEvent.title} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4 sm:p-6 md:w-3/4 flex flex-col h-full relative">
                      <div className="flex justify-between items-start mb-2">
                        <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-[#2bcd82]/10 text-[#2bcd82]">
                          Event
                        </span>
                        <span className="text-gray-500 text-xs sm:text-sm">{formatDate(featuredEvent.date)}</span>
                      </div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-2">{featuredEvent.title}</h2>
                      <div className="flex items-center text-gray-600 mb-1 text-sm">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>{featuredEvent.time}</span>
                      </div>
                      <div className="flex items-center text-gray-600 mb-3 sm:mb-4 text-sm">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span>{featuredEvent.location}</span>
                      </div>
                      <p className="text-gray-600 mb-4 line-clamp-2 text-sm">{featuredEvent.description}</p>
                      <div className="mt-auto flex justify-end">
                        <a 
                          href={featuredEvent.registrationLink}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center bg-[#2bcd82] text-white hover:bg-[#25b975] font-medium py-1 sm:py-2 px-3 sm:px-4 rounded text-sm"
                        >
                          Register Now <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* News Card - Better on mobile */}
              {featuredNews && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
                  <div className="md:flex h-full">
                    <div className="w-full md:w-1/4 h-48 md:h-auto md:max-w-[220px]">
                      <img 
                        src={featuredNews.image || "https://images.unsplash.com/photo-1551966775-a4ddc8df052b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"} 
                        alt={featuredNews.title} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4 sm:p-6 md:w-3/4 flex flex-col h-full relative">
                      <div className="flex justify-between items-start mb-2">
                        <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-[#fb6a69]/10 text-[#fb6a69]">
                          News
                        </span>
                        <span className="text-gray-500 text-xs sm:text-sm">{formatDate(featuredNews.date)}</span>
                      </div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-2">{featuredNews.title}</h2>
                      <div className="flex items-center text-gray-600 mb-3 sm:mb-4 text-sm">
                        <span className="font-medium">By: {featuredNews.author}</span>
                      </div>
                      <p className="text-gray-600 mb-4 line-clamp-2 text-sm">{featuredNews.summary}</p>
                      <div className="mt-auto flex justify-end">
                        <a 
                          href={featuredNews.readMoreLink}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center bg-[#fb6a69] text-white hover:bg-[#f5514f] font-medium py-1 sm:py-2 px-3 sm:px-4 rounded text-sm"
                        >
                          Read Full Article <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="text-center mt-8 sm:mt-10">
            <Button 
              variant="primary" 
              size="large"
              onClick={() => navigate('/events-news')}
              className="w-full sm:w-auto"
            >
              Explore All Events & News
            </Button>
          </div>
        </div>
      </section>

      {/* Member Benefits - Responsive improvements */}
      <div className="py-10 sm:py-12 md:py-16 bg-gray-100">
        <div className="container mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-3 sm:mb-4">
            Why Join Our <span className="text-[#fb6a69]">Membership</span>?
          </h2>
          <p className="text-center text-gray-600 max-w-3xl mx-auto mb-8 sm:mb-12 px-2">
            Save time and money with unlimited access to our growing library of premium speech therapy catalogs.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                title: "Professional Catalogs",
                description: "Access our extensive library of worksheets, activities, and evidence-based materials.",
                icon: <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-[#2bcd82]" />
              },
              {
                title: "Community Support",
                description: "Connect with fellow speech pathologists to share ideas and get support.",
                icon: <Users className="w-8 h-8 sm:w-10 sm:h-10 text-[#2bcd82]" />
              },
              {
                title: "Continuing Education",
                description: "Stay updated with the latest research and techniques in speech pathology.",
                icon: <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10 text-[#2bcd82]" />
              }
            ].map((benefit, index) => (
              <div key={index} className="bg-white p-6 sm:p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-100">
                <div className="mb-3 sm:mb-4">{benefit.icon}</div>
                <h3 className="text-lg sm:text-xl font-bold text-[#2bcd82] mb-2 sm:mb-3">{benefit.title}</h3>
                <p className="text-gray-600 text-sm sm:text-base">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials - Responsive improvements */}
      <div className="bg-gradient-to-br from-[#fb6a69]/5 to-[#2bcd82]/5 py-12 sm:py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-gray-800 mb-3 sm:mb-4">
            What Our <span className="text-[#2bcd82]">Members</span> Say
          </h2>
          <p className="text-center text-gray-600 max-w-3xl mx-auto mb-10 sm:mb-12 md:mb-16 px-2">
            Hear from speech-language pathologists who have transformed their practice with our resources
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-10">
            {[
              {
                quote: "The resources and community have transformed my practice. I'm more confident and effective as a speech pathologist.",
                author: "Sarah Johnson, SLP",
                role: "Pediatric Specialist",
                image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80"
              },
              {
                quote: "I've found innovative approaches and supportive colleagues. The membership has been invaluable for my professional growth.",
                author: "Michael Torres, SLP",
                role: "School-Based Therapist",
                image: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80"
              },
              {
                quote: "Access to quality resources saves me hours of preparation time every week. Well worth the membership fee!",
                author: "Jennifer Smith, SLP",
                role: "Private Practice Owner",
                image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80"
              }
            ].map((testimonial, index) => (
              <div key={index} className="flex flex-col h-full">
                {/* Quote Card */}
                <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg mb-6 sm:mb-10 flex-grow relative">
                  {/* Large quotation mark */}
                  <div className="absolute -top-5 -left-2 text-[80px] sm:text-[120px] leading-none text-[#2bcd82]/10 font-serif">
                    "
                  </div>
                  <p className="text-gray-700 text-base sm:text-lg relative z-10 mb-4 sm:mb-6">"{testimonial.quote}"</p>
                  <div className="h-4 w-4 bg-white absolute -bottom-2 left-10 transform rotate-45 shadow-b"></div>
                </div>
                
                {/* Author Info */}
                <div className="flex items-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden mr-3 sm:mr-4 border-2 border-[#2bcd82] shadow-md">
                    <img 
                      src={testimonial.image} 
                      alt={testimonial.author} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-[#2bcd82] text-sm sm:text-base">{testimonial.author}</p>
                    <p className="text-gray-600 text-xs sm:text-sm">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-10 sm:mt-16">
            <Button 
              variant="primary" 
              size="large"
              onClick={() => navigate('/plans')}
              className="w-full sm:w-auto"
            >
              Join Our Community
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default HomePage; 