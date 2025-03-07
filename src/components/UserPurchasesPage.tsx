import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Button from './Button';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/formatters';
import { Download, Package, Clock, CircleDollarSign, RefreshCw, User, CreditCard, Calendar } from 'lucide-react';

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

  const loadPurchases = async () => {
    if (!isLoggedIn || !user) {
      navigate('/signin');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const userPurchases = await getUserPurchaseHistory();
      
      // Ensure consistent data format
      const normalizedPurchases: Purchase[] = userPurchases.map((purchase: any) => {
        // Ensure items array is properly formatted
        const items = Array.isArray(purchase.items) ? purchase.items.map((item: any) => ({
          id: item.id || 0,
          type: item.type || 'product',
          name: item.name || 'Unknown Product',
          description: item.description || '',
          category: item.category || 'Resource',
          price: typeof item.price === 'string' ? item.price : String(item.price || 0),
          quantity: item.quantity || 1,
          imageUrl: item.imageUrl || ''
        })) : [];
        
        return {
          id: purchase.id || '',
          items: items,
          total: typeof purchase.total === 'string' ? purchase.total : String(purchase.total || 0),
          transactionId: purchase.transactionId || 'N/A',
          paymentMethod: purchase.paymentMethod || 'unknown',
          purchaseDate: purchase.purchaseDate || (purchase.createdAt ? purchase.createdAt.toDate?.().toISOString() : new Date().toISOString()),
          status: purchase.status || 'completed',
          billingInfo: purchase.billingInfo || {}
        };
      });
      
      // Sort purchases by date (newest first)
      const sortedPurchases = normalizedPurchases.sort((a, b) => {
        return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
      });
      
      setPurchases(sortedPurchases);
      
      // Group purchases by date
      const grouped = groupPurchasesByDate(sortedPurchases);
      setGroupedPurchases(grouped);
    } catch (err) {
      console.error('Error loading purchases:', err);
      setError('Failed to load your purchase history. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to group purchases by date
  const groupPurchasesByDate = (purchaseList: Purchase[]): GroupedPurchases => {
    const grouped: GroupedPurchases = {};
    
    purchaseList.forEach(purchase => {
      // Extract just the date part (YYYY-MM-DD) from the purchase date
      const purchaseDate = new Date(purchase.purchaseDate);
      const dateKey = purchaseDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      grouped[dateKey].push(purchase);
    });
    
    return grouped;
  };
  
  // Get a formatted date label for a group header
  const getDateLabel = (dateKey: string): string => {
    const date = new Date(dateKey);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if it's today
    if (dateKey === today.toISOString().split('T')[0]) {
      return 'Today';
    }
    
    // Check if it's yesterday
    if (dateKey === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    }
    
    // Otherwise use the formatted date
    return formatDate(date, 'long');
  };

  useEffect(() => {
    // Wait for auth to load, then load purchases
    if (!authLoading) {
      loadPurchases();
    }
  }, [isLoggedIn, user, getUserPurchaseHistory, navigate, authLoading]);

  const renderPurchaseItems = (items: PurchaseItem[]) => {
    if (!items || items.length === 0) {
      return <p className="text-gray-500 text-center py-4">No items in this purchase</p>;
    }
    
    return items.map((item, index) => (
      <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden mr-4">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Package className="w-6 h-6" />
              </div>
            )}
          </div>
          <div>
            <h4 className="font-medium text-gray-800">{item.name}</h4>
            <p className="text-sm text-gray-500">
              {item.type === 'plan' ? 'Membership Plan' : item.category || 'Resource'}
            </p>
          </div>
        </div>
        <div className="flex items-center">
          <span className="font-medium text-gray-700 mr-4">
            ${parseFloat(item.price).toFixed(2)} × {item.quantity || 1}
          </span>
          
          {item.type !== 'plan' && (
            <button 
              className="p-2 rounded-lg bg-[#2bcd82]/10 text-[#2bcd82] hover:bg-[#2bcd82]/20 transition-colors"
              onClick={() => navigate(`/resource/${item.id}`)}
            >
              <Download className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    ));
  };

  // Render payment method with icon
  const renderPaymentMethod = (method: string) => {
    const paymentMethod = method.toLowerCase();
    
    if (paymentMethod.includes('stripe') || paymentMethod.includes('card')) {
      return (
        <div className="flex items-center text-sm text-gray-600">
          <CreditCard className="w-4 h-4 mr-1" />
          <span>Credit Card</span>
        </div>
      );
    } else if (paymentMethod.includes('paypal')) {
      return (
        <div className="flex items-center text-sm text-gray-600">
          <CircleDollarSign className="w-4 h-4 mr-1" />
          <span>PayPal</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center text-sm text-gray-600">
        <CircleDollarSign className="w-4 h-4 mr-1" />
        <span>Other</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Page Header - Updated to match MonthlyArticlesPage style */}
        <div className="text-center mb-12 bg-white rounded-2xl p-8 shadow-sm">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#2bcd82] to-[#25b975]">My Purchases</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Track your transaction history and download your purchased resources.
          </p>
          <div className="mt-6 max-w-sm mx-auto h-1 bg-gradient-to-r from-[#2bcd82] to-transparent rounded-full"></div>
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 border-4 border-[#2bcd82] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading your purchases...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-6 rounded-lg text-center">
            <p className="mb-4">{error}</p>
            <Button 
              variant="secondary" 
              onClick={loadPurchases}
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Try Again
            </Button>
          </div>
        ) : purchases.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Purchases Yet</h2>
            <p className="text-gray-600 mb-6">You haven't made any purchases yet. Explore our catalog to find resources.</p>
            <Button 
              variant="primary" 
              onClick={() => navigate('/catalog')}
            >
              Browse Resources
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Purchase List Grouped by Date */}
            <div className="lg:col-span-2">
              {Object.entries(groupedPurchases).map(([dateKey, datePurchases]) => (
                <div key={dateKey} className="mb-8">
                  {/* Date Group Header */}
                  <div className="flex items-center mb-4">
                    <Calendar className="text-[#2bcd82] w-5 h-5 mr-2" />
                    <h2 className="text-xl font-bold text-gray-700">{getDateLabel(dateKey)}</h2>
                  </div>
                  
                  {/* Purchases for this date */}
                  <div className="space-y-6">
                    {datePurchases.map((purchase, index) => (
                      <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden">
                        {/* Purchase Header */}
                        <div className="bg-gray-50 p-4 border-b border-gray-100">
                          <div className="flex flex-wrap justify-between items-center">
                            <div>
                              <h3 className="font-semibold text-gray-800">
                                Order #{purchase.transactionId?.slice(-8) || `P${index + 1}`}
                              </h3>
                              <div className="flex items-center mt-1 space-x-3">
                                <div className="text-sm text-gray-500 flex items-center">
                                  <Clock className="w-4 h-4 mr-1" />
                                  {/* Show time only since we're already grouping by date */}
                                  {new Date(purchase.purchaseDate).toLocaleTimeString(undefined, {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                                {renderPaymentMethod(purchase.paymentMethod)}
                              </div>
                            </div>
                            <div className="flex items-center bg-[#2bcd82]/10 px-3 py-1 rounded text-[#2bcd82] font-medium">
                              <CircleDollarSign className="w-4 h-4 mr-2" />
                              ${parseFloat(purchase.total).toFixed(2)}
                            </div>
                          </div>
                          
                          {/* Billing info if available */}
                          {purchase.billingInfo && (purchase.billingInfo.firstName || purchase.billingInfo.email) && (
                            <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600 flex items-start">
                              <User className="w-4 h-4 mr-2 mt-0.5" />
                              <div>
                                {purchase.billingInfo.firstName && purchase.billingInfo.lastName && (
                                  <div>{purchase.billingInfo.firstName} {purchase.billingInfo.lastName}</div>
                                )}
                                {purchase.billingInfo.email && (
                                  <div>{purchase.billingInfo.email}</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Purchase Items */}
                        <div className="p-4">
                          {renderPurchaseItems(purchase.items)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Right Column - Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Account Summary</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Total Purchases</span>
                    <span className="font-semibold">{purchases.length}</span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Total Items</span>
                    <span className="font-semibold">
                      {purchases.reduce((count, purchase) => {
                        return count + (purchase.items?.length || 0);
                      }, 0)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Total Spent</span>
                    <span className="font-bold text-[#2bcd82]">
                      ${purchases.reduce((total, purchase) => {
                        return total + parseFloat(purchase.total || '0');
                      }, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className="mt-6">
                  <Button 
                    variant="primary" 
                    size="large"
                    onClick={() => navigate('/catalog')}
                    className="w-full"
                  >
                    Browse More Resources
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default UserPurchasesPage; 