import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Check, Star, Loader, Clock, BookOpen, Users } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import Button from './Button';
import { useCart } from '../context/CartContext';
import { fetchProduct } from '../lib/woocommerce/products';
import { Product } from '../types';
import { useWooCommerce } from '../context/WooCommerceContext';
import { toast } from 'react-hot-toast';

const ResourceDetailPage: React.FC = () => {
  const { resourceId } = useParams<{ resourceId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'description' | 'details' | 'reviews'>('description');
  
  const { featuredProducts } = useWooCommerce();
  const { addToCart } = useCart();
  
  // Fetch product data when component mounts
  useEffect(() => {
    const loadProduct = async () => {
      if (!resourceId) {
        setError('Resource ID is missing');
        setLoading(false);
        return;
      }
      
      try {
        const loadedProduct = await fetchProduct(resourceId);
        setProduct(loadedProduct);
        setError(null);
      } catch (err) {
        console.error('Error loading product:', err);
        setError('Failed to load resource. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadProduct();
  }, [resourceId]);
  
  // Handle adding the product to cart
  const handleAddToCart = () => {
    if (!product) return;
    
    try {
      addToCart({
        id: Number(product.id),
        title: product.name,
        description: product.description,
        category: product.category || '',
        imageUrl: product.thumbnail || '',
        price: product.price.toString(),
        quantity: 1
      });
      
      toast.success(`${product.name} added to cart!`);
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Error adding to cart. Please try again.");
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-14 h-14 text-[#2bcd82] animate-spin mx-auto mb-6" />
            <p className="text-gray-600 text-xl font-medium">Loading resource...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-gray-600 mb-6 hover:text-[#2bcd82] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> Back to Catalog
          </button>
          
          <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-2xl mx-auto border border-gray-100">
            <p className="text-red-600 text-2xl font-medium mb-6">{error || 'Resource not found'}</p>
            <Button 
              onClick={() => navigate('/catalog')} 
              className="bg-[#2bcd82] hover:bg-[#25b975] text-white px-8 py-3 rounded-xl text-lg font-medium"
            >
              Browse Catalog
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <nav className="flex items-center space-x-1 text-sm text-gray-500 mb-6">
          <a href="/" className="hover:text-[#2bcd82] transition-colors">Home</a>
          <span>/</span>
          <a href="/catalog" className="hover:text-[#2bcd82] transition-colors">Catalog</a>
          <span>/</span>
          <span className="text-gray-700 font-medium truncate max-w-[200px]">{product.name}</span>
        </nav>
        
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 mb-12">
          <div className="flex flex-col lg:flex-row">
            {/* Product Image */}
            <div className="lg:w-2/5 bg-gray-50 relative flex items-center justify-center py-8">
              {product.category && (
                <span className="absolute top-4 left-4 bg-[#2bcd82]/90 text-white text-sm font-medium px-3 py-1 rounded-full z-10 backdrop-blur-sm">
                  {product.category}
                </span>
              )}
              
              {product.thumbnail ? (
                <div className="relative mx-auto w-[300px] max-w-full">
                  {/* Slight 3D perspective container */}
                  <div className="transform-gpu preserve-3d perspective-[800px] hover:rotate-y-[-5deg] transition-transform duration-500">
                    <div className="aspect-[3/4] shadow-lg rounded-md overflow-hidden transform rotate-[-1deg] border border-gray-200 relative backface-hidden">
                      <img 
                        src={product.thumbnail} 
                        alt={product.name} 
                        className="w-full h-full object-cover object-center"
                      />
                      {/* Book title overlay at bottom */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-black/0 p-3 pt-8">
                        <h3 className="text-white text-sm font-bold line-clamp-2">{product.name}</h3>
                        <p className="text-white/80 text-xs mt-1">Speech Therapy Resource</p>
                      </div>
                      {/* Subtle page line effects */}
                      <div className="absolute top-2 bottom-2 right-[2px] w-[1px] bg-white/30"></div>
                      <div className="absolute top-2 bottom-2 right-[4px] w-[1px] bg-white/20"></div>
                      <div className="absolute top-0 right-0 w-[15px] h-full bg-gradient-to-l from-black/10 to-transparent"></div>
                    </div>
                  </div>
                  {/* Book spine effect */}
                  <div className="absolute top-0 bottom-0 left-0 w-[10px] bg-[#2bcd82] rounded-l-md transform translate-x-[-2px]"></div>
                  {/* Book shadow effect */}
                  <div className="absolute -bottom-4 left-0 right-0 h-[20px] bg-black/20 blur-md rounded-full z-[-1]"></div>
                </div>
              ) : (
                <div className="mx-auto w-[300px] max-w-full aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 rounded-md shadow-md border border-gray-200 flex flex-col items-center justify-center p-4">
                  <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium text-center">No cover available</p>
                </div>
              )}
            </div>
            
            {/* Product Details */}
            <div className="lg:w-3/5 p-6 md:p-10 flex flex-col">
              {/* Product Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-block bg-blue-50 text-blue-600 text-xs font-medium px-2.5 py-1 rounded-full">New</span>
                <span className="inline-block bg-purple-50 text-purple-600 text-xs font-medium px-2.5 py-1 rounded-full">Top Rated</span>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 leading-tight">{product.name}</h1>
              
              <div className="flex items-center mt-4">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <Star
                      key={idx}
                      className={`w-5 h-5 ${idx <= 4 ? 'text-yellow-400' : 'text-gray-300'}`}
                      fill={idx <= 4 ? 'currentColor' : 'none'}
                    />
                  ))}
                </div>
                <span className="ml-2 text-gray-600">(12 reviews)</span>
              </div>
              
              <div className="flex flex-wrap gap-6 mb-8 text-sm">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 text-gray-400 mr-2" />
                  <span>Created: June 2023</span>
                </div>
                <div className="flex items-center">
                  <BookOpen className="w-4 h-4 text-gray-400 mr-2" />
                  <span>12 Pages</span>
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 text-gray-400 mr-2" />
                  <span>1,240+ Downloads</span>
                </div>
              </div>
              
              <div className="bg-[#f8fcfa] rounded-xl p-5 mb-8 border border-[#e0f5eb]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700 font-medium">Price:</span>
                  <span className="text-3xl font-bold text-[#fb6a69]">${product.price.toFixed(2)}</span>
                </div>
                
                <p className="text-sm text-gray-500">
                  One-time purchase • Instant download • No subscription required
                </p>
              </div>
              
              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">What's Included:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-[#2bcd82] mr-2 mt-0.5 flex-shrink-0" />
                    <span>High-quality downloadable PDF with printable worksheets</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-[#2bcd82] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Detailed instructions for implementation</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-[#2bcd82] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Free lifetime updates and access</span>
                  </li>
                </ul>
              </div>
              
              <div className="flex flex-col space-y-3 mt-auto">
                <Button 
                  onClick={handleAddToCart}
                  className="w-full bg-[#2bcd82] hover:bg-[#25b975] text-white px-4 py-4 rounded-xl flex items-center justify-center text-lg font-medium shadow-sm shadow-[#2bcd82]/20 transition-all hover:shadow-md"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
                </Button>
                
      
              </div>
            </div>
          </div>
        </div>
        
        {/* Product Tabs */}
        <div className="mb-16">
          <div className="border-b border-gray-200 mb-8">
            <div className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab('description')}
                className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'description'
                    ? 'border-b-2 border-[#2bcd82] text-[#2bcd82]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Description
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'details'
                    ? 'border-b-2 border-[#2bcd82] text-[#2bcd82]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Resource Details
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'reviews'
                    ? 'border-b-2 border-[#2bcd82] text-[#2bcd82]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Reviews (32)
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            {activeTab === 'description' && (
              <div className="prose prose-lg max-w-none">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mb-8">
                  <p className="text-lg leading-relaxed mb-6">
                    Have you chosen "shr" words using the Complexity Approach and need more homework sheets and therapy activities that not only keep kids interested, but have high practice trials on each page? If you've always wanted to quickly print a board game, go through some word lists, and have play-based ideas at your fingertips with something NEW for an entire block of therapy without using the same activity twice, this is the packet for you!
                  </p>
                  
                  <h3 className="text-xl font-bold text-gray-800 mb-4">DOWNLOAD THIS RESOURCE IF YOU WANT:</h3>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-[#2bcd82] text-white font-medium mr-3 mt-0.5">❶</span>
                      <span>High-practice trial therapy worksheets for Complexity Approach intervention</span>
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-[#2bcd82] text-white font-medium mr-3 mt-0.5">❷</span>
                      <span>A wide variety of activities for therapy sessions so children won't get bored, including less structured, play-based ideas</span>
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-[#2bcd82] text-white font-medium mr-3 mt-0.5">❸</span>
                      <span>Chaining strategies to elicit the cluster before getting into high-practice trials</span>
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-[#2bcd82] text-white font-medium mr-3 mt-0.5">❹</span>
                      <span>An evidence-based resource that outlines general therapy steps for the Complexity Approach</span>
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-[#2bcd82] text-white font-medium mr-3 mt-0.5">❺</span>
                      <span>Color and black & white cards, games, activities, and homework word lists to support your intervention- something for every child's interests</span>
                    </li>
                  </ul>
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-4">EACH PACKET INCLUDES:</h3>
                <div className="bg-white border border-gray-200 rounded-xl mb-8">
                  <ul className="divide-y divide-gray-100">
                    <li className="p-4">Over <span className="font-semibold">55 functional pages</span> targeting "shr" complex clusters – x26 color pages and x31 black & white options</li>
                    <li className="p-4">Includes <span className="font-semibold">therapy steps handout</span></li>
                    <li className="p-4"><span className="font-semibold">Full-size Flashcards</span> featuring x9 words</li>
                    <li className="p-4"><span className="font-semibold">Mini Flashcards</span> x5 per target word (total = 45 mini cards)</li>
                    <li className="p-4"><span className="font-semibold">Forward and backward chaining pages</span> to help elicit the complex target</li>
                    <li className="p-4"><span className="font-semibold">Play-based ideas</span> for each target word</li>
                    <li className="p-4">
                      <span className="font-semibold">Gameboards:</span> x4 to use dice and counters to play these games
                    </li>
                    <li className="p-4">
                      <span className="font-semibold">High Practice pages:</span>
                      <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4">
                        <li>Stamp & Say x2</li>
                        <li>Draw & Say x2</li>
                        <li>Find & Say x1</li>
                        <li>Spin & Say x1</li>
                        <li>Pop & Say x4</li>
                        <li>100 Practices x2</li>
                      </ul>
                    </li>
                    <li className="p-4"><span className="font-semibold">Weekly Word lists</span> x4 with fun designs for easy home practice</li>
                    <li className="p-4"><span className="font-semibold">Cut, Paste & Say</span> x5 craft pages</li>
                  </ul>
                </div>
                
                <div className="bg-[#f0f9f4] border border-[#c8ebda] p-6 rounded-xl mb-8">
                  <h3 className="text-xl font-bold text-gray-800 mb-3">MORE RESOURCES</h3>
                  <p className="mb-4">GET OUR 2-ELEMENT BUNDLE featuring "sl", "fl", "fr", "thr" and "shr" <a href="/catalog" className="text-[#2bcd82] font-medium hover:underline">here</a></p>
                  <p className="mb-4">Do you need FREE 100 Trials for Speech no-prep worksheets? Sign up for my newsletter to get access to my Freebie Library of goodies that are aimed at your speech sound caseload.</p>
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-3">ABOUT THE AUTHOR:</h3>
                <p className="mb-6">
                  Rebecca Reinking is an SLP who works privately with children who have speech sound disorders. She has a particular interest in phonological interventions and strives to connect and collaborate with speech scientists to bridge the gap between research and clinical practice.
                </p>
                
            
                
                <p className="text-gray-600 leading-relaxed mt-4">
                  This resource is perfect for speech-language pathologists working with clients 
                  who need assistance with articulation, language development, or cognitive skills. 
                  The materials are designed to be engaging and effective, created by experienced SLPs.
                </p>
              </div>
            )}
            
            {activeTab === 'details' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Resource Specifications</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <span className="text-gray-600">Format</span>
                        <span className="font-medium">PDF</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <span className="text-gray-600">Pages</span>
                        <span className="font-medium">12</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <span className="text-gray-600">Age Range</span>
                        <span className="font-medium">5-12 years</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <span className="text-gray-600">Created</span>
                        <span className="font-medium">June 2023</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <span className="text-gray-600">Last Updated</span>
                        <span className="font-medium">July 2023</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Target Areas</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">Articulation</span>
                      <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">Phonology</span>
                      <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">Language</span>
                      <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">Fluency</span>
                      <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">Pragmatics</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'reviews' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Customer Reviews</h3>
                    <div className="flex items-center mt-1">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={`w-5 h-5 ${star <= 5 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                          />
                        ))}
                      </div>
                      <span className="ml-2 text-gray-600">4.9 out of 5 (32 reviews)</span>
                    </div>
                  </div>
                  
                  <Button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm">
                    Write a Review
                  </Button>
                </div>
                
                <div className="space-y-6">
                  {/* Sample review items */}
                  <div className="pb-6 border-b border-gray-100">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#2bcd82]/20 text-[#2bcd82] flex items-center justify-center font-medium">
                        JD
                      </div>
                      <div className="ml-3">
                        <h4 className="font-medium text-gray-800">Jane Doe, SLP</h4>
                        <div className="flex items-center">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((_, idx) => (
                              <Star 
                                key={idx} 
                                className={`w-4 h-4 ${idx < 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                              />
                            ))}
                          </div>
                          <span className="ml-2 text-xs text-gray-500">2 months ago</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-600">
                      This resource has been incredibly helpful in my therapy sessions. The worksheets are 
                      engaging and my young clients love them. Would highly recommend!
                    </p>
                  </div>
                  
                  <div className="pb-6 border-b border-gray-100">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#2bcd82]/20 text-[#2bcd82] flex items-center justify-center font-medium">
                        MS
                      </div>
                      <div className="ml-3">
                        <h4 className="font-medium text-gray-800">Mark Smith</h4>
                        <div className="flex items-center">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((_, idx) => (
                              <Star 
                                key={idx} 
                                className={`w-4 h-4 ${idx < 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                              />
                            ))}
                          </div>
                          <span className="ml-2 text-xs text-gray-500">3 months ago</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-600">
                      Good quality resources but would appreciate more variety. The PDF prints well and the instructions are clear.
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 text-center">
                  <Button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-2 rounded-lg text-sm">
                    Load More Reviews
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Related Resources */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Related Resources</h2>
            <Button 
              onClick={() => navigate('/catalog')} 
              className="bg-[#fb6a69] hover:bg-[#e05958] text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              View All
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.filter(item => item.id !== product.id).slice(0, 3).map((relatedProduct) => (
              <div 
                key={relatedProduct.id} 
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full border border-gray-100 group cursor-pointer"
                onClick={() => navigate(`/resource/${relatedProduct.id}`)}
              >
                <div className="relative h-48 overflow-hidden bg-gray-100">
                  {relatedProduct.thumbnail ? (
                    <img 
                      src={relatedProduct.thumbnail} 
                      alt={relatedProduct.name} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-200">
                      <p className="text-gray-400">No image</p>
                    </div>
                  )}
                  
                  {relatedProduct.category && (
                    <span className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                      {relatedProduct.category}
                    </span>
                  )}
                </div>
                
                <div className="p-5 flex flex-col flex-grow">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-[#2bcd82] transition-colors">
                    {relatedProduct.name}
                  </h3>
                  
                  <p className="text-gray-600 mb-4 text-sm line-clamp-2 flex-grow">
                    {relatedProduct.description}
                  </p>
                  
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-[#fb6a69] font-bold">${relatedProduct.price.toFixed(2)}</span>
                    
                    <div className="flex items-center">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className="w-3 h-3 text-yellow-400 fill-yellow-400" 
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500 ml-1">(24)</span>
                    </div>
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