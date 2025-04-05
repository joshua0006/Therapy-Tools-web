import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, FileText, ArrowRight } from 'lucide-react';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { app } from '../lib/firebase';
import Header from './Header';
import Footer from './Footer';

// Interface for Firebase products
interface FirebaseProduct {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  category?: string;
  categories?: Array<string | Category>;
  downloads?: Array<{
    id: string;
    name: string;
    file: string;
  }>;
  images?: Array<{ src: string }>;
  image?: string;
  fileUrl?: string;
  pdfUrl?: string;
  // Additional specific fields for sounds/disorders
  targetSounds?: string[];
  disorders?: string[];
  [key: string]: any;
}

// Category interface
interface Category {
  id: string | number;
  name: string;
  slug?: string;
  [key: string]: any;
}

// Define common speech sounds and disorders
const SPEECH_SOUNDS = [
  'R', 'S', 'L', 'TH', 'CH', 'SH', 'K', 'G', 'F', 'V', 'P', 'B', 'M', 'N', 'T', 'D'
];

const SPEECH_DISORDERS = [
  'Articulation Disorder',
  'Phonological Disorder',
  'Apraxia of Speech',
  'Dysarthria',
  'Fluency Disorder',
  'Stuttering',
  'Cluttering',
  'Voice Disorder',
  'Language Disorder',
  'Developmental Language Disorder',
  'Expressive Language Disorder',
  'Receptive Language Disorder',
  'Social Communication Disorder',
  'Pragmatic Language Disorder',
  'Auditory Processing Disorder'
];

const ResourceFinder: React.FC = () => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<'sound' | 'disorder'>('sound');
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [products, setProducts] = useState<FirebaseProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to check if product has PDF files
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

  // Get PDF count for a product
  const getPdfCount = (product: FirebaseProduct): number => {
    let count = 0;
    
    // Count PDFs in downloads array
    if (product.downloads && product.downloads.length > 0) {
      const pdfDownloads = product.downloads.filter(download => 
        download.file && download.file.toLowerCase().endsWith('.pdf')
      );
      count += pdfDownloads.length;
    }
    
    // Add direct PDF URL if available
    if (product.pdfUrl && product.pdfUrl.toLowerCase().endsWith('.pdf')) {
      count += 1;
    }
    
    // Add fileUrl if available and not already counted
    if (product.fileUrl && product.fileUrl.toLowerCase().endsWith('.pdf') && product.fileUrl !== product.pdfUrl) {
      count += 1;
    }
    
    return count;
  };

  // Check if product is relevant to the selected sound or disorder
  const isRelevantProduct = (product: FirebaseProduct, type: 'sound' | 'disorder', value: string): boolean => {
    if (!product) return false;
    
    if (type === 'sound') {
      // Check targetSounds array
      if (product.targetSounds && Array.isArray(product.targetSounds)) {
        if (product.targetSounds.includes(value)) return true;
      }
      
      // Check in categories
      if (product.categories && Array.isArray(product.categories)) {
        for (const cat of product.categories) {
          const catName = typeof cat === 'object' && cat !== null && 'name' in cat ? cat.name : cat;
          if (typeof catName === 'string' && 
              (catName.includes(`Sound ${value}`) || 
               catName.includes(`${value} Sound`) || 
               catName === value)) {
            return true;
          }
        }
      }
      
      // Check in name and description
      if (product.name && product.name.includes(`Sound ${value}`)) return true;
      if (product.description && product.description.includes(`Sound ${value}`)) return true;
      
      // Check in name and description for the sound letter itself
      if (product.name && product.name.includes(`${value} `)) return true;
      if (product.description && product.description.includes(`${value} `)) return true;
    } else {
      // Check disorders array
      if (product.disorders && Array.isArray(product.disorders)) {
        if (product.disorders.includes(value)) return true;
      }
      
      // Check in categories
      if (product.categories && Array.isArray(product.categories)) {
        for (const cat of product.categories) {
          const catName = typeof cat === 'object' && cat !== null && 'name' in cat ? cat.name : cat;
          if (typeof catName === 'string' && 
              (catName.includes(value) || catName === value)) {
            return true;
          }
        }
      }
      
      // Check in name and description
      if (product.name && product.name.toLowerCase().includes(value.toLowerCase())) return true;
      if (product.description && product.description.toLowerCase().includes(value.toLowerCase())) return true;
    }
    
    return false;
  };

  // Fetch products when a sound or disorder is selected
  useEffect(() => {
    if (!selectedValue) {
      setProducts([]);
      return;
    }
    
    const fetchProducts = async () => {
      const db = getFirestore(app);
      
      if (!db) {
        setError('Firebase Firestore instance not found');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all products from Firestore
        const productsRef = collection(db, 'products');
        const productsSnapshot = await getDocs(productsRef);
        
        if (productsSnapshot.empty) {
          setProducts([]);
          setLoading(false);
          return;
        }
        
        // Process products and filter them based on the selected sound or disorder
        const allProducts: FirebaseProduct[] = [];
        
        productsSnapshot.forEach((doc) => {
          const data = doc.data();
          
          const product: FirebaseProduct = {
            id: doc.id,
            name: data.name || data.title || 'Unnamed Product',
            description: data.description || data.content || '',
            thumbnail: data.thumbnail || data.image || data.images?.[0]?.src || '',
            category: data.category || 'Uncategorized',
            categories: Array.isArray(data.categories) ? data.categories : 
              (data.category ? [data.category] : ['Uncategorized']),
            downloads: data.downloads || [],
            pdfUrl: data.pdfUrl || data.fileUrl || '',
            targetSounds: data.targetSounds || [],
            disorders: data.disorders || [],
            ...data
          };
          
          // Only add products that are relevant to the selected sound or disorder
          if (isRelevantProduct(product, selectedType, selectedValue)) {
            allProducts.push(product);
          }
        });
        
        setProducts(allProducts);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products from Firebase');
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [selectedType, selectedValue]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-12 bg-white rounded-2xl p-8 shadow-sm">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#2bcd82] to-[#25b975]">
            Find the Right Resources
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Get a list of products that are recommended for specific speech sounds or disorders. 
            Each product shows a cover image and description.
          </p>
          <div className="mt-6 max-w-sm mx-auto h-1 bg-gradient-to-r from-[#2bcd82] to-transparent rounded-full"></div>
        </div>
        
        {/* Selection Controls */}
        <div className="bg-white rounded-xl shadow-sm mb-8 p-6">
          {/* Type Selection */}
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">
              I'm looking for resources related to:
            </label>
            <div className="flex gap-4 max-w-md mx-auto">
              <button
                onClick={() => {
                  setSelectedType('sound');
                  setSelectedValue('');
                }}
                className={`flex-1 py-3 px-4 rounded-lg transition-all ${
                  selectedType === 'sound'
                    ? 'bg-[#2bcd82] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Speech Sound
              </button>
              <button
                onClick={() => {
                  setSelectedType('disorder');
                  setSelectedValue('');
                }}
                className={`flex-1 py-3 px-4 rounded-lg transition-all ${
                  selectedType === 'disorder'
                    ? 'bg-[#2bcd82] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Speech Disorder
              </button>
            </div>
          </div>
          
          {/* Card Grid for Category Selection */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-4 text-center">
              Select a {selectedType === 'sound' ? 'sound' : 'disorder'}:
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {selectedType === 'sound' ? (
                SPEECH_SOUNDS.map((sound) => (
                  <div
                    key={sound}
                    onClick={() => setSelectedValue(sound === selectedValue ? '' : sound)}
                    className={`cursor-pointer rounded-lg p-4 text-center transition-all ${
                      sound === selectedValue
                        ? 'bg-[#2bcd82] text-white shadow-md transform scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="font-bold text-xl mb-1">{sound}</div>
                    <div className="text-xs opacity-80">
                      {sound === selectedValue ? 'Selected' : 'Click to select'}
                    </div>
                  </div>
                ))
              ) : (
                SPEECH_DISORDERS.map((disorder) => (
                  <div
                    key={disorder}
                    onClick={() => setSelectedValue(disorder === selectedValue ? '' : disorder)}
                    className={`cursor-pointer rounded-lg p-4 text-center transition-all ${
                      disorder === selectedValue
                        ? 'bg-[#2bcd82] text-white shadow-md transform scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="font-medium text-sm mb-1">{disorder}</div>
                    <div className="text-xs opacity-80">
                      {disorder === selectedValue ? 'Selected' : 'Click to select'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2bcd82]"></div>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center my-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}
        
        {/* No Results */}
        {!loading && !error && selectedValue && products.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-xl font-medium">No resources found</p>
            <p className="text-gray-400 mt-2">
              We couldn't find any resources for {selectedType === 'sound' ? 'sound' : 'disorder'}: <strong>{selectedValue}</strong>
            </p>
          </div>
        )}
        
        {/* Results Grid */}
        {!loading && products.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              Resources for {selectedType === 'sound' ? 'Sound' : 'Disorder'}: <span className="text-[#2bcd82]">{selectedValue}</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div 
                  key={product.id}
                  onClick={() => navigate(`/catalog/${product.id}`)}
                  className="bg-white cursor-pointer rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full border border-gray-100"
                >
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
                        {getPdfCount(product) > 1 ? `${getPdfCount(product)} PDFs` : "PDF"}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-5 flex flex-col flex-grow">
                    <div className="h-14 mb-2 flex flex-col justify-start">
                      <h3 
                        className="text-lg font-bold text-gray-800 hover:text-[#2bcd82] transition-colors line-clamp-2 leading-tight"
                        title={product.name || product.title || 'Unnamed Product'}
                      >
                        {product.name || product.title || 'Unnamed Product'}
                      </h3>
                    </div>
                    
                    <div className="text-gray-600 mb-4 text-sm flex-grow">
                      {product.description ? (
                        <p className="line-clamp-3">
                          {product.description.length > 120 
                            ? product.description.substring(0, 120) + '...' 
                            : product.description}
                        </p>
                      ) : (
                        <p className="text-gray-400 italic">No description available</p>
                      )}
                    </div>
                    
                    {/* Category Tags */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {product.categories && product.categories.length > 0 ? (
                        product.categories.slice(0, 3).map((cat, idx) => (
                          <span 
                            key={idx} 
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full"
                          >
                            {typeof cat === 'object' && cat !== null && 'name' in cat ? cat.name : cat}
                          </span>
                        ))
                      ) : product.category ? (
                        <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                          {product.category}
                        </span>
                      ) : null}
                    </div>
                    
                    <div className="mt-auto">
                      <button 
                        className="w-full text-white bg-[#2bcd82] flex items-center justify-center gap-2 hover:bg-[#25b975] p-2 rounded-lg transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/catalog/${product.id}`);
                        }}
                      >
                        View Details
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default ResourceFinder; 