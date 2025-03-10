import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { Search, Filter, Grid, Loader, Tag, FileText, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { app } from '../lib/firebase'; // Import the Firebase app directly

// Sample products data to use when Firebase access fails
const SAMPLE_PRODUCTS = [
  {
    id: "1",
    name: "Speech Sound Handbook",
    description: "Comprehensive guide for speech-language pathologists working with children who have phonological disorders.",
    price: 29.99,
    thumbnail: "https://adventuresinspeechpathology.com/wp-content/uploads/2024/09/Ch-1-Sound-Handbook-AISP.pdf",
    category: "Guides"
  },
  {
    id: "2",
    name: "Language Therapy Worksheets",
    description: "A collection of worksheets for improving language skills in school-aged children.",
    price: 19.99,
    thumbnail: "",
    category: "Worksheets"
  },
  {
    id: "3",
    name: "Fluency Assessment Tools",
    description: "Tools and resources for assessing and treating fluency disorders.",
    price: 24.99,
    thumbnail: "",
    category: "Assessment"
  }
];

// More flexible interface for Firebase products to handle various field structures
interface FirebaseProduct {
  id: string;
  name?: string;
  title?: string; // Alternative field for name
  description?: string;
  price?: number | string;
  thumbnail?: string;
  category?: string; // For backward compatibility
  categories?: Array<string | Category>; // Array of category names or Category objects
  downloads?: Array<{
    id: string;
    name: string;
    file: string;
  }>;
  images?: Array<{ src: string }>;
  image?: string; // Alternative field for thumbnail
  fileUrl?: string; // PDF URL
  pdfUrl?: string; // Alternative PDF URL
  [key: string]: any; // Allow any additional fields
}

// Category object structure that matches what's coming from Firebase
interface Category {
  id: string | number;
  name: string;
  slug?: string;
  [key: string]: any;
}

// Add a helper function to safely check if text contains HTML
const containsHtml = (text: string): boolean => {
  return /<\/?[a-z][\s\S]*>/i.test(text);
};

const CatalogPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Initialize state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [products, setProducts] = useState<FirebaseProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9); // Number of products per page
  
  // Parse URL parameters for category filter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const categoryParam = params.get('category');
    
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
    
    // Scroll to top when category changes
    window.scrollTo(0, 0);
  }, [location.search]);
  
  // Create Firestore instance directly
  const db = getFirestore(app);
  
  // Fetch products from Firebase
  useEffect(() => {
    const fetchProducts = async () => {
      if (!db) {
        setError('Firebase Firestore instance not found. Please check your configuration.');
        loadSampleProducts();
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('Fetching products from Firebase...');
        
        // Get products collection
        const productsRef = collection(db, 'products');
        
        try {
          const productsSnapshot = await getDocs(productsRef);
          
          if (productsSnapshot.empty) {
            console.log('No products found in the collection');
            setError('No products found in the database.');
            loadSampleProducts();
            return;
          } else {
            console.log(`Found ${productsSnapshot.size} products`);
          }
          
          const loadedProducts: FirebaseProduct[] = [];
          const categorySet = new Set<string>();
          const categoryMap: Record<string, string> = {}; // Map category IDs to names
          
          productsSnapshot.forEach((doc) => {
            const data = doc.data();
            console.log(`Product data for ${doc.id}:`, data);
            
            // Extract price, handling various formats
            let productPrice = 0;
            if (typeof data.price === 'number') {
              productPrice = data.price;
            } else if (typeof data.price === 'string') {
              // Remove currency symbols and convert to number
              productPrice = parseFloat(data.price.replace(/[^0-9.-]+/g, '')) || 0;
            }
            
            const product: FirebaseProduct = {
              id: doc.id,
              name: data.name || data.title || 'Unnamed Product',
              description: data.description || data.content || '',
              price: productPrice,
              thumbnail: data.thumbnail || data.image || data.images?.[0]?.src || '',
              category: data.category || data.productCategory || 'Uncategorized',
              categories: Array.isArray(data.categories) ? data.categories : 
                (data.category ? [data.category] : ['Uncategorized']),
              downloads: data.downloads || [],
              pdfUrl: data.pdfUrl || data.fileUrl || '',
              // Include all original data
              ...data
            };
            
            loadedProducts.push(product);
            
            // Add category to set and map
            // First check if categories array contains objects with name properties
            if (product.categories && Array.isArray(product.categories)) {
              product.categories.forEach(cat => {
                if (typeof cat === 'object' && cat !== null && 'name' in cat) {
                  categorySet.add(cat.name);
                  categoryMap[cat.name] = cat.name;
                } else if (typeof cat === 'string') {
                  categorySet.add(cat);
                  categoryMap[cat] = cat;
                }
              });
            }
            
            // Fallback to single category field if no categories were added
            if ((!product.categories || product.categories.length === 0) && product.category) {
              const category = product.category || 'Uncategorized';
              categorySet.add(category);
              categoryMap[category] = category;
            }
          });
          
          // Convert category set to array of objects
          const categoryList: Category[] = Array.from(categorySet).map(categoryId => ({
            id: categoryId,
            name: categoryMap[categoryId] || categoryId
          }));
          
          setProducts(loadedProducts);
          setCategories(categoryList);
          setUsingMockData(false);
          setLoading(false);
        } catch (firestoreError: unknown) {
          console.error('Firebase error:', firestoreError);
          
          // Check if it's a permission error
          const errorMessage = String(firestoreError);
          if (errorMessage.includes('permission') || 
              errorMessage.includes('insufficient')) {
            setError(`Firebase permissions error: You do not have access to the products collection. Please contact your administrator or update your Firebase security rules.`);
            
            // Load sample products as fallback
            loadSampleProducts();
          } else {
            setError('Failed to load products: ' + errorMessage);
            loadSampleProducts();
          }
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products from Firebase. ' + (err instanceof Error ? err.message : ''));
        loadSampleProducts();
      }
    };
    
    // Helper function to load sample products when Firebase fails
    const loadSampleProducts = () => {
      console.log('Loading sample products as fallback');
      
      const sampleData = SAMPLE_PRODUCTS.map(product => ({
        ...product,
        id: product.id.toString()
      }));
      
      // Extract categories from sample data
      const categorySet = new Set<string>();
      sampleData.forEach(product => {
        if (product.category) {
          categorySet.add(product.category);
        }
      });
      
      const categoryList: Category[] = Array.from(categorySet).map(category => ({
        id: category,
        name: category
      }));
      
      setProducts(sampleData);
      setCategories(categoryList);
      setUsingMockData(true);
      setLoading(false);
    };
    
    fetchProducts();
  }, [db]);
  
  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    if (!products.length) return [];
    
    return products.filter(product => {
      // Apply search filter
      const matchesSearch = searchQuery
        ? (product.name && product.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;
      
      // Apply category filter
      const matchesCategory = selectedCategory === 'all' ? true : (
        // Check if product.categories contains a category with matching name
        (product.categories && Array.isArray(product.categories) && product.categories.some(cat => {
          // If cat is an object with name property
          if (typeof cat === 'object' && cat !== null && 'name' in cat) {
            return cat.name === selectedCategory || cat.id === selectedCategory;
          }
          // If cat is a string
          return cat === selectedCategory;
        })) ||
        // Fallback to single category field
        product.category === selectedCategory
      );
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);
  
  // Calculate total pages
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  
  // Get current page products
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredProducts.slice(startIndex, startIndex + pageSize);
  }, [filteredProducts, currentPage, pageSize]);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);
  
  // Handle page change
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  // Helper to get product price regardless of format - keeping for reference but we don't use it anymore
  // const getProductPrice = (product: FirebaseProduct): number => {
  //   if (typeof product.price === 'number') {
  //     return product.price;
  //   } else if (typeof product.price === 'string') {
  //     return parseFloat(product.price) || 0;
  //   }
  //   return 0;
  // };

  // Check if product has PDFs
  const hasPdfFiles = (product: FirebaseProduct): boolean => {
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

  // After the hasPdfFiles function, add a new function to get PDF count
  const getPdfCount = (product: FirebaseProduct): number => {
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-12 bg-white rounded-2xl p-8 shadow-sm">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#2bcd82] to-[#25b975]">Resource Catalog</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Browse our collection of speech therapy resources, worksheets, and materials designed by experienced SLPs.
            <span className="block mt-2 font-medium text-[#2bcd82]">All resources are included with your subscription!</span>
          </p>
          <div className="mt-6 max-w-sm mx-auto h-1 bg-gradient-to-r from-[#2bcd82] to-transparent rounded-full"></div>
        </div>
        
        {/* Mock Data Warning */}
        {usingMockData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertCircle className="text-yellow-500 mr-2" />
              <p className="text-yellow-700 font-medium">Using Sample Data</p>
            </div>
            <p className="text-yellow-600 text-sm">
              Unable to access the Firebase database due to permission issues. Displaying sample products instead.
            </p>
          </div>
        )}
        
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm mb-8 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="text-gray-500 w-5 h-5" />
              <select
                value={selectedCategory}
                onChange={(e) => {
                  const category = e.target.value;
                  setSelectedCategory(category);
                  
                  // Update URL with the new category parameter
                  const params = new URLSearchParams(location.search);
                  if (category === 'all') {
                    params.delete('category');
                  } else {
                    params.set('category', category);
                  }
                  
                  // Replace the current URL to avoid adding to history stack
                  navigate(`${location.pathname}?${params.toString()}`, { replace: true });
                }}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
              >
                <option value="all">All Categories</option>
                {categories.map((category: Category) => (
                  <option key={category.id} value={category.name}>{category.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center">
              <button 
                className="p-2 rounded-lg bg-[#2bcd82] text-white"
                disabled
              >
                <Grid size={20} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm">
            <div className="relative mb-8">
              <Loader className="w-16 h-16 text-[#2bcd82] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 bg-white rounded-full"></div>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Loading Resources</h3>
            <p className="text-gray-600 text-lg max-w-md text-center">Fetching the latest therapy resources from our catalog...</p>
          </div>
        )}
        
        {/* Error State - only show if not using mock data */}
        {error && !usingMockData && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 mb-2 text-lg font-medium">Failed to load resources</p>
            <p className="text-red-500">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
        
        {/* No Results */}
        {!loading && !error && filteredProducts.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-xl font-medium">No resources found</p>
            <p className="text-gray-400 mt-2">Try adjusting your search or filters</p>
          </div>
        )}
        
        {/* Grid View */}
        {!loading && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedProducts.map((product: FirebaseProduct) => (
              <div onClick={() => navigate(`/catalog/${product.id}`)} key={product.id} className="bg-white cursor-pointer rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full border border-gray-100">
                <div className="relative h-48 overflow-hidden bg-gray-100">
                  {product.thumbnail ? (
                    <img 
                      src={product.thumbnail} 
                      alt={product.name || 'Product'} 
                      className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-200">
                      <p className="text-gray-400">No image</p>
                    </div>
                  )}
                  
                  {/* PDF Indicator */}
                  {hasPdfFiles(product) && (
                    <div className="absolute top-0 left-0 bg-blue-500 text-white px-3 py-1 rounded-br-lg text-sm font-bold flex items-center">
                      <FileText className="w-4 h-4 mr-1" />
                      {getPdfCount(product) > 1 ? `${getPdfCount(product)} PDFs` : "PDF"}
                    </div>
                  )}
                  
                 
                </div>
                
                <div className="p-5 flex flex-col flex-grow">
                  <div className="h-14 mb-2 flex flex-col justify-center">
                    <h3 
                      className="text-lg font-bold text-gray-800 hover:text-[#2bcd82] transition-colors line-clamp-2 leading-tight"
                      title={product.name || product.title || 'Unnamed Product'}
                    >
                      {product.name || product.title || 'Unnamed Product'}
                    </h3>
                  </div>
                  
                  <div className="text-gray-600 mb-4 text-sm flex-grow">
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
                  
                  <div className="mt-auto flex items-center justify-between">
                    
                    <div className="flex space-x-2">
                      <button 
                        className="text-white bg-[#2bcd82] flex items-center gap-2 hover:bg-[#25b975] p-2 rounded-lg transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Navigate to the product detail page
                          navigate(`/catalog/${product.id}`);
                        }}
                      >
                        {getPdfCount(product) > 1 ? (
                          <>View {getPdfCount(product)} PDFs</>
                        ) : (
                          <>View Details</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category Tags - Updated to show multiple categories */}
                <div className="absolute top-0 right-0 flex flex-wrap justify-end gap-1 p-1 z-10">
                  {product.categories && product.categories.length > 0 ? (
                    product.categories.map((cat, idx) => (
                      <span 
                        key={idx} 
                        className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full shadow-sm"
                      >
                        {typeof cat === 'object' && cat !== null && 'name' in cat ? cat.name : cat}
                      </span>
                    ))
                  ) : product.category ? (
                    <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full shadow-sm">
                      {product.category}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Pagination Controls */}
        {!loading && filteredProducts.length > 0 && (
          <div className="mt-10 flex flex-col items-center">
            <p className="text-gray-500 mb-3">
              Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredProducts.length)} of {filteredProducts.length} products
            </p>
            
            <div className="flex flex-wrap justify-center items-center gap-3">
              <button
                className={`flex items-center px-4 py-2 rounded-md transition-all ${
                  currentPage === 1 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-gray-700 border border-gray-200 hover:shadow-md hover:border-gray-300'
                }`}
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Prev
              </button>
              
              {/* Page Numbers with Ellipsis */}
              <div className="flex items-center">
                {/* First page always shown */}
                {totalPages > 5 && currentPage > 3 && (
                  <>
                    <button
                      className="w-10 h-10 mx-1 rounded-md font-medium flex items-center justify-center transition-all bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-primary shadow-sm"
                      onClick={() => goToPage(1)}
                    >
                      1
                    </button>
                    {currentPage > 4 && (
                      <span className="mx-1 text-gray-500 w-10 text-center">...</span>
                    )}
                  </>
                )}
                
                {/* Dynamically calculated pages */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  // Skip if it's the first or last page and would be shown separately
                  if ((totalPages > 5) && 
                      ((pageNum === 1 && currentPage > 3) || 
                       (pageNum === totalPages && currentPage < totalPages - 2))) {
                    return null;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      className={`w-10 h-10 mx-1 rounded-md font-medium flex items-center justify-center transition-all duration-200 ${
                        currentPage === pageNum
                          ? 'bg-[#2bcd82] text-white shadow-md transform scale-110'
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-primary shadow-sm'
                      }`}
                      onClick={() => goToPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                {/* Last page always shown */}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    {currentPage < totalPages - 3 && (
                      <span className="mx-1 text-gray-500 w-10 text-center">...</span>
                    )}
                    <button
                      className="w-10 h-10 mx-1 rounded-md font-medium flex items-center justify-center transition-all bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-primary shadow-sm"
                      onClick={() => goToPage(totalPages)}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>
              
              <button
                className={`flex items-center px-4 py-2 rounded-md transition-all ${
                  currentPage === totalPages 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-gray-700 border border-gray-200 hover:shadow-md hover:border-gray-300'
                }`}
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default CatalogPage;