import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { Search, Filter, Grid, ShoppingCart, Loader, Tag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWooCommerce } from '../context/WooCommerceContext';
import { toast } from 'react-hot-toast';
import { Product, Category } from '../types';

// Helper function to calculate the "original" price
// This creates a fake original price that's 10-20% higher than the actual price
const calculateOriginalPrice = (actualPrice: number): number => {
  // Random discount between 10% and 20%
  const discountPercentage = Math.floor(Math.random() * 11) + 10; // 10-20
  
  // Calculate the "original" price
  const originalPrice = actualPrice * (100 / (100 - discountPercentage));
  
  // Round to 2 decimal places
  return Math.round(originalPrice * 100) / 100;
};

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

const CatalogPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const { addToCart } = useCart();
  const navigate = useNavigate();
  
  const { products, categories, loading, error } = useWooCommerce();
  
  // Filter products based on search and category
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        product.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Create a mapping of product IDs to their "original" prices
  // Using useMemo to ensure this is only recalculated when products change
  const originalPrices = useMemo(() => {
    const priceMap: Record<string, number> = {};
    
    products.forEach((product: Product) => {
      priceMap[product.id] = calculateOriginalPrice(product.price);
    });
    
    return priceMap;
  }, [products]);
  
  // Calculate the discount percentage for a product
  const getDiscountPercentage = (actualPrice: number, originalPrice: number): number => {
    return Math.round(((originalPrice - actualPrice) / originalPrice) * 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Page Header - Updated to match MonthlyArticlesPage style */}
        <div className="text-center mb-12 bg-white rounded-2xl p-8 shadow-sm">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#2bcd82] to-[#25b975]">Resource Catalog</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Browse our collection of speech therapy resources, worksheets, and materials designed by experienced SLPs.
          </p>
          <div className="mt-6 max-w-sm mx-auto h-1 bg-gradient-to-r from-[#2bcd82] to-transparent rounded-full"></div>
        </div>
        
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
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2bcd82] focus:border-[#2bcd82] transition-colors"
              >
                <option value="all">All Categories</option>
                {categories.map((category: Category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
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
        
        {/* Error State */}
        {error && (
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
        
        {/* Grid View (Now the only view) */}
        {!loading && !error && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product: Product) => (
              <div onClick={() => navigate(`/catalog/${product.id}`)} key={product.id} className="bg-white cursor-pointer rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full border border-gray-100">
                <div className="relative h-48 overflow-hidden bg-gray-100">
                  {product.thumbnail ? (
                    <img 
                      src={product.thumbnail} 
                      alt={product.name} 
                      className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-200">
                      <p className="text-gray-400">No image</p>
                    </div>
                  )}
                  
                  {/* Sale Tag */}
                  <div className="absolute top-0 right-0 bg-[#fb6a69] text-white px-3 py-1 rounded-bl-lg text-sm font-bold flex items-center">
                    <Tag className="w-4 h-4 mr-1" />
                    {getDiscountPercentage(product.price, originalPrices[product.id])}% OFF
                  </div>
                </div>
                
                <div className="p-5 flex flex-col flex-grow">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 hover:text-[#2bcd82] transition-colors">
                    {product.name}
                  </h3>
                  
                  <p className="text-gray-600 mb-4 text-sm line-clamp-3 flex-grow">
                    {product.description}
                  </p>
                  
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex flex-col">
                      {/* Original Price (crossed out) */}
                      <span className="text-gray-500 line-through text-sm">
                        {formatCurrency(originalPrices[product.id])}
                      </span>
                      
                      {/* Sale Price */}
                      <span className="text-[#fb6a69] font-bold text-lg">
                        {formatCurrency(product.price)}
                      </span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button 
                        className="text-white bg-[#2bcd82] flex items-center gap-2 hover:bg-[#25b975] p-2 rounded-lg transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart({
                            id: parseInt(product.id, 10),
                            title: product.name,
                            description: product.description || '',
                            category: 'Uncategorized', // Use a default category for cart display
                            imageUrl: product.thumbnail || '',
                            price: product.price.toString(),
                            quantity: 1
                          });
                          toast.success(`${product.name} added to cart!`);
                        }}
                      >
                        <ShoppingCart size={20} /> Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default CatalogPage;