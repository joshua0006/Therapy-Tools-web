import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import Footer from './Footer';
import { FileText, Download, Eye, Clock, Filter, Search, Grid, List } from 'lucide-react';

// Interface for owned file type
interface OwnedFile {
  id: number;
  title: string;
  category: string;
  dateAcquired: string;
  fileSize: string;
  fileType: string;
  downloadUrl: string;
  previewUrl: string;
  thumbnailUrl: string;
}

const DashboardPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [files, setFiles] = useState<OwnedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if not logged in
    if (!isLoggedIn) {
      navigate('/');
      return;
    }

    // Simulate loading user's files
    const loadFiles = async () => {
      // In a real application, this would be an API call to get user's purchased files
      setTimeout(() => {
        setFiles([
          {
            id: 1,
            title: "Articulation Worksheets Bundle",
            category: "Worksheets",
            dateAcquired: "2023-09-15",
            fileSize: "4.2 MB",
            fileType: "PDF",
            downloadUrl: "#",
            previewUrl: "#",
            thumbnailUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
          },
          {
            id: 2,
            title: "Language Development Assessment",
            category: "Assessments",
            dateAcquired: "2023-10-22",
            fileSize: "2.8 MB",
            fileType: "PDF",
            downloadUrl: "#",
            previewUrl: "#",
            thumbnailUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
          },
          {
            id: 3,
            title: "Speech Therapy Games Collection",
            category: "Activities",
            dateAcquired: "2023-11-05",
            fileSize: "8.5 MB",
            fileType: "ZIP",
            downloadUrl: "#",
            previewUrl: "#",
            thumbnailUrl: "https://images.unsplash.com/photo-1559131583-f176a2eb61db?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
          },
          {
            id: 4,
            title: "Fluency Building Exercises",
            category: "Exercises",
            dateAcquired: "2023-12-01",
            fileSize: "3.1 MB",
            fileType: "PDF",
            downloadUrl: "#",
            previewUrl: "#",
            thumbnailUrl: "https://images.unsplash.com/photo-1551818255-e6e10975bc17?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
          },
        ]);
        setLoading(false);
      }, 1000);
    };
    
    loadFiles();
  }, [isLoggedIn, navigate]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">My Library</h1>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search your files..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2bcd82]"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            </div>
            
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <button 
                className={`p-2 ${viewMode === 'grid' ? 'bg-[#2bcd82] text-white' : 'bg-white text-gray-700'}`}
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <Grid className="w-5 h-5" />
              </button>
              <button 
                className={`p-2 ${viewMode === 'list' ? 'bg-[#2bcd82] text-white' : 'bg-white text-gray-700'}`}
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2bcd82]"></div>
          </div>
        ) : files.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Your library is empty</h2>
            <p className="text-gray-600 mb-6">You haven't purchased any resources yet.</p>
            <button 
              onClick={() => navigate('/catalog')}
              className="bg-[#2bcd82] hover:bg-[#25b975] text-white font-medium py-2 px-6 rounded-full transition-colors"
            >
              Browse Catalog
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
              <div className="flex items-center text-gray-600">
                <Filter className="w-5 h-5 mr-2" />
                <span className="font-medium">Filters:</span>
                <div className="ml-4 space-x-2">
                  <span className="inline-block px-3 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200 cursor-pointer">All</span>
                  <span className="inline-block px-3 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200 cursor-pointer">Worksheets</span>
                  <span className="inline-block px-3 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200 cursor-pointer">Assessments</span>
                  <span className="inline-block px-3 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200 cursor-pointer">Activities</span>
                </div>
              </div>
            </div>
            
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {files.map(file => (
                  <div key={file.id} className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                    <div className="h-40 overflow-hidden relative">
                      <img 
                        src={file.thumbnailUrl} 
                        alt={file.title} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-white rounded-full px-2 py-1 text-xs font-medium">
                        {file.fileType}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-800 mb-1 truncate">{file.title}</h3>
                      <div className="flex items-center text-gray-500 text-sm mb-3">
                        <span className="bg-[#2bcd82]/10 text-[#2bcd82] px-2 py-0.5 rounded-full">
                          {file.category}
                        </span>
                        <span className="mx-2">•</span>
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{formatDate(file.dateAcquired)}</span>
                      </div>
                      <div className="flex justify-between">
                        <button className="text-[#2bcd82] hover:text-[#25b975] font-medium flex items-center">
                          <Eye className="w-4 h-4 mr-1" /> Preview
                        </button>
                        <button className="text-[#2bcd82] hover:text-[#25b975] font-medium flex items-center">
                          <Download className="w-4 h-4 mr-1" /> Download
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {files.map(file => (
                  <div key={file.id} className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex flex-col sm:flex-row">
                      <div className="sm:w-48 h-32 overflow-hidden">
                        <img 
                          src={file.thumbnailUrl} 
                          alt={file.title} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <h3 className="font-bold text-gray-800 mb-1 sm:mb-0">{file.title}</h3>
                          <div className="flex items-center space-x-3">
                            <button className="text-[#2bcd82] hover:text-[#25b975] font-medium flex items-center">
                              <Eye className="w-4 h-4 mr-1" /> Preview
                            </button>
                            <button className="text-[#2bcd82] hover:text-[#25b975] font-medium flex items-center">
                              <Download className="w-4 h-4 mr-1" /> Download
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center text-gray-500 text-sm mt-2">
                          <span className="bg-[#2bcd82]/10 text-[#2bcd82] px-2 py-0.5 rounded-full mr-3">
                            {file.category}
                          </span>
                          <div className="flex items-center mr-3">
                            <Clock className="w-4 h-4 mr-1" />
                            <span>{formatDate(file.dateAcquired)}</span>
                          </div>
                          <div className="flex items-center mr-3">
                            <FileText className="w-4 h-4 mr-1" />
                            <span>{file.fileType}</span>
                          </div>
                          <span>{file.fileSize}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default DashboardPage; 