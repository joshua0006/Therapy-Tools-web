import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, X, ChevronLeft, ChevronRight, Loader, AlertTriangle } from 'lucide-react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '../lib/firebase';

interface PageViewInfo {
  pdfUrl: string;
  pdfName: string;
  selectedPages: number[];
  email: string;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
  maxAccessCount: number;
}

const GuestPdfViewer: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageInfo, setPageInfo] = useState<PageViewInfo | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageRendering, setPageRendering] = useState(false);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();

  // Fetch session data
  useEffect(() => {
    const fetchSessionData = async () => {
      if (!sessionId) {
        setError("No session ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const db = getFirestore(app);
        
        try {
          const sessionRef = doc(db, 'pdfSessions', sessionId);
          const sessionSnap = await getDoc(sessionRef);

          if (!sessionSnap.exists()) {
            throw new Error("Session not found or has expired");
          }

          const data = sessionSnap.data() as PageViewInfo;
          
          // Check if session is expired
          if (data.expiresAt < Date.now()) {
            throw new Error("This viewing session has expired");
          }
          
          // Check if max views exceeded
          if (data.accessCount >= data.maxAccessCount) {
            throw new Error("Maximum view count reached for this session");
          }

          setPageInfo(data);
        } catch (fbError) {
          console.error("Firebase error:", fbError);
          
          // In development, provide a mock response for testing
          if (process.env.NODE_ENV === 'development') {
            console.log('Using mock data for development');
            // Mock data for development/testing
            const mockData: PageViewInfo = {
              pdfUrl: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf',
              pdfName: 'Sample PDF Document',
              selectedPages: [1, 2, 3],
              email: 'test@example.com',
              createdAt: Date.now(),
              expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
              accessCount: 0,
              maxAccessCount: 10
            };
            setPageInfo(mockData);
          } else {
            throw fbError;
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching session data:", err);
        setError(err instanceof Error ? err.message : "Failed to load content");
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId]);

  // Load PDF.js when page info is available
  useEffect(() => {
    if (!pageInfo || !pageInfo.pdfUrl) return;
    
    const loadPdfJs = async () => {
      try {
        // Load PDF.js if not already loaded
        if (typeof window.pdfjsLib === 'undefined') {
          const pdfjsScript = document.createElement('script');
          pdfjsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          pdfjsScript.integrity = 'sha512-q+4lLh43mytYJ34/IqIGiTp3MvKnS0o9rNDkEIbPT1qPbUYq/ZqQ3Q9uhX+XUQ8P5JnFNNlzgOuqkCNtR6j+eA==';
          pdfjsScript.crossOrigin = 'anonymous';
          pdfjsScript.referrerPolicy = 'no-referrer';
          document.head.appendChild(pdfjsScript);
          
          await new Promise<void>((resolve) => {
            pdfjsScript.onload = () => {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
              resolve();
            };
          });
        }
        
        // Load the PDF
        const loadingTask = window.pdfjsLib.getDocument({
          url: pageInfo.pdfUrl,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
        });
        
        loadingTask.promise.then((pdf: any) => {
          setPdfDocument(pdf);
          // Render first page
          renderPage(0);
        }).catch((err: any) => {
          console.error("Error loading PDF:", err);
          setError("Failed to load the PDF document");
        });
      } catch (err) {
        console.error("Error initializing PDF viewer:", err);
        setError("Failed to initialize PDF viewer");
      }
    };
    
    loadPdfJs();
  }, [pageInfo]);

  // Render the current page
  const renderPage = async (pageIndex: number) => {
    if (!pdfDocument || !pageInfo || !canvasRef.current) return;
    
    try {
      setPageRendering(true);
      
      // Get the page number to render (from selected pages array)
      const pageNum = pageInfo.selectedPages[pageIndex];
      if (!pageNum) {
        throw new Error(`Page ${pageIndex+1} not found in selected pages`);
      }
      
      // Get the page
      const page = await pdfDocument.getPage(pageNum);
      
      // Set up scale and viewport
      const scale = 1.5;
      const viewport = page.getViewport({ scale });
      
      // Set canvas dimensions
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Fill canvas with white background
      if (context) {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      // Render the page
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      setCurrentPageIndex(pageIndex);
    } catch (err) {
      console.error("Error rendering page:", err);
    } finally {
      setPageRendering(false);
    }
  };

  // Navigation handlers
  const goToPreviousPage = () => {
    if (currentPageIndex > 0) {
      renderPage(currentPageIndex - 1);
    }
  };

  const goToNextPage = () => {
    if (pageInfo && currentPageIndex < pageInfo.selectedPages.length - 1) {
      renderPage(currentPageIndex + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="mx-auto h-12 w-12 text-indigo-600 animate-spin mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Loading your document...</h2>
          <p className="text-gray-500 mt-2">Please wait while we prepare your selected pages</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Unable to Access Document</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <FileText className="text-indigo-600 mr-2" />
            <h1 className="text-xl font-semibold text-gray-800">
              {pageInfo?.pdfName || 'PDF Viewer'}
            </h1>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 py-8">
        <div className="max-w-5xl mx-auto px-4">
          {/* Document info */}
          <div className="bg-indigo-50 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-medium text-indigo-800">Viewing Selected Pages</h2>
            {pageInfo && (
              <p className="text-indigo-600">
                Showing page {currentPageIndex + 1} of {pageInfo.selectedPages.length} selected pages
                (original PDF pages: {pageInfo.selectedPages.join(', ')})
              </p>
            )}
          </div>

          {/* PDF Viewer */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Canvas Container */}
            <div className="flex justify-center items-center min-h-[500px] bg-gray-200 p-4">
              {pageRendering ? (
                <div className="flex flex-col items-center justify-center">
                  <Loader className="text-indigo-600 h-8 w-8 animate-spin mb-2" />
                  <p className="text-gray-600">Loading page...</p>
                </div>
              ) : (
                <div className="bg-white shadow-lg">
                  <canvas 
                    ref={canvasRef} 
                    className="block"
                  />
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="bg-gray-50 p-4 flex items-center justify-center space-x-6">
              <button
                onClick={goToPreviousPage}
                disabled={currentPageIndex === 0 || pageRendering}
                className={`flex items-center space-x-1 px-3 py-2 rounded ${
                  currentPageIndex === 0 || pageRendering
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Previous</span>
              </button>

              <div className="text-gray-700 font-medium">
                {pageInfo && `Page ${currentPageIndex + 1} of ${pageInfo.selectedPages.length}`}
              </div>

              <button
                onClick={goToNextPage}
                disabled={!pageInfo || currentPageIndex >= pageInfo.selectedPages.length - 1 || pageRendering}
                className={`flex items-center space-x-1 px-3 py-2 rounded ${
                  !pageInfo || currentPageIndex >= pageInfo.selectedPages.length - 1 || pageRendering
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                }`}
              >
                <span>Next</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Note */}
          <div className="mt-6 text-center text-gray-600 text-sm">
            <p>This link provides temporary access to the selected pages you requested.</p>
            <p>For full access to this document, please visit our website.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Therapy Tools. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

// Add PDF.js types
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export default GuestPdfViewer; 