import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Check, Star, Download } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import Button from './Button';
import { useCart } from '../context/CartContext';
import { toast } from 'react-hot-toast';

// This interface should match your resource data structure
interface ResourceItem {
  id: number;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  price: string;
  quantity?: number;
}

const ResourceDetailPage: React.FC = () => {
  const { resourceId } = useParams<{ resourceId: string }>();
  const navigate = useNavigate();
  const [resource, setResource] = useState<ResourceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // In a real app, you would fetch this from Firebase
  // For now, we'll use dummy data similar to what's in CatalogPage
  const resources: ResourceItem[] = [
    {
      id: 1,
      title: "Articulation Worksheets Bundle",
      description: "Comprehensive collection of articulation worksheets for various speech sounds. This bundle includes over 50 printable worksheets designed to help clients practice specific speech sounds in different word positions. Perfect for speech-language pathologists working with children or adults on articulation skills.",
      category: "Worksheets",
      imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      price: "$19.99"
    },
    {
      id: 2,
      title: "Language Development Assessment",
      description: "Complete assessment toolkit for evaluating language development in children. This comprehensive assessment package includes standardized evaluation forms, scoring guides, and interpretation materials to help clinicians assess receptive and expressive language skills across different age groups.",
      category: "Assessments",
      imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      price: "$24.99"
    },
    {
      id: 3,
      title: "Speech Therapy Games Collection",
      description: "Fun and engaging games designed to support speech therapy sessions. This collection includes 10 printable game boards, card sets, and activity sheets that make therapy sessions enjoyable while targeting specific speech and language goals. Suitable for individual or group therapy sessions.",
      category: "Activities",
      imageUrl: "https://images.unsplash.com/photo-1516733968668-dbdce39c4651?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      price: "$29.99"
    },
    {
      id: 4,
      title: "Fluency Building Exercises",
      description: "Targeted exercises to help clients build fluency and confidence in speaking. This resource provides structured activities for addressing stuttering and other fluency disorders, with progressive exercises that help clients develop strategies for smoother speech in various communication contexts.",
      category: "Exercises",
      imageUrl: "https://images.unsplash.com/photo-1551818255-e6e10975bc17?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      price: "$15.99"
    },
    {
      id: 5,
      title: "Social Communication Toolkit",
      description: "Resources for developing social communication skills in diverse settings. This toolkit includes social stories, conversation starters, role-playing scenarios, and visual supports to help individuals with social communication challenges navigate different social situations effectively.",
      category: "Toolkits",
      imageUrl: "https://images.unsplash.com/photo-1573497161161-c3e73707e25c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      price: "$22.99"
    },
    {
      id: 6,
      title: "Voice Therapy Guide",
      description: "Comprehensive guide for voice therapy techniques and exercises. This guide provides detailed instructions for voice therapy interventions, including vocal hygiene education, resonance exercises, and therapeutic techniques for various voice disorders. Includes printable client handouts and therapy tracking forms.",
      category: "Guides",
      imageUrl: "https://images.unsplash.com/photo-1490810194309-344b3661ba39?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      price: "$18.99"
    }
  ];

  // Default addToCart function that shows error toast
  let addToCart = (_resource: any) => {
    toast.error("Unable to add to cart. Please try reloading the page.");
  };
  
  // Try to get real addToCart function from context
  try {
    const cart = useCart();
    addToCart = cart.addToCart;
  } catch (error) {
    console.error("Failed to load cart in resource detail:", error);
  }

  useEffect(() => {
    // Simulate API call to fetch resource details
    setLoading(true);
    
    try {
      // In a real app, you would fetch from Firebase here
      // For now, find the resource in our dummy data
      const id = parseInt(resourceId || '0', 10);
      const foundResource = resources.find(r => r.id === id);
      
      if (foundResource) {
        setResource(foundResource);
        setError(null);
      } else {
        setError('Resource not found');
      }
    } catch (err) {
      setError('Failed to load resource details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [resourceId]);

  const handleAddToCart = () => {
    if (resource) {
      try {
        addToCart({
          ...resource,
          quantity: 1
        });
        
        toast.success(`Added ${resource.title} to cart`);
      } catch (error) {
        console.error("Error adding to cart:", error);
        toast.error("Error adding to cart. Please try again.");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2bcd82]"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
            <p className="text-gray-700 mb-4">{error || 'Resource not found'}</p>
            <button 
              onClick={() => navigate('/catalog')}
              className="text-[#2bcd82] hover:underline flex items-center"
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <button 
          onClick={() => navigate('/catalog')}
          className="text-gray-600 hover:text-[#2bcd82] flex items-center mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Catalog
        </button>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="md:flex">
            {/* Resource Image */}
            <div className="md:w-1/2">
              <div className="h-64 md:h-full bg-gray-200 relative">
                <img 
                  src={resource.imageUrl} 
                  alt={resource.title} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-[#2bcd82]/10 text-[#2bcd82] font-medium px-3 py-1 rounded-full text-sm">
                    {resource.category}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Resource Details */}
            <div className="md:w-1/2 p-6 md:p-8">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">{resource.title}</h1>
              
              <div className="flex items-center mb-6">
                <div className="flex text-yellow-400 mr-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>
                <span className="text-gray-600 text-sm">(24 reviews)</span>
              </div>
              
              <p className="text-gray-600 mb-6">{resource.description}</p>
              
              <div className="border-t border-b py-4 mb-6">
                <div className="flex items-center mb-3">
                  <Check className="w-5 h-5 text-[#2bcd82] mr-3" />
                  <span className="text-gray-700">Instant digital download</span>
                </div>
                <div className="flex items-center mb-3">
                  <Check className="w-5 h-5 text-[#2bcd82] mr-3" />
                  <span className="text-gray-700">High-quality printable PDF</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-[#2bcd82] mr-3" />
                  <span className="text-gray-700">Lifetime access to updates</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-6">
                <span className="text-2xl font-bold text-[#fb6a69]">{resource.price}</span>
                <Button 
                  variant="primary" 
                  size="large"
                  onClick={handleAddToCart}
                  className="flex items-center"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
                </Button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">What you'll get:</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <Download className="w-5 h-5 text-gray-500 mr-2 mt-0.5" />
                    <span className="text-gray-600">Downloadable PDF files</span>
                  </li>
                  <li className="flex items-start">
                    <Download className="w-5 h-5 text-gray-500 mr-2 mt-0.5" />
                    <span className="text-gray-600">Printable worksheets and materials</span>
                  </li>
                  <li className="flex items-start">
                    <Download className="w-5 h-5 text-gray-500 mr-2 mt-0.5" />
                    <span className="text-gray-600">Usage instructions and guidelines</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Additional Information Tabs */}
          <div className="border-t">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Additional Information</h2>
              <div className="prose max-w-none">
                <p>This resource is designed for speech-language pathologists, therapists, and educators working with clients who need support in this area. The materials are professionally designed and ready to use in your practice.</p>
                <p className="mt-4">All resources are provided as digital downloads. After purchase, you'll have immediate access to download the files from your account dashboard.</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Featured Catalog Items */}
        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Featured Catalog Items</h2>
            <a href="/catalog" className="text-[#fb6a69] hover:text-[#e05554] font-medium flex items-center">
              View More
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Card 1 - FEATURED - Speech Therapy Events */}
            <div className="w-full sm:w-1/3 rounded-xl border border-gray-200 overflow-hidden shadow-md hover:shadow-lg transition duration-300 hover:-translate-y-1 flex flex-col h-[420px]">
              <div className="relative h-48 flex-shrink-0 overflow-hidden">
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-[#fb6a69] to-[#e05554] shadow-md z-10">
                  FEATURED
                </span>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 z-10">
                  <span className="text-white font-bold">$39.99</span>
                </div>
                <img 
                  src="https://images.unsplash.com/photo-1516383274620-63dbfa9b56bd?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" 
                  alt="Speech Therapy Card Deck" 
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
                <div className="absolute top-3 right-3 flex items-center z-10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 fill-current" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 fill-current" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 fill-current" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 fill-current" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-300" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                </div>
              </div>
              <div className="p-4 flex flex-col h-full">
                <div className="flex-grow">
                  <h3 className="text-lg font-semibold text-gray-800 line-clamp-1 mb-2">Annual Speech Therapy Conference</h3>
                  <p className="text-gray-600 text-sm line-clamp-3">
                    Join leading experts for our annual conference on the latest advancements in speech therapy techniques and research findings. Network with peers and earn CEU credits.
                  </p>
                </div>
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <button className="px-4 py-2 bg-[#fb6a69] hover:bg-[#e05554] text-white rounded transition duration-300 text-sm font-medium flex-1 mr-2">
                      Add to Cart
                    </button>
                    <a href="/events" className="px-4 py-2 border border-[#2bcd82] text-[#2bcd82] hover:bg-[#2bcd82] hover:text-white rounded transition duration-300 text-sm font-medium text-center flex-1">
                      View Events
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2 - NEW - News Article */}
            <div className="w-full sm:w-1/3 rounded-xl border border-gray-200 overflow-hidden shadow-md hover:shadow-lg transition duration-300 hover:-translate-y-1 flex flex-col h-[420px]">
              <div className="relative h-48 flex-shrink-0 overflow-hidden">
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-[#2bcd82] to-[#25b674] shadow-md z-10">
                  NEW
                </span>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 z-10">
                  <span className="text-white font-bold">$24.99</span>
                </div>
                <img 
                  src="https://images.unsplash.com/photo-1543269865-cbf427effbad?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" 
                  alt="Language Development Workbook" 
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
                <div className="absolute top-3 right-3 flex items-center z-10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 fill-current" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 fill-current" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 fill-current" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-300" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-300" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                </div>
              </div>
              <div className="p-4 flex flex-col h-full">
                <div className="flex-grow">
                  <h3 className="text-lg font-semibold text-gray-800 line-clamp-1 mb-2">New Research in Early Intervention</h3>
                  <p className="text-gray-600 text-sm line-clamp-3">
                    Groundbreaking study reveals the benefits of early speech therapy intervention for children under five. Researchers found significant improvements in language acquisition and social communication skills.
                  </p>
                </div>
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <button className="px-4 py-2 bg-[#fb6a69] hover:bg-[#e05554] text-white rounded transition duration-300 text-sm font-medium flex-1 mr-2">
                      Add to Cart
                    </button>
                    <a href="/news" className="px-4 py-2 border border-[#2bcd82] text-[#2bcd82] hover:bg-[#2bcd82] hover:text-white rounded transition duration-300 text-sm font-medium text-center flex-1">
                      Read News
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3 - SALE - Product */}
            <div className="w-full sm:w-1/3 rounded-xl border border-gray-200 overflow-hidden shadow-md hover:shadow-lg transition duration-300 hover:-translate-y-1 flex flex-col h-[420px]">
              <div className="relative h-48 flex-shrink-0 overflow-hidden">
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 shadow-md z-10">
                  SALE
                </span>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 z-10">
                  <span className="text-white font-bold">$19.99</span>
                  <span className="text-gray-300 line-through text-sm ml-2">$29.99</span>
                </div>
                <img 
                  src="https://images.unsplash.com/photo-1456406644174-8ddd4cd52a06?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" 
                  alt="Articulation Assessment Kit" 
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
                <div className="absolute top-3 right-3 flex items-center z-10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 fill-current" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 fill-current" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 fill-current" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 fill-current" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 fill-current" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                </div>
              </div>
              <div className="p-4 flex flex-col h-full">
                <div className="flex-grow">
                  <h3 className="text-lg font-semibold text-gray-800 line-clamp-1 mb-2">Articulation Assessment Kit</h3>
                  <p className="text-gray-600 text-sm line-clamp-3">
                    Complete assessment toolkit for speech-language pathologists, including visual aids, recording sheets, and progress trackers. Designed for clinical and educational settings.
                  </p>
                </div>
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <button className="px-4 py-2 bg-[#fb6a69] hover:bg-[#e05554] text-white rounded transition duration-300 text-sm font-medium flex-1 mr-2">
                      Add to Cart
                    </button>
                    <a href="/resource/3" className="px-4 py-2 border border-[#2bcd82] text-[#2bcd82] hover:bg-[#2bcd82] hover:text-white rounded transition duration-300 text-sm font-medium text-center flex-1">
                      View Details
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ResourceDetailPage; 