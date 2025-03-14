import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Check, Star, Loader, Clock, BookOpen, Users, AlertCircle, FileText, LockIcon, Info, CheckCircle, Tag, X, Bookmark, BookmarkPlus, Loader2 } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import Button from './Button';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, setDoc, arrayUnion, updateDoc } from 'firebase/firestore';
import { app } from '../lib/firebase';
import SecurePdfViewer from './SecurePdfViewer';

// Use the same FirebaseProduct interface as in CatalogPage
interface FirebaseProduct {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  content?: string;
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
  image?: string;
  fileUrl?: string;
  pdfUrl?: string;
  details?: {
    difficulty?: string;
    duration?: string;
    ageRange?: string;
    targetAudience?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Category object structure
interface Category {
  id: string | number;
  name: string;
  slug?: string;
  [key: string]: any;
}

// Sample fallback product in case of Firebase access issues
const SAMPLE_PRODUCT: FirebaseProduct = {
  id: "sample-1",
  name: "Speech Sound Handbook",
  description: "Comprehensive guide for speech-language pathologists working with children who have phonological disorders.",
  content: "<p>This handbook provides detailed instructions and resources for assessing and treating various speech sound disorders. It includes practical strategies, worksheets, and evidence-based approaches to help clinicians provide effective therapy.</p><p>Perfect for both new and experienced SLPs looking to expand their knowledge and clinical skills.</p>",
  price: 29.99,
  thumbnail: "",
  category: "Guides",
  details: {
    difficulty: "Intermediate",
    duration: "Self-paced",
    ageRange: "3-12 years",
    targetAudience: "Speech-Language Pathologists"
  }
};

// Helper function to format currency
const formatCurrency = (amount: number | string | undefined): string => {
  // Handle undefined, null, or empty values
  if (amount === undefined || amount === null || amount === '') {
    return '$0.00';
  }
  
  // Convert to number if it's a string
  let numericAmount: number;
  
  if (typeof amount === 'number') {
    numericAmount = amount;
  } else {
    // Parse string, removing any non-numeric characters except decimal point
    const cleanAmount = String(amount).replace(/[^0-9.-]+/g, '');
    numericAmount = parseFloat(cleanAmount);
  }
  
  // Handle NaN
  if (isNaN(numericAmount)) {
    console.warn('Invalid amount format:', amount);
    return '$0.00';
  }
  
  // Format the amount as currency
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(numericAmount);
};

// Add a helper function to safely check if text contains HTML
const containsHtml = (text: string): boolean => {
  return /<\/?[a-z][\s\S]*>/i.test(text);
};

// This creates a fake original price that's 10-20% higher than the actual price
const calculateOriginalPrice = (actualPrice: number): number => {
  // Random discount between 10% and 20%
  const discountPercentage = Math.floor(Math.random() * 11) + 10; // 10-20
  
  // Calculate the "original" price
  const originalPrice = actualPrice * (100 / (100 - discountPercentage));
  
  // Round to 2 decimal places
  return Math.round(originalPrice * 100) / 100;
};

// Calculate the discount percentage for a product
const getDiscountPercentage = (actualPrice: number, originalPrice: number): number => {
  return Math.round(((originalPrice - actualPrice) / originalPrice) * 100);
};

const ResourceDetailPage: React.FC = () => {
  const { resourceId } = useParams<{ resourceId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<FirebaseProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<FirebaseProduct[]>([]);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(true);
  
  // PDF viewer states
  const [isPdfViewerVisible, setIsPdfViewerVisible] = useState(false);
  const [pdfDetails, setPdfDetails] = useState<{ url: string; name: string } | null>(null);
  
  // PDF list states
  const [availablePdfs, setAvailablePdfs] = useState<Array<{ url: string; name: string; id?: string }>>([]);
  const [showPdfList, setShowPdfList] = useState(false);
  
  const { user, isLoggedIn, getUserPurchaseHistory, isSubscriptionActive, getSubscriptionRemainingDays } = useAuth();
  
  // Add states for bookmark functionality
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [bookmarkCheckLoading, setBookmarkCheckLoading] = useState(true);
  
  // Create Firestore instance directly
  const db = getFirestore(app);
  
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
  
  // Get product price regardless of format
  const getProductPrice = (product: FirebaseProduct): number => {
    if (!product || product.price === undefined || product.price === null) {
      return 0;
    }
    
    if (typeof product.price === 'number') {
      return isNaN(product.price) ? 0 : product.price;
    } else if (typeof product.price === 'string') {
      const cleanPrice = product.price.replace(/[^0-9.-]+/g, '');
      const parsedPrice = parseFloat(cleanPrice);
      return isNaN(parsedPrice) ? 0 : parsedPrice;
    }
    return 0;
  };
  
  // Check if user has access to this product via subscription or direct purchase
  useEffect(() => {
    const checkPurchaseStatus = async () => {
      if (!resourceId || !isLoggedIn || !user) {
        setHasPurchased(false);
        setCheckingPurchase(false);
        return;
      }
      
      try {
        setCheckingPurchase(true);
        
        // First check if user has an active subscription
        const hasActiveSubscription = isSubscriptionActive();
        
        if (hasActiveSubscription) {
          // If user has an active subscription, they can access all PDFs
          setHasPurchased(true);
          console.log('User has access to this product via active subscription');
          setCheckingPurchase(false);
          return;
        }
        
        // If no active subscription, check if they purchased this specific product
        const purchaseHistory = await getUserPurchaseHistory();
        
        // Check if the current product is in any of the purchase items
        const hasProduct = purchaseHistory.some(purchase => 
          purchase.items.some((item: { id: string | number }) => 
            item.id.toString() === resourceId.toString()
          )
        );
        
        setHasPurchased(hasProduct);
        console.log(`User has ${hasProduct ? '' : 'not '}purchased this product`);
      } catch (err) {
        console.error('Error checking purchase status:', err);
        setHasPurchased(false);
      } finally {
        setCheckingPurchase(false);
      }
    };
    
    checkPurchaseStatus();
  }, [resourceId, isLoggedIn, user, getUserPurchaseHistory]);
  
  // Fetch product data when component mounts
  useEffect(() => {
    const loadProduct = async () => {
      if (!resourceId) {
        setError('Resource ID is missing');
        setLoading(false);
        return;
      }
      
      if (!db) {
        setError('Firebase Firestore instance not found. Please check your configuration.');
        loadSampleProduct();
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        console.log(`Fetching product with ID: ${resourceId} from Firebase...`);
        
        // First try direct document lookup
        let productData: FirebaseProduct | null = null;
        
        try {
          // Try to get document directly by ID
          const docRef = doc(db, 'products', resourceId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            productData = { id: docSnap.id, ...docSnap.data() };
            console.log('Found product by direct ID:', productData);
          } else {
            console.log('No product found with direct ID, trying query...');
          }
        } catch (err) {
          console.warn('Error fetching product by direct ID:', err);
          // Continue to alternative query methods
        }
        
        // If not found by direct ID, try querying
        if (!productData) {
          try {
            const productsRef = collection(db, 'products');
            // Query by ID field
            const q = query(productsRef, where('id', '==', resourceId));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              const docData = querySnapshot.docs[0];
              productData = { id: docData.id, ...docData.data() };
              console.log('Found product by ID field query:', productData);
            } else {
              // Try querying all products to find a match
              const allProductsSnapshot = await getDocs(collection(db, 'products'));
              
              // String comparison for ID matching
              const matchingDoc = allProductsSnapshot.docs.find(doc => 
                doc.id === resourceId || String(doc.data().id) === resourceId
              );
              
              if (matchingDoc) {
                productData = { id: matchingDoc.id, ...matchingDoc.data() };
                console.log('Found product by string comparison:', productData);
              } else {
                throw new Error(`Product with ID ${resourceId} not found`);
              }
            }
          } catch (err) {
            console.error('Error querying for product:', err);
            throw err;
          }
        }
        
        // If we have a product, also fetch related products by category
        if (productData) {
          setProduct(productData);
          setUsingMockData(false);
          
          // Fetch related products in the same category
          try {
            const category = productData.category;
            if (category) {
              const relatedQuery = query(
                collection(db, 'products'), 
                where('category', '==', category)
              );
              const relatedSnapshot = await getDocs(relatedQuery);
              
              const related: FirebaseProduct[] = [];
              relatedSnapshot.forEach(doc => {
                // Don't include the current product
                if (doc.id !== resourceId) {
                  related.push({ id: doc.id, ...doc.data() });
                }
              });
              
              setRelatedProducts(related.slice(0, 3)); // Limit to 3 related products
            }
          } catch (err) {
            console.warn('Error fetching related products:', err);
            // Non-critical error, can continue without related products
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading product:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        
        if (errorMessage.includes('permission') || errorMessage.includes('insufficient')) {
          setError('Firebase permissions error: You do not have access to the products collection.');
          loadSampleProduct();
        } else {
          setError(`Failed to load product: ${errorMessage}`);
          loadSampleProduct();
        }
      }
    };
    
    // Load sample product as fallback
    const loadSampleProduct = () => {
      console.log('Loading sample product as fallback');
      setProduct({...SAMPLE_PRODUCT, id: resourceId || SAMPLE_PRODUCT.id});
      setUsingMockData(true);
      setLoading(false);
    };
    
    loadProduct();
  }, [resourceId, db]);
  
  // Use the same hasPdfFiles function, but also add a function to collect all available PDFs
  const collectAvailablePdfs = (product: FirebaseProduct): Array<{ url: string; name: string; id?: string }> => {
    const pdfs: Array<{ url: string; name: string; id?: string }> = [];
    
    // Collect PDFs from downloads array
    if (product.downloads && product.downloads.length > 0) {
      const pdfDownloads = product.downloads.filter(download => 
        download.file && download.file.toLowerCase().endsWith('.pdf')
      );
      
      pdfDownloads.forEach(download => {
        pdfs.push({
          url: download.file,
          name: download.name || `${product.name || 'Document'} - ${pdfs.length + 1}`,
          id: download.id
        });
      });
    }
    
    // Add direct PDF URL if available
    if (product.pdfUrl && product.pdfUrl.toLowerCase().endsWith('.pdf')) {
      // Check if it's not already in the list
      if (!pdfs.some(pdf => pdf.url === product.pdfUrl)) {
        pdfs.push({
          url: product.pdfUrl,
          name: `${product.name || product.title || 'Document'} - Main PDF`,
        });
      }
    }
    
    // Add fileUrl if available and not already counted
    if (product.fileUrl && product.fileUrl.toLowerCase().endsWith('.pdf') && 
        (!product.pdfUrl || product.fileUrl !== product.pdfUrl)) {
      // Check if it's not already in the list
      if (!pdfs.some(pdf => pdf.url === product.fileUrl)) {
        pdfs.push({
          url: product.fileUrl,
          name: `${product.name || product.title || 'Document'} - Additional PDF`,
        });
      }
    }
    
    return pdfs;
  };

  // Add useEffect to collect PDFs when product changes
  useEffect(() => {
    if (product) {
      const pdfs = collectAvailablePdfs(product);
      setAvailablePdfs(pdfs);
    }
  }, [product]);
  
  // Update useEffect to check if this product is already bookmarked
  useEffect(() => {
    const checkBookmarkStatus = async () => {
      if (!isLoggedIn || !user || !resourceId) {
        setBookmarkCheckLoading(false);
        return;
      }
      
      setBookmarkCheckLoading(true);
      
      try {
        const db = getFirestore();
        const bookmarksRef = doc(db, 'users', user.id, 'bookmarks', 'savedItems');
        const bookmarksSnap = await getDoc(bookmarksRef);
        
        if (bookmarksSnap.exists()) {
          const bookmarksData = bookmarksSnap.data();
          if (bookmarksData.items && Array.isArray(bookmarksData.items)) {
            // Use String to ensure consistent comparison (some IDs might be numbers)
            const isAlreadyBookmarked = bookmarksData.items.some(
              (item: any) => String(item.id) === String(resourceId)
            );
            setIsBookmarked(isAlreadyBookmarked);
            console.log(`Bookmark status for ${resourceId}: ${isAlreadyBookmarked ? 'Bookmarked' : 'Not bookmarked'}`);
          }
        } else {
          // If no bookmarks document exists, item is not bookmarked
          setIsBookmarked(false);
        }
      } catch (err) {
        console.error('Error checking bookmark status:', err);
        setIsBookmarked(false);
      } finally {
        setBookmarkCheckLoading(false);
      }
    };
    
    // Run the check whenever resourceId, user, or login state changes
    checkBookmarkStatus();
  }, [isLoggedIn, user, resourceId]);
  
  // Update handleAddToBookmarks with loading state
  const handleAddToBookmarks = async () => {
    if (!isLoggedIn || !user) {
      // Keep error toast for login requirement
      toast.error('Please log in to bookmark this item');
      navigate('/signin');
      return;
    }
    
    if (!product) return;
    
    // Set loading state
    setBookmarkLoading(true);
    
    try {
      const db = getFirestore();
      const bookmarksRef = doc(db, 'users', user.id, 'bookmarks', 'savedItems');
      
      // Extract category names for storage
      const extractCategoryNames = (categories: Array<string | Category> | undefined) => {
        if (!categories || !Array.isArray(categories)) return [];
        
        return categories.map(cat => {
          if (typeof cat === 'object' && cat !== null && 'name' in cat) {
            return cat.name;
          }
          return cat;
        });
      };
      
      const bookmarkItem = {
        id: product.id,
        name: product.name || product.title || 'Unnamed Product',
        description: product.description || '',
        category: product.category || 'Uncategorized',
        // Add categories array, extract from product.categories if it exists, otherwise create from category
        categories: product.categories ? extractCategoryNames(product.categories) : 
                    (product.category ? [product.category] : ['Uncategorized']),
        imageUrl: product.thumbnail || product.image || product.images?.[0]?.src || '',
        addedAt: new Date().toISOString(),
        hasPdf: hasPdfFiles(product)
      };
      
      // First, check if bookmarks document exists
      const bookmarksSnap = await getDoc(bookmarksRef);
      
      if (!bookmarksSnap.exists()) {
        // Create the bookmarks document with this item
        await setDoc(bookmarksRef, {
          items: [bookmarkItem],
          updatedAt: new Date().toISOString()
        });
        
        setIsBookmarked(true);
        // Remove toast notification
      } else {
        // Update the existing bookmarks document
        const existingData = bookmarksSnap.data();
        
        // Check if already bookmarked to avoid duplicates
        if (existingData.items && Array.isArray(existingData.items)) {
          const isAlreadyBookmarked = existingData.items.some(
            (item: any) => String(item.id) === String(product.id)
          );
          
          if (isAlreadyBookmarked) {
            // Already bookmarked, so we'll remove it (toggle behavior)
            const updatedItems = existingData.items.filter(
              (item: any) => String(item.id) !== String(product.id)
            );
            
            await setDoc(bookmarksRef, {
              items: updatedItems,
              updatedAt: new Date().toISOString()
            });
            
            setIsBookmarked(false);
            // Remove toast notification
          } else {
            // Add to bookmarks
            await updateDoc(bookmarksRef, {
              items: arrayUnion(bookmarkItem),
              updatedAt: new Date().toISOString()
            });
            
            setIsBookmarked(true);
            // Remove toast notification
          }
        } else {
          // No items array or not an array, create a new one
          await setDoc(bookmarksRef, {
            items: [bookmarkItem],
            updatedAt: new Date().toISOString()
          });
          
          setIsBookmarked(true);
          // Remove toast notification
        }
      }
    } catch (err) {
      console.error('Error updating bookmark:', err);
      // Keep error toast
      toast.error('Failed to update bookmark. Please try again.');
    } finally {
      // Reset loading state
      setBookmarkLoading(false);
    }
  };
  
  // Modify the handleViewPdf function to show PDF list if multiple PDFs available
  const handleViewPdf = () => {
    if (!isLoggedIn) {
      toast.error('Please log in to view this PDF');
      navigate('/signin');
      return;
    }
    
    if (!hasPurchased) {
      // Check if user has an active subscription
      const hasActiveSubscription = isSubscriptionActive();
      
      if (hasActiveSubscription) {
        // Allow access if they have an active subscription
        setHasPurchased(true);
      } else {
        // Otherwise inform them they need a subscription
        toast.error('You need an active subscription to access PDF resources');
        return;
      }
    }
    
    if (product && resourceId) {
      // Collect all available PDFs
      const pdfs = collectAvailablePdfs(product);
      
      if (pdfs.length === 0) {
        toast.error('No PDF files found for this product');
        return;
      }
      
      setAvailablePdfs(pdfs);
      
      if (pdfs.length === 1) {
        // If there's only one PDF, open it directly
        setPdfDetails(pdfs[0]);
        setIsPdfViewerVisible(true);
      } else {
        // If there are multiple PDFs, show the selection list
        setShowPdfList(true);
      }
    }
  };
  
  // Add function to select a specific PDF to view
  const handleSelectPdf = (pdf: { url: string; name: string }) => {
    setPdfDetails({
      url: pdf.url,
      name: pdf.name
    });
    setIsPdfViewerVisible(true);
    setShowPdfList(false);
  };

  // Add function to close PDF list
  const handleClosePdfList = () => {
    setShowPdfList(false);
  };

  // Add function to close PDF viewer
  const handleClosePdfViewer = () => {
    setIsPdfViewerVisible(false);
    setPdfDetails(null);
  };
  
  const productPrice = product ? getProductPrice(product) : 0;
  
  // Calculate the "original" price for the discount
  const originalPrice = useMemo(() => {
    return calculateOriginalPrice(productPrice);
  }, [productPrice]);
  
  // Add this component to render subscription status
  const renderSubscriptionStatus = () => {
    if (!isLoggedIn || !user) return null;
    
    const hasActiveSubscription = isSubscriptionActive();
    if (!hasActiveSubscription) return null;
    
    const remainingDays = getSubscriptionRemainingDays();
    
    return (
      <div className="mb-4 bg-green-50 p-3 rounded-lg border border-green-100">
        <div className="flex items-center text-green-700">
          <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
          <span className="font-medium">Active Subscription</span>
        </div>
        <p className="text-sm text-green-600 mt-1">
          Your subscription provides full access to all PDF resources. 
          {remainingDays > 0 && (
            <span className="font-medium"> {remainingDays} days remaining</span>
          )}
        </p>
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12 flex justify-center items-center">
          <div className="flex flex-col items-center">
            <Loader className="w-12 h-12 text-[#2bcd82] animate-spin mb-4" />
            <h2 className="text-xl font-semibold text-gray-700">Loading resource details...</h2>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  if (error && !usingMockData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12">
          <div className="bg-red-50 rounded-lg p-6 text-center max-w-2xl mx-auto">
            <h2 className="text-red-600 text-xl font-bold mb-2">Error</h2>
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={() => navigate('/catalog')}
              className="inline-flex items-center px-4 py-2 bg-[#2bcd82] text-white rounded-lg hover:bg-[#25b975] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Catalog
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Resource not found</h2>
            <button 
              onClick={() => navigate('/catalog')}
              className="inline-flex items-center px-4 py-2 bg-[#2bcd82] text-white rounded-lg hover:bg-[#25b975] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Catalog
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Mock Data Warning */}
        {usingMockData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertCircle className="text-yellow-500 mr-2" />
              <p className="text-yellow-700 font-medium">Using Sample Data</p>
            </div>
            <p className="text-yellow-600 text-sm">
              Unable to access the Firebase database due to permission issues. Displaying sample product information.
            </p>
          </div>
        )}
        
        {/* Back Button */}
        <button 
          onClick={() => navigate('/catalog')}
          className="mb-6 inline-flex items-center text-gray-600 hover:text-[#2bcd82] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Catalog
        </button>
        
        {/* Product Hero Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-8">
            {/* Product Image */}
            <div className="rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center min-h-[240px] max-h-[500px] m-auto w-[450px] p-4">
              {product.thumbnail || product.image || product.images?.[0]?.src ? (
                <div className="book-container relative transform hover:rotate-y-5 transition-transform duration-300">
                  <img 
                    src={product.thumbnail || product.image || product.images?.[0]?.src} 
                    alt={product.name || product.title || 'Product'} 
                    className="w-full h-full object-contain rounded-md shadow-[8px_8px_12px_rgba(0,0,0,0.2)] border-r-4 border-b-4 border-gray-200"
                    style={{ 
                      transformStyle: 'preserve-3d',
                      perspective: '1000px'
                    }}
                  />
                  <div className="absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-gray-300 to-gray-100 rounded-r-sm"></div>
                </div>
              ) : (
                <div className="text-gray-400 text-center p-8 shadow-md border border-gray-200 rounded-lg bg-white">
                  <BookOpen className="w-16 h-16 mx-auto mb-4" />
                  <p>No preview available</p>
                </div>
              )}
            </div>
            
            {/* Product Info */}
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {product.name || product.title || 'Unnamed Product'}
              </h1>
              
              {/* Subscription status indicator */}
              {renderSubscriptionStatus()}
              
              {/* Product Category */}
              <div className="flex items-center my-2">
                <Tag className="h-5 w-5 text-green-700 mr-2" />
                {product.categories && Array.isArray(product.categories) && product.categories.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {product.categories.map((cat, idx) => (
                      <span key={idx} className="text-sm px-2 py-1 bg-green-50 text-green-700 rounded-full">
                        {typeof cat === 'object' && cat !== null ? cat.name : cat}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm font-medium text-gray-700">{product.category || 'Uncategorized'}</span>
                )}
              </div>
              
              {/* PDF Indicator */}
              {hasPdfFiles(product) && (
                <div className="mb-4 flex items-center bg-blue-50 p-2 rounded">
                  <FileText className="text-blue-500 mr-2 w-5 h-5" />
                  <span className="text-blue-700 text-sm font-medium">
                    {availablePdfs.length > 1 ? `${availablePdfs.length} PDF documents included` : "PDF document included"}
                    {!hasPurchased && !checkingPurchase && (
                      <span className="ml-1 text-yellow-600">
                        <LockIcon className="w-3 h-3 inline-block mr-1" />
                        Subscription required
                      </span>
                    )}
                  </span>
                </div>
              )}
              
              <div className="flex flex-col space-y-4 mt-auto">
                <Button 
                  onClick={handleAddToBookmarks}
                  disabled={bookmarkLoading || bookmarkCheckLoading}
                  className={`flex items-center justify-center py-3 rounded-lg transition-colors ${
                    bookmarkCheckLoading
                      ? 'bg-gray-100 text-gray-500'
                      : isBookmarked 
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300' 
                        : 'bg-[#2bcd82] hover:bg-[#25b975] text-white'
                  }`}
                >
                  {bookmarkLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" /> {isBookmarked ? 'Removing...' : 'Adding...'}
                    </>
                  ) : bookmarkCheckLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Checking...
                    </>
                  ) : isBookmarked ? (
                    <>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="20" 
                        height="20" 
                        viewBox="0 0 24 24" 
                        fill="#1d4ed8" 
                        stroke="#1d4ed8" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        className="mr-2"
                      >
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                      </svg>
                      Bookmarked
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-5 h-5 mr-2" /> Add to Bookmarks
                    </>
                  )}
                </Button>
                
                {hasPdfFiles(product) && (
                  <>
                    {hasPurchased ? (
                      <Button 
                        onClick={handleViewPdf}
                        className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg"
                      >
                        <FileText className="w-5 h-5 mr-2" /> View PDF
                      </Button>
                    ) : (
                      <div className="flex flex-col items-center bg-gray-100 p-3 rounded-lg">
                        <div className="flex items-center text-gray-600 mb-2">
                          <LockIcon className="w-5 h-5 mr-2 text-gray-500" />
                          <span className="font-medium">PDF Access Locked</span>
                        </div>
                        <p className="text-sm text-gray-500 text-center">
                          {isLoggedIn ? 
                            "Active subscription required to access PDF content" : 
                            <span 
                              className="text-blue-500 hover:text-blue-700 hover:underline cursor-pointer transition-colors flex items-center justify-center gap-1"
                              onClick={() => navigate('/signin')}
                            >
                              Login and subscribe to access PDF content
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14" />
                              </svg>
                            </span>
                          }
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Remove the tabs section and directly show description content */}
          <div className="border-t border-gray-100">
            <div className="p-6">
              {/* Description Content - Moving content to the top */}
              <div className="description-container">
                {/* Always show the Contents section at the top, before any product content */}
                <div className="prose prose-lg max-w-none">
                  {/* Contents Section */}
                  <div className="border-gray-200 border rounded-xl p-6 mb-8 bg-gray-50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">CONTENTS:</h2>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center mr-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                        <span>Covers all sounds including: /p, b, t, d, k, g, m, n, ŋ, f, h, w, j, s, z, ʃ, l, ɹ, vocalic ɹ, tʃ, dʒ, v, θ, ð, /s/ clusters, /l/ clusters, /ɹ/ clusters</span>
                      </li>
                      <li className="flex items-start">
                        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center mr-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                        <span>120 individual "squares" featuring x12 mini pictures per square.</span>
                      </li>
                      <li className="flex items-start">
                        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center mr-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                        <span>Covers initial, medial, final position (for singleton sounds)</span>
                      </li>
                      <li className="flex items-start">
                        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center mr-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                        <span>Print-friendly as all sounds fit on one page</span>
                      </li>
                      <li className="flex items-start">
                        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center mr-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                        <span>Includes color and black & white versions</span>
                      </li>
                    </ul>
                  </div>
                  
                  {/* Testimonials Section */}
                  <div className="border-gray-200 border rounded-xl p-6 mb-8 bg-gray-50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">What SLP's like you are saying:</h2>
                    <div className="space-y-4">
                      <blockquote className="italic text-gray-700">
                        "My clients have really loved putting different toys on these squares and then 'earning' them. They are a nice easy way to get some really quick productions of our targets."
                      </blockquote>
                      <blockquote className="italic text-gray-700">
                        "So versatile!! I can use this for multiple sessions, coloring, or using dotter and then the next time we might put burgers on the targets and play pop the pig. The options are endless."
                      </blockquote>
                      <blockquote className="italic text-gray-700">
                        "This is a perfect resource to use with any type of manipulative for the practice on the grid. You can get so creative with this one! My students love it."
                      </blockquote>
                    </div>
                  </div>
                  
                  {/* Now show the dynamic content from Firebase */}
                  {product?.content && (
                    <div className="prose-img:rounded-lg prose-img:mx-auto prose-headings:text-gray-800 prose-p:text-gray-600 prose-a:text-blue-500 prose-strong:text-gray-800 mb-8"
                      dangerouslySetInnerHTML={{ __html: product.content }} 
                    />
                  )}
                </div>
              </div>
              
           
            </div>
          </div>
        </div>
        
        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Related Products</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedProducts.map(relatedProduct => (
                <div 
                  key={relatedProduct.id}
                  onClick={() => navigate(`/catalog/${relatedProduct.id}`)}
                  className="bg-white cursor-pointer rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
                >
                  <div className="h-40 overflow-hidden bg-gray-100">
                    {relatedProduct.thumbnail || relatedProduct.image || relatedProduct.images?.[0]?.src ? (
                      <img 
                        src={relatedProduct.thumbnail || relatedProduct.image || relatedProduct.images?.[0]?.src}
                        alt={relatedProduct.name || relatedProduct.title || 'Related Product'} 
                        className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-200">
                        <p className="text-gray-400">No image</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 flex-grow flex flex-col">
                    <h3 className="font-medium text-gray-800 mb-2">
                      {relatedProduct.name || relatedProduct.title || 'Unnamed Product'}
                    </h3>
                    <p className="text-[#fb6a69] font-bold mt-auto">
                      {formatCurrency(getProductPrice(relatedProduct))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* PDF List Modal */}
        {showPdfList && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[80vh] overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Available PDFs</h3>
                <button 
                  onClick={handleClosePdfList}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-3 mt-4">
                {availablePdfs.map((pdf, index) => (
                  <button 
                    key={index}
                    onClick={() => handleSelectPdf(pdf)}
                    className="w-full flex items-center p-3 hover:bg-blue-50 rounded-lg transition-colors group border border-gray-200 hover:border-blue-300"
                  >
                    <div className="mr-3 bg-blue-100 text-blue-600 p-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-800 group-hover:text-blue-700">{pdf.name}</p>
                      <p className="text-xs text-gray-500">Click to view</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Add the PDF viewer */}
      {isPdfViewerVisible && pdfDetails && resourceId && (
        <SecurePdfViewer
          productId={resourceId}
          onClose={handleClosePdfViewer}
          pdfDetails={pdfDetails}
        />
      )}
      
      <Footer />
    </div>
  );
};

export default ResourceDetailPage; 