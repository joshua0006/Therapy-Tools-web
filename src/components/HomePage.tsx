import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Button from './Button';
import { BookOpen, Users, GraduationCap, Award, Download, ShoppingBag, ChevronLeft, ChevronRight} from 'lucide-react';
import { useAuth } from '../context/AuthContext';



const HomePage: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  
  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselImages = [
    "https://images.unsplash.com/photo-1516733968668-dbdce39c4651?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1576267423445-b2e0074d68a4?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1607453998774-d533f65dac99?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1612439487053-b47e2ccc507a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
  ];

  // Auto-rotate carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [carouselImages.length]);

  // Manual navigation
  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? carouselImages.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#2bcd82]/10 to-white min-h-screen flex flex-col justify-between">
        <div className="container mx-auto px-4 py-12 flex-grow flex items-center">
          <div className="flex flex-col md:flex-row items-center w-full">
            <div className="md:w-1/2 mb-8 md:mb-0 pr-0 md:pr-8">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
                Speech Pathology <span className="text-[#2bcd82]">Resources</span> for SLPs
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Discover premium activities, worksheets, and assessments designed by speech-language pathologists for speech-language pathologists.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                {isLoggedIn ? (
                  <Button 
                    variant="primary" 
                    size="large"
                    onClick={() => navigate('/catalog')}
                  >
                    Browse Catalogs
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="primary" 
                      size="large"
                      onClick={() => navigate('/plans')}
                    >
                      View Membership
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="large"
                      onClick={() => navigate('/catalog')}
                    >
                      Browse Catalog
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              {/* Photo Carousel - Larger size */}
              <div className="relative w-full">
                <div className="rounded-lg overflow-hidden shadow-xl h-[28rem] w-full relative">
                  {carouselImages.map((image, index) => (
                    <div 
                      key={index}
                      className={`absolute inset-0 transition-opacity duration-1000 ${
                        index === currentSlide ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <img 
                        src={image} 
                        alt={`Speech therapy slide ${index + 1}`} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  
                  {/* Carousel Controls */}
                  <div className="absolute inset-0 flex items-center justify-between p-4">
                    <button 
                      onClick={prevSlide}
                      className="p-3 rounded-full bg-white/40 hover:bg-white/70 transition-colors text-gray-800"
                      aria-label="Previous slide"
                    >
                      <ChevronLeft className="w-7 h-7" />
                    </button>
                    <button 
                      onClick={nextSlide}
                      className="p-3 rounded-full bg-white/40 hover:bg-white/70 transition-colors text-gray-800"
                      aria-label="Next slide"
                    >
                      <ChevronRight className="w-7 h-7" />
                    </button>
                  </div>
                  
                  {/* Carousel Indicators */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-3">
                    {carouselImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`w-3 h-3 rounded-full transition-colors ${
                          index === currentSlide ? 'bg-[#2bcd82]' : 'bg-white/50'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Highlight Bar - Now inside the hero section */}
        <div id="highlight-bar" className="w-full bg-[#2bcd82] text-white py-8">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="flex flex-col items-center">
                <Award className="w-12 h-12 mb-4" />
                <h3 className="text-2xl font-bold">Quality Catalogs</h3>
                <p className="text-lg">Expertly designed by SLPs for SLPs</p>
              </div>
              <div className="flex flex-col items-center">
                <Download className="w-12 h-12 mb-4" />
                <h3 className="text-2xl font-bold">Instant Downloads</h3>
                <p className="text-lg">Get what you need when you need it</p>
              </div>
              <div className="flex flex-col items-center">
                <ShoppingBag className="w-12 h-12 mb-4" />
                <h3 className="text-2xl font-bold">Membership Benefits</h3>
                <p className="text-lg">Save with our exclusive plans</p>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Member Benefits */}
      <div className="py-16 bg-gray-100">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
            Why Join Our <span className="text-[#fb6a69]">Membership</span>?
          </h2>
          <p className="text-center text-gray-600 max-w-3xl mx-auto mb-12">
            Save time and money with unlimited access to our growing library of premium speech therapy catalogs.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Professional Catalogs",
                description: "Access our extensive library of worksheets, activities, and evidence-based materials.",
                icon: <BookOpen className="w-10 h-10 text-[#2bcd82]" />
              },
              {
                title: "Community Support",
                description: "Connect with fellow speech pathologists to share ideas and get support.",
                icon: <Users className="w-10 h-10 text-[#2bcd82]" />
              },
              {
                title: "Continuing Education",
                description: "Stay updated with the latest research and techniques in speech pathology.",
                icon: <GraduationCap className="w-10 h-10 text-[#2bcd82]" />
              }
            ].map((benefit, index) => (
              <div key={index} className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-100">
                <div className="mb-4">{benefit.icon}</div>
                <h3 className="text-xl font-bold text-[#2bcd82] mb-3">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Products */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Featured <span className="text-[#fb6a69]">Catalogs</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Articulation Worksheets Bundle",
                image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
                price: "$19.99",
                url: "/catalog/articulation-bundle"
              },
              {
                title: "Language Development Assessment",
                image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
                price: "$24.99",
                url: "/catalog/language-assessment"
              },
              {
                title: "Speech Therapy Games Collection",
                image: "https://images.unsplash.com/photo-1559131583-f176a2eb61db?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
                price: "$29.99",
                url: "/catalog/therapy-games"
              }
            ].map((product, index) => (
              <div 
                key={index} 
                className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer"
                onClick={() => navigate(product.url)}
              >
                <div className="h-48 overflow-hidden">
                  <img 
                    src={product.image} 
                    alt={product.title} 
                    className="w-full h-full object-cover transition-transform hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{product.title}</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-[#fb6a69]">{product.price}</span>
                    <button className="bg-[#2bcd82] hover:bg-[#25b975] text-white font-medium py-1 px-4 rounded-full">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-10">
            <Button 
              variant="secondary" 
              size="large"
              onClick={() => navigate('/catalog')}
            >
              Browse All Catalogs
            </Button>
          </div>
        </div>
      </div>

      {/* Featured Section - Events & News */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Stay Connected</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Keep up with the latest events, workshops, and news in the speech pathology community.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Events Preview */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-64 overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
                  alt="Speech pathology event" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Upcoming Events</h3>
                <p className="text-gray-600 mb-4">
                  Discover conferences, workshops, and networking opportunities for speech-language pathologists.
                </p>
                <Button 
                  variant="secondary" 
                  size="medium"
                  onClick={() => navigate('/events-news')}
                >
                  View Events
                </Button>
              </div>
            </div>
            
            {/* News Preview */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-64 overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1551966775-a4ddc8df052b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
                  alt="Speech pathology news" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Latest News</h3>
                <p className="text-gray-600 mb-4">
                  Stay informed about the latest research, trends, and developments in speech pathology.
                </p>
                <Button 
                  variant="secondary" 
                  size="medium"
                  onClick={() => navigate('/events-news')}
                >
                  Read News
                </Button>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-10">
            <Button 
              variant="primary" 
              size="large"
              onClick={() => navigate('/events-news')}
            >
              Explore All Events & News
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <div className="bg-gradient-to-br from-[#fb6a69]/5 to-[#2bcd82]/5 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-800 mb-4">
            What Our <span className="text-[#2bcd82]">Members</span> Say
          </h2>
          <p className="text-center text-gray-600 max-w-3xl mx-auto mb-16">
            Hear from speech-language pathologists who have transformed their practice with our resources
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                quote: "The resources and community have transformed my practice. I'm more confident and effective as a speech pathologist.",
                author: "Sarah Johnson, SLP",
                role: "Pediatric Specialist",
                image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80"
              },
              {
                quote: "I've found innovative approaches and supportive colleagues. The membership has been invaluable for my professional growth.",
                author: "Michael Torres, SLP",
                role: "School-Based Therapist",
                image: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80"
              },
              {
                quote: "Access to quality resources saves me hours of preparation time every week. Well worth the membership fee!",
                author: "Jennifer Smith, SLP",
                role: "Private Practice Owner",
                image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80"
              }
            ].map((testimonial, index) => (
              <div key={index} className="flex flex-col h-full">
                {/* Quote Card */}
                <div className="bg-white p-8 rounded-lg shadow-lg mb-10 flex-grow relative">
                  {/* Large quotation mark */}
                  <div className="absolute -top-5 -left-2 text-[120px] leading-none text-[#2bcd82]/10 font-serif">
                    "
                  </div>
                  <p className="text-gray-700 text-lg relative z-10 mb-6">"{testimonial.quote}"</p>
                  <div className="h-4 w-4 bg-white absolute -bottom-2 left-10 transform rotate-45 shadow-b"></div>
                </div>
                
                {/* Author Info */}
                <div className="flex items-center">
                  <div className="w-16 h-16 rounded-full overflow-hidden mr-4 border-2 border-[#2bcd82] shadow-md">
                    <img 
                      src={testimonial.image} 
                      alt={testimonial.author} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-[#2bcd82]">{testimonial.author}</p>
                    <p className="text-gray-600 text-sm">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-16">
            <Button 
              variant="primary" 
              size="large"
              onClick={() => navigate('/plans')}
            >
              Join Our Community
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default HomePage; 