import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { getFirestore, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { app } from '../lib/firebase';
import { getProxiedPdfUrl } from '../services/pdfService';
import Header from './Header';
import Footer from './Footer';
import { ArrowLeft, AlertTriangle, Clock, Loader2, Download, Eye, FileText, Check } from 'lucide-react';
import Button from './Button';
import { toast } from 'react-hot-toast';

// Add PDF.js type declarations
declare global {
  interface Window {
    pdfjsLib: any; // Using any type to avoid conflicts
  }
}

interface PageSelection {
  email: string;
  productId: string;
  pdfUrl?: string;
  pdfName?: string;
  selectedPages: number[];
  createdAt: string;
  expiresAt: string;
  accessCount: number;
}

const ViewSelectedPages: React.FC = () => {
  const { selectionId } = useParams<{ selectionId: string }>();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<PageSelection | null>(null);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [expired, setExpired] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadCounter, setDownloadCounter] = useState(0);

  // Check if the URL has a download=all parameter
  const shouldDownloadAll = new URLSearchParams(location.search).get('download') === 'all';

  useEffect(() => {
    const fetchSelectionData = async () => {
      if (!selectionId) {
        setError('No selection ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const db = getFirestore(app);
        const selectionRef = doc(db, 'pageSelections', selectionId);
        const selectionSnap = await getDoc(selectionRef);

        if (!selectionSnap.exists()) {
          setError('This selection does not exist or may have been removed');
          setLoading(false);
          return;
        }

        const selectionData = selectionSnap.data() as PageSelection;
        setSelection(selectionData);

        // Check if expired
        const expirationDate = new Date(selectionData.expiresAt);
        const now = new Date();
        if (now > expirationDate) {
          setExpired(true);
          setLoading(false);
          return;
        }

        // Update access count
        await updateDoc(selectionRef, {
          accessCount: increment(1)
        });

        // Start loading the images
        loadPdfPages(selectionData);
      } catch (err) {
        console.error('Error fetching selection data:', err);
        setError('Failed to load the selected pages. Please try again later.');
        setLoading(false);
      }
    };

    fetchSelectionData();
  }, [selectionId]);

  // Function to download all pages
  const downloadAllPages = async () => {
    if (pageImages.length === 0 || !selection) return;
    
    setDownloadingAll(true);
    setDownloadCounter(0);
    
    // Create a delay between downloads to avoid browser throttling
    for (let i = 0; i < pageImages.length; i++) {
      const imageUrl = pageImages[i];
      const pageNum = selection.selectedPages[i];
      
      if (!imageUrl) continue;
      
      // Create download link
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `page-${pageNum}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Update counter for visual feedback
      setDownloadCounter(i + 1);
      
      // Add a small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    toast.success(`Downloaded all ${pageImages.length} pages`);
    setDownloadingAll(false);
  };

  // Check if we should automatically download all pages
  useEffect(() => {
    if (shouldDownloadAll && pageImages.length > 0 && !downloadingAll && !loadingImages) {
      downloadAllPages();
    }
  }, [shouldDownloadAll, pageImages, loadingImages]);

  const loadPdfPages = async (selectionData: PageSelection) => {
    if (!selectionData.pdfUrl) {
      setError('No PDF URL available for this selection');
      setLoading(false);
      return;
    }

    try {
      setLoadingImages(true);
      
      // Use PDF.js to render pages
      if (typeof window.pdfjsLib === 'undefined') {
        // Load PDF.js library if not already loaded
        const pdfjsScript = document.createElement('script');
        pdfjsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        pdfjsScript.integrity = 'sha512-q+4lLh43mytYJ34/IqIGiTp3MvKnS0o9rNDkEIbPT1qPbUYq/ZqQ3Q9uhX+XUQ8P5JnFNNlzgOuqkCNtR6j+eA==';
        pdfjsScript.crossOrigin = 'anonymous';
        pdfjsScript.referrerPolicy = 'no-referrer';
        document.head.appendChild(pdfjsScript);
        
        // Wait for PDF.js to load
        await new Promise<void>((resolve) => {
          pdfjsScript.onload = () => {
            // Set worker path
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve();
          };
        });
      }

      // Get proxied URL to avoid CORS issues
      const pdfUrl = getProxiedPdfUrl(selectionData.pdfUrl);
      
      // Fetch PDF data
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      }
      
      const pdfData = await response.arrayBuffer();
      
      // Load the PDF
      const pdf = await window.pdfjsLib.getDocument({
        data: pdfData,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true,
      }).promise;
      
      const images: string[] = [];
      
      // Render each selected page
      for (const pageNum of selectionData.selectedPages) {
        try {
          const page = await pdf.getPage(pageNum);
          const scale = 1.5; // Higher scale for better quality
          const viewport = page.getViewport({ scale });
          
          // Create canvas for rendering
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          const context = canvas.getContext('2d');
          if (!context) continue;
          
          // Render PDF page
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
          
          // Convert to image
          const dataUrl = canvas.toDataURL('image/png');
          images.push(dataUrl);
        } catch (pageErr) {
          console.error(`Error rendering page ${pageNum}:`, pageErr);
          // Add placeholder for failed page
          images.push('');
        }
      }
      
      setPageImages(images);
      setLoadingImages(false);
      setLoading(false);
    } catch (err) {
      console.error('Error loading PDF pages:', err);
      setError('Failed to load PDF pages. The PDF may no longer be available.');
      setLoadingImages(false);
      setLoading(false);
    }
  };

  const handleDownloadImage = (imageUrl: string, pageNum: number) => {
    // Create download link
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `page-${pageNum}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Downloaded page ${pageNum}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12 flex justify-center items-center">
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
            <h2 className="text-xl font-semibold text-gray-700">Loading selected pages...</h2>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-8 text-center">
            <Clock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Link Expired</h1>
            <p className="text-gray-600 mb-6">
              This shared link has expired. Shared page links are valid for 7 days.
            </p>
            <Link to="/" className="inline-flex items-center text-indigo-600 hover:text-indigo-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Home
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !selection) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Error Loading Pages</h1>
            <p className="text-gray-600 mb-6">
              {error || "Unable to load the selected pages. The link may be invalid or expired."}
            </p>
            <Link to="/" className="inline-flex items-center text-indigo-600 hover:text-indigo-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Home
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-gray-600 hover:text-indigo-600 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
          <div className="p-6 md:p-8">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                Selected Pages from {selection.pdfName || "Document"}
              </h1>
              <p className="text-gray-600">
                <span className="font-medium">Pages:</span> {selection.selectedPages.sort((a, b) => a - b).join(', ')}
              </p>
              <div className="bg-indigo-50 rounded-lg p-3 mt-4 flex items-start">
                <FileText className="w-5 h-5 text-indigo-500 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-indigo-700">
                  These selected pages were shared with you. You can view and download these pages anytime within 7 days of when they were shared.
                </p>
              </div>
              
              {/* Download All Button */}
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={downloadAllPages}
                  disabled={downloadingAll || pageImages.length === 0}
                  className={`flex items-center px-4 py-2 ${
                    downloadingAll ? 'bg-gray-200 text-gray-600 cursor-wait' : 'bg-green-600 hover:bg-green-700 text-white'
                  } rounded-lg transition-colors`}
                >
                  {downloadingAll ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Downloading... ({downloadCounter}/{pageImages.length})
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download All Pages
                    </>
                  )}
                </Button>
              </div>
              
              {/* Download Progress Message */}
              {downloadingAll && (
                <div className="mt-3 bg-green-50 p-3 rounded-lg border border-green-200">
                  <p className="text-green-800 text-sm flex items-center">
                    <Check className="w-4 h-4 mr-2" />
                    Downloading page {downloadCounter} of {pageImages.length}. Please wait...
                  </p>
                </div>
              )}
            </div>

            {loadingImages ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                <p className="text-gray-700">Rendering page images...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8">
                {pageImages.map((imageUrl, index) => {
                  const pageNum = selection.selectedPages[index];
                  return (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-medium text-gray-800">Page {pageNum}</h3>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleDownloadImage(imageUrl, pageNum)}
                            className="flex items-center px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 rounded"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                          <Button
                            onClick={() => window.open(imageUrl, '_blank')}
                            className="flex items-center px-3 py-1.5 text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Full Size
                          </Button>
                        </div>
                      </div>
                      {imageUrl ? (
                        <div className="bg-gray-50 p-2 rounded border border-gray-200">
                          <img
                            src={imageUrl}
                            alt={`Page ${pageNum}`}
                            className="max-w-full h-auto mx-auto rounded shadow-sm"
                          />
                        </div>
                      ) : (
                        <div className="bg-gray-50 p-8 text-center rounded border border-gray-200">
                          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                          <p className="text-gray-500">Failed to render this page</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ViewSelectedPages; 