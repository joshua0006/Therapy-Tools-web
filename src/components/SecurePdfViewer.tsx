import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, FileText, ShieldCheck, Eye, Download } from 'lucide-react';
import { toast } from 'sonner';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

interface SecurePdfViewerProps {
  productId: string | number;
  onClose: () => void;
  pdfDetails?: {
    url: string;
    name: string;
    preventDownload?: boolean;
  } | null;
}

interface FirebaseProduct {
  id: string | number;
  name?: string;
  description?: string;
  downloadable?: boolean;
  downloads?: Array<{
    id: string;
    name: string;
    file: string;
  }>;
  pdfUrl?: string;
  fileUrl?: string;
  images?: Array<{
    src: string;
  }>;
  [key: string]: any;
}

const SecurePdfViewer: React.FC<SecurePdfViewerProps> = ({ productId, onClose, pdfDetails }) => {
  const [pdfUrl, setPdfUrl] = useState<string>(pdfDetails?.url || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productName, setProductName] = useState<string>(pdfDetails?.name || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Security features to prevent downloads
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Prevent right-click
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };
    
    // Prevent keyboard shortcuts like Ctrl+S
    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey && (e.key === 's' || e.key === 'p')) || e.key === 'F12') {
        e.preventDefault();
        return false;
      }
    };
    
    // Add event listeners
    container.addEventListener('contextmenu', preventContextMenu);
    window.addEventListener('keydown', preventKeyboardShortcuts);
    
    // Cleanup
    return () => {
      container.removeEventListener('contextmenu', preventContextMenu);
      window.removeEventListener('keydown', preventKeyboardShortcuts);
    };
  }, []);
  
  // Load the PDF from product data
  useEffect(() => {
    const loadPdf = async () => {
      if (pdfDetails?.url) {
        // If PDF details are provided directly, use them
        setPdfUrl(pdfDetails.url);
        setProductName(pdfDetails.name);
        setLoading(false);
      } else if (productId) {
        // Otherwise fetch from Firebase
        await fetchProductData();
      } else {
        setError('No PDF URL or Product ID provided');
        setLoading(false);
      }
    };
    
    const fetchProductData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const db = getFirestore();
        const productRef = doc(db, 'products', String(productId));
        const productSnap = await getDoc(productRef);
        
        if (!productSnap.exists()) {
          throw new Error('Product not found');
        }
        
        const productData = productSnap.data() as FirebaseProduct;
        setProductName(productData.name || 'PDF Document');
        
        // Check for downloads array
        if (productData.downloads && productData.downloads.length > 0) {
          // Find the first PDF file in downloads
          const pdfFile = productData.downloads.find(download => 
            download.file && download.file.toLowerCase().endsWith('.pdf')
          );
          
          if (pdfFile) {
            console.log('Found PDF file:', pdfFile);
            setPdfUrl(pdfFile.file);
          } else {
            throw new Error('No PDF file found in downloads');
          }
        } else if (productData.pdfUrl) {
          // Fallback to pdfUrl if no downloads array
          setPdfUrl(productData.pdfUrl);
        } else {
          throw new Error('No PDF URL found for this product');
        }
      } catch (err) {
        console.error('Error fetching product data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load product data');
      } finally {
        setLoading(false);
      }
    };
    
    loadPdf();
  }, [productId, pdfDetails]);

  // Handle iframe load event
  const handleIframeLoad = () => {
    setLoading(false);
    toast.success('Document loaded successfully');
  };

  // Handle iframe error
  const handleIframeError = () => {
    setError('Failed to load the PDF. Please try again.');
    setLoading(false);
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div 
        ref={containerRef}
        className="bg-white rounded-lg shadow-xl overflow-hidden w-full max-w-full h-full max-h-screen flex flex-col"
        style={{ height: 'calc(100vh - 40px)', maxWidth: 'calc(100vw - 40px)' }}
      >
        {/* Header */}
        <div className="bg-gray-800 text-white px-4 py-3 flex justify-between items-center">
          <div className="flex items-center truncate">
            <FileText className="mr-2 flex-shrink-0" size={20} />
            <h2 className="text-lg font-semibold truncate">{productName || 'PDF Document'}</h2>
          </div>
          <button 
            onClick={onClose}
            className="hover:bg-gray-700 p-1 rounded"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 min-h-0 relative bg-gray-100 overflow-hidden">
          {/* Loading State */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-700">Loading document...</span>
            </div>
          )}
          
          {/* Error State */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-6 bg-white z-10">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-lg w-full">
                <div className="flex items-start">
                  <AlertTriangle className="text-red-500 mr-3 mt-0.5" size={24} />
                  <div>
                    <h3 className="text-red-800 font-medium text-lg">Error Loading PDF</h3>
                    <p className="text-red-700 mt-2">{error}</p>
                  </div>
                </div>
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors flex items-center"
                  >
                    <RefreshCw size={16} className="mr-2" />
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* PDF Viewer (using secured iframe) */}
          {pdfUrl && (
            <div className="h-full w-full relative">
              {/* Security overlay to block the top control bar */}
              <div 
                className="absolute top-0 left-0 right-0 z-20"
                style={{ 
                  height: '40px', 
                  background: 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(5px)'
                }}
              />
              
              {/* Additional overlay for the download button area */}
              <div 
                className="absolute top-0 right-0 z-20"
                style={{ 
                  height: '40px', 
                  width: '100px',
                  background: 'rgba(0,0,0,0.8)'
                }}
              />
              
              {/* Main security overlay to prevent interactions */}
              <div 
                className="absolute inset-0 pointer-events-none" 
                style={{ zIndex: 5 }}
              />
              
              <div className="w-full h-full" style={{ overflow: 'hidden' }}>
                <iframe
                  ref={iframeRef}
                  src={`${pdfUrl}${pdfUrl.includes('?') ? '&' : '?'}t=${Date.now()}`}
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  className="w-full h-full border-0"
                  style={{ 
                    height: 'calc(100% + 40px)', 
                    width: '100%',
                    marginTop: '-40px' // Push iframe up to hide the controls
                  }}
                  title={productName || "PDF Document"}
                />
              </div>
              
              {/* Custom control bar */}
              <div 
                className="absolute top-0 left-0 right-0 bg-gray-800 text-white z-30 flex items-center px-4"
                style={{ height: '40px' }}
              >
                <div className="flex items-center">
                  <FileText size={16} className="mr-2" />
                  <span className="text-sm">{productName}</span>
                </div>
              </div>
              
              {/* Watermark */}
              <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs py-1 px-3 rounded-full flex items-center pointer-events-none" style={{ zIndex: 40 }}>
                <Eye size={12} className="mr-1" />
                <span>View Only • No Downloads</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-gray-800 px-4 py-2 text-gray-400 text-xs flex items-center justify-between">
          <div className="flex items-center">
            <ShieldCheck size={14} className="mr-2" />
            <span>Protected document • {new Date().toLocaleDateString()}</span>
          </div>
          
          <div className="flex items-center">
            <Download size={14} className="mr-1 text-red-400" />
            <span className="text-red-400">Downloads disabled</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurePdfViewer; 