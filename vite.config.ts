import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

// Copy PDF.js files to public directory during build
const copyPdfFiles = () => {
  return {
    name: 'copy-pdf-files',
    buildStart() {
      // Define files to copy
      const filesToCopy = [
        {
          src: path.resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
          dest: path.resolve(__dirname, 'public/pdf/pdf.worker.min.mjs')
        },
        {
          src: path.resolve(__dirname, 'node_modules/pdfjs-dist/cmaps'),
          dest: path.resolve(__dirname, 'public/pdf/cmaps')
        },
        {
          src: path.resolve(__dirname, 'node_modules/pdfjs-dist/standard_fonts'),
          dest: path.resolve(__dirname, 'public/pdf/standard_fonts')
        }
      ];
      
      // Process each file/directory
      filesToCopy.forEach(item => {
        try {
          // Create directory if it doesn't exist
          const destDir = fs.statSync(item.src).isDirectory() ? item.dest : path.dirname(item.dest);
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }
          
          // Copy file or directory
          if (fs.statSync(item.src).isDirectory()) {
            // Copy directory recursively
            copyDir(item.src, item.dest);
            console.log(`Copied directory ${path.basename(item.src)} to public/pdf/`);
          } else {
            // Copy single file
            fs.copyFileSync(item.src, item.dest);
            console.log(`Copied ${path.basename(item.src)} to public/pdf/`);
          }
        } catch (err) {
          console.error(`Error copying ${item.src}:`, err);
        }
      });
    }
  }
}

// Helper function to copy directories recursively
function copyDir(src: string, dest: string): void {
  // Create destination directory
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  // Read source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  // Process each entry
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    // Copy directories recursively, files directly
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    copyPdfFiles(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    headers: {
      // Set CORS headers for all requests in development
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
    }
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  }
});
