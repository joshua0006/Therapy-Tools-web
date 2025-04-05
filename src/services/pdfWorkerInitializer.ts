import { pdfjs } from 'react-pdf';

// Use a local worker path with the base URL to ensure it works on any port
const getBaseUrl = () => {
  return window.location.origin;
};

// Set worker source to a local file with proper base URL
pdfjs.GlobalWorkerOptions.workerSrc = `${getBaseUrl()}/pdf/pdf.worker.min.mjs`;

export default pdfjs; 