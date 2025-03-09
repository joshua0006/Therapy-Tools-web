import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Button from './Button';
import { useAuth } from '../context/AuthContext';
import {  Package, CircleDollarSign, RefreshCw, User, CreditCard, FileText, ChevronDown, ChevronUp, CheckCircle, Search, Filter, XCircle, AlertCircle, Settings } from 'lucide-react';
import SecurePdfViewer from './SecurePdfViewer';
import { getFirestore, doc, getDoc, collection, query, where, getDocs} from 'firebase/firestore';
import { toast } from 'react-hot-toast';

// Define the PurchaseItem and Purchase interfaces for better type safety
interface PurchaseItem {
  id: number | string;
  type: 'product' | 'plan';
  name: string;
  title?: string;
  description?: string;
  category?: string;
  price: string;
  quantity: number;
  imageUrl?: string;
  slug?: string;
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
  subscription?: {
    plan: string;
    billingCycle: string;
    endDate: string;
    token?: string;
    status?: string;
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

// Filter options for purchases
type StatusFilter = 'all' | 'completed' | 'pending' | 'refunded';
type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';
type ItemTypeFilter = 'all' | 'product' | 'plan';

// Fix the membershipInfo type to properly include subscriptions
interface MembershipInfo {
  joinDate: string;
  status: string;
  expiryDate: string | null;
  updatedAt?: string;
  token?: string;
  billingCycle?: "monthly" | "yearly";
  totalPurchases?: number;
  renewalCount?: number;
  totalSpend?: number;
  lastPurchaseDate?: string;
  subscriptions?: Record<string, any>; // Add this to match the actual structure
}

// Update the user type if needed (usually in the auth context)
interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  membershipInfo?: MembershipInfo;
  // ... other user properties
}

// Helper function to format price safely
const formatPrice = (price: string | number | undefined): string => {
  // Handle undefined or empty string
  if (price === undefined || price === '') {
    return '$0.00';
  }
  
  // If price is already a number, format it
  if (typeof price === 'number') {
    if (isNaN(price)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price);
  }
  
  // Convert string price to number
  const numericPrice = parseFloat(String(price).replace(/[^0-9.-]+/g, ''));
  if (isNaN(numericPrice)) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(numericPrice);
};

const UserPurchasesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn, user, getUserPurchaseHistory, loading: authLoading } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
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
  const [showPdfViewer, setShowPdfViewer] = useState<boolean>(false);
  
  // New state for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [itemTypeFilter, setItemTypeFilter] = useState<ItemTypeFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  
  // Update the state for subscription information
  const [subscriptions, setSubscriptions] = useState<Record<string, { 
    endDate: Date, 
    daysRemaining: number, 
    isActive: boolean,
    billingCycle: string,
    plan: string,
    price?: number,
    totalItemsPrice: number
  }>>({});

  // Add new state for tracking accumulated subscription value
  const [totalSubscriptionValue, setTotalSubscriptionValue] = useState<number>(0);

  // Get Firestore instance
  const db = getFirestore();

  // Add loadingKey state at the top of the component
  const [loadingKey, setLoadingKey] = useState<number>(0);

  // Fix the applyFiltersAndSort function to properly handle default filters
  const applyFiltersAndSort = () => {
    console.log("Starting filter process with:", {
      totalPurchases: purchases.length,
      statusFilter,
      itemTypeFilter,
      searchTerm,
      sortOption
    });

    // Start with all purchases
    let result = [...purchases];
    
    // Check if any filters are active
    const isFilterActive = 
      (searchTerm && searchTerm.trim() !== '') || 
      statusFilter !== 'all' || 
      itemTypeFilter !== 'all';
    
    console.log(`Starting with ${result.length} purchases. Filters active: ${isFilterActive}`);
    
    // Only apply filtering if any filters are active
    if (isFilterActive) {
      // Apply search term
      if (searchTerm && searchTerm.trim() !== '') {
        const lowercaseSearch = searchTerm.toLowerCase().trim();
        result = result.filter(purchase => {
          // Search in transaction ID
          if (purchase.transactionId && purchase.transactionId.toLowerCase().includes(lowercaseSearch)) return true;
          
          // More comprehensive search in item properties
          const hasMatchingItem = purchase.items && Array.isArray(purchase.items) && purchase.items.some(item => {
            const itemId = String(item.id);
            const productDetail = productDetails[itemId];
            
            return (
              // Check item properties
              (item.name && item.name.toLowerCase().includes(lowercaseSearch)) ||
              (item.title && item.title.toLowerCase().includes(lowercaseSearch)) ||
              (item.description && item.description.toLowerCase().includes(lowercaseSearch)) ||
              (item.category && item.category.toLowerCase().includes(lowercaseSearch)) ||
              
              // Check product details from Firebase
              (productDetail && productDetail.name && productDetail.name.toLowerCase().includes(lowercaseSearch)) ||
              (productDetail && productDetail.description && productDetail.description.toLowerCase().includes(lowercaseSearch)) ||
              (productDetail && productDetail.category && productDetail.category.toLowerCase().includes(lowercaseSearch))
            );
          });
          
          if (hasMatchingItem) return true;
          
          // Search by price/total
          if (purchase.total && purchase.total.toLowerCase().includes(lowercaseSearch)) return true;
          
          // Search billing info
          if (purchase.billingInfo) {
            const { firstName, lastName, email } = purchase.billingInfo;
            if (
              (firstName && firstName.toLowerCase().includes(lowercaseSearch)) ||
              (lastName && lastName.toLowerCase().includes(lowercaseSearch)) ||
              (email && email.toLowerCase().includes(lowercaseSearch))
            ) {
              return true;
            }
          }
          
          // Search subscription plan
          if (purchase.subscription && purchase.subscription.plan && 
              purchase.subscription.plan.toLowerCase().includes(lowercaseSearch)) {
            return true;
          }
          
          return false;
        });
        console.log(`After search term filter: ${result.length} purchases remain`);
      }
      
      // Apply status filter - only if not 'all'
      if (statusFilter !== 'all') {
        result = result.filter(purchase => purchase.status && purchase.status.toLowerCase() === statusFilter);
        console.log(`After status filter (${statusFilter}): ${result.length} purchases remain`);
      }
      
      // Apply item type filter - only if not 'all'
      if (itemTypeFilter !== 'all') {
        result = result.filter(purchase => 
          purchase.items && 
          Array.isArray(purchase.items) && 
          purchase.items.some(item => item.type === itemTypeFilter)
        );
        console.log(`After item type filter (${itemTypeFilter}): ${result.length} purchases remain`);
      }
    }
    
    // Always apply sorting to make a consistent experience
    result.sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
        case 'oldest':
          return new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
        case 'highest':
          return parseFloat(b.total.replace(/[^0-9.-]+/g, '')) - parseFloat(a.total.replace(/[^0-9.-]+/g, ''));
        case 'lowest':
          return parseFloat(a.total.replace(/[^0-9.-]+/g, '')) - parseFloat(b.total.replace(/[^0-9.-]+/g, ''));
        default:
          return 0;
      }
    });
    
    console.log(`Final result: ${result.length} purchases after filtering and sorting`);
    setFilteredPurchases(result);
    
    // Group filtered purchases by date
    const grouped = groupPurchasesByDate(result);
    console.log(`Grouped into ${Object.keys(grouped).length} date groups`);
    setGroupedPurchases(grouped);
  };

  // Reset the filters and ensure default values are properly set
  const resetFilters = () => {
    console.log("Resetting all filters to default values");
    setSearchTerm('');
    setStatusFilter('all');
    setItemTypeFilter('all');
    setSortOption('newest');
    
    // Re-apply filters immediately
    setTimeout(() => {
      applyFiltersAndSort();
    }, 0);
  };

  // Add this useEffect to ensure initial state is properly set
  useEffect(() => {
    // Initialize default filter values when component mounts
    setStatusFilter('all');
    setItemTypeFilter('all');
    setSortOption('newest');
  }, []);

  // Modify the loadData function to set filtered purchases directly
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      console.log('Loading purchases for user:', user.id);
      setLoading(true);
      setError(null); // Clear any previous errors

      try {
        // Fetch user purchases using the existing function
        const userPurchases = await getUserPurchaseHistory();
        
        // Debug log to verify data retrieval
        console.log(`Retrieved ${userPurchases.length} purchases for user ${user.id}`, userPurchases);
        
        if (!userPurchases || userPurchases.length === 0) {
          console.log('No purchases found for user');
          setPurchases([]);
          setFilteredPurchases([]);
          setGroupedPurchases({});
          setLoading(false);
          return;
        }
        
        // Sort purchases by date, newest first
        const sortedPurchases = [...userPurchases].sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.purchaseDate);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.purchaseDate);
          return dateB.getTime() - dateA.getTime();
        });
        
        // Update the purchases state
        setPurchases(sortedPurchases);
        
        // Set filtered purchases directly to show all purchases by default
        setFilteredPurchases(sortedPurchases);
        
        // Group purchases by date
        const groupedByDate = groupPurchasesByDate(sortedPurchases);
        setGroupedPurchases(groupedByDate);
        
        // Initialize all date groups as expanded by default
        const initialExpandedState: Record<string, boolean> = {};
        Object.keys(groupedByDate).forEach(dateKey => {
          initialExpandedState[dateKey] = true;
        });
        setExpandedDates(initialExpandedState);

        // Extract unique product IDs for loading product details
        const productIdSet = new Set<string>();
        const productNameMap = new Map<string, string>();
        
        // Log to help debug the extraction of product IDs
        console.log('Processing purchases to extract product IDs:', sortedPurchases);
        
        sortedPurchases.forEach(purchase => {
          if (purchase.items && Array.isArray(purchase.items)) {
            purchase.items.forEach((item: PurchaseItem) => {
              if (item.id) {
                const productId = String(item.id);
                productIdSet.add(productId);
                
                // Store original item name for fallback
                if (item.name && item.name !== 'Unknown Product') {
                  productNameMap.set(productId, item.name);
                  console.log(`Stored original name for product ${productId}: ${item.name}`);
                }
              } else {
                console.warn('Found purchase item without ID:', item);
              }
            });
          } else {
            console.warn('Purchase has no items array:', purchase);
          }
        });
        
        console.log(`Found ${productIdSet.size} unique products to load from Firebase`);
        
        // Load product details from Firebase
        const productDetailsMap: Record<string, FirebaseProduct> = {};
        
        if (productIdSet.size > 0) {
          const db = getFirestore();
          if (!db) {
            throw new Error('Firebase not initialized');
          }
          
          const productsCollection = collection(db, 'products');
          
          // Try loading products directly first
          const productIds = Array.from(productIdSet);
          
          // Process in chunks to avoid Firestore limitations
          const idChunks = [];
          for (let i = 0; i < productIds.length; i += 10) {
            idChunks.push(productIds.slice(i, i + 10));
          }
          
          // Process each chunk
          for (const chunk of idChunks) {
            try {
              // Try to get documents directly by ID
              const docPromises = chunk.map(id => getDoc(doc(db, 'products', id)));
              const docSnapshots = await Promise.all(docPromises);
              
              docSnapshots.forEach((docSnap, index) => {
                const productId = chunk[index];
                if (docSnap.exists()) {
                  const productData = docSnap.data();
                  productDetailsMap[productId] = {
                    ...productData,
                    id: productData.id || productId,
                    docId: docSnap.id
                  };
                  console.log(`Loaded product ${productId} directly by document ID`);
                }
              });
            } catch (error) {
              console.error('Error fetching products by document ID:', error);
            }
          }
          
          // For products not found by document ID, try alternative methods
          const remainingIds = productIds.filter(id => !productDetailsMap[id]);
          if (remainingIds.length > 0) {
            console.log(`Looking up ${remainingIds.length} remaining products by ID field`);
            
            for (const productId of remainingIds) {
              try {
                // Try to find by ID field
                const idQuery = query(productsCollection, where('id', '==', productId));
                const querySnapshot = await getDocs(idQuery);
          
                if (!querySnapshot.empty) {
                  const doc = querySnapshot.docs[0];
                  const productData = doc.data();
                  productDetailsMap[productId] = {
                    ...productData,
                    id: productId,
                    docId: doc.id
                  };
                  console.log(`Found product ${productId} by ID field query`);
                  continue;
                }

                // Try by name if we have it
                const productName = productNameMap.get(productId);
                if (productName) {
                  // Try name match
                  const nameQuery = query(productsCollection, where('name', '==', productName));
                  const nameQuerySnapshot = await getDocs(nameQuery);
                  
                  if (!nameQuerySnapshot.empty) {
                    const doc = nameQuerySnapshot.docs[0];
                    const productData = doc.data();
                    productDetailsMap[productId] = {
                      ...productData,
                      id: productId,
                      docId: doc.id
                    };
                    console.log(`Found product ${productId} by name match: ${productName}`);
                    continue;
                  }
                  
                  // Try title match
                  const titleQuery = query(productsCollection, where('title', '==', productName));
                  const titleQuerySnapshot = await getDocs(titleQuery);
                  
                  if (!titleQuerySnapshot.empty) {
                    const doc = titleQuerySnapshot.docs[0];
                    const productData = doc.data();
                    productDetailsMap[productId] = {
                      ...productData,
                      id: productId,
                      docId: doc.id
                    };
                    console.log(`Found product ${productId} by title match: ${productName}`);
                    continue;
                  }
                }
                
                // If still not found, create a fallback from purchase data
                console.log(`Creating fallback for product ${productId}`);
                
                // Find the original purchase item to extract data
                let originalItem: PurchaseItem | null = null;
                
                // Look through all purchases to find this item
                for (const purchase of sortedPurchases) {
                  if (purchase.items && Array.isArray(purchase.items)) {
                    const foundItem = purchase.items.find((item: PurchaseItem) => String(item.id) === productId);
                    if (foundItem) {
                      originalItem = foundItem;
                      break;
                    }
                  }
                }
                
                if (originalItem) {
                  console.log(`Using data from original purchase for ${productId}:`, originalItem.name);
                  
                  // Create a fallback product entry using purchase data
                  productDetailsMap[productId] = {
                    id: productId,
                    docId: 'fallback',
                    name: originalItem.name && originalItem.name !== 'Unknown Product' 
                      ? originalItem.name 
                      : `Product #${productId.substring(0, 8)}`,
                    description: originalItem.description || 'Product details not available',
                    price: originalItem.price || '0',
                    imageUrl: originalItem.imageUrl || '',
                    category: originalItem.category || 'Resource',
                    // Important: pass through any PDF or download information from the purchase item
                    downloads: originalItem.downloads || [],
                    pdfUrl: originalItem.pdfUrl || '',
                    fileUrl: originalItem.fileUrl || '',
                    isPlaceholder: true
                  };
                } else {
                  console.log(`No original item found for ${productId}, creating minimal fallback`);
                  
                  productDetailsMap[productId] = {
                    id: productId,
                    docId: 'fallback',
                    name: `Product #${productId.substring(0, 8)}`,
                    description: 'Product details not available',
                    price: '0',
                    category: 'Resource',
                    isPlaceholder: true
                  };
                }
              } catch (error) {
                console.error(`Error retrieving product ${productId}:`, error);
              }
            }
          }
        }
        
        console.log(`Finished loading ${Object.keys(productDetailsMap).length} product details`);
        setProductDetails(productDetailsMap);
        
        // Now process subscriptions if they exist
        if (user.membershipInfo && typeof user.membershipInfo === 'object') {
          // Use type assertion to access the subscriptions property safely
          const membershipInfo = user.membershipInfo as MembershipInfo & { subscriptions?: Record<string, any> };
          const subscriptionsData = membershipInfo.subscriptions || {};
          const userSubscriptions: Record<string, any> = {};
          
          for (const [planId, subscription] of Object.entries(subscriptionsData)) {
            if (subscription && subscription.endDate) {
              const endDate = new Date(subscription.endDate);
              const now = new Date();
              const diffTime = endDate.getTime() - now.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const isActive = diffDays > 0;
              
              // Calculate total value of included items
              let totalItemsPrice = 0;
              
              // If price is 0, check if there are items included in this plan
              if (!subscription.price || subscription.price === '0' || subscription.price === 0) {
                for (const purchase of sortedPurchases) {
                  if (purchase.items && purchase.items.length > 0) {
                    for (const item of purchase.items) {
                      if (item.planId === planId) {
                        const itemPrice = parseFloat(typeof item.price === 'string' ? item.price : String(item.price || 0));
                        if (!isNaN(itemPrice)) {
                          totalItemsPrice += itemPrice;
                        }
                      }
                    }
                  }
                }
              }
              
              userSubscriptions[planId] = {
                endDate: endDate,
                daysRemaining: diffDays,
                isActive: isActive,
                billingCycle: subscription.billingCycle || 'monthly',
                plan: planId,
                price: subscription.price ? parseFloat(String(subscription.price)) : 0,
                totalItemsPrice: totalItemsPrice
              };
            }
          }
          
          setSubscriptions(userSubscriptions);
          
          // Load accumulated subscription value
          if (membershipInfo.totalSpend) {
            setTotalSubscriptionValue(membershipInfo.totalSpend);
          }
        }
        
      } catch (error) {
        console.error('Error loading user purchase data:', error);
        setError('Failed to load your purchase history. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (isLoggedIn && user && !authLoading) {
      loadData();
    } else if (!isLoggedIn && !authLoading) {
      setLoading(false);
    }
  }, [isLoggedIn, user, authLoading, getUserPurchaseHistory, loadingKey]);

  // Modify the useEffect to only run when an actual filter change happens
  useEffect(() => {
    // Check if any filter has been applied
    const isFilterActive = 
      (searchTerm && searchTerm.trim() !== '') || 
      statusFilter !== 'all' || 
      itemTypeFilter !== 'all';
    
    // Only apply filters when they're active or when sorting changes
    if (isFilterActive || sortOption !== 'newest') {
      applyFiltersAndSort();
    }
  }, [searchTerm, statusFilter, itemTypeFilter, sortOption, purchases]);

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

  // Update the handleViewPdf function to enforce preventDownload
  const handleViewPdf = async (productId: string, downloadIndex?: number, pdfDetails?: {url: string, name: string}) => {
    try {
    console.log('Opening PDF viewer for product:', productId, 'download index:', downloadIndex);
    
      // If direct PDF details are provided, use them
      if (pdfDetails && pdfDetails.url) {
        console.log('Using direct PDF details:', pdfDetails);
        
        // Always set preventDownload to true for security
        setSelectedProductId(productId);
        setSelectedPdfDetails({
          url: pdfDetails.url,
          name: pdfDetails.name || 'Document.pdf',
          preventDownload: true // Enforce download protection
        });
        setShowPdfViewer(true);
        return;
      }

      // First check if we have the product in our productDetails state
      const productDetail = productDetails[productId];
      const item = findPurchaseItemById(productId);
      
      if (!productDetail && !item) {
        throw new Error('Product information not found');
      }
      
      console.log('Product detail from state:', productDetail);
      console.log('Item from purchases:', item);
      
      // Initialize variables for PDF details
      let pdfUrl: string | null = null;
      let pdfName = 'Document.pdf';
      
      // First try to find PDF in product details (from Firebase)
      if (productDetail) {
        // Check for downloads array first
        if (productDetail.downloads && Array.isArray(productDetail.downloads) && productDetail.downloads.length > 0) {
          const pdfFiles = productDetail.downloads.filter((download: any) => 
            download.file && 
            typeof download.file === 'string' && 
            download.file.toLowerCase().endsWith('.pdf')
          );
          
          if (pdfFiles.length > 0) {
            // Use specific index or default to first
            const selectedPdf = typeof downloadIndex === 'number' && downloadIndex < pdfFiles.length
              ? pdfFiles[downloadIndex]
              : pdfFiles[0];
              
            pdfUrl = selectedPdf.file;
            pdfName = selectedPdf.name || productDetail.name || 'Document.pdf';
            
            console.log(`Found PDF in product downloads:`, selectedPdf);
          }
        }
        
        // If no PDF in downloads, check for direct pdfUrl
        if (!pdfUrl && productDetail.pdfUrl) {
          pdfUrl = productDetail.pdfUrl;
          pdfName = productDetail.name || 'Document.pdf';
          console.log(`Using direct pdfUrl from product:`, pdfUrl);
        }
        
        // If still no PDF, check fileUrl
        if (!pdfUrl && productDetail.fileUrl && productDetail.fileUrl.toLowerCase().endsWith('.pdf')) {
          pdfUrl = productDetail.fileUrl;
          pdfName = productDetail.name || 'Document.pdf';
          console.log(`Using fileUrl from product:`, pdfUrl);
        }
      }
      
      // If no PDF found in product details, try purchase item data
      if (!pdfUrl && item) {
        // Check item downloads
        if (item.downloads && Array.isArray(item.downloads) && item.downloads.length > 0) {
          const pdfFiles = item.downloads.filter(download => 
            download.file && 
            typeof download.file === 'string' && 
            download.file.toLowerCase().endsWith('.pdf')
          );
          
          if (pdfFiles.length > 0) {
            // Use specific index or default to first
            const selectedPdf = typeof downloadIndex === 'number' && downloadIndex < pdfFiles.length
              ? pdfFiles[downloadIndex]
              : pdfFiles[0];
              
            pdfUrl = selectedPdf.file;
            pdfName = selectedPdf.name || item.name || 'Document.pdf';
            
            console.log(`Found PDF in item downloads:`, selectedPdf);
          }
        }
        
        // If no PDF in downloads, check for direct pdfUrl
        if (!pdfUrl && item.pdfUrl) {
          pdfUrl = item.pdfUrl;
          pdfName = item.name || 'Document.pdf';
          console.log(`Using direct pdfUrl from item:`, pdfUrl);
        }
        
        // If still no PDF, check fileUrl
        if (!pdfUrl && item.fileUrl && item.fileUrl.toLowerCase().endsWith('.pdf')) {
          pdfUrl = item.fileUrl;
          pdfName = item.name || 'Document.pdf';
          console.log(`Using fileUrl from item:`, pdfUrl);
        }
      }
      
      // If we still don't have a PDF URL, try fetching from Firebase directly
      if (!pdfUrl) {
        console.log('No PDF found in cached data, fetching from Firebase...');
        const db = getFirestore();
        if (!db) {
          throw new Error('Firebase not initialized');
        }
        
        try {
          const productRef = doc(db, 'products', String(productId));
          const productSnap = await getDoc(productRef);
          
          if (productSnap.exists()) {
            const productData = productSnap.data();
            
            // Check downloads array
            if (productData.downloads && Array.isArray(productData.downloads) && productData.downloads.length > 0) {
              const pdfFiles = productData.downloads.filter((download: any) => 
          download.file && download.file.toLowerCase().endsWith('.pdf')
        );
        
              if (pdfFiles.length > 0) {
                const selectedPdf = typeof downloadIndex === 'number' && downloadIndex < pdfFiles.length
                  ? pdfFiles[downloadIndex]
                  : pdfFiles[0];
                
                pdfUrl = selectedPdf.file;
                pdfName = selectedPdf.name || productData.name || 'Document.pdf';
                
                console.log(`Found PDF in Firebase downloads:`, selectedPdf);
              }
            }
            
            // Try direct PDF URL
            if (!pdfUrl && productData.pdfUrl) {
              pdfUrl = productData.pdfUrl;
              pdfName = productData.name || 'Document.pdf';
              console.log(`Using pdfUrl from Firebase:`, pdfUrl);
            }
            
            // Try file URL
            if (!pdfUrl && productData.fileUrl && productData.fileUrl.toLowerCase().endsWith('.pdf')) {
              pdfUrl = productData.fileUrl;
              pdfName = productData.name || 'Document.pdf';
              console.log(`Using fileUrl from Firebase:`, pdfUrl);
            }
          } else {
            console.log(`Product ${productId} not found in Firebase`);
          }
        } catch (error) {
          console.error('Error fetching product from Firebase:', error);
        }
      }
      
      // If we still don't have a PDF URL, throw an error
      if (!pdfUrl) {
        throw new Error('No PDF files found for this product');
      }
      
      // Add a security token or timestamp to prevent caching and direct access attempts
      const secureUrl = pdfUrl.includes('?') 
        ? `${pdfUrl}&secure=true&t=${Date.now()}` 
        : `${pdfUrl}?secure=true&t=${Date.now()}`;
      
      // Set state to show the PDF viewer with secure settings
      setSelectedProductId(productId);
      setSelectedPdfDetails({
        url: secureUrl,
        name: pdfName,
        preventDownload: true // Always enforce download protection
      });
      setShowPdfViewer(true);
      
      // Toggle expanded state to show PDF details
      toggleItemExpanded(productId);
    } catch (error) {
      console.error('Error setting up PDF viewer:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load PDF document');
    }
  };

  // Implement a close handler for the PDF viewer
  const handleClosePdfViewer = () => {
    setShowPdfViewer(false);
    setSelectedProductId(null);
    setSelectedPdfDetails(null);
  };

  // Toggle item expanded state
  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
    
    // If expanding and we don't have downloads for this product yet, fetch them
    if (!expandedItems[itemId] && !productDownloads[itemId]) {
      fetchProductDownloads(String(itemId));
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
        
        // Extract PDF files from the product
        const pdfs: Array<{id: string, name: string, file: string}> = [];
        
        // Check downloads array
        if (productData.downloads && Array.isArray(productData.downloads)) {
          productData.downloads.forEach((download: { id?: string; name?: string; file: string }) => {
            if (download.file && download.file.toLowerCase().endsWith('.pdf')) {
              pdfs.push({
                id: download.id || `pdf-${Date.now()}-${pdfs.length}`,
                name: download.name || 'PDF Document',
                file: download.file
              });
            }
          });
        }
        
        // Check if there's a direct PDF URL
        if (productData.pdfUrl && productData.pdfUrl.toLowerCase().endsWith('.pdf')) {
          pdfs.push({
            id: `pdf-direct-${Date.now()}`,
            name: productData.name || 'PDF Document',
            file: productData.pdfUrl
          });
        }
        
        // Check if there's a fileUrl that's a PDF
        if (productData.fileUrl && productData.fileUrl.toLowerCase().endsWith('.pdf')) {
          pdfs.push({
            id: `pdf-file-${Date.now()}`,
            name: productData.name || 'PDF Document',
            file: productData.fileUrl
          });
        }
        
          setProductDownloads(prev => ({
            ...prev,
            [productId]: pdfs
          }));
        } else {
        // Product not found - try to create a fallback entry using purchase data
        console.log(`Product ${productId} not found in Firebase, using fallback data`);
        
        // Check if we already have fallback data
        if (!productDetails[productId] || !productDetails[productId].isPlaceholder) {
          // Find the original purchase item for this product
          let originalItem: PurchaseItem | null = null;
          
          // Search through all purchases
          for (const purchase of purchases) {
            const foundItem = purchase.items.find((item: PurchaseItem) => String(item.id) === String(productId));
            if (foundItem) {
              originalItem = foundItem;
              break;
            }
          }
          
          if (originalItem) {
            // Create a fallback product entry
            const fallbackProduct = {
              id: productId,
              docId: 'unknown',
              name: originalItem.name || 'Unknown Product',
              description: originalItem.description || 'Product details not available',
              price: originalItem.price || '0',
              imageUrl: originalItem.imageUrl || '',
              category: originalItem.category || 'Resource',
              isPlaceholder: true
            };
            
            setProductDetails(prev => ({
              ...prev,
              [productId]: fallbackProduct
            }));
            
            // If the original item has PDF data, use it
            if (originalItem.downloads || originalItem.pdfUrl || originalItem.fileUrl) {
              const pdfs: Array<{id: string, name: string, file: string}> = [];
              
              // Process downloads
              if (originalItem.downloads && Array.isArray(originalItem.downloads)) {
                originalItem.downloads.forEach((download: { id: string; name: string; file: string }) => {
                  if (download.file && download.file.toLowerCase().endsWith('.pdf')) {
                    pdfs.push({
                      id: download.id || `pdf-${Date.now()}-${pdfs.length}`,
                      name: download.name || 'PDF Document',
                      file: download.file
                    });
                  }
                });
              }
              
              // Add direct PDF URL if available
              if (originalItem.pdfUrl && originalItem.pdfUrl.toLowerCase().endsWith('.pdf')) {
                pdfs.push({
                  id: `pdf-direct-${Date.now()}`,
                  name: originalItem.name || 'PDF Document',
                  file: originalItem.pdfUrl
                });
              }
              
              // Add file URL if it's a PDF
              if (originalItem.fileUrl && originalItem.fileUrl.toLowerCase().endsWith('.pdf')) {
                pdfs.push({
                  id: `pdf-file-${Date.now()}`,
                  name: originalItem.name || 'PDF Document',
                  file: originalItem.fileUrl
                });
              }
              
              if (pdfs.length > 0) {
                setProductDownloads(prev => ({
                  ...prev,
                  [productId]: pdfs
                }));
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching product details for ${productId}:`, error);
    } finally {
      setPdfLoadingStates(prev => ({...prev, [productId]: false}));
    }
  };

  // Check if a purchase item has PDF files
  const hasPdfFiles = (item: PurchaseItem): boolean => {
    const productId = String(item.id);
    const productDetail = productDetails[productId];
    
    // First check the item itself (from purchase data)
    // Check item downloads
    if (item.downloads && Array.isArray(item.downloads) && item.downloads.length > 0) {
      const hasPdf = item.downloads.some((download: {file: string, name: string, id: string}) => 
        download.file && 
        typeof download.file === 'string' && 
        download.file.toLowerCase().endsWith('.pdf')
      );
      
      if (hasPdf) {
        console.log(`Item ${productId} has PDFs in purchase data downloads`, item.downloads);
        return true;
      }
    }
    
    // Check item PDF URL
    if (item.pdfUrl && typeof item.pdfUrl === 'string') {
      console.log(`Item ${productId} has PDF URL in purchase data`, item.pdfUrl);
      return true;
    }
    
    // Check item file URL
    if (item.fileUrl && typeof item.fileUrl === 'string' && item.fileUrl.toLowerCase().endsWith('.pdf')) {
      console.log(`Item ${productId} has PDF file URL in purchase data`, item.fileUrl);
      return true;
    }
    
    // Then check product details (from Firebase)
    if (productDetail) {
      // Check product downloads
      if (productDetail.downloads && Array.isArray(productDetail.downloads) && productDetail.downloads.length > 0) {
        const hasPdf = productDetail.downloads.some((download: any) => 
          download.file && 
          typeof download.file === 'string' && 
          download.file.toLowerCase().endsWith('.pdf')
        );
        
        if (hasPdf) {
          console.log(`Product ${productId} has PDFs in Firebase downloads`, productDetail.downloads);
          return true;
        }
      }
      
      // Check product PDF URL
      if (productDetail.pdfUrl && typeof productDetail.pdfUrl === 'string') {
        console.log(`Product ${productId} has PDF URL in Firebase`, productDetail.pdfUrl);
        return true;
      }
      
      // Check product file URL
      if (productDetail.fileUrl && typeof productDetail.fileUrl === 'string' && productDetail.fileUrl.toLowerCase().endsWith('.pdf')) {
        console.log(`Product ${productId} has PDF file URL in Firebase`, productDetail.fileUrl);
        return true;
      }
      
      // Check pdfFiles array
      if (productDetail.pdfFiles && Array.isArray(productDetail.pdfFiles) && productDetail.pdfFiles.length > 0) {
        console.log(`Product ${productId} has pdfFiles array in Firebase`, productDetail.pdfFiles);
        return true;
      }
    }
    
    return false;
  };

  // Function to calculate days remaining for a subscription
  const calculateDaysRemaining = (endDateStr: string): number => {
    const endDate = new Date(endDateStr);
    const now = new Date();
    
    // If already expired, return 0
    if (endDate <= now) return 0;
    
    // Calculate days remaining
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };
  
  // Update the subscription processing to include price information
  useEffect(() => {
    const newSubscriptions: Record<string, any> = {};
    
    purchases.forEach(purchase => {
      // Check each purchase for subscription information
      if (purchase.subscription) {
        const { plan, endDate, billingCycle } = purchase.subscription;
        if (endDate) {
          const endDateObj = new Date(endDate);
          const daysRemaining = calculateDaysRemaining(endDate);
          const isActive = daysRemaining > 0;
          
          // Try to get price from subscription items
          let price: number = 0; // Initialize to 0 instead of undefined
          let totalItemsPrice: number = 0;
          
          if (purchase.items && purchase.items.length > 0) {
            // Find subscription item
            const subscriptionItem = purchase.items.find(item => item.type === 'plan');
            if (subscriptionItem && subscriptionItem.price) {
              // Try to parse price as number
              if (typeof subscriptionItem.price === 'string') {
                const cleanPrice = subscriptionItem.price.replace(/[^0-9.-]+/g, '');
                price = parseFloat(cleanPrice);
                if (isNaN(price)) price = 0; // Use 0 instead of undefined
              } else if (typeof subscriptionItem.price === 'number') {
                price = subscriptionItem.price;
              }
            }
            
            // Sum up prices of all items in the subscription
            purchase.items.forEach(item => {
              let itemPrice = 0;
              if (typeof item.price === 'string') {
                const cleanPrice = item.price.replace(/[^0-9.-]+/g, '');
                itemPrice = parseFloat(cleanPrice);
                if (!isNaN(itemPrice)) {
                  totalItemsPrice += itemPrice * (item.quantity || 1);
                }
              } else if (typeof item.price === 'number') {
                totalItemsPrice += item.price * (item.quantity || 1);
              }
            });
          }
          
          // If we couldn't find a price from the plan item, try to use total
          if (price === 0 && purchase.total) {
            let totalPrice = 0;
            if (typeof purchase.total === 'string') {
              const cleanTotal = purchase.total.replace(/[^0-9.-]+/g, '');
              totalPrice = parseFloat(cleanTotal);
              if (!isNaN(totalPrice)) {
                price = totalPrice;
              }
            } else if (typeof purchase.total === 'number') {
              price = purchase.total;
            }
          }
          
          // If we still don't have a price but have total items price, use that
          if (price === 0 && totalItemsPrice > 0) {
            price = totalItemsPrice;
          }
          
          newSubscriptions[purchase.id] = {
            endDate: endDateObj,
            daysRemaining,
            isActive,
            billingCycle: billingCycle || 'monthly',
            plan: plan || 'premium',
            price: price,
            totalItemsPrice: totalItemsPrice
          };
        }
      }
    });
    
    setSubscriptions(newSubscriptions);
  }, [purchases]);

  // Add a useEffect to load the user's accumulated subscription value
  useEffect(() => {
    if (isLoggedIn && user && user.membershipInfo) {
      // Get total subscription value from the user's profile
      const totalSpend = user.membershipInfo.totalSpend || 0;
      setTotalSubscriptionValue(totalSpend);
    }
  }, [isLoggedIn, user]);

  // Update the renderPurchaseItems function to display product information from Firebase
  const renderPurchaseItems = (items: PurchaseItem[]) => {
    console.log("Rendering purchase items:", items);
    
    if (!items || items.length === 0) {
      return <div className="text-gray-500 italic p-4">No items in this purchase</div>;
    }
    
    return items.map((item, index) => {
      const productId = String(item.id);
      console.log(`Rendering item ${productId}:`, item);
      
      const productDetail = productDetails[productId];
      console.log(`Product detail for ${productId}:`, productDetail);
      
      const isSubscription = item.type === 'plan';
      const subscriptionInfo = isSubscription ? subscriptions[productId] : null;
      
      // Determine the product name and image with proper fallbacks
      const productName = productDetail?.name || item.name || `Product #${productId.substring(0, 8)}`;
      const productTitle = item.title || '';
      const productCategory = productDetail?.category || item.category || 'Resource';
      const productImage = productDetail?.imageUrl || item.imageUrl || '';
      const isPlaceholder = productDetail?.isPlaceholder === true;
      
      // Log to help debugging
      if (productName === 'Unknown Product') {
        console.warn(`Item ${productId} still showing as Unknown Product`, { item, productDetail });
      }
      
      return (
        <div key={`${productId}-${index}`} className="flex flex-col sm:flex-row py-4 px-6 rounded-xl shadow-sm bg-white border border-gray-100 hover:border-[#2bcd82] transition-all duration-200">
          <div className="sm:w-20 md:w-28 flex-shrink-0 mb-3 sm:mb-0 mr-4">
            {productImage ? (
              <img 
                src={productImage} 
                alt={productName}
                className="w-full h-auto rounded-md object-cover shadow-sm"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-image.jpg';
                }}
              />
            ) : (
              <div className="w-full h-24 bg-gray-100 rounded-md flex items-center justify-center">
                <FileText className="text-gray-400" size={24} />
              </div>
            )}
          </div>
          
          <div className="flex-grow flex flex-col justify-center">
            <div className="flex flex-wrap items-start justify-between">
              <div className="mr-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  {productName}
                  {isPlaceholder && (
                    <span className="ml-2 text-sm bg-orange-100 text-orange-800 py-1 px-2 rounded-md">
                      Archive Item
                  </span>
                  )}
                </h3>
                {productTitle && (
                  <p className="text-gray-700 font-medium">{productTitle}</p>
                )}
                <span className="text-sm text-gray-500">{productCategory}</span>
              </div>
              
              <div className="text-right">
                <div className="text-lg font-medium text-[#2bcd82]">
                  {formatPrice(item.price)}
                </div>
                <div className="text-sm text-gray-500">
                  Qty: {item.quantity || 1}
                </div>
              </div>
            </div>
            
            <div className="mt-2 flex flex-wrap items-center gap-2">
                  {hasPdfFiles(item) && (
                    <span className="text-sm px-2 py-0.5 bg-[#e8faf1] rounded-full text-[#25b975] flex items-center">
                      <FileText className="w-3 h-3 mr-1" />
                  PDF included
                    </span>
                  )}
                  
                  <span className="text-sm px-2 py-0.5 bg-green-50 rounded-full text-green-700 flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Purchased
              </span>
              
              {isSubscription && subscriptionInfo && (
                <span className={`text-sm px-2 py-0.5 ${
                  subscriptionInfo.isActive 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-red-50 text-red-700'
                } rounded-full flex items-center`}>
                  {subscriptionInfo.isActive 
                    ? <><CheckCircle className="w-3 h-3 mr-1" /> Active</> 
                    : <><AlertCircle className="w-3 h-3 mr-1" /> Expired</>
                  }
          </span>
                    )}
            </div>
          </div>
          
          <div className="mt-3 flex justify-end">
            {!isSubscription && hasPdfFiles(item) && (
                      <button
                className="flex items-center h-18 px-2 ml-4 bg-[#2bcd82] hover:bg-[#25b975] text-white rounded-lg transition-colors duration-200 shadow-sm hover:shadow group"
                onClick={() => handleViewPdf(productId)}
              >
                <FileText className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                <span className="font-medium">View PDF</span>
                      </button>
            )}
            
            {isSubscription && subscriptionInfo?.isActive && (
            <button 
                className="flex items-center py-2.5 px-4 bg-[#2bcd82] hover:bg-[#25b975] text-white rounded-lg transition-colors duration-200 shadow-sm hover:shadow group"
                onClick={() => navigate('/settings')}
            >
                <Settings className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Manage Subscription</span>
            </button>
            )}
              </div>
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

  // Toggle expand/collapse for a date group
  const toggleDateExpanded = (dateKey: string) => {
    setExpandedDates(prev => {
      const newState = { ...prev };
      newState[dateKey] = !prev[dateKey];
      return newState;
    });
  };

  // Count visible purchases
  const countVisiblePurchases = () => {
    return filteredPurchases.length;
  };

  // Fix the reference to loadPurchases in the UI
  const handleRetryLoading = () => {
    if (isLoggedIn && user) {
      setLoading(true);
      setError(null);
      // Re-trigger the useEffect by updating a dependency
      const loadingTimestamp = Date.now();
      setLoadingKey(loadingTimestamp);
    }
  };

  // Add the missing findPurchaseItemById function
  const findPurchaseItemById = (productId: string): PurchaseItem | null => {
    for (const purchase of purchases) {
      if (purchase.items && Array.isArray(purchase.items)) {
        const foundItem = purchase.items.find((item: PurchaseItem) => String(item.id) === productId);
        if (foundItem) {
          return foundItem;
        }
      }
    }
    return null;
  };

  // If user is not logged in, show a message
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-800 mb-2">Login Required</h3>
            <p className="text-gray-600 mb-6">Please log in to view your purchase history</p>
            <Button 
              onClick={() => navigate('/login')}
              className="bg-[#2bcd82] hover:bg-[#25b975] text-white"
            >
              Login
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
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-12 bg-white rounded-2xl p-8 shadow-sm">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#2bcd82] to-[#25b975]">Your Purchases</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            View and manage your purchase history and downloads
          </p>
          <div className="mt-6 max-w-sm mx-auto h-1 bg-gradient-to-r from-[#2bcd82] to-transparent rounded-full"></div>
        </div>
        
        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2bcd82]"></div>
            <span className="ml-3 text-gray-700">Loading your purchases...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 bg-white rounded-2xl shadow-sm">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">Error Loading Purchases</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex justify-center mt-4">
            <Button 
                onClick={handleRetryLoading}
                className="bg-[#2bcd82] hover:bg-[#25b975] text-white flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Try Again
            </Button>
          </div>
          </div>
        ) : purchases.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-800 mb-2">No Purchases Yet</h3>
            <p className="text-gray-600 mb-6">You haven't made any purchases yet.</p>
            <Button 
              onClick={() => navigate('/catalog')}
              className="bg-[#2bcd82] hover:bg-[#25b975] text-white"
            >
              Browse Products
            </Button>
          </div>
        ) : (
          <div>
            {/* Purchase Search and Filters */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative w-full md:w-96">
                  <input
                    type="text"
                    placeholder="Search purchases..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-[#2bcd82] focus:border-[#2bcd82]"
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  {searchTerm && (
                    <button 
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      onClick={() => setSearchTerm('')}
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  )}
                  </div>
                
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center bg-[#ff6b6b] hover:bg-[#ff5252] text-white"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
                  </div>
              
              {/* Filters Section */}
              {showFilters && (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#2bcd82] focus:border-[#2bcd82]"
                    >
                      <option value="all">All Statuses</option>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                  
                  {/* Item Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Type</label>
                    <select
                      value={itemTypeFilter}
                      onChange={(e) => setItemTypeFilter(e.target.value as ItemTypeFilter)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#2bcd82] focus:border-[#2bcd82]"
                    >
                      <option value="all">All Types</option>
                      <option value="product">Products</option>
                      <option value="plan">Subscriptions</option>
                    </select>
                  </div>
                  
                  {/* Sort Option */}
                            <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value as SortOption)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#2bcd82] focus:border-[#2bcd82]"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="highest">Highest Price</option>
                      <option value="lowest">Lowest Price</option>
                    </select>
                                </div>
                  
                  {/* Reset Button */}
                  <div className="flex items-end">
                    <Button
                      onClick={resetFilters}
                      className="w-full bg-[#2bcd82] hover:bg-[#25b975] text-white"
                    >
                      Reset Filters
                    </Button>
                              </div>
                            </div>
              )}
                            </div>

            {/* Results Count */}
            <div className="text-gray-600 mb-6 bg-white rounded-lg p-4 shadow-sm">
              Found {countVisiblePurchases()} purchase{countVisiblePurchases() !== 1 ? 's' : ''}
              {searchTerm && ` matching "${searchTerm}"`}
                          </div>

            {/* Manual display of purchases if filtered out */}
            {filteredPurchases.length === 0 && purchases.length > 0 && (
              <div>
                <div className="bg-yellow-50 p-3 rounded mb-4">
                  <p className="text-yellow-700 mb-2">
                    <strong>Notice:</strong> Your purchases are being filtered out. Showing all purchases instead.
                  </p>
                  <button 
                    onClick={resetFilters}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Reset Filters
                          </button>
                          </div>
                          
                <div className="space-y-4">
                  {purchases.map((purchase, index) => (
                    <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex justify-between items-start mb-3">
                              <div>
                          <h4 className="font-medium">Order #{purchase.id.substring(0, 8)}</h4>
                          <p className="text-sm text-gray-500">
                            {new Date(purchase.purchaseDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatPrice(purchase.total)}</div>
                          <div className="text-sm text-gray-500">{purchase.status}</div>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-3 mt-3">
                        <h5 className="text-sm font-medium mb-2">Items:</h5>
                        {purchase.items && purchase.items.length > 0 ? (
                          <ul className="space-y-2">
                            {purchase.items.map((item, idx) => (
                              <li key={idx} className="flex justify-between items-center py-1 px-2 bg-gray-50 rounded">
                                <div>{item.name || `Product #${item.id}`}</div>
                                <div>{formatPrice(item.price)}</div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500 text-sm">No items in this purchase</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No matches message */}
            {filteredPurchases.length === 0 && purchases.length === 0 && (
              <div className="text-center py-12 bg-gray-100 rounded-lg">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-800 mb-2">No Matches Found</h3>
                <p className="text-gray-600 mb-6">Try adjusting your search or filters</p>
                <Button
                  onClick={resetFilters}
                  className="bg-[#2bcd82] hover:bg-[#25b975] text-white"
                >
                  Reset Filters
                </Button>
              </div>
            )}

            {/* Regular purchase display if filtering works */}
            {filteredPurchases.length > 0 && (
              <div className="space-y-8">
                {Object.entries(groupedPurchases).map(([dateKey, purchasesInGroup]) => (
                  <div key={dateKey} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div 
                      className="bg-gray-100 px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={() => toggleDateExpanded(dateKey)}
                    >
                      <h3 className="text-lg font-semibold text-gray-800">{getDateLabel(dateKey)}</h3>
                      <div className="flex items-center">
                        <span className="text-gray-600 text-sm mr-3">{purchasesInGroup.length} purchase{purchasesInGroup.length !== 1 ? 's' : ''}</span>
                        <button className="p-1 hover:bg-gray-300 rounded-full">
                          {expandedDates[dateKey] ? (
                            <ChevronUp className="h-5 w-5 text-gray-600" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {expandedDates[dateKey] && (
                      <div className="divide-y divide-gray-100">
                        {purchasesInGroup.map((purchase) => (
                          <div 
                            key={purchase.id}
                            className={`px-6 py-4 ${
                              expandedPurchases[purchase.id] ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div 
                              className="flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer"
                              onClick={() => togglePurchaseExpanded(purchase.id)}
                            >
                              <div >
                                <div className="flex items-center mb-1">
                                  <span className="font-medium text-gray-800">Order #{purchase.id.substring(0, 8)}</span>
                                  <div className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
                                    {purchase.status}
                                  </div>
                                </div>
                                  <div className="text-sm text-gray-600">
                                  {new Date(purchase.purchaseDate).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                  </div>
                              </div>
                              
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                                <div className="flex items-center">
                                  <CircleDollarSign className="h-4 w-4 text-green-600 mr-1.5" />
                                  <span className="font-medium">{formatPrice(purchase.total)}</span>
                            </div>
                                
                                <div className="flex items-center">
                                  {renderPaymentMethod(purchase.paymentMethod)}
                                </div>
                                
                                <button className="p-1 hover:bg-gray-100 rounded-full">
                                  {expandedPurchases[purchase.id] ? (
                                    <ChevronUp className="h-5 w-5 text-gray-600" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5 text-gray-600" />
                                  )}
                                </button>
                              </div>
                        </div>
                        
                            {expandedPurchases[purchase.id] && (
                              <div className="mt-4 pt-4 border-t border-gray-100">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Purchase Items</h4>
                                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          {renderPurchaseItems(purchase.items)}
                          </div>
                        </div>
                      )}
                      </div>
                    ))}
                  </div>
                    )}
                </div>
              ))}
          </div>
        )}
          </div>
        )}
        
        {/* PDF Viewer */}
        {showPdfViewer && selectedPdfDetails && selectedProductId && (
        <SecurePdfViewer 
          productId={selectedProductId}
          pdfDetails={{
            url: selectedPdfDetails.url,
            name: selectedPdfDetails.name,
              preventDownload: true
          }}
            onClose={handleClosePdfViewer}
        />
      )}
      </main>

      <Footer />
    </div>
  );
};

export default UserPurchasesPage; 