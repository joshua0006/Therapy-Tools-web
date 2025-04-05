import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, AlertTriangle, FileText, ShieldCheck, Download, ZoomIn, ZoomOut, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, Search, Layers, Grid } from 'lucide-react';
import { toast } from 'sonner';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getProxiedPdfUrl, handleProxyFailure, fetchPdfAsArrayBuffer } from '../services/pdfService';

interface SecurePdfViewerProps {
  productId: string | number;
  onClose: () => void;
  pdfDetails?: {
    url: string;
    name: string;
    preventDownload?: boolean;
    initialPage?: number;
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
  const [originalUrl, setOriginalUrl] = useState<string>(pdfDetails?.url || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productName, setProductName] = useState<string>(pdfDetails?.name || '');
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3; // Maximum number of automatic retries
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1.5);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [inputPage, setInputPage] = useState<string>('1');
  const [targetPage, setTargetPage] = useState<number | null>(null);
  const [pageNavigationAttempted, setPageNavigationAttempted] = useState(false);
  const [pageNavigationComplete, setPageNavigationComplete] = useState(false);
  const [pageNavigationLoading, setPageNavigationLoading] = useState(false);
  const initialLoadCompleted = useRef(false);
  const initialPageRef = useRef<number | null>(pdfDetails?.initialPage || null);
  
  // State for tracking dragging/panning
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });
  const [initialOffset, setInitialOffset] = useState({ x: 0, y: 0 });
  
  const [isScrollable, setIsScrollable] = useState(false);
  
  const [pageTransition, setPageTransition] = useState<'fade-in' | 'fade-out' | null>(null);
  
  const [isFirstRender, setIsFirstRender] = useState(true);
  const renderAttempts = useRef(0);
  const lastRenderTimestamp = useRef(0);
  const timerRef = useRef<any>(null);
  
  // Get target page directly passed in props or from session storage
  useEffect(() => {
    // First try to get the page from props
    if (initialPageRef.current) {
      console.log(`[PDF Viewer] Using initial page from props: ${initialPageRef.current}`);
      setTargetPage(initialPageRef.current);
      setCurrentPage(initialPageRef.current);
      setInputPage(initialPageRef.current.toString());
      setPageNavigationAttempted(true);
      return;
    }
    
    // If not in props, try to get from session storage with new key
    const pageDataJson = sessionStorage.getItem('pdfTargetPage');
    if (pageDataJson) {
      try {
        const pageData = JSON.parse(pageDataJson);
        if (pageData && typeof pageData.targetPage === 'number') {
          console.log(`[PDF Viewer] Found target page in session storage: ${pageData.targetPage}`);
          setTargetPage(pageData.targetPage);
          setCurrentPage(pageData.targetPage);
          setInputPage(pageData.targetPage.toString());
          setPageNavigationAttempted(true);
        }
      } catch (error) {
        console.error("[PDF Viewer] Error parsing page data from session storage:", error);
      }
    }
    
    // Fallback to legacy key if needed
    if (!pageNavigationAttempted) {
      const legacyPageStr = sessionStorage.getItem('pdfInitialPage');
      if (legacyPageStr) {
        try {
          const parsedPage = parseInt(legacyPageStr, 10);
          if (!isNaN(parsedPage) && parsedPage > 0) {
            console.log(`[PDF Viewer] Using legacy page number: ${parsedPage}`);
            setTargetPage(parsedPage);
            setCurrentPage(parsedPage);
            setInputPage(parsedPage.toString());
            setPageNavigationAttempted(true);
          }
        } catch (error) {
          console.error("[PDF Viewer] Error parsing legacy page number:", error);
        }
      }
    }
  }, []);
  
  // Clear session storage after navigation is complete
  useEffect(() => {
    if (pageNavigationComplete && pageNavigationAttempted) {
      console.log('[PDF Viewer] Navigation complete, clearing session storage');
      sessionStorage.removeItem('pdfTargetPage');
      sessionStorage.removeItem('pdfInitialPage');
    }
  }, [pageNavigationComplete, pageNavigationAttempted]);
  
  // Enhanced function to ensure we navigate to the requested page
  const ensurePageNavigation = () => {
    if (!pdfDocument || pageNavigationComplete || !targetPage) return;
    
    console.log(`[PDF Viewer] Ensuring navigation to target page: ${targetPage}`);
    
    // Verify the target page is within bounds
    if (targetPage >= 1 && targetPage <= pageCount) {
      if (currentPage !== targetPage) {
        console.log(`[PDF Viewer] Initiating navigation to page ${targetPage}`);
        renderPage(targetPage);
      } else {
        console.log(`[PDF Viewer] Already on target page ${targetPage}`);
        setPageNavigationComplete(true);
      }
    } else {
      console.warn(`[PDF Viewer] Target page ${targetPage} out of bounds (1-${pageCount})`);
    }
  };
  
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
        const originalPdfUrl = pdfDetails.url;
        setOriginalUrl(originalPdfUrl);
        // For the PDF.js viewer, we'll use the direct URL without proxying
        setPdfUrl(originalPdfUrl);
        setProductName(pdfDetails.name);
        
        // Set initial page if provided
        if (pdfDetails.initialPage && typeof pdfDetails.initialPage === 'number') {
          console.log(`[PDF Viewer] Got initialPage from pdfDetails: ${pdfDetails.initialPage}`);
          setTargetPage(pdfDetails.initialPage);
          setCurrentPage(pdfDetails.initialPage);
          setInputPage(pdfDetails.initialPage.toString());
          setPageNavigationAttempted(true);
        }
        
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
            // Store original URL for reference
            setOriginalUrl(pdfFile.file);
            // Use direct URL for PDF.js
            setPdfUrl(pdfFile.file);
          } else {
            throw new Error('No PDF file found in downloads');
          }
        } else if (productData.pdfUrl) {
          // Fallback to pdfUrl if no downloads array
          setOriginalUrl(productData.pdfUrl);
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

  // Fetch PDF data when URL changes
  useEffect(() => {
    if (!pdfUrl) return;
    
    const fetchPdfData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching PDF data from:', pdfUrl);
        
        // Always fetch a fresh copy of the PDF data
        const data = await fetchPdfAsArrayBuffer(pdfUrl);
        
        // Make sure component is still mounted before setting state
        if (!componentIsMounted.current) return;
        
        // Set PDF data as a fresh copy
        setPdfData(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching PDF data:', err);
        // Make sure component is still mounted before setting state
        if (!componentIsMounted.current) return;
        
        // Try with direct URL if we were using a proxy
        if (pdfUrl !== originalUrl && retryCount < maxRetries) {
          toast.info('Having trouble loading the document. Trying direct access...');
          setPdfUrl(originalUrl);
          setRetryCount(prev => prev + 1);
        } else if (retryCount < maxRetries) {
          // Try with a proxied URL if we were using direct
          toast.info('Having trouble loading the document. Trying alternate method...');
          const newUrl = getProxiedPdfUrl(originalUrl);
          setPdfUrl(newUrl);
          setRetryCount(prev => prev + 1);
        } else {
          setError('Unable to load the document. The server might be unavailable or not allowing access.');
          setLoading(false);
        }
      }
    };
    
    fetchPdfData();
  }, [pdfUrl, originalUrl, retryCount]);

  // Add a ref to track component mounted state
  const componentIsMounted = useRef(true);
  
  // Set mount/unmount tracking
  useEffect(() => {
    componentIsMounted.current = true;
    
    return () => {
      // When component unmounts, mark it as unmounted to prevent state updates
      componentIsMounted.current = false;
      
      // Clean up any ArrayBuffers or large objects to prevent memory leaks
      setPdfData(null);
      setPdfDocument(null);
      setThumbnails([]);
    };
  }, []);

  // Generate thumbnail for a specific page
  const generateThumbnail = async (pageNum: number, pdf: any) => {
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.2 });
      
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      const context = canvas.getContext('2d');
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      return canvas.toDataURL();
    } catch (err) {
      console.error(`Error generating thumbnail for page ${pageNum}:`, err);
      return '';
    }
  };

  // Generate thumbnails for all pages
  const generateThumbnails = async (pdf: any) => {
    const thumbnailsArray = [];
    const totalPages = pdf.numPages;
    
    // Only generate thumbnails for first 20 pages to avoid performance issues
    const pagesToGenerate = Math.min(totalPages, 20);
    
    for (let i = 1; i <= pagesToGenerate; i++) {
      const thumbnail = await generateThumbnail(i, pdf);
      thumbnailsArray.push(thumbnail);
    }
    
    setThumbnails(thumbnailsArray);
  };

  // Render a specific page with improved verification
  const renderPage = async (pageNum: number, isInitialRender = false) => {
    if (!pdfDocument || !canvasRef.current) return;
    
    try {
      console.log(`[PDF Viewer] Rendering page ${pageNum}${isInitialRender ? ' (initial render)' : ''}`);
      
      // Always show loading when navigating to a new page
      setPageNavigationLoading(true);

      // Track render attempt for debugging
      renderAttempts.current += 1;
      lastRenderTimestamp.current = Date.now();
      
      // Add a brief fade-out effect before loading new page
      if (!isInitialRender) {
        setPageTransition('fade-out');
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      // Get page
      const page = await pdfDocument.getPage(pageNum);
      console.log(`[PDF Viewer] Got page ${pageNum}, size: ${page.view}`);
      
      // Set scale based on zoom level
      const viewport = page.getViewport({ scale: zoomLevel });
      console.log(`[PDF Viewer] Viewport created: ${viewport.width}x${viewport.height}`);
      
      // Prepare canvas
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true }); // Disable alpha for better performance
      if (!context) {
        console.error('[PDF Viewer] Failed to get canvas context');
        throw new Error('Failed to get canvas context');
      }
      
      // Fill canvas with white background before rendering
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // Set the canvas dimensions to match the viewport
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      
      // Fill canvas with white again after resizing
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      console.log(`[PDF Viewer] Canvas prepared: ${canvas.width}x${canvas.height}`);
      
      // For first render, always use the most compatible rendering approach
      const useWebGL = !isFirstRender && !isInitialRender;
      
      // Render PDF page with safer defaults for first render
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        enableWebGL: useWebGL,
        renderInteractiveForms: true,
        intent: isFirstRender ? "display" : "print"  // Use 'display' for first render, 'print' for higher quality
      };
      
      // Create a render task
      const renderTask = page.render(renderContext);
      
      // Wait for the render to complete and verify
      await renderTask.promise;
      
      console.log(`[PDF Viewer] Render completed for page ${pageNum}`);
      
      // Add fade-in effect after page is loaded
      setPageTransition('fade-in');
      
      // More robust content verification
      const hasContent = await verifyCanvasHasContent(canvas, context);
      
      if (!hasContent) {
        console.warn(`[PDF Viewer] Page ${pageNum} appears to be blank, attempting additional rendering`);
        
        // Try an alternative rendering approach immediately
        // Force a re-render with slightly different parameters
        const altViewport = page.getViewport({ scale: zoomLevel * 0.99 }); // Slightly different scale
        canvas.height = altViewport.height;
        canvas.width = altViewport.width;
        
        // Fill with white background again
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        try {
          // Cancel previous render task if needed
          renderTask.cancel();
        } catch (e) {
          // Ignore cancel errors
        }
        
        try {
          // Explicit clean reliable render settings 
          await page.render({
            canvasContext: context,
            viewport: altViewport,
            enableWebGL: false, // Try without WebGL
            renderInteractiveForms: false
          }).promise;
          
          console.log(`[PDF Viewer] Alternative render completed for page ${pageNum}`);
        } catch (err) {
          console.error(`[PDF Viewer] Alternative render failed:`, err);
          
          // Try one more time with even more basic settings
          try {
            // Use an even more basic approach
            await page.render({
              canvasContext: context,
              viewport: page.getViewport({ scale: zoomLevel * 1.01 }),
            }).promise;
            console.log(`[PDF Viewer] Basic render completed for page ${pageNum}`);
          } catch (basicErr) {
            console.error(`[PDF Viewer] Basic render also failed:`, basicErr);
          }
        }
      }
      
      // First render special handling - if this is the first render, schedule a verification
      // and potential re-render after a short delay 
      if (isFirstRender) {
        setIsFirstRender(false);
        
        // Clear any existing timers
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        
        // Schedule verification and potential re-render
        timerRef.current = setTimeout(async () => {
          // Only proceed if component is still mounted
          if (componentIsMounted.current && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              const stillHasContent = await verifyCanvasHasContent(canvasRef.current, ctx);
              
              if (!stillHasContent) {
                console.log('[PDF Viewer] First render verification failed, forcing re-render');
                
                // Forced complete re-render with optimal settings
                const forcedPage = await pdfDocument.getPage(pageNum);
                const forcedViewport = forcedPage.getViewport({ scale: zoomLevel });
                
                // Resize canvas
                canvasRef.current.height = forcedViewport.height;
                canvasRef.current.width = forcedViewport.width;
                
                // Prepare context
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                
                // Render with optimal settings - try a different intent
                await forcedPage.render({
                  canvasContext: ctx,
                  viewport: forcedViewport,
                  enableWebGL: false,
                  intent: 'print' // Higher quality
                }).promise;
                
                console.log('[PDF Viewer] Forced re-render completed');
              }
            }
          }
        }, 600);
      }
      
      // Update UI state after successful render
      setCurrentPage(pageNum);
      setInputPage(pageNum.toString());
      
      // Reset pan position when changing pages
      setViewportOffset({ x: 0, y: 0 });
      
      // Update the canvas container transform
      if (canvasContainerRef.current) {
        canvasContainerRef.current.style.transform = `translate(0px, 0px)`;
      }
      
      // Check if content is scrollable
      setTimeout(() => {
        checkIfScrollable();
      }, 100);
      
      // Check if this was our target page
      if (targetPage === pageNum) {
        console.log(`[PDF Viewer] Successfully rendered target page ${pageNum}`);
        setPageNavigationComplete(true);
        setPageNavigationLoading(false);
        
        if (pageNavigationAttempted) {
          toast.success(`Showing page ${pageNum}`);
        }
      }
      
      // End loading and complete navigation after everything is done
      setPageNavigationLoading(false);
      
      // Reset transition after animation completes
      setTimeout(() => {
        setPageTransition(null);
      }, 300);
      
      // Pre-render next page in background to speed up navigation
      if (pageNum < pageCount) {
        setTimeout(() => {
          try {
            pdfDocument.getPage(pageNum + 1);
            console.log(`[PDF Viewer] Pre-fetched next page ${pageNum + 1}`);
          } catch (e) {
            // Ignore pre-fetch errors
          }
        }, 500);
      }
    } catch (err) {
      console.error(`[PDF Viewer] Error rendering page ${pageNum}:`, err);
      setPageNavigationLoading(false);
      setPageTransition(null); // Reset transition on error
      toast.error(`Failed to render page ${pageNum}. Trying again...`);
      
      // Add retry logic for page rendering with slightly different approach
      setTimeout(() => {
        if (componentIsMounted.current && !pageNavigationComplete && currentPage !== pageNum) {
          console.log(`[PDF Viewer] Retrying page ${pageNum} render with alternative method`);
          
          try {
            // Try to use a different rendering approach for the retry
            const retryRender = async () => {
              // Get page again
              const page = await pdfDocument.getPage(pageNum);
              const canvas = canvasRef.current;
              if (!canvas) return;
              
              const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
              if (!context) return;
              
              // Start with a white canvas
              context.fillStyle = '#ffffff';
              context.fillRect(0, 0, canvas.width, canvas.height);
              
              // Use a different scale for the retry
              const altScale = zoomLevel * 1.01; // Slightly different scale
              const viewport = page.getViewport({ scale: altScale });
              
              // Prepare canvas with different settings
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              context.fillStyle = '#ffffff';
              context.fillRect(0, 0, canvas.width, canvas.height);
              
              // Use different render settings
              await page.render({
                canvasContext: context,
                viewport: viewport,
                enableWebGL: false,
                renderInteractiveForms: false
              }).promise;
              
              console.log(`[PDF Viewer] Retry render completed for page ${pageNum}`);
              setCurrentPage(pageNum);
            };
            
            retryRender();
          } catch (retryErr) {
            console.error(`[PDF Viewer] Retry render also failed:`, retryErr);
            // If all else fails, try simply advancing to the next page
            if (pageNum < pageCount) {
              renderPage(pageNum + 1);
            }
          }
        }
      }, 1000);
    }
  };

  // New helper function for more robust content verification
  const verifyCanvasHasContent = async (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): Promise<boolean> => {
    // Give a small delay to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      // Check for non-white pixels in multiple areas of the canvas
      const checkPoints = [
        { x: canvas.width * 0.25, y: canvas.height * 0.25 },
        { x: canvas.width * 0.5, y: canvas.height * 0.5 },
        { x: canvas.width * 0.75, y: canvas.height * 0.75 },
        { x: canvas.width * 0.5, y: canvas.height * 0.25 },
        { x: canvas.width * 0.25, y: canvas.height * 0.75 }
      ];
      
      for (const point of checkPoints) {
        const sample = context.getImageData(
          Math.floor(point.x), 
          Math.floor(point.y), 
          10, 10
        );
        
        // Check for non-white pixels
        for (let i = 0; i < sample.data.length; i += 4) {
          const r = sample.data[i];
          const g = sample.data[i + 1];
          const b = sample.data[i + 2];
          
          // If any pixel is not white (allowing for some near-white variation)
          if (r < 240 || g < 240 || b < 240) {
            return true;
          }
        }
      }

      // Full scan as a fallback if needed
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const samplingRate = 200; // Check every Nth pixel to save performance
      
      for (let i = 0; i < data.length; i += 4 * samplingRate) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // If any pixel is not white (allowing for some near-white variation)
        if (r < 240 || g < 240 || b < 240) {
          return true;
        }
      }
      
      // No non-white pixels found
      return false;
    } catch (e) {
      console.error('[PDF Viewer] Error verifying canvas content:', e);
      // In case of error, assume there is content
      return true;
    }
  };

  // Check if content is scrollable vertically
  const checkIfScrollable = () => {
    if (viewerContainerRef.current && canvasRef.current) {
      const containerHeight = viewerContainerRef.current.clientHeight;
      const contentHeight = canvasRef.current.height;
      
      setIsScrollable(contentHeight > containerHeight);
    }
  };

  // Handle page navigation
  const goToPage = (pageNum: number) => {
    // Only navigate if we're within bounds and not already on that page
    const targetPage = Math.max(1, Math.min(pageNum, pageCount));
    
    if (targetPage !== currentPage) {
      console.log(`[PDF Viewer] Navigation request to page ${targetPage}`);
      
      // Show loading state immediately
      setPageNavigationLoading(true);
      
      // Clear the canvas first
      if (canvasRef.current) {
        const context = canvasRef.current.getContext('2d', { willReadFrequently: true });
        if (context) {
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
      
      // Add a small delay to allow the canvas to refresh
      setTimeout(() => {
        renderPage(targetPage);
      }, 50);
    }
  };

  // Setup drag/pan events
  useEffect(() => {
    const canvasContainer = canvasContainerRef.current;
    const viewerContainer = viewerContainerRef.current;
    if (!canvasContainer || !viewerContainer) return;
    
    const handleMouseDown = (e: MouseEvent) => {
      // Enable dragging when content is scrollable
      if (isScrollable) {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        setInitialOffset({ ...viewportOffset });
        
        // Change cursor
        canvasContainer.style.cursor = 'grabbing';
      }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && isScrollable) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        
        // Calculate new offset
        const newOffsetX = initialOffset.x + deltaX;
        const newOffsetY = initialOffset.y + deltaY;
        
        // Calculate boundaries to prevent dragging beyond content
        const containerWidth = viewerContainer.clientWidth;
        const containerHeight = viewerContainer.clientHeight;
        const contentWidth = canvasRef.current?.width || 0;
        const contentHeight = canvasRef.current?.height || 0;
        
        // Limit dragging to avoid exposing empty areas - only for horizontal movement
        const maxOffsetX = Math.max(0, containerWidth / 2 - contentWidth / 2);
        const minOffsetX = Math.min(0, containerWidth - contentWidth + maxOffsetX);
        
        // Modified constraint to ensure users can scroll to see the top of the document
        // Remove the negative padding by allowing enough downward movement
        const maxOffsetY = containerHeight; // Allow large positive offset (moving content down)
        const minOffsetY = Math.min(0, containerHeight - contentHeight - 50); // Add extra space to ensure top is visible
        
        // Apply bounds - horizontal constraint remains the same
        const boundedOffsetX = Math.max(minOffsetX, Math.min(maxOffsetX, newOffsetX));
        const boundedOffsetY = Math.max(minOffsetY, Math.min(maxOffsetY, newOffsetY));
        
        // Apply the transform directly to the container
        canvasContainer.style.transform = `translate(${boundedOffsetX}px, ${boundedOffsetY}px)`;
        
        // Update state
        setViewportOffset({ x: boundedOffsetX, y: boundedOffsetY });
      }
    };
    
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        canvasContainer.style.cursor = isScrollable ? 'grab' : 'default';
      }
    };
    
    // Add event listeners
    canvasContainer.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Cleanup
    return () => {
      canvasContainer.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, initialOffset, viewportOffset, isScrollable]);
  
  // Update cursor style when scrollability changes
  useEffect(() => {
    if (canvasContainerRef.current) {
      canvasContainerRef.current.style.cursor = isScrollable ? 'grab' : 'default';
    }
  }, [isScrollable]);

  // Check for scrollable content when zoom changes or window resizes
  useEffect(() => {
    checkIfScrollable();
    
    const handleResize = () => {
      checkIfScrollable();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [zoomLevel]);
  
  // Load PDF.js viewer when PDF data is available with enhanced page navigation
  useEffect(() => {
    if (!pdfData || !viewerContainerRef.current || !componentIsMounted.current) return;
    
    // Reset page navigation state for new document load
    setPageNavigationComplete(false);
    setIsFirstRender(true);
    renderAttempts.current = 0;
    
    const loadPdfJs = async () => {
      try {
        setLoading(true);
        
        // PDF.js global needs to be available - it should be imported in the HTML or layout
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
        
        // Clear the container
        const container = viewerContainerRef.current;
        if (!container || !componentIsMounted.current) return;
        
        console.log('[PDF Viewer] Loading PDF with data size:', pdfData.byteLength);
        
        // Create a fresh copy of the data to avoid ArrayBuffer detachment issues
        const pdfDataCopy = new Uint8Array(pdfData).buffer;
        
        // Verify the buffer is valid
        if (pdfDataCopy.byteLength === 0) {
          throw new Error('Invalid or empty PDF data buffer');
        }
        
        // Additional options to improve rendering reliability
        const loadingOptions = {
          data: pdfDataCopy,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/',
          disableAutoFetch: false,
          disableStream: false,
          enableXfa: true,  // Enable XFA support
          useSystemFonts: true, // Use system fonts when possible
          useWorkerFetch: true, // Use worker for fetching
          isEvalSupported: true,
          disableFontFace: false, // Enable font face loading
          rangeChunkSize: 65536, // Increase chunk size for better performance
          maxImageSize: 16777216 // Allow larger images to handle high-resolution documents
        };
        
        console.log('[PDF Viewer] Creating document with options:', loadingOptions);
        
        try {
          // Fetch and load the PDF from the ArrayBuffer data
          const loadingTask = window.pdfjsLib.getDocument(loadingOptions);
          
          // Add progress monitoring
          loadingTask.onProgress = function(progressData: { loaded: number; total: number }) {
            if (progressData.total) {
              const progress = (progressData.loaded / progressData.total) * 100;
              console.log(`[PDF Viewer] Loading progress: ${Math.round(progress)}%`);
            }
          };
          
          loadingTask.promise.then(async (pdf: any) => {
            if (!componentIsMounted.current) return;
            
            console.log(`[PDF Viewer] PDF loaded successfully: ${pdf.numPages} pages`);
            setPdfDocument(pdf);
            setPageCount(pdf.numPages);
            
            // Generate metadata for validation
            const metadata = await pdf.getMetadata().catch(() => ({}));
            console.log('[PDF Viewer] PDF metadata:', metadata);
            
            // Prepare canvas with background color before any rendering
            if (canvasRef.current) {
              const context = canvasRef.current.getContext('2d', { alpha: false, willReadFrequently: true });
              if (context) {
                // Set a white background immediately
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              }
            }
            
            // Generate thumbnails in background
            generateThumbnails(pdf);
            
            // Determine initial page to display
            let initialPage = 1;
            
            // Prioritize target page from state (populated from props or session storage)
            if (targetPage && targetPage >= 1 && targetPage <= pdf.numPages) {
              initialPage = targetPage;
              console.log(`[PDF Viewer] Navigating to target page: ${initialPage}`);
            }
            
            // Force document to be ready by pre-rendering first few pages
            const pagesToPrefetch = Math.min(2, pdf.numPages);
            try {
              for (let i = 1; i <= pagesToPrefetch; i++) {
                await pdf.getPage(i);
                console.log(`[PDF Viewer] Pre-fetched page ${i}`);
              }
            } catch (e) {
              console.error('[PDF Viewer] Error pre-fetching pages:', e);
            }
            
            // Initial page rendering with special flag
            await renderPage(initialPage, true);
            
            setLoading(false);
            toast.success('Document loaded successfully');
            
            // First page verification with multiple layers of backup
            const verifyAndFixRendering = async () => {
              // Primary verification after a short delay
              setTimeout(async () => {
                if (componentIsMounted.current && canvasRef.current) {
                  const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
                  if (ctx) {
                    try {
                      const hasContent = await verifyCanvasHasContent(canvasRef.current, ctx);
                      
                      if (!hasContent) {
                        console.warn('[PDF Viewer] Canvas appears blank after initial load, applying fix');
                        // Force re-render current page
                        const page = await pdf.getPage(currentPage);
                        const viewport = page.getViewport({ scale: zoomLevel * 1.01 }); // Slightly different scale
                        
                        // Resize canvas
                        canvasRef.current.height = viewport.height;
                        canvasRef.current.width = viewport.width;
                        
                        // Clear context
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                        
                        // Render with different settings
                        await page.render({
                          canvasContext: ctx,
                          viewport: viewport,
                          enableWebGL: false,
                          intent: 'print', // Higher quality
                          renderInteractiveForms: false
                        }).promise;
                        
                        console.log('[PDF Viewer] Applied blank page fix');
                      }
                      
                      // Verify navigation to target page after fixing blank issues
                      if (targetPage && currentPage !== targetPage) {
                        console.log(`[PDF Viewer] Page mismatch after fix, navigating to target: ${targetPage}`);
                        renderPage(targetPage);
                      }
                    } catch (e) {
                      console.error('[PDF Viewer] Error in verification fix:', e);
                    }
                  }
                }
              }, 800);
              
              // Secondary backup verification after a longer delay
              setTimeout(() => {
                if (componentIsMounted.current && canvasRef.current) {
                  try {
                    // Special force render for common blank page issue
                    const manualFixBlankPage = async () => {
                      if (pdfDocument) {
                        const page = await pdfDocument.getPage(currentPage);
                        const ctx = canvasRef.current?.getContext('2d', { alpha: false });
                        if (ctx && canvasRef.current) {
                          const viewport = page.getViewport({ scale: zoomLevel * 1.02 }); // Use slightly different scale
                          
                          // Resize and prepare canvas
                          canvasRef.current.height = viewport.height;
                          canvasRef.current.width = viewport.width;
                          ctx.fillStyle = '#ffffff';
                          ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                          
                          // Render with special settings
                          await page.render({
                            canvasContext: ctx,
                            viewport: viewport,
                            enableWebGL: false,
                            renderInteractiveForms: false,
                            intent: 'print'
                          }).promise;
                          
                          console.log('[PDF Viewer] Applied secondary backup fix');
                        }
                      }
                    };
                    
                    manualFixBlankPage();
                  } catch (e) {
                    console.error('[PDF Viewer] Error in secondary verification:', e);
                  }
                }
              }, 1500);
            };
            
            verifyAndFixRendering();
            
          }).catch((err: Error) => {
            if (!componentIsMounted.current) return;
            
            console.error('[PDF Viewer] Error rendering PDF:', err);
            setError(`Error rendering PDF: ${err.message}`);
            setLoading(false);
            
            // Try an alternative loading approach with a proxy if failed
            setTimeout(() => {
              if (!componentIsMounted.current) return;
              console.log('[PDF Viewer] Attempting alternative loading method');
              
              try {
                // Try loading with original URL via proxy
                setPdfUrl(getProxiedPdfUrl(originalUrl));
              } catch (altErr) {
                console.error('[PDF Viewer] Alternative loading also failed:', altErr);
              }
            }, 1000);
          });
        } catch (docErr) {
          console.error('[PDF Viewer] Error creating PDF document:', docErr);
          throw docErr;
        }
      } catch (err) {
        if (!componentIsMounted.current) return;
        
        console.error('[PDF Viewer] Error initializing PDF.js viewer:', err);
        setError(`Error initializing PDF viewer: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };
    
    loadPdfJs();
  }, [pdfData, targetPage, originalUrl]);

  // Re-render current page when zoom level changes
  useEffect(() => {
    if (pdfDocument && currentPage > 0) {
      renderPage(currentPage);
    }
  }, [zoomLevel]);

  // Handle manual retry button handler
  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setRetryCount(0);
    setPdfData(null);
    
    // Preserve the target page across retries
    const initialPageStr = sessionStorage.getItem('pdfInitialPage');
    if (initialPageStr) {
      const parsedPage = parseInt(initialPageStr, 10);
      if (!isNaN(parsedPage) && parsedPage > 0) {
        setTargetPage(parsedPage);
      }
    }
    
    // Try alternating between direct URL and proxied URL
    const newUrl = pdfUrl === originalUrl ? 
      getProxiedPdfUrl(originalUrl) : 
      originalUrl;
    
    console.log('Manually retrying with URL:', newUrl);
    setPdfUrl(newUrl);
  };

  // Handle zoom controls
  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
    setViewportOffset({ x: 0, y: 0 });
  };
  
  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
    setViewportOffset({ x: 0, y: 0 });
  };
  
  const resetZoom = () => {
    setZoomLevel(1.5);
    setViewportOffset({ x: 0, y: 0 });
  };

  // Handle page jump
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputPage(e.target.value);
  };
  
  // Handle page input submission
  const handlePageSubmit = () => {
    const pageNum = parseInt(inputPage);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pageCount) {
      goToPage(pageNum);
    } else {
      // If invalid, reset to current page
      setInputPage(currentPage.toString());
    }
  };
  
  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePageSubmit();
    }
  };

  // Toggle thumbnails sidebar
  const toggleThumbnails = () => {
    setShowThumbnails(prev => !prev);
  };
  
  // Add CSS styles for animations
  const pageLoadKeyframes = `
    @keyframes pageLoad {
      0% { opacity: 0.3; transform: scale(0.98); }
      100% { opacity: 1; transform: scale(1); }
    }
  `;
  
  const pageNumberAnimKeyframes = `
    @keyframes pageNumberAnim {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
  `;
  
  // Add validation for initial page number
  useEffect(() => {
    if (pdfDocument && targetPage && pageCount > 0) {
      const validatedPage = Math.max(1, Math.min(targetPage, pageCount));
      if (validatedPage !== currentPage) {
        renderPage(validatedPage, true);
      }
    }
  }, [pdfDocument, targetPage, pageCount]);
  
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      {/* Add keyframes for animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        ${pageLoadKeyframes}
        ${pageNumberAnimKeyframes}
        
        .page-animation {
          animation: pageLoad 0.3s ease-out forwards;
        }
        
        .page-number-animation {
          animation: pageNumberAnim 1s ease-in-out infinite;
        }
        
        .page-dots .dot {
          opacity: 0.7;
          transform: scale(0);
          animation: dotPulse 1.5s ease-in-out infinite;
        }
        
        .page-dots .dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .page-dots .dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @keyframes dotPulse {
          0% { transform: scale(0); opacity: 0.5; }
          50% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0); opacity: 0.5; }
        }
        
        @keyframes loadingAppear {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        .animate-loadingAppear {
          animation: loadingAppear 0.3s ease-out forwards;
        }
      `}} />
      
      <div 
        ref={containerRef}
        className="bg-white rounded-lg shadow-xl overflow-hidden w-full max-w-full h-full max-h-screen flex flex-col"
        style={{ width: 'calc(100% - 40px)', height: 'calc(100% - 40px)' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white px-4 py-3 flex justify-between items-center">
          <div className="flex items-center truncate">
            <FileText className="mr-2 flex-shrink-0" size={20} />
            <h2 className="text-lg font-semibold truncate">
              {productName || pdfDetails?.name || 'PDF Document'}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleThumbnails}
              className="hover:bg-indigo-600 p-2 rounded transition-colors flex items-center"
              aria-label="Toggle thumbnails"
            >
              <Grid size={18} />
            </button>
            <button 
              onClick={onClose}
              className="hover:bg-indigo-600 p-2 rounded transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 min-h-0 relative overflow-hidden flex">
          {/* Thumbnails Sidebar */}
          {showThumbnails && (
            <div className="w-56 bg-gray-100 border-r border-gray-200 flex flex-col overflow-hidden">
              <div className="p-2 bg-gray-200 font-medium text-sm">Page Thumbnails</div>
              <div className="flex-1 overflow-auto p-2 space-y-2">
                {thumbnails.length > 0 ? (
                  thumbnails.map((thumbnail, index) => (
                    <div 
                      key={index}
                      className={`cursor-pointer rounded overflow-hidden border-2 ${currentPage === index + 1 ? 'border-indigo-500' : 'border-transparent'}`}
                      onClick={() => goToPage(index + 1)}
                    >
                      <div className="aspect-w-3 aspect-h-4 bg-white">
                        <img 
                          src={thumbnail} 
                          alt={`Page ${index + 1}`} 
                          className="object-contain w-full"
                        />
                      </div>
                      <div className="text-xs text-center py-1 bg-gray-200">
                        Page {index + 1}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                    {loading ? 'Loading thumbnails...' : 'No thumbnails available'}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* PDF Display Area */}
          <div className="flex-1 bg-gray-800 flex flex-col overflow-hidden">
            {/* Loading State */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10 backdrop-blur-sm">
                <div className="bg-white p-8 rounded-lg shadow-lg flex flex-col items-center">
                  <div className="w-16 h-16 border-4 border-t-indigo-600 border-indigo-300 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-700 font-medium">Loading document{retryCount > 0 ? ` (Attempt ${retryCount}/${maxRetries})` : ''}...</p>
                </div>
              </div>
            )}
            
            {/* Enhanced Page Navigation Loading State */}
            {!loading && pageNavigationLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/30 z-10 backdrop-blur-[1px] transition-all duration-300 ease-in-out">
                <div className="bg-white p-8 rounded-lg shadow-lg flex flex-col items-center transform transition-all animate-loadingAppear">
                  <div className="relative w-20 h-20 mb-3">
                    <svg className="absolute inset-0 w-full h-full animate-spin" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#E2E8F0" strokeWidth="8" />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="45" 
                        fill="none" 
                        stroke="#4f46e5" 
                        strokeWidth="8"
                        strokeDasharray="283"
                        strokeDashoffset="200"
                        strokeLinecap="round"
                       />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-indigo-700 font-semibold text-lg page-number-animation">
                        
                      </span>
                    </div>
                  </div>
                  <p className="text-center text-[#4f46e5] font-bold">Loading...</p>
                  <div className="mt-3 flex items-center justify-center space-x-2 page-dots">
                    <span className="bg-indigo-600 rounded-full w-2 h-2 dot"></span>
                    <span className="bg-indigo-600 rounded-full w-2 h-2 dot"></span>
                    <span className="bg-indigo-600 rounded-full w-2 h-2 dot"></span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Error State */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center p-6 bg-gray-900/95 z-10 backdrop-blur-sm">
                <div className="bg-white rounded-lg p-8 max-w-lg w-full shadow-2xl">
                  <div className="flex items-start">
                    <AlertTriangle className="text-red-500 mr-3 mt-0.5 flex-shrink-0" size={28} />
                    <div>
                      <h3 className="text-red-800 font-medium text-xl">Error Loading PDF</h3>
                      <p className="text-red-700 mt-2">{error}</p>
                      <p className="text-gray-600 mt-2 text-sm">
                        This could be due to CORS restrictions or the remote server being temporarily unavailable.
                      </p>
                    </div>
                  </div>
                  <div className="mt-8 flex justify-center space-x-4">
                    <button
                      onClick={handleRetry}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-md transition-colors flex items-center shadow-md"
                    >
                      <RefreshCw size={16} className="mr-2" />
                      Try Again
                    </button>
                    <button
                      onClick={onClose}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2 rounded-md transition-colors shadow"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* PDF Viewer Container */}
            <div 
              ref={viewerContainerRef} 
              className="flex-1 overflow-auto bg-gray-200 flex justify-center relative "
            >
              <div 
                ref={canvasContainerRef}
                className={`relative transition-all duration-300 ease-in-out bg-white shadow-xl ${
                  pageTransition === 'fade-out' ? 'opacity-20 scale-[0.98]' : 
                  pageTransition === 'fade-in' ? 'opacity-100 scale-100 page-animation' : 
                  'opacity-100'
                }`}
                style={{ 
                  willChange: 'transform, opacity',
                  minWidth: '300px',
                  minHeight: '400px'
                }}
              >
                {/* Canvas indicator frame */}
                <div 
                  className="absolute inset-0 border-2 border-dashed border-gray-300 pointer-events-none"
                  style={{ opacity: loading ? 0 : 0.3 }}
                ></div>
                
                {/* PDF Canvas */}
                <canvas
                  ref={canvasRef}
                  className="shadow-lg"
                  style={{
                    display: 'block',
                    backgroundColor: '#ffffff'
                  }}
                />
                
                
              </div>
              
              {/* Drag to pan tooltip - moved to viewer container bottom right */}
              {isScrollable && (
                <div className="fixed bottom-20 right-15 bg-gray-800/70 text-white text-xs py-1.5 px-3 rounded-md pointer-events-none shadow-lg z-10 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 8l4 4-4 4"/>
                    <path d="M3 12h18"/>
                  </svg>
                  Drag to pan
                </div>
              )}
            </div>
            
            {/* Navigation Controls */}
            <div className="bg-gray-100 border-t border-gray-300 p-2 flex items-center justify-between px-4">
              {/* Page Navigation */}
              <div className="flex items-center space-x-1">
                <button 
                  onClick={() => goToPage(1)} 
                  disabled={currentPage === 1 || loading}
                  className="p-1.5 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:pointer-events-none"
                  aria-label="First page"
                >
                  <ChevronsLeft size={18} />
                </button>
                <button 
                  onClick={() => goToPage(currentPage - 1)} 
                  disabled={currentPage === 1 || loading}
                  className="p-1.5 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:pointer-events-none"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={18} />
                </button>
                
                <div className="flex items-center mx-1 bg-white rounded border border-gray-300 px-1">
                  <input
                    type="text"
                    value={inputPage}
                    onChange={handlePageInputChange}
                    onKeyDown={handlePageInputKeyDown}
                    onBlur={handlePageSubmit}
                    className="w-10 text-center py-1 focus:outline-none"
                    aria-label="Page number"
                  />
                  <span className="text-gray-600 mx-1">of</span>
                  <span className="text-gray-800 font-medium">{pageCount}</span>
                </div>
                
                <button 
                  onClick={() => goToPage(currentPage + 1)} 
                  disabled={currentPage === pageCount || loading}
                  className="p-1.5 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:pointer-events-none"
                  aria-label="Next page"
                >
                  <ChevronRight size={18} />
                </button>
                <button 
                  onClick={() => goToPage(pageCount)} 
                  disabled={currentPage === pageCount || loading}
                  className="p-1.5 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:pointer-events-none"
                  aria-label="Last page"
                >
                  <ChevronsRight size={18} />
                </button>
              </div>
              
              {/* Zoom Controls */}
              <div className="flex items-center space-x-1 ml-2">
                <button 
                  onClick={zoomOut}
                  disabled={zoomLevel <= 0.5 || loading}
                  className="p-1.5 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:pointer-events-none"
                  aria-label="Zoom out"
                >
                  <ZoomOut size={18} />
                </button>
                <div className="bg-white rounded border border-gray-300 px-2 py-1 text-sm">
                  {Math.round(zoomLevel * 100)}%
                </div>
                <button 
                  onClick={zoomIn}
                  disabled={zoomLevel >= 3 || loading}
                  className="p-1.5 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:pointer-events-none"
                  aria-label="Zoom in"
                >
                  <ZoomIn size={18} />
                </button>
                <button 
                  onClick={resetZoom}
                  disabled={loading}
                  className="p-1.5 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:pointer-events-none text-xs"
                  aria-label="Reset zoom"
                >
                  Reset
                </button>
              </div>
              
              {/* Security Indicator */}
              <div className="ml-auto flex items-center">
                <ShieldCheck size={14} className="text-green-600 mr-1" />
                <span className="text-xs text-gray-500">Secured Document</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add PDF.js types to the Window interface
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export default SecurePdfViewer; 