import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Check, Star, Loader, Clock, BookOpen, Users, AlertCircle, FileText, Download, LockIcon, ShieldCheck, Info, CheckCircle, Tag } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import Button from './Button';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
  category?: string;
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
  const [activeTab, setActiveTab] = useState<'description' | 'details' | 'reviews'>('description');
  const [usingMockData, setUsingMockData] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<FirebaseProduct[]>([]);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(true);
  
  // Add PDF viewer states
  const [isPdfViewerVisible, setIsPdfViewerVisible] = useState(false);
  const [pdfDetails, setPdfDetails] = useState<{ url: string; name: string } | null>(null);
  
  const { addToCart } = useCart();
  const { user, isLoggedIn, getUserPurchaseHistory } = useAuth();
  
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
  
  // Check if user has purchased this product
  useEffect(() => {
    const checkPurchaseStatus = async () => {
      if (!resourceId || !isLoggedIn || !user) {
        setHasPurchased(false);
        setCheckingPurchase(false);
        return;
      }
      
      try {
        setCheckingPurchase(true);
        
        // Get user purchase history
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
  
  const handleAddToCart = () => {
    if (product) {
      addToCart({
        id: parseInt(product.id, 10) || Math.floor(Math.random() * 10000),
        title: product.name || product.title || 'Unnamed Product',
        description: product.description || '',
        category: product.category || 'Uncategorized',
        imageUrl: product.thumbnail || product.image || product.images?.[0]?.src || '',
        price: getProductPrice(product).toString(),
        quantity: 1
      });
      
      toast.success(`${product.name || product.title || 'Product'} added to cart!`);
    }
  };
  
  // Update the handleViewPdf function to use the secure viewer
  const handleViewPdf = () => {
    if (!isLoggedIn) {
      toast.error('Please log in to view this PDF');
      navigate('/login');
      return;
    }
    
    if (!hasPurchased) {
      toast.error('You need to purchase this product to view the PDF');
      return;
    }
    
    if (product && resourceId) {
      // Check if we have direct PDF details
      if (product.pdfUrl) {
        setPdfDetails({
          url: product.pdfUrl,
          name: product.name || product.title || 'PDF Document'
        });
        setIsPdfViewerVisible(true);
        return;
      }
      
      // Check for PDF in downloads array
      if (product.downloads && product.downloads.length > 0) {
        const pdfDownloads = product.downloads.filter(download => 
          download.file && download.file.toLowerCase().endsWith('.pdf')
        );
        
        if (pdfDownloads.length > 0) {
          setPdfDetails({
            url: pdfDownloads[0].file,
            name: pdfDownloads[0].name || product.name || 'PDF Document'
          });
          setIsPdfViewerVisible(true);
          return;
        }
      }
      
      // Check fileUrl as a last resort
      if (product.fileUrl && product.fileUrl.toLowerCase().endsWith('.pdf')) {
        setPdfDetails({
          url: product.fileUrl,
          name: product.name || product.title || 'PDF Document'
        });
        setIsPdfViewerVisible(true);
        return;
      }
      
      // If no PDF found
      toast.error('No PDF file found for this product');
    }
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
              
              <div className="mt-1 mb-4">
                <span className="text-sm text-gray-500">Category: </span>
                <span className="text-sm font-medium text-gray-700">{product.category || 'Uncategorized'}</span>
              </div>
              
              {/* PDF Indicator */}
              {hasPdfFiles(product) && (
                <div className="mb-4 flex items-center bg-blue-50 p-2 rounded">
                  <FileText className="text-blue-500 mr-2 w-5 h-5" />
                  <span className="text-blue-700 text-sm font-medium">
                    PDF document included
                    {!hasPurchased && !checkingPurchase && (
                      <span className="ml-1 text-yellow-600">
                        <LockIcon className="w-3 h-3 inline-block mr-1" />
                        Purchase required to view
                      </span>
                    )}
                  </span>
                </div>
              )}
              
              {/* Sale Tag */}
              {productPrice > 0 ? (
                <div className="mb-4 flex items-center bg-[#ffebeb] p-2 rounded">
                  <Tag className="text-[#fb6a69] mr-2 w-5 h-5" />
                  <span className="text-[#fb6a69] text-sm font-bold">
                    {getDiscountPercentage(productPrice, originalPrice)}% OFF
                  </span>
                </div>
              ) : (
                <div className="mb-4 flex items-center bg-[#ebfdf3] p-2 rounded">
                  <Tag className="text-[#2bcd82] mr-2 w-5 h-5" />
                  <span className="text-[#2bcd82] text-sm font-bold">
                    FREE
                  </span>
                </div>
              )}
              
              <div className="mb-4">
                {productPrice > 0 ? (
                  <>
                    {/* Original Price (crossed out) */}
                    <span className="text-gray-500 line-through text-lg block">
                      {formatCurrency(originalPrice)}
                    </span>
                    
                    {/* Sale Price */}
                    <span className="text-2xl text-[#fb6a69] font-bold">
                      {formatCurrency(productPrice)}
                    </span>
                  </>
                ) : (
                  /* Free Product Price */
                  <span className="text-2xl text-[#2bcd82] font-bold">
                    Free
                  </span>
                )}
              </div>
              
              <div className="flex flex-col space-y-4 mt-auto">
                <Button 
                  onClick={handleAddToCart}
                  className="flex items-center justify-center bg-[#2bcd82] hover:bg-[#25b975] text-white py-3 rounded-lg"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" /> Add to Cart
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
                            "Purchase this product to unlock PDF access" : 
                            "Login and purchase to access PDF content"}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="border-t border-gray-100">
            <div className="flex border-b border-gray-100">
              <button
                className={`flex-1 py-3 px-4 text-center text-sm font-medium ${activeTab === 'description' ? 'text-[#2bcd82] border-b-2 border-[#2bcd82]' : 'text-gray-500'}`}
                onClick={() => setActiveTab('description')}
              >
                Description
              </button>
              <button
                className={`flex-1 py-3 px-4 text-center text-sm font-medium ${activeTab === 'details' ? 'text-[#2bcd82] border-b-2 border-[#2bcd82]' : 'text-gray-500'}`}
                onClick={() => setActiveTab('details')}
              >
                Details
              </button>
              <button
                className={`flex-1 py-3 px-4 text-center text-sm font-medium ${activeTab === 'reviews' ? 'text-[#2bcd82] border-b-2 border-[#2bcd82]' : 'text-gray-500'}`}
                onClick={() => setActiveTab('reviews')}
              >
                Reviews
              </button>
            </div>
            
            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'description' && (
                <div className="description-container">
                  {product.content || product.description ? (
                    <div className="prose prose-slate max-w-none">
                      <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mb-6">
                        {product.content ? (
                          <div className="prose-img:rounded-lg prose-img:mx-auto prose-headings:text-gray-800 prose-p:text-gray-600 prose-a:text-blue-500 prose-strong:text-gray-800" dangerouslySetInnerHTML={{ __html: product.content }} />
                        ) : product.description ? (
                          <div>
                            {containsHtml(product.description) ? (
                              <div className="prose-img:rounded-lg prose-img:mx-auto prose-headings:text-gray-800 prose-p:text-gray-600 prose-a:text-blue-500 prose-strong:text-gray-800" dangerouslySetInnerHTML={{ __html: product.description }} />
                            ) : (
                              <>
                                {product.description.split('\n').map((paragraph, index) => (
                                  <p key={index} className="mb-4 text-gray-600">{paragraph}</p>
                                ))}
                              </>
                            )}
                          </div>
                        ) : null}
                      </div>
                      
                      {/* Additional info and formatting enhancements */}
                      {product.details && Object.keys(product.details).length > 0 && (
                        <div className="bg-indigo-50 p-4 rounded-lg mb-6">
                          <h3 className="text-lg font-bold text-indigo-700 mb-3">Additional Information</h3>
                          <ul className="space-y-2">
                            {Object.entries(product.details).map(([key, value]) => {
                              // Skip if the value is null, undefined, or an object
                              if (value === null || value === undefined || typeof value === 'object') return null;
                              
                              // Format the key for display
                              const formattedKey = key
                                .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                                .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
                              
                              return (
                                <li key={key} className="flex items-start">
                                  <div className="bg-indigo-100 p-1 rounded-full mr-2 mt-1">
                                    <Info className="w-3 h-3 text-indigo-600" />
                                  </div>
                                  <div>
                                    <span className="font-medium text-indigo-800">{formattedKey}: </span>
                                    <span className="text-indigo-700">{String(value)}</span>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                      
                      {/* Category information */}
                      {product.category && (
                        <div className="flex items-center mb-6 bg-blue-50 p-3 rounded-lg">
                          <Tag className="text-blue-500 w-5 h-5 mr-2" />
                          <p className="text-blue-700">
                            <span className="font-medium">Category:</span> {product.category}
                          </p>
                        </div>
                      )}

                      {/* Key Benefits Section */}
                      <div className="mb-8">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                          <CheckCircle className="text-[#2bcd82] w-5 h-5 mr-2" />
                          Key Benefits
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white p-4 rounded-lg border border-gray-100 flex items-start">
                            <div className="bg-[#2bcd82]/10 p-2 rounded-full mr-3">
                              <Check className="w-4 h-4 text-[#2bcd82]" />
                            </div>
                            <div>
                              <p className="text-gray-700">Easy-to-use resources for immediate implementation</p>
                            </div>
                          </div>
                          <div className="bg-white p-4 rounded-lg border border-gray-100 flex items-start">
                            <div className="bg-[#2bcd82]/10 p-2 rounded-full mr-3">
                              <Check className="w-4 h-4 text-[#2bcd82]" />
                            </div>
                            <div>
                              <p className="text-gray-700">Evidence-based materials created by specialists</p>
                            </div>
                          </div>
                          <div className="bg-white p-4 rounded-lg border border-gray-100 flex items-start">
                            <div className="bg-[#2bcd82]/10 p-2 rounded-full mr-3">
                              <Check className="w-4 h-4 text-[#2bcd82]" />
                            </div>
                            <div>
                              <p className="text-gray-700">Engaging activities that maintain client interest</p>
                            </div>
                          </div>
                          <div className="bg-white p-4 rounded-lg border border-gray-100 flex items-start">
                            <div className="bg-[#2bcd82]/10 p-2 rounded-full mr-3">
                              <Check className="w-4 h-4 text-[#2bcd82]" />
                            </div>
                            <div>
                              <p className="text-gray-700">Save time with ready-to-use materials</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Who this is for section */}
                      <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 mb-6">
                        <h3 className="text-lg font-bold text-blue-800 mb-3 flex items-center">
                          <Users className="w-5 h-5 mr-2 text-blue-500" />
                          Who This Resource is For
                        </h3>
                        <p className="text-blue-700 mb-3">
                          This resource is ideal for speech-language pathologists, special education teachers, and interventionists working with:
                        </p>
                        <ul className="list-disc pl-6 text-blue-700 space-y-1">
                          <li>School-aged children with speech and language needs</li>
                          <li>Clients requiring structured therapy materials</li>
                          <li>Students needing engaging practice activities</li>
                        </ul>
                      </div>
                      
                      {!hasPurchased && hasPdfFiles(product) && (
                        <div className="bg-yellow-50 p-5 rounded-xl border border-yellow-100">
                          <div className="flex items-center mb-2">
                            <Info className="text-yellow-600 w-5 h-5 mr-2" />
                            <h3 className="text-lg font-bold text-yellow-800">PDF Access</h3>
                          </div>
                          <p className="text-yellow-700 mb-2">
                            This product includes PDF materials that are accessible after purchase.
                          </p>
                          <p className="text-yellow-600 text-sm">
                            Purchase now to unlock all content and resources included with this product.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-6 rounded-xl">
                      <p className="text-gray-600">{product.description || 'No description available.'}</p>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'details' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {product.details?.difficulty && (
                    <div className="flex items-start">
                      <div className="bg-gray-100 p-2 rounded-full mr-3">
                        <Star className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-800">Difficulty</h3>
                        <p className="text-sm text-gray-600">{product.details.difficulty}</p>
                      </div>
                    </div>
                  )}
                  
                  {product.details?.duration && (
                    <div className="flex items-start">
                      <div className="bg-gray-100 p-2 rounded-full mr-3">
                        <Clock className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-800">Duration</h3>
                        <p className="text-sm text-gray-600">{product.details.duration}</p>
                      </div>
                    </div>
                  )}
                  
                  {product.details?.ageRange && (
                    <div className="flex items-start">
                      <div className="bg-gray-100 p-2 rounded-full mr-3">
                        <Users className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-800">Age Range</h3>
                        <p className="text-sm text-gray-600">{product.details.ageRange}</p>
                      </div>
                    </div>
                  )}
                  
                  {product.details?.targetAudience && (
                    <div className="flex items-start">
                      <div className="bg-gray-100 p-2 rounded-full mr-3">
                        <Users className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-800">Target Audience</h3>
                        <p className="text-sm text-gray-600">{product.details.targetAudience}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Display downloads if available */}
                  {product.downloads && product.downloads.length > 0 && (
                    <div className="col-span-1 md:col-span-2 mt-4">
                      <h3 className="text-sm font-medium text-gray-800 mb-2">Included Files</h3>
                      <div className="space-y-2">
                        {product.downloads.map((download, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <div className="flex items-center">
                              <FileText className="w-4 h-4 text-blue-500 mr-2" />
                              <span className="text-sm">{download.name}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-xs text-gray-500 mr-2">
                                {download.file.split('.').pop()?.toUpperCase()}
                              </span>
                              {download.file.toLowerCase().endsWith('.pdf') && !hasPurchased && (
                                <LockIcon className="w-3 h-3 text-gray-400" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {!hasPurchased && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                          <p className="text-sm text-gray-600 flex items-center justify-center">
                            <LockIcon className="w-4 h-4 mr-2 text-gray-400" />
                            Purchase required to access these files
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'reviews' && (
                <div className="text-center py-6">
                  <p className="text-gray-500">No reviews yet.</p>
                </div>
              )}
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