import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { Calendar, User, BookOpen, Download, ChevronRight, Search, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Interface for monthly articles
interface Article {
  id: number;
  title: string;
  date: string;
  author: string;
  topic: string;
  summary: string;
  image: string;
  readMoreLink: string;
  pdfDownloadLink: string;
  isPremium: boolean;
}

// Mock data for monthly articles
const MOCK_ARTICLES: Article[] = [
  {
    id: 1,
    title: 'Evidence-Based Approaches to Childhood Apraxia of Speech',
    date: '2024-06-01',
    author: 'Dr. Emily Parker, CCC-SLP',
    topic: 'Childhood Apraxia',
    summary: 'This in-depth article explores the latest research-backed methodologies for addressing childhood apraxia of speech, with practical applications for clinic and home settings.',
    image: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    readMoreLink: '/articles/1',
    pdfDownloadLink: '/downloads/article-1.pdf',
    isPremium: false
  },
  {
    id: 2,
    title: 'Multilingual Development: Supporting Bilingual Children',
    date: '2024-05-01',
    author: 'Maria González, Ph.D.',
    topic: 'Multilingualism',
    summary: 'A comprehensive examination of language acquisition in bilingual environments, with strategies for SLPs working with culturally diverse populations.',
    image: 'https://images.unsplash.com/photo-1555431189-0fabf2667795?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    readMoreLink: '/articles/2',
    pdfDownloadLink: '/downloads/article-2.pdf',
    isPremium: true
  },
  {
    id: 3,
    title: 'Technological Integration in Adult Neurological Rehabilitation',
    date: '2024-04-01',
    author: 'Dr. James Wilson',
    topic: 'Technology',
    summary: 'Discover how cutting-edge technology is transforming rehabilitation practices for adults with acquired neurological conditions affecting speech and language.',
    image: 'https://images.unsplash.com/photo-1573166953836-c5b6878d8e36?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    readMoreLink: '/articles/3',
    pdfDownloadLink: '/downloads/article-3.pdf',
    isPremium: true
  },
  {
    id: 4,
    title: 'Parent Coaching Models in Early Intervention',
    date: '2024-03-01',
    author: 'Sarah Thompson, M.S., CCC-SLP',
    topic: 'Early Intervention',
    summary: 'Learn effective parent coaching techniques to enhance outcomes in early intervention speech therapy, emphasizing family-centered practices.',
    image: 'https://images.unsplash.com/photo-1591123120675-6f7f1aae0e5b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    readMoreLink: '/articles/4',
    pdfDownloadLink: '/downloads/article-4.pdf',
    isPremium: false
  },
  {
    id: 5,
    title: 'Social Communication Disorders: Assessment and Intervention',
    date: '2024-02-01',
    author: 'Dr. Michael Brown',
    topic: 'Social Communication',
    summary: 'A detailed guide to identifying and addressing social communication disorders across the lifespan, with evidence-based intervention strategies.',
    image: 'https://images.unsplash.com/photo-1573497620053-ea5300f94f21?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    readMoreLink: '/articles/5',
    pdfDownloadLink: '/downloads/article-5.pdf',
    isPremium: true
  },
  {
    id: 6,
    title: 'Voice Therapy Techniques for Professional Voice Users',
    date: '2024-01-01',
    author: 'Dr. Lisa Sánchez, CCC-SLP',
    topic: 'Voice Therapy',
    summary: 'Specialized approaches for working with singers, teachers, and other professional voice users, including preventative care and rehabilitation methods.',
    image: 'https://images.unsplash.com/photo-1516450137517-162bfbeb8dba?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    readMoreLink: '/articles/6',
    pdfDownloadLink: '/downloads/article-6.pdf',
    isPremium: false
  }
];

// Format date to readable format
const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

const MonthlyArticlesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'free' | 'premium'>('all');
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  
  // Redirect if not logged in
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/plans');
    }
  }, [isLoggedIn, navigate]);

  // Filter articles based on search term and active filter
  const filteredArticles = MOCK_ARTICLES.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         article.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.author.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeFilter === 'all') return matchesSearch;
    if (activeFilter === 'free') return matchesSearch && !article.isPremium;
    if (activeFilter === 'premium') return matchesSearch && article.isPremium;
    
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-12 bg-white rounded-2xl p-8 shadow-sm">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#2bcd82] to-[#25b975]">Monthly Articles</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Exclusive in-depth articles for speech-language pathologists, updated monthly with the latest research and practical techniques.
          </p>
          <div className="mt-6 max-w-sm mx-auto h-1 bg-gradient-to-r from-[#2bcd82] to-transparent rounded-full"></div>
        </div>
        
        {/* Search and Filter */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button 
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                activeFilter === 'all' 
                  ? 'bg-[#2bcd82] text-white shadow-md' 
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
              onClick={() => setActiveFilter('all')}
            >
              All Articles
            </button>
            <button 
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                activeFilter === 'free' 
                  ? 'bg-[#2bcd82] text-white shadow-md' 
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
              onClick={() => setActiveFilter('free')}
            >
              Free Access
            </button>
            <button 
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                activeFilter === 'premium' 
                  ? 'bg-[#fb6a69] text-white shadow-md' 
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
              onClick={() => setActiveFilter('premium')}
            >
              Premium Only
            </button>
          </div>
          
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#2bcd82] focus:border-transparent shadow-sm"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
        </div>
        
        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map(article => (
            <ArticleCard key={article.id} article={article} />
          ))}
          
          {/* No results message */}
          {filteredArticles.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-xl shadow-sm">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-xl font-medium">No articles found matching your search criteria.</p>
              <p className="text-gray-400 mt-2">Try adjusting your filters or search term.</p>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

// Article Card Component
interface ArticleCardProps {
  article: Article;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article }) => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  
  const handlePremiumClick = () => {
    if (!isLoggedIn) {
      navigate('/plans');
    }
  };
  
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col h-full border border-gray-100">
      <div className="relative h-52 overflow-hidden">
        <img 
          src={article.image} 
          alt={article.title} 
          className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
        />
        {article.isPremium && (
          <div className="absolute top-3 right-3 bg-gradient-to-r from-[#fb6a69] to-[#e05554] text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center shadow-md">
            <Lock className="w-3.5 h-3.5 mr-1" />
            PREMIUM
          </div>
        )}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-800 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
          {article.topic}
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-center text-gray-500 text-sm mb-3 bg-gray-50 rounded-full px-3 py-1.5">
          <Calendar className="w-4 h-4 mr-1.5 text-[#2bcd82]" />
          <span>{formatDate(article.date)}</span>
          <span className="mx-2">•</span>
          <User className="w-4 h-4 mr-1.5 text-[#2bcd82]" />
          <span>{article.author.split(',')[0]}</span>
        </div>
        
        <h3 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2 hover:text-[#2bcd82] transition-colors">{article.title}</h3>
        
        <p className="text-gray-600 mb-6 text-sm line-clamp-3 flex-grow">
          {article.summary}
        </p>
        
        {(!article.isPremium || isLoggedIn) ? (
          <div className="mt-auto grid grid-cols-2 gap-3">
            <a 
              href={article.readMoreLink}
              className="bg-[#2bcd82] hover:bg-[#25b975] text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center shadow-sm"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Read Article
            </a>
            
            <a 
              href={article.pdfDownloadLink}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center shadow-sm border border-gray-200"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </a>
          </div>
        ) : (
          <button
            onClick={handlePremiumClick}
            className="bg-gradient-to-r from-[#fb6a69] to-[#e05554] hover:from-[#e05554] hover:to-[#d04544] text-white py-3 px-4 rounded-lg font-medium transition-all shadow-md w-full flex items-center justify-center"
          >
            <Lock className="w-4 h-4 mr-2" />
            Unlock Premium Content
          </button>
        )}
      </div>
    </div>
  );
};

export default MonthlyArticlesPage; 