import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { Search, Filter, Grid, ShoppingCart, Loader, FileText } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWooCommerce } from '../context/WooCommerceContext';
import { Product, Category } from '../types';
import { toast } from 'react-hot-toast';

const CatalogPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const navigate = useNavigate();
  
  const { products, categories, loading, error } = useWooCommerce();
  
  // Default addToCart function that shows error toast
  let addToCart = (_resource: any) => {
    toast.error("Unable to add to cart. Please try reloading the page.");
  };
  
  // Try to get real addToCart function from context
  try {
    const cart = useCart();
    addToCart = cart.addToCart;
    // If we get here, the cart is loaded
    if (!isCartLoaded) setIsCartLoaded(true);
  } catch (error) {
    console.error("Failed to load cart in catalog:", error);
  }
  
  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      searchTerm === '' ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === 'all' || 
      product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Resource Catalog</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Browse our collection of speech therapy resources, worksheets, and materials designed by experienced SLPs.
          </p>
        </div>
        
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm mb-8 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2bcd82] focus:border-transparent"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="text-gray-500 w-5 h-5" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2bcd82] focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
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
            {filteredProducts.map((product) => (
              <div onClick={() => navigate(`/resource/${product.id}`)} key={product.id} className="bg-white cursor-pointer rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full border border-gray-100">
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
                </div>
                
                <div className="p-5 flex flex-col flex-grow">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 hover:text-[#2bcd82] transition-colors">
                    {product.name}
                  </h3>
                  
                  <p className="text-gray-600 mb-4 text-sm line-clamp-3 flex-grow">
                    {product.description}
                  </p>
                  
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-[#fb6a69] font-bold">${product.price.toFixed(2)}</span>
                    
                    <div className="flex space-x-2">
                      <button 
                        className="text-white bg-[#2bcd82] flex items-center gap-2 hover:bg-[#25b975] p-2 rounded-lg transition-colors"
                        onClick={() => {
                          addToCart({
                            id: product.id,
                            title: product.name,
                            price: Number(product.price),
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