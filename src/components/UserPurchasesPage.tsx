import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Button from './Button';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/formatters';
import { Download, Package, Clock, CircleDollarSign } from 'lucide-react';

const UserPurchasesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn, user, getUserPurchaseHistory, loading: authLoading } = useAuth();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPurchases = async () => {
      if (!isLoggedIn || !user) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        const userPurchases = await getUserPurchaseHistory();
        setPurchases(userPurchases);
      } catch (err) {
        console.error('Error loading purchases:', err);
        setError('Failed to load your purchase history. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    // Wait for auth to load, then load purchases
    if (!authLoading) {
      loadPurchases();
    }
  }, [isLoggedIn, user, getUserPurchaseHistory, navigate, authLoading]);

  const renderPurchaseItems = (items: any[]) => {
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
              {item.type === 'plan' ? 'Membership Plan' : 'Resource'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-medium">${parseFloat(item.price).toFixed(2)}</p>
          <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
        </div>
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">My Purchases</h1>
        <p className="text-gray-600 mb-8">View your purchase history and downloads</p>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2bcd82]"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        ) : purchases.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">No Purchases Yet</h2>
            <p className="text-gray-500 mb-6">You haven't made any purchases yet.</p>
            <Button
              variant="primary"
              size="large"
              onClick={() => navigate('/catalog')}
            >
              Browse Resources
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {purchases.map((purchase, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex flex-wrap justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-1">
                        Order #{purchase.id.substring(0, 8)}
                      </h3>
                      <div className="flex items-center text-gray-500 text-sm">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{formatDate(purchase.purchaseDate)}</span>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-800 mt-2 md:mt-0">
                      <CircleDollarSign className="w-5 h-5 mr-1 text-[#2bcd82]" />
                      <span className="font-bold">${parseFloat(purchase.total).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap text-sm text-gray-500">
                    <div className="mr-4 mb-1">
                      <span className="font-medium">Payment Method:</span> {purchase.paymentMethod}
                    </div>
                    <div className="mr-4 mb-1">
                      <span className="font-medium">Transaction ID:</span> {purchase.transactionId.substring(0, 12)}...
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <h4 className="font-medium text-gray-700 mb-4">Items Purchased</h4>
                  <div className="space-y-1">
                    {renderPurchaseItems(purchase.items)}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-6 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">Need help with your purchase?</p>
                    <a href="/contact" className="text-[#2bcd82] hover:text-[#25b975] text-sm font-medium">
                      Contact Support
                    </a>
                  </div>
                  {purchase.items.some((item: any) => item.type === 'product') && (
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => navigate('/dashboard')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Downloads
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default UserPurchasesPage; 