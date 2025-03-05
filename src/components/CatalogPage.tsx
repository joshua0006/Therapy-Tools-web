import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { Search, Filter, Grid, List, Eye } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { toast } from 'react-hot-toast';

interface ResourceItem {
  id: number;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  price: string;
}

const CatalogPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const navigate = useNavigate();
  
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
  
  // Dummy data for resources
  const resources: ResourceItem[] = [
    {
      id: 1,
      title: "Articulation Worksheets Bundle",
      description: "Comprehensive collection of articulation worksheets for various speech sounds.",
      category: "Worksheets",
      imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      price: "$19.99"
    },
    {
      id: 2,
      title: "Language Development Assessment",
      description: "Complete assessment toolkit for evaluating language development in children.",
      category: "Assessments",
      imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      price: "$24.99"
    },
    {
      id: 3,
      title: "Speech Therapy Games Collection",
      description: "Fun and engaging games designed to support speech therapy sessions.",
      category: "Activities",
      imageUrl: "https://images.unsplash.com/photo-1516733968668-dbdce39c4651?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      price: "$29.99"
    },
    {
      id: 4,
      title: "Fluency Building Exercises",
      description: "Targeted exercises to help clients build fluency and confidence in speaking.",
      category: "Exercises",
      imageUrl: "https://images.unsplash.com/photo-1551818255-e6e10975bc17?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      price: "$15.99"
    },
    {
      id: 5,
      title: "Social Communication Toolkit",
      description: "Resources for developing social communication skills in diverse settings.",
      category: "Toolkits",
      imageUrl: "https://images.unsplash.com/photo-1573497161161-c3e73707e25c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      price: "$22.99"
    },
    {
      id: 6,
      title: "Voice Therapy Guide",
      description: "Comprehensive guide for voice therapy techniques and exercises.",
      category: "Guides",
      imageUrl: "https://images.unsplash.com/photo-1490810194309-344b3661ba39?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      price: "$18.99"
    }
  ];

  const handleAddToCart = (resource: ResourceItem) => {
    try {
      addToCart({
        ...resource,
        quantity: 1
      });
      
      // Show notification using toast
      toast.success(`Added ${resource.title} to cart`);
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Error adding to cart. Please try again.");
    }
  };

  const handleViewDetails = (resourceId: number) => {
    navigate(`/resource/${resourceId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Resource Catalog</h1>
        
        {/* Search and Filter Section */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search resources..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2bcd82]"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative inline-block">
                <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg bg-white">
                  <Filter className="w-5 h-5 mr-2" />
                  <span>Filter</span>
                </button>
              </div>
              
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button 
                  className={`p-2 ${viewMode === 'grid' ? 'bg-[#2bcd82] text-white' : 'bg-white text-gray-700'}`}
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button 
                  className={`p-2 ${viewMode === 'list' ? 'bg-[#2bcd82] text-white' : 'bg-white text-gray-700'}`}
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Resources Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map(resource => (
              <div key={resource.id} className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <div 
                  className="relative cursor-pointer"
                  onClick={() => handleViewDetails(resource.id)}
                >
                  <img src={resource.imageUrl} alt={resource.title} className="w-full h-48 object-cover" />
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-opacity flex items-center justify-center opacity-0 hover:opacity-50">
                    <button className="bg-white rounded-full p-2">
                      <Eye className="w-5 h-5 text-gray-800" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 
                      className="text-lg font-bold text-gray-800 hover:text-[#2bcd82] cursor-pointer"
                      onClick={() => handleViewDetails(resource.id)}
                    >
                      {resource.title}
                    </h3>
                    <span className="bg-[#2bcd82]/10 text-[#2bcd82] font-medium px-2 py-1 rounded-full text-sm">
                      {resource.category}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">{resource.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-[#fb6a69]">{resource.price}</span>
                    <div className="flex space-x-2">
                      <button 
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-1 px-3 rounded-full flex items-center"
                        onClick={() => handleViewDetails(resource.id)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Details
                      </button>
                      <button 
                        className="bg-[#2bcd82] hover:bg-[#25b975] text-white font-medium py-1 px-3 rounded-full"
                        onClick={() => handleAddToCart(resource)}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {resources.map(resource => (
              <div key={resource.id} className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row">
                  <div 
                    className="relative w-full md:w-48 cursor-pointer"
                    onClick={() => handleViewDetails(resource.id)}
                  >
                    <img src={resource.imageUrl} alt={resource.title} className="w-full h-48 object-cover" />
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-opacity flex items-center justify-center opacity-0 hover:opacity-100">
                      <button className="bg-white rounded-full p-2">
                        <Eye className="w-5 h-5 text-gray-800" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 
                        className="text-lg font-bold text-gray-800 hover:text-[#2bcd82] cursor-pointer"
                        onClick={() => handleViewDetails(resource.id)}
                      >
                        {resource.title}
                      </h3>
                      <span className="bg-[#2bcd82]/10 text-[#2bcd82] font-medium px-2 py-1 rounded-full text-sm">
                        {resource.category}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4">{resource.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-[#fb6a69]">{resource.price}</span>
                      <div className="flex space-x-2">
                        <button 
                          className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-1 px-3 rounded-full flex items-center"
                          onClick={() => handleViewDetails(resource.id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Details
                        </button>
                        <button 
                          className="bg-[#2bcd82] hover:bg-[#25b975] text-white font-medium py-1 px-3 rounded-full"
                          onClick={() => handleAddToCart(resource)}
                        >
                          Add to Cart
                        </button>
                      </div>
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