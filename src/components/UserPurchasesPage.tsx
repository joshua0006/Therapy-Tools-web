import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Button from './Button';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/formatters';
import { Download, Package, Clock, CircleDollarSign, RefreshCw, User, CreditCard, Calendar, Eye, FileText, ChevronDown, ChevronUp, CheckCircle, LockIcon, ShieldCheck } from 'lucide-react';
import SecurePdfViewer from './SecurePdfViewer';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { toast } from 'react-hot-toast';

// Define the PurchaseItem and Purchase interfaces for better type safety
interface PurchaseItem {
  id: number | string;
  type: 'product' | 'plan';
  name: string;
  description?: string;
  category?: string;
  price: string;
  quantity: number;
  imageUrl?: string;
  downloads?: Array<{
    id: string;
    name: string;
    file: string;
  }>;
  pdfUrl?: string;
  fileUrl?: string;
}

interface Purchase {
  id: string;
  items: PurchaseItem[];
  total: string;
  transactionId: string;
  paymentMethod: string;
  purchaseDate: string;
  status: string;
  createdAt?: any;
  billingInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

// Add a new interface for Firebase product data
interface FirebaseProduct {
  id?: string | number;  // Make id optional since it comes from document data
  docId?: string;        // Add docId to store the Firestore document ID
  name?: string;         // Make name optional since it might not always be present
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

// Add a new interface for purchases grouped by date
interface GroupedPurchases {
  [date: string]: Purchase[];
}

const UserPurchasesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn, user, getUserPurchaseHistory, loading: authLoading } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [groupedPurchases, setGroupedPurchases] = useState<GroupedPurchases>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [productDownloads, setProductDownloads] = useState<Record<string, Array<{id: string, name: string, file: string}>>>({});
  const [pdfLoadingStates, setPdfLoadingStates] = useState<Record<string, boolean>>({});
  const [selectedPdfDetails, setSelectedPdfDetails] = useState<{url: string, name: string, preventDownload: boolean} | null>(null);
  const [expandedPurchases, setExpandedPurchases] = useState<Record<string, boolean>>({});
  const [productDetails, setProductDetails] = useState<Record<string, FirebaseProduct>>({});

  // Get Firestore instance
  const db = getFirestore();

  // Fetch user purchases when component mounts
  useEffect(() => {
    loadPurchases();
  }, [user]);

  // Load user purchases
  const loadPurchases = async () => {
    if (!isLoggedIn || !user) {
      setPurchases([]);
      setGroupedPurchases({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const purchaseHistory = await getUserPurchaseHistory();
      
      if (!purchaseHistory || purchaseHistory.length === 0) {
        setPurchases([]);
        setGroupedPurchases({});
        setLoading(false);
        return;
      }
      
      // Sort purchases by date (newest first)
      const sortedPurchases = [...purchaseHistory].sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.purchaseDate);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.purchaseDate);
        return dateB.getTime() - dateA.getTime();
      });
      
      setPurchases(sortedPurchases);
      
      // Group purchases by date
      const grouped = groupPurchasesByDate(sortedPurchases);
      setGroupedPurchases(grouped);
      
      // Get all unique product IDs from purchases
      const productIds = new Set<string>();
      sortedPurchases.forEach(purchase => {
        purchase.items.forEach((item: PurchaseItem) => {
          productIds.add(String(item.id));
        });
      });

      // Fetch product details for all products
      const productsRef = collection(db, 'products');
      const productDetails: Record<string, FirebaseProduct> = {};

      // First try direct document lookups
      for (const productId of productIds) {
        try {
          const docRef = doc(db, 'products', productId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            productDetails[productId] = {
              ...data,
              docId: docSnap.id,
              id: data.id || docSnap.id
            };
            continue; // Skip to next product if found
          }

          // If not found by direct ID, try querying by product ID field
          const q = query(productsRef, where('id', '==', productId));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const docData = querySnapshot.docs[0];
            const data = docData.data();
            productDetails[productId] = {
              ...data,
              docId: docData.id,
              id: data.id || docData.id
            };
            continue;
          }

          // Try string comparison for numeric IDs
          const allProductsQuery = query(productsRef);
          const allProductsSnapshot = await getDocs(allProductsQuery);
          
          const strProductId = String(productId);
          const matchingDoc = allProductsSnapshot.docs.find(doc => 
            doc.id === strProductId || 
            String(doc.data().id) === strProductId
          );
          
          if (matchingDoc) {
            const data = matchingDoc.data();
            productDetails[productId] = {
              ...data,
              docId: matchingDoc.id,
              id: data.id || matchingDoc.id
            };
          }
        } catch (error) {
          console.error(`Error fetching product ${productId}:`, error);
        }
      }

      // Update product details state
      setProductDetails(productDetails);

      // Pre-fetch downloads for items with PDFs
      const itemsWithPdfs = sortedPurchases.flatMap(purchase => 
        purchase.items.filter((item: PurchaseItem) => hasPdfFiles(item))
      );
      
      // Fetch first few items' downloads to improve initial load experience
      const initialItems = itemsWithPdfs.slice(0, 3);
      for (const item of initialItems) {
        const productId = String(item.id);
        if (productDetails[productId]) {
          const pdfs: Array<{id: string, name: string, file: string}> = [];
          const product = productDetails[productId];

          // Check downloads array
          if (product.downloads && Array.isArray(product.downloads)) {
            const pdfDownloads = product.downloads.filter(download => 
              download.file && download.file.toLowerCase().endsWith('.pdf')
            );
            if (pdfDownloads.length > 0) {
              pdfs.push(...pdfDownloads);
            }
          }

          // Check direct PDF URL
          if (product.pdfUrl && typeof product.pdfUrl === 'string' && product.pdfUrl.toLowerCase().endsWith('.pdf')) {
            pdfs.push({
              id: 'pdfUrl',
              name: product.name || 'Main Document',
              file: product.pdfUrl
            });
          }

          // Check fileUrl field
          if (product.fileUrl && typeof product.fileUrl === 'string' && product.fileUrl.toLowerCase().endsWith('.pdf')) {
            pdfs.push({
              id: 'fileUrl',
              name: `${product.name || 'Document'} File`,
              file: product.fileUrl
            });
          }

          // Update downloads state
          if (pdfs.length > 0) {
            setProductDownloads(prev => ({
              ...prev,
              [productId]: pdfs
            }));
          }
        }
      }
      
    } catch (err) {
      console.error('Error loading purchases:', err);
      setError('Failed to load your purchase history. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Group purchases by date (YYYY-MM)
  const groupPurchasesByDate = (purchaseList: Purchase[]): GroupedPurchases => {
    const grouped: GroupedPurchases = {};
    
    purchaseList.forEach(purchase => {
      let date;
      
      if (purchase.createdAt?.toDate) {
        // Handle Firestore Timestamp
        date = purchase.createdAt.toDate();
      } else {
        // Handle string date
        date = new Date(purchase.purchaseDate);
      }
      
      if (isNaN(date.getTime())) {
        // If date is invalid, use current date
        date = new Date();
      }
      
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!grouped[yearMonth]) {
        grouped[yearMonth] = [];
      }
      
      grouped[yearMonth].push(purchase);
    });
    
    return grouped;
  };
  
  // Format date key to a readable label
  const getDateLabel = (dateKey: string): string => {
    const [year, month] = dateKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    
    // Format like "July 2023"
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  // Handle toggling a purchase's expanded state
  const togglePurchaseExpanded = (purchaseId: string) => {
    setExpandedPurchases(prev => ({
      ...prev,
      [purchaseId]: !prev[purchaseId]
    }));
  };

  // Update the handleViewPdf function to handle secure PDF viewing
  const handleViewPdf = async (productId: string, downloadIndex?: number, pdfDetails?: {url: string, name: string}) => {
    console.log('Opening PDF viewer for product:', productId, 'download index:', downloadIndex);
    setSelectedProductId(productId);
    
    try {
      // If direct PDF details are provided, use them
      if (pdfDetails) {
        setSelectedPdfDetails({
          ...pdfDetails,
          preventDownload: true
        });
        sessionStorage.setItem('selectedPdfUrl', pdfDetails.url);
        sessionStorage.setItem('selectedPdfName', pdfDetails.name);
        sessionStorage.setItem('preventDownload', 'true');
        return;
      }

      // If no direct details, fetch from Firebase
      if (!db) {
        throw new Error('Firebase Firestore instance not found');
      }

      // Get product document from Firebase
      const docRef = doc(db, 'products', productId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Product not found in Firebase');
      }

      const productData = docSnap.data();
      
      // Check downloads array first
      if (productData.downloads && Array.isArray(productData.downloads)) {
        const pdfDownloads = productData.downloads.filter(download => 
          download.file && download.file.toLowerCase().endsWith('.pdf')
        );
        
        if (pdfDownloads.length > 0) {
          const selectedPdf = pdfDownloads[downloadIndex || 0];
          setSelectedPdfDetails({
            url: selectedPdf.file,
            name: selectedPdf.name,
            preventDownload: true
          });
          sessionStorage.setItem('selectedPdfUrl', selectedPdf.file);
          sessionStorage.setItem('selectedPdfName', selectedPdf.name);
          sessionStorage.setItem('preventDownload', 'true');
          return;
        }
      }

      throw new Error('No PDF files found in downloads');

    } catch (error) {
      console.error('Error setting up PDF viewer:', error);
      toast.error('Failed to load PDF document');
      setSelectedProductId(null);
      setSelectedPdfDetails(null);
    }
  };

  const handleClosePdfViewer = () => {
    setSelectedProductId(null);
    setSelectedPdfDetails(null);
    // Clear session storage
    sessionStorage.removeItem('selectedPdfIndex');
    sessionStorage.removeItem('selectedPdfUrl');
    sessionStorage.removeItem('selectedPdfName');
    sessionStorage.removeItem('preventDownload');
  };

  // Toggle item expanded state
  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
    
    // If expanding and we don't have downloads for this product yet, fetch them
    if (!expandedItems[itemId] && !productDownloads[itemId]) {
      fetchProductDownloads(itemId);
    }
  };

  // Fetch product downloads from Firebase
  const fetchProductDownloads = async (productId: string) => {
    if (!db) {
      console.error('Firebase Firestore instance not found');
      return;
    }

    try {
      setPdfLoadingStates(prev => ({...prev, [productId]: true}));
      console.log(`Fetching downloads for product ID: ${productId}`);
      
      // Query the products collection directly by ID
      const docRef = doc(db, 'products', productId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const productData = docSnap.data();
        console.log('Found product data:', productData);
        
        // Store the product details
        const productDoc = {
          ...productData,
          docId: docSnap.id,
          id: productData.id || docSnap.id
        };
        
        setProductDetails(prev => ({
          ...prev,
          [productId]: productDoc
        }));
        
        // Extract downloads array
        const pdfs: Array<{id: string, name: string, file: string}> = [];
        
        // Check downloads array first
        if (productData.downloads && Array.isArray(productData.downloads)) {
          const pdfDownloads = productData.downloads.filter(download => 
            download.file && download.file.toLowerCase().endsWith('.pdf')
          );
          
          if (pdfDownloads.length > 0) {
            pdfs.push(...pdfDownloads);
          }
        }
        
        // Update the state with the product downloads
        if (pdfs.length > 0) {
          setProductDownloads(prev => ({
            ...prev,
            [productId]: pdfs
          }));
        } else {
          console.log('No PDF downloads found for product');
        }
      } else {
        console.log(`Product with ID ${productId} not found in Firebase`);
      }
    } catch (error) {
      console.error('Error fetching product downloads:', error);
    } finally {
      setPdfLoadingStates(prev => ({...prev, [productId]: false}));
    }
  };

  // Check if a purchase item has PDF files
  const hasPdfFiles = (item: PurchaseItem): boolean => {
    // Check if the item has downloads with PDF files
    if (item.downloads && item.downloads.length > 0) {
      const hasPdfDownload = item.downloads.some(download => 
        download.file && download.file.toLowerCase().endsWith('.pdf')
      );
      if (hasPdfDownload) return true;
    }
    
    // Check if the item has a direct PDF URL
    if (item.pdfUrl && item.pdfUrl.toLowerCase().endsWith('.pdf')) {
      return true;
    }
    
    // Check if the item has a fileUrl that's a PDF
    if (item.fileUrl && item.fileUrl.toLowerCase().endsWith('.pdf')) {
      return true;
    }
    
    return false;
  };

  // Count the number of PDF files for an item
  const countPdfFiles = (item: PurchaseItem): number => {
    let count = 0;
    
    // Count PDF downloads
    if (item.downloads && item.downloads.length > 0) {
      count += item.downloads.filter(download => 
        download.file && download.file.toLowerCase().endsWith('.pdf')
      ).length;
    }
    
    // Add pdfUrl if it exists
    if (item.pdfUrl && item.pdfUrl.toLowerCase().endsWith('.pdf')) {
      count += 1;
    }
    
    // Add fileUrl if it's a PDF
    if (item.fileUrl && item.fileUrl.toLowerCase().endsWith('.pdf')) {
      count += 1;
    }
    
    return count;
  };

  // Format price for display
  const formatPrice = (price: string): string => {
    const numPrice = parseFloat(price);
    return numPrice.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    });
  };

  // Render purchase items
  const renderPurchaseItems = (items: PurchaseItem[]) => {
    if (!items || items.length === 0) {
      return <p className="text-gray-500 text-center py-4">No items in this purchase</p>;
    }
    
    return items.map((item, index) => {
      // Get Firebase product details if available
      const firebaseProduct = productDetails[String(item.id)];
      
      // Merge Firebase product details with purchase item data
      const displayName = firebaseProduct?.name || item.name;
      const displayImage = firebaseProduct?.image || item.imageUrl;
      const displayCategory = firebaseProduct?.category || item.category;
      
      return (
        <div key={index} className="flex flex-col py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors rounded-lg">
          <div className="flex justify-between items-center">
        <div className="flex items-center">
              <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden mr-4 border border-gray-200">
                {displayImage ? (
                  <img src={displayImage} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400">
                    <Package className="w-8 h-8" />
              </div>
            )}
          </div>
          <div>
                <h4 className="font-medium text-gray-800 text-lg">{displayName}</h4>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-sm px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                    {item.type === 'plan' ? 'Membership Plan' : displayCategory || 'Resource'}
                  </span>
                  
                  {hasPdfFiles(item) && (
                    <span className="text-sm px-2 py-0.5 bg-blue-50 rounded-full text-blue-700 flex items-center">
                      <FileText className="w-3 h-3 mr-1" />
                      {countPdfFiles(item) > 1 ? `${countPdfFiles(item)} PDFs` : 'PDF included'}
                    </span>
                  )}
                  
                  <span className="text-sm px-2 py-0.5 bg-green-50 rounded-full text-green-700 flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Purchased
                  </span>
                </div>
          </div>
        </div>
            <div className="flex flex-col items-end">
              <span className="font-medium text-gray-700 mb-2">
                {formatPrice(item.price)} × {item.quantity || 1}
              </span>
              
              <div className="flex gap-2">
                {item.type !== 'plan' && hasPdfFiles(item) ? (
                  <button 
                    className="p-2.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors relative flex items-center"
                    onClick={() => toggleItemExpanded(String(item.id))}
                    title="View PDFs"
                  >
                    <FileText className="w-5 h-5 mr-1.5" />
                    <span className="text-sm font-medium">View PDFs</span>
                    {expandedItems[String(item.id)] ? (
                      <ChevronUp className="w-4 h-4 ml-1" />
                    ) : (
                      <ChevronDown className="w-4 h-4 ml-1" />
                    )}
                    {countPdfFiles(item) > 1 && (
                      <span className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                        {countPdfFiles(item)}
          </span>
                    )}
                  </button>
                ) : item.type !== 'plan' ? (
                  <button 
                    className="p-2 rounded-lg bg-[#2bcd82]/10 text-[#2bcd82] hover:bg-[#2bcd82]/20 transition-colors flex items-center"
                    onClick={() => {
                      const firebaseProduct = productDetails[String(item.id)];
                      const downloads = firebaseProduct?.downloads;
                      if (downloads && Array.isArray(downloads) && downloads.length > 0) {
                        const pdfDownloads = downloads.filter(download => 
                          download.file && download.file.toLowerCase().endsWith('.pdf')
                        );
                        if (pdfDownloads.length > 0) {
                          handleViewPdf(String(item.id), 0, {
                            url: pdfDownloads[0].file,
                            name: pdfDownloads[0].name
                          });
                          return;
                        }
                      }
                      // If no downloads found, try direct fetch
                      handleViewPdf(String(item.id));
                    }}
                    title="View document"
                  >
                    <FileText className="w-5 h-5 mr-1.5" />
                    <span className="text-sm font-medium">View</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          
          {/* PDF list - shows when expanded */}
          {item.type !== 'plan' && hasPdfFiles(item) && expandedItems[String(item.id)] && (
            <div className="mt-3 ml-16 bg-gray-50 rounded-lg p-4 border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <h5 className="font-medium text-gray-700">Available Documents</h5>
                <div className="flex items-center text-sm text-gray-500">
                  <ShieldCheck className="w-4 h-4 mr-1 text-green-500" />
                  <span>Secure viewing enabled</span>
                </div>
              </div>
              
              {pdfLoadingStates[String(item.id)] ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span className="text-sm text-gray-500">Loading documents...</span>
                </div>
              ) : productDownloads[String(item.id)] && productDownloads[String(item.id)].length > 0 ? (
                <div className="space-y-2">
                  {productDownloads[String(item.id)].map((download, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-200 transition-colors">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-50 rounded mr-3">
                          <FileText className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">{download.name}</span>
                          <div className="text-xs text-gray-500 mt-0.5">PDF Document</div>
                        </div>
                      </div>
                      <button
                        className="text-xs px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center"
                        onClick={() => handleViewPdf(
                          String(item.id), 
                          idx, 
                          { url: download.file, name: download.name }
                        )}
                      >
                        <Eye className="w-3 h-3 mr-1.5" />
                        View
                      </button>
                    </div>
                  ))}
                </div>
              ) : item.downloads && item.downloads.length > 0 ? (
                // Direct downloads from purchase item
                <div className="space-y-2">
                  {item.downloads
                    .filter(download => download.file && download.file.toLowerCase().endsWith('.pdf'))
                    .map((download, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-200 transition-colors">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-50 rounded mr-3">
                            <FileText className="w-5 h-5 text-blue-500" />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700">{download.name}</span>
                            <div className="text-xs text-gray-500 mt-0.5">PDF Document</div>
                          </div>
                        </div>
                        <button
                          className="text-xs px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center"
                          onClick={() => handleViewPdf(
                            String(item.id), 
                            idx,
                            { url: download.file, name: download.name }
                          )}
                        >
                          <Eye className="w-3 h-3 mr-1.5" />
                          View
                        </button>
                      </div>
                    ))}
                </div>
              ) : (
                // Fallback for when no specific PDFs are found but we know it has PDFs
                <div className="text-center py-4 bg-white rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-500 mb-3">Click the button below to view document</p>
            <button 
                    className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium"
                    onClick={() => handleViewPdf(String(item.id))}
            >
                    <FileText className="w-4 h-4 mr-2" />
                    {countPdfFiles(item) > 1 ? 'View PDF Documents' : 'View PDF Document'}
            </button>
                </div>
              )}
              
              <div className="mt-3 p-2 bg-yellow-50 rounded-lg border border-yellow-100">
                <p className="text-xs text-yellow-700 flex items-center">
                  <LockIcon className="w-3 h-3 mr-1 text-yellow-500" />
                  PDFs are protected and cannot be downloaded
                </p>
              </div>
            </div>
          )}
        </div>
      );
    });
  };

  // Render payment method icon
  const renderPaymentMethod = (method: string) => {
    const lowerMethod = method.toLowerCase();
    
    if (lowerMethod.includes('card') || lowerMethod.includes('credit') || lowerMethod.includes('visa') || lowerMethod.includes('mastercard')) {
      return <CreditCard className="w-4 h-4 mr-1" />;
    }
    
    return null;
  };

  // If user is not logged in, show a message
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12">
          <div className="max-w-lg mx-auto text-center bg-white p-8 rounded-xl shadow-sm">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">My Purchases</h1>
            <p className="text-gray-600 mb-6">Please log in to view your purchase history.</p>
            <Button 
              onClick={() => navigate('/login')}
              className="bg-[#2bcd82] hover:bg-[#25b975] text-white"
            >
              Log In
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">My Purchases</h1>
          <p className="text-center text-gray-600 max-w-2xl mx-auto">
            View and access all the resources you've purchased. Click on any PDF document to view it securely in our protected viewer.
          </p>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2bcd82]"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-2xl mx-auto">
            <p className="text-red-600 text-center">{error}</p>
            <div className="flex justify-center mt-4">
            <Button 
                onClick={() => loadPurchases()}
                className="bg-[#2bcd82] hover:bg-[#25b975] text-white flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Try Again
            </Button>
          </div>
          </div>
        ) : !purchases || purchases.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center max-w-2xl mx-auto">
            <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Package className="text-gray-400 w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No Purchases Yet</h2>
            <p className="text-gray-600 mb-6">You haven't made any purchases yet. Explore our catalog to find resources.</p>
            <Button 
              onClick={() => navigate('/catalog')}
              className="bg-[#2bcd82] hover:bg-[#25b975] text-white"
            >
              Explore Catalog
            </Button>
          </div>
        ) : (
          <div className="space-y-8 max-w-4xl mx-auto">
            {Object.keys(groupedPurchases).map((dateKey) => (
              <div key={dateKey} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-gray-500 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-800">{getDateLabel(dateKey)}</h2>
                  </div>
                  <div className="text-sm text-gray-500">
                    {groupedPurchases[dateKey].length} {groupedPurchases[dateKey].length === 1 ? 'purchase' : 'purchases'}
                  </div>
                  </div>
                  
                <div className="divide-y divide-gray-100">
                  {groupedPurchases[dateKey].map((purchase) => (
                    <div key={purchase.id} className="p-5">
                      <div 
                        className="flex justify-between items-center cursor-pointer"
                        onClick={() => togglePurchaseExpanded(purchase.id)}
                      >
                            <div>
                          <div className="flex items-center">
                            <span className="font-medium text-gray-800">
                              Order #{purchase.transactionId.slice(-8)}
                            </span>
                            <span className="ml-3 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium capitalize">
                              {purchase.status}
                            </span>
                                </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {formatDate(purchase.purchaseDate)} • {purchase.items.length} {purchase.items.length === 1 ? 'item' : 'items'}
                              </div>
                            </div>
                        <div className="flex items-center">
                          <div className="mr-4 text-right">
                            <div className="font-semibold text-gray-800">{purchase.total}</div>
                            <div className="text-sm text-gray-500 flex items-center justify-end mt-1">
                              {renderPaymentMethod(purchase.paymentMethod)}
                              <span>{purchase.paymentMethod}</span>
                            </div>
                          </div>
                          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                            {expandedPurchases[purchase.id] ? 
                              <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            }
                          </button>
                            </div>
                          </div>
                          
                      {expandedPurchases[purchase.id] && (
                        <div className="mt-4 border-t border-gray-100 pt-4">
                          <div className="space-y-1 mb-4">
                            {purchase.billingInfo && (
                              <div className="flex items-start mb-3">
                                <User className="w-4 h-4 text-gray-400 mt-0.5 mr-2" />
                              <div>
                                  <div className="text-sm font-medium text-gray-700">Billing Info</div>
                                  <div className="text-sm text-gray-600">
                                    {purchase.billingInfo.firstName} {purchase.billingInfo.lastName}
                                    {purchase.billingInfo.email && <span> • {purchase.billingInfo.email}</span>}
                                  </div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="font-medium text-gray-700 mb-3">Purchased Items</h3>
                            <div className="divide-y divide-gray-200">
                          {renderPurchaseItems(purchase.items)}
                            </div>
                          </div>
                        </div>
                      )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>
      
      <Footer />
      
      {/* Secure PDF Viewer - passing preventDownload flag */}
      {selectedProductId && selectedPdfDetails && (
        <SecurePdfViewer 
          productId={selectedProductId}
          onClose={handleClosePdfViewer}
          pdfDetails={{
            url: selectedPdfDetails.url,
            name: selectedPdfDetails.name,
            preventDownload: true // Always prevent downloads
          }}
        />
      )}
    </div>
  );
};

export default UserPurchasesPage; 