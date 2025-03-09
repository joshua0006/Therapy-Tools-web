import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { Search, Filter, Grid, ShoppingCart, Loader, Tag, FileText, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { toast } from 'react-hot-toast';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { app } from '../lib/firebase'; // Import the Firebase app directly

// Sample products data to use when Firebase access fails
const SAMPLE_PRODUCTS = [
  {
    id: "1",
    name: "Speech Sound Handbook",
    description: "Comprehensive guide for speech-language pathologists working with children who have phonological disorders.",
    price: 29.99,
    thumbnail: "https://adventuresinspeechpathology.com/wp-content/uploads/2024/09/Ch-1-Sound-Handbook-AISP.pdf",
    category: "Guides"
  },
  {
    id: "2",
    name: "Language Therapy Worksheets",
    description: "A collection of worksheets for improving language skills in school-aged children.",
    price: 19.99,
    thumbnail: "",
    category: "Worksheets"
  },
  {
    id: "3",
    name: "Fluency Assessment Tools",
    description: "Tools and resources for assessing and treating fluency disorders.",
    price: 24.99,
    thumbnail: "",
    category: "Assessment"
  }
];

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

// More flexible interface for Firebase products to handle various field structures
interface FirebaseProduct {
  id: string;
  name?: string;
  title?: string; // Alternative field for name
  description?: string;
  price?: number | string;
  thumbnail?: string;
  category?: string;
  downloads?: Array<{
    id: string;
    name: string;
    file: string;
  }>;
  images?: Array<{ src: string }>;
  image?: string; // Alternative field for thumbnail
  fileUrl?: string; // PDF URL
  pdfUrl?: string; // Alternative PDF URL
  [key: string]: any; // Allow any additional fields
}

interface Category {
  id: string;
  name: string;
}

// Add a helper function to safely check if text contains HTML
const containsHtml = (text: string): boolean => {
  return /<\/?[a-z][\s\S]*>/i.test(text);
};

const CatalogPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [products, setProducts] = useState<FirebaseProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  
  const { addToCart } = useCart();
  const navigate = useNavigate();

  // Create Firestore instance directly
  const db = getFirestore(app);
  
  // Fetch products from Firebase
  useEffect(() => {
    const fetchProducts = async () => {
      if (!db) {
        setError('Firebase Firestore instance not found. Please check your configuration.');
        loadSampleProducts();
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('Fetching products from Firebase...');
        
        // Get products collection
        const productsRef = collection(db, 'products');
        
        try {
          const productsSnapshot = await getDocs(productsRef);
          
          if (productsSnapshot.empty) {
            console.log('No products found in the collection');
            setError('No products found in the database.');
            loadSampleProducts();
            return;
          } else {
            console.log(`Found ${productsSnapshot.size} products`);
          }
          
          const loadedProducts: FirebaseProduct[] = [];
          const categorySet = new Set<string>();
          const categoryMap: Record<string, string> = {}; // Map category IDs to names
          
          productsSnapshot.forEach((doc) => {
            const data = doc.data();
            console.log(`Product data for ${doc.id}:`, data);
            
            // Extract price, handling various formats
            let productPrice = 0;
            if (typeof data.price === 'number') {
              productPrice = data.price;
            } else if (typeof data.price === 'string') {
              // Remove currency symbols and convert to number
              productPrice = parseFloat(data.price.replace(/[^0-9.-]+/g, '')) || 0;
            }
            
            const product: FirebaseProduct = {
              id: doc.id,
              name: data.name || data.title || 'Unnamed Product',
              description: data.description || data.content || '',
              price: productPrice,
              thumbnail: data.thumbnail || data.image || data.images?.[0]?.src || '',
              category: data.category || data.productCategory || 'Uncategorized',
              downloads: data.downloads || [],
              pdfUrl: data.pdfUrl || data.fileUrl || '',
              // Include all original data
              ...data
            };
            
            loadedProducts.push(product);
            
            // Add category to set and map
            const category = product.category || 'Uncategorized';
            categorySet.add(category);
            categoryMap[category] = category; // Same ID and name for simplicity
          });
          
          // Convert category set to array of objects
          const categoryList: Category[] = Array.from(categorySet).map(categoryId => ({
            id: categoryId,
            name: categoryMap[categoryId] || categoryId
          }));
          
          setProducts(loadedProducts);
          setCategories(categoryList);
          setUsingMockData(false);
          setLoading(false);
        } catch (firestoreError: unknown) {
          console.error('Firebase error:', firestoreError);
          
          // Check if it's a permission error
          const errorMessage = String(firestoreError);
          if (errorMessage.includes('permission') || 
              errorMessage.includes('insufficient')) {
            setError(`Firebase permissions error: You do not have access to the products collection. Please contact your administrator or update your Firebase security rules.`);
            
            // Load sample products as fallback
            loadSampleProducts();
          } else {
            setError('Failed to load products: ' + errorMessage);
            loadSampleProducts();
          }
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products from Firebase. ' + (err instanceof Error ? err.message : ''));
        loadSampleProducts();
      }
    };
    
    // Helper function to load sample products when Firebase fails
    const loadSampleProducts = () => {
      console.log('Loading sample products as fallback');
      
      const sampleData = SAMPLE_PRODUCTS.map(product => ({
        ...product,
        id: product.id.toString()
      }));
      
      // Extract categories from sample data
      const categorySet = new Set<string>();
      sampleData.forEach(product => {
        if (product.category) {
          categorySet.add(product.category);
        }
      });
      
      const categoryList: Category[] = Array.from(categorySet).map(category => ({
        id: category,
        name: category
      }));
      
      setProducts(sampleData);
      setCategories(categoryList);
      setUsingMockData(true);
      setLoading(false);
    };
    
    fetchProducts();
  }, [db]);
  
  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    return products.filter((product: FirebaseProduct) => {
      const name = product.name || product.title || '';
      const description = product.description || '';
      
      const matchesSearch = 
        name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Create a mapping of product IDs to their "original" prices
  const originalPrices = useMemo(() => {
    const priceMap: Record<string, number> = {};
    
    products.forEach((product: FirebaseProduct) => {
      const productPrice = typeof product.price === 'string' 
        ? parseFloat(product.price) 
        : (product.price || 0);
        
      priceMap[product.id] = calculateOriginalPrice(productPrice);
    });
    
    return priceMap;
  }, [products]);
  
  // Calculate the discount percentage for a product
  const getDiscountPercentage = (actualPrice: number, originalPrice: number): number => {
    return Math.round(((originalPrice - actualPrice) / originalPrice) * 100);
  };

  // Helper to get product price regardless of format
  const getProductPrice = (product: FirebaseProduct): number => {
    if (typeof product.price === 'number') {
      return product.price;
    } else if (typeof product.price === 'string') {
      return parseFloat(product.price) || 0;
    }
    return 0;
  };

  // Check if product has PDFs
  const hasPdfFiles = (product: FirebaseProduct): boolean => {
    // Check downloads array
    if (product.downloads && product.downloads.length > 0) {
      const pdfDownloads = product.downloads.filter(download => 
        download.file && download.file.toLowerCase().endsWith('.pdf')
      );
      if (pdfDownloads.length > 0) return true;
    }
    
    // Check direct PDF URL
    if (product.pdfUrl && product.pdfUrl.toLowerCase().endsWith('.pdf')) {
      return true;
    }
    
    // Check fileUrl
    if (product.fileUrl && product.fileUrl.toLowerCase().endsWith('.pdf')) {
      return true;
    }
    
    return false;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-12 bg-white rounded-2xl p-8 shadow-sm">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#2bcd82] to-[#25b975]">Resource Catalog</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Browse our collection of speech therapy resources, worksheets, and materials designed by experienced SLPs.
          </p>
          <div className="mt-6 max-w-sm mx-auto h-1 bg-gradient-to-r from-[#2bcd82] to-transparent rounded-full"></div>
        </div>
        
        {/* Mock Data Warning */}
        {usingMockData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertCircle className="text-yellow-500 mr-2" />
              <p className="text-yellow-700 font-medium">Using Sample Data</p>
            </div>
            <p className="text-yellow-600 text-sm">
              Unable to access the Firebase database due to permission issues. Displaying sample products instead.
            </p>
          </div>
        )}
        
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
        
        {/* Error State - only show if not using mock data */}
        {error && !usingMockData && (
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
        
        {/* Grid View */}
        {!loading && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product: FirebaseProduct) => (
              <div onClick={() => navigate(`/catalog/${product.id}`)} key={product.id} className="bg-white cursor-pointer rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full border border-gray-100">
                <div className="relative h-48 overflow-hidden bg-gray-100">
                  {product.thumbnail ? (
                    <img 
                      src={product.thumbnail} 
                      alt={product.name || 'Product'} 
                      className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-200">
                      <p className="text-gray-400">No image</p>
                    </div>
                  )}
                  
                  {/* PDF Indicator */}
                  {hasPdfFiles(product) && (
                    <div className="absolute top-0 left-0 bg-blue-500 text-white px-3 py-1 rounded-br-lg text-sm font-bold flex items-center">
                      <FileText className="w-4 h-4 mr-1" />
                      PDF
                    </div>
                  )}
                  
                  {/* Sale Tag */}
                  {getProductPrice(product) > 0 ? (
                    <div className="absolute top-0 right-0 bg-[#fb6a69] text-white px-3 py-1 rounded-bl-lg text-sm font-bold flex items-center">
                      <Tag className="w-4 h-4 mr-1" />
                      {getDiscountPercentage(getProductPrice(product), originalPrices[product.id])}% OFF
                    </div>
                  ) : (
                    <div className="absolute top-0 right-0 bg-[#2bcd82] text-white px-3 py-1 rounded-bl-lg text-sm font-bold flex items-center">
                      <Tag className="w-4 h-4 mr-1" />
                      FREE
                    </div>
                  )}
                </div>
                
                <div className="p-5 flex flex-col flex-grow">
                  <div className="h-14 mb-2 flex flex-col justify-center">
                    <h3 
                      className="text-lg font-bold text-gray-800 hover:text-[#2bcd82] transition-colors line-clamp-2 leading-tight"
                      title={product.name || product.title || 'Unnamed Product'}
                    >
                      {product.name || product.title || 'Unnamed Product'}
                    </h3>
                  </div>
                  
                  <div className="text-gray-600 mb-4 text-sm flex-grow">
                    {product.description ? (
                      <>
                        {containsHtml(product.description) ? (
                          <div 
                            className="line-clamp-3 prose prose-sm max-w-none prose-p:my-1 prose-headings:my-1" 
                            dangerouslySetInnerHTML={{ 
                              __html: product.description.length > 150 
                                ? product.description.substring(0, 150) + '...' 
                                : product.description 
                            }} 
                          />
                        ) : (
                          <p className="line-clamp-3">
                            {product.description.length > 120 
                              ? product.description.substring(0, 120) + '...' 
                              : product.description}
                          </p>
                        )}
                        {product.description.length > (containsHtml(product.description) ? 150 : 120) && (
                          <span className="text-blue-500 text-xs font-medium mt-1 inline-block">
                            Read more
                          </span>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-400 italic">No description available</p>
                    )}
                  </div>
                  
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex flex-col">
                      {getProductPrice(product) > 0 ? (
                        <>
                          {/* Original Price (crossed out) */}
                          <span className="text-gray-500 line-through text-sm">
                            {formatCurrency(originalPrices[product.id])}
                          </span>
                          
                          {/* Sale Price */}
                          <span className="text-[#fb6a69] font-bold text-lg">
                            {formatCurrency(getProductPrice(product))}
                          </span>
                        </>
                      ) : (
                        /* Free Product Price */
                        <span className="text-[#2bcd82] font-bold text-lg">
                          Free
                        </span>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <button 
                        className="text-white bg-[#2bcd82] flex items-center gap-2 hover:bg-[#25b975] p-2 rounded-lg transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart({
                            id: parseInt(product.id, 10) || Math.floor(Math.random() * 10000),
                            title: product.name || product.title || 'Unnamed Product',
                            description: product.description || '',
                            category: product.category || 'Uncategorized',
                            imageUrl: product.thumbnail || '',
                            price: getProductPrice(product).toString(),
                            quantity: 1
                          });
                          toast.success(`${product.name || product.title || 'Product'} added to cart!`);
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