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
        
        {/* Related Resources Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Related Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {resources
              .filter(r => r.id !== resource.id && r.category === resource.category)
              .slice(0, 3)
              .map(relatedResource => (
                <div 
                  key={relatedResource.id} 
                  className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/resource/${relatedResource.id}`)}
                >
                  <img 
                    src={relatedResource.imageUrl} 
                    alt={relatedResource.title} 
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-gray-800">{relatedResource.title}</h3>
                      <span className="bg-[#2bcd82]/10 text-[#2bcd82] font-medium px-2 py-1 rounded-full text-sm">
                        {relatedResource.category}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4 line-clamp-2">{relatedResource.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-[#fb6a69]">{relatedResource.price}</span>
                      <button 
                        className="text-[#2bcd82] hover:underline text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/resource/${relatedResource.id}`);
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ResourceDetailPage; 