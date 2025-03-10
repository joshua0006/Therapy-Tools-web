import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Package, Filter, Search, XCircle, AlertCircle, Bookmark, RefreshCw, User, BookmarkMinus, ChevronDown, ChevronUp, CheckCircle, FileText, Trash, BookOpen, X, Eye, ArrowUpDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import Footer from './Footer';
import Button from './Button';
import SecurePdfViewer from './SecurePdfViewer';

// Category object structure
interface Category {
  id: string | number;
  name: string;
  slug?: string;
  [key: string]: any;
}

// Define the BookmarkItem interface
interface BookmarkItem {
  id: string | number;
  name: string;
  description?: string;
  category?: string;
  categories?: Array<string | Category>;
  imageUrl?: string;
  addedAt: string;
  hasPdf?: boolean;
  downloads?: Array<{
    id: string;
    name: string;
    file: string;
  }>;
  pdfUrl?: string;
  fileUrl?: string;
}

// Define BookmarksData interface
interface BookmarksData {
  items: BookmarkItem[];
  updatedAt: string;
}

// Add a new interface for Firebase product data
interface FirebaseProduct {
  id?: string | number;
  docId?: string;
  name?: string;
  description?: string;
  downloads?: Array<{
    id: string;
    name: string;
    file: string;
  }>;
  pdfUrl?: string;
  fileUrl?: string;
  [key: string]: any;
}

// Filter options for bookmarks
type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc';
type CategoryFilter = 'all' | string;

// Format date for display
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch (e) {
    return 'Invalid date';
  }
};

const BookmarksPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn, user, loading: authLoading } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [filteredBookmarks, setFilteredBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [productDetails, setProductDetails] = useState<Record<string, FirebaseProduct>>({});
  const [showPdfViewer, setShowPdfViewer] = useState<boolean>(false);
  const [selectedPdfDetails, setSelectedPdfDetails] = useState<{url: string, name: string, preventDownload: boolean, productId?: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [categories, setCategories] = useState<string[]>([]);
  
  // Load bookmarks data
  useEffect(() => {
    const loadBookmarks = async () => {
      if (!isLoggedIn || !user) {
        setBookmarks([]);
        setFilteredBookmarks([]);
        setError('Please log in to view your bookmarks');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const db = getFirestore();
        const bookmarksRef = doc(db, 'users', user.id, 'bookmarks', 'savedItems');
        
        const bookmarksSnap = await getDoc(bookmarksRef);
        
        if (!bookmarksSnap.exists()) {
          setBookmarks([]);
          setFilteredBookmarks([]);
          setLoading(false);
          return;
        }
        
        const bookmarksData = bookmarksSnap.data() as BookmarksData;
        
        if (bookmarksData.items && Array.isArray(bookmarksData.items)) {
          // Set bookmarks state
          setBookmarks(bookmarksData.items);
          setFilteredBookmarks(bookmarksData.items);
          
          // Note: We'll get categories from products collection instead,
          // but we'll keep this as a fallback in case loadAllCategories fails
          if (!categories.length) {
            const categorySet = new Set<string>();
            
            bookmarksData.items.forEach(item => {
              // Check for categories array first
              if (item.categories && Array.isArray(item.categories)) {
                item.categories.forEach(cat => {
                  if (typeof cat === 'object' && cat !== null && 'name' in cat) {
                    // If it's a category object, add its name to the set
                    if (cat.name) categorySet.add(cat.name);
                  } else if (typeof cat === 'string') {
                    // If it's already a string, add it directly
                    categorySet.add(cat);
                  }
                });
              } 
              
              // Fallback to single category if no categories array or if categories array is empty
              if ((!item.categories || (item.categories as any).length === 0) && item.category) {
                categorySet.add(item.category);
              }
            });
            
            setCategories(Array.from(categorySet));
          }
          
          // Load product details for each bookmark
          const detailsPromises = bookmarksData.items.map(async (item) => {
            try {
              const productRef = doc(db, 'products', String(item.id));
              const productSnap = await getDoc(productRef);
              
              if (productSnap.exists()) {
                return {
                  id: item.id,
                  details: { id: productSnap.id, ...productSnap.data() }
                };
              }
            } catch (err) {
              console.error(`Error loading details for product ${item.id}:`, err);
            }
            return null;
          });
          
          const resolvedDetails = await Promise.all(detailsPromises);
          const detailsMap: Record<string, FirebaseProduct> = {};
          
          resolvedDetails.forEach(result => {
            if (result && result.details) {
              detailsMap[String(result.id)] = result.details;
            }
          });
          
          setProductDetails(detailsMap);
        } else {
          setBookmarks([]);
          setFilteredBookmarks([]);
        }
      } catch (err) {
        console.error('Error loading bookmarks:', err);
        setError('Failed to load bookmarks. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadBookmarks();
    loadAllCategories(); // Also load all categories from products
  }, [isLoggedIn, user]);
  
  // After the loadBookmarks function, add a new function to fetch all categories from products
  const loadAllCategories = async () => {
    if (!isLoggedIn) return;
    
    try {
      setLoading(true);
      
      const db = getFirestore();
      const productsRef = collection(db, 'products');
      const productsSnapshot = await getDocs(productsRef);
      
      if (productsSnapshot.empty) {
        console.log('No products found in the collection');
        return;
      }
      
      const categorySet = new Set<string>();
      
      // Extract all unique category names from products
      productsSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Handle categories array (could be objects or strings)
        if (data.categories && Array.isArray(data.categories)) {
          data.categories.forEach((cat: any) => {
            if (typeof cat === 'object' && cat !== null && 'name' in cat) {
              // If it's a category object, add its name
              if (cat.name) categorySet.add(cat.name);
            } else if (typeof cat === 'string') {
              // If it's a string, add it directly
              categorySet.add(cat);
            }
          });
        }
        
        // Also include the single category field for backward compatibility
        if ((!data.categories || data.categories.length === 0) && data.category) {
          categorySet.add(data.category);
        }
      });
      
      // Update categories state with all unique categories
      setCategories(Array.from(categorySet));
      
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Apply filters and sorting
  useEffect(() => {
    if (!bookmarks.length) {
      setFilteredBookmarks([]);
      return;
    }
    
    let filtered = [...bookmarks];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.description && item.description.toLowerCase().includes(query)) ||
        (item.category && item.category.toLowerCase().includes(query))
      );
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => 
        // Check categories array first
        (item.categories && Array.isArray(item.categories) && item.categories.some(cat => {
          // If cat is an object, compare its name property to categoryFilter
          if (typeof cat === 'object' && cat !== null && 'name' in cat) {
            return cat.name === categoryFilter;
          }
          // Otherwise, compare the string directly
          return cat === categoryFilter;
        })) ||
        // Fallback to single category if no categories array
        item.category === categoryFilter
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        case 'oldest':
          return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });
    
    setFilteredBookmarks(filtered);
  }, [bookmarks, searchQuery, categoryFilter, sortOption]);
  
  // Toggle expanded state for an item
  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };
  
  // Handle removing a bookmark
  const handleRemoveBookmark = async (itemId: string) => {
    if (!isLoggedIn || !user) return;
    
    try {
      const db = getFirestore();
      const bookmarksRef = doc(db, 'users', user.id, 'bookmarks', 'savedItems');
      const bookmarksSnap = await getDoc(bookmarksRef);
      
      if (bookmarksSnap.exists()) {
        const bookmarksData = bookmarksSnap.data() as BookmarksData;
        
        if (bookmarksData.items && Array.isArray(bookmarksData.items)) {
          // Filter out the item to remove
          const updatedItems = bookmarksData.items.filter(item => String(item.id) !== String(itemId));
          
          // Update the document
          await setDoc(bookmarksRef, {
            items: updatedItems,
            updatedAt: new Date().toISOString()
          });
          
          // Update local state
          setBookmarks(updatedItems);
          toast.success('Bookmark removed successfully');
        }
      }
    } catch (err) {
      console.error('Error removing bookmark:', err);
      toast.error('Failed to remove bookmark. Please try again.');
    }
  };
  
  // Handle PDF viewing
  const handleViewPdf = async (itemId: string) => {
    if (!isLoggedIn || !user) {
      toast.error('Please log in to view this PDF');
      return;
    }
    
    try {
      // Check if we have product details
      const productDetail = productDetails[itemId];
      
      if (!productDetail) {
        toast.error('Product details not found');
        return;
      }
      
      // Check if it has a direct PDF URL
      if (productDetail.pdfUrl) {
        setSelectedPdfDetails({
          url: productDetail.pdfUrl,
          name: productDetail.name || 'PDF Document',
          preventDownload: true,
          productId: String(itemId)
        });
        setShowPdfViewer(true);
        return;
      }
      
      // Check for PDF in downloads
      if (productDetail.downloads && productDetail.downloads.length > 0) {
        const pdfDownloads = productDetail.downloads.filter(download => 
          download.file && download.file.toLowerCase().endsWith('.pdf')
        );
        
        if (pdfDownloads.length > 0) {
          setSelectedPdfDetails({
            url: pdfDownloads[0].file,
            name: pdfDownloads[0].name || productDetail.name || 'PDF Document',
            preventDownload: true,
            productId: String(itemId)
          });
          setShowPdfViewer(true);
          return;
        }
      }
      
      // Check fileUrl as a last resort
      if (productDetail.fileUrl && productDetail.fileUrl.toLowerCase().endsWith('.pdf')) {
        setSelectedPdfDetails({
          url: productDetail.fileUrl,
          name: productDetail.name || 'PDF Document',
          preventDownload: true,
          productId: String(itemId)
        });
        setShowPdfViewer(true);
        return;
      }
      
      toast.error('No PDF found for this item');
    } catch (err) {
      console.error('Error viewing PDF:', err);
      toast.error('Failed to load PDF. Please try again.');
    }
  };
  
  // Handle closing PDF viewer
  const handleClosePdfViewer = () => {
    setShowPdfViewer(false);
    setSelectedPdfDetails(null);
  };
  
  // Handle retry loading
  const handleRetryLoading = () => {
    window.location.reload();
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
            <Bookmark className="w-6 h-6 text-blue-500 mr-2" />
            My Bookmarks
          </h1>
          <p className="text-gray-600">
            Access your saved resources anytime. Bookmark your favorite speech pathology materials for quick reference.
          </p>
        </div>
        
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm mb-8 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search bookmarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            
            {/* Category Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="text-gray-500 w-5 h-5" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[180px]"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            {/* Sort Options */}
            <div className="flex items-center space-x-2">
              <ArrowUpDown className="text-gray-500 w-5 h-5" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[180px]"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm p-10 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading your bookmarks...</p>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="bg-red-50 rounded-lg p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-red-700 mb-2">Error Loading Bookmarks</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleRetryLoading} variant="secondary">
              <RefreshCw className="w-4 h-4 mr-2" /> Try Again
            </Button>
          </div>
        )}
        
        {/* No Bookmarks State */}
        {!loading && !error && bookmarks.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-10 text-center">
            <div className="w-28 h-36 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-white border-l-[12px] border-l-[#2bcd82] border border-gray-200 rounded-sm transform rotate-6 shadow-md"></div>
              <div className="absolute inset-0 bg-white border-l-[12px] border-l-[#2bcd82] border border-gray-200 rounded-sm transform rotate-3 shadow-md"></div>
              <div className="absolute inset-0 bg-white border-l-[12px] border-l-[#2bcd82] border border-gray-200 rounded-sm shadow-md flex items-center justify-center">
                <Bookmark className="w-10 h-10 text-[#2bcd82]" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Your Bookshelf is Empty</h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              You haven't bookmarked any resources yet. Browse our catalog and add items to your bookmarks for quick access.
            </p>
            <Button onClick={() => navigate('/catalog')} variant="primary">
              Browse Resources
            </Button>
          </div>
        )}
        
        {/* Bookmarks List */}
        {!loading && !error && filteredBookmarks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredBookmarks.map(item => (
              <div 
                key={item.id} 
                className="group relative transform transition-all duration-300 hover:-translate-y-2 hover:shadow-lg"
                onClick={() => navigate(`/catalog/${item.id}`)}
              >
                {/* Book Card */}
                <div className="relative h-[380px] bg-white rounded-lg shadow-md overflow-hidden cursor-pointer border border-gray-100 flex flex-col group transition-all duration-300 hover:border-[#2bcd82]">
                  {/* Book Spine */}
                  <div className="absolute left-0 top-0 bottom-0 w-[12px] bg-gradient-to-r from-[#2bcd82] to-[#25b975] z-10"></div>
                  
                  {/* Book Cover */}
                  <div className="ml-[12px] flex-grow flex flex-col h-full relative">
                    {/* Book Top Edge */}
                    <div className="absolute left-0 right-0 top-0 h-[5px] bg-gray-100 shadow-inner"></div>
                    
                    {/* Book Cover Content */}
                    <div className="p-5 pt-6 flex flex-col h-full relative bg-white overflow-hidden">
                      {/* Book Image or Default Cover */}
                      <div className="absolute inset-0 opacity-10" style={{ 
                        backgroundImage: item.imageUrl ? `url(${item.imageUrl})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundBlendMode: 'overlay'
                      }}></div>
                      
                      {/* Book Page Effect - Multiple lines to simulate page edges */}
                      <div className="absolute right-0 top-[5px] bottom-[5px] flex flex-col justify-between pointer-events-none">
                        {[...Array(8)].map((_, i) => (
                          <div key={i} className="h-[1px] w-[4px] bg-gray-300 shadow-sm"></div>
                        ))}
                      </div>
                      
                      {/* Category Tags */}
                      <div className="mb-3 w-full z-10 relative">
                        {item.categories && Array.isArray(item.categories) && item.categories.length > 0 ? (
                          <div className="flex items-center w-full">
                            <span className="text-xs px-2.5 py-1 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 rounded-md font-medium border border-blue-200 whitespace-nowrap overflow-hidden text-ellipsis max-w-[calc(100%-30px)]">
                              {item.categories.map(cat => 
                                typeof cat === 'object' && cat !== null && 'name' in cat ? cat.name : cat
                              ).join(', ')}
                            </span>
                            {item.categories.length > 1 && (
                              <span className="ml-1 text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                                ({item.categories.length})
                              </span>
                            )}
                          </div>
                        ) : item.category ? (
                          <span className="text-xs px-2.5 py-1 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 rounded-md font-medium border border-blue-200 whitespace-nowrap overflow-hidden text-ellipsis inline-block max-w-full">
                            {item.category}
                          </span>
                        ) : null}
                      </div>
                      
                      {/* Book Image - Larger for better visualization */}
                      <div className="h-44 mb-4 overflow-hidden rounded-md relative z-10 bg-gray-50 flex items-center justify-center">
                        {item.imageUrl ? (
                          <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <BookOpen className="w-12 h-12 text-gray-300" />
                        )}
                      </div>
                      
                      {/* Book Title */}
                      <h3 className="relative z-10 text-lg font-bold text-gray-800 mb-2 line-clamp-2">
                        {item.name}
                      </h3>                     
                      
                      {/* Book Bottom Edge */}
                      <div className="absolute left-0 right-0 bottom-0 h-[5px] bg-gray-100 shadow-inner"></div>
                    </div>
                  </div>
                  
                  {/* Book Pages Edge - Right Side */}
                  <div className="absolute right-0 top-[5px] bottom-[5px] w-[5px] bg-gray-100 shadow-inner"></div>
                </div>
                
                {/* Hover Actions - Appears on hover */}
                <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 p-4">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewPdf(String(item.id));
                    }}
                    className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition-colors duration-200"
                    disabled={!item.hasPdf}
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveBookmark(String(item.id));
                    }}
                    className="bg-red-600 text-white p-3 rounded-full hover:bg-red-700 transition-colors duration-200"
                  >
                    <BookmarkMinus className="w-5 h-5" />
                  </button>
                </div>
                
                {/* "Read Now" ribbon - appears on hover */}
                <div className="absolute bottom-4 left-0 right-0 mx-auto w-32 text-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:-translate-y-2">
                  <div className="bg-[#2bcd82] text-white py-1 px-4 rounded-md shadow-md font-medium text-sm">
                    Read Now
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Filtered No Results */}
        {!loading && !error && bookmarks.length > 0 && filteredBookmarks.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-700 mb-1">No matching bookmarks</h3>
            <p className="text-gray-500 mb-4">No bookmarks match your current filters or search query.</p>
            <Button 
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setSortOption('newest');
              }}
              variant="secondary"
            >
              Reset Filters
            </Button>
          </div>
        )}
      </main>
      
      {/* PDF Viewer */}
      {showPdfViewer && selectedPdfDetails && (
        <SecurePdfViewer
          productId={selectedPdfDetails.productId || ''}
          onClose={handleClosePdfViewer}
          pdfDetails={selectedPdfDetails}
        />
      )}
      
      <Footer />
    </div>
  );
};

export default BookmarksPage; 