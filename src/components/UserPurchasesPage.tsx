import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Package, Filter, Search, XCircle, AlertCircle, Bookmark, RefreshCw, User, BookmarkMinus, ChevronDown, ChevronUp, CheckCircle, FileText, Trash, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import Footer from './Footer';
import Button from './Button';
import SecurePdfViewer from './SecurePdfViewer';

// Define the BookmarkItem interface
interface BookmarkItem {
  id: string | number;
  name: string;
  description?: string;
  category?: string;
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
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const db = getFirestore();
        const bookmarksRef = doc(db, 'users', user.id, 'bookmarks', 'savedItems');
        const bookmarksSnap = await getDoc(bookmarksRef);
        
        if (bookmarksSnap.exists()) {
          const bookmarksData = bookmarksSnap.data() as BookmarksData;
          
          if (bookmarksData.items && Array.isArray(bookmarksData.items)) {
            // Process bookmarks
            setBookmarks(bookmarksData.items);
            setFilteredBookmarks(bookmarksData.items);
            
            // Extract categories
            const categorySet = new Set<string>();
            bookmarksData.items.forEach(item => {
              if (item.category) {
                categorySet.add(item.category);
              }
            });
            setCategories(Array.from(categorySet));
            
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
        } else {
          // No bookmarks yet
          setBookmarks([]);
          setFilteredBookmarks([]);
        }
      } catch (err) {
        console.error('Error loading bookmarks:', err);
        setError('Failed to load your bookmarks. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadBookmarks();
  }, [isLoggedIn, user]);
  
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
      filtered = filtered.filter(item => item.category === categoryFilter);
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
        
        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search your bookmarks..."
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
                  <XCircle className="w-5 h-5" />
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="text-gray-500 w-5 h-5" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <div className="bg-white rounded-lg shadow-sm p-10 text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bookmark className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Bookmarks Yet</h3>
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
          <div className="space-y-4">
            {filteredBookmarks.map(item => (
              <div key={item.id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
                <div className="flex flex-col sm:flex-row">
                  {/* Image */}
                  <div className="sm:w-40 h-auto flex-shrink-0">
                    <div className="h-full w-full aspect-square">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-4 flex-grow">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">{item.name}</h3>
                        {item.category && (
                          <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full inline-block mb-2">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        Bookmarked on {formatDate(item.addedAt)}
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                      {item.description || 'No description available.'}
                    </p>
                    
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        onClick={() => navigate(`/catalog/${item.id}`)}
                        className="text-sm py-1.5 px-3 bg-blue-500 text-white hover:bg-blue-600 rounded-lg"
                      >
                        View Details
                      </Button>
                      
                      {item.hasPdf && (
                        <Button 
                          onClick={() => handleViewPdf(String(item.id))}
                          className="text-sm py-1.5 px-3 bg-green-500 text-white hover:bg-green-600 rounded-lg flex items-center"
                        >
                          <FileText className="w-4 h-4 mr-1" /> View PDF
                        </Button>
                      )}
                      
                      <Button 
                        onClick={() => handleRemoveBookmark(String(item.id))}
                        className="text-sm py-1.5 px-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg flex items-center"
                      >
                        <BookmarkMinus className="w-4 h-4 mr-1" /> Remove
                      </Button>
                    </div>
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