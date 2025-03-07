import React from 'react';
import Header from './Header';
import Footer from './Footer';
import Terms1 from '../assets/images/terms-1.webp'; 
import Terms2 from '../assets/images/terms-2.webp';


const TermsOfUsePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
  

        {/* Main content */}
        <div className="bg-white mb-8">
          <p className="mb-6">
            At Adventures in Speech Pathology® resources are the intellectual property of Reinking Publications and are copyright
            protected. Our Terms of Use must be adhered to when using our resources. Thank you for respecting the time,
            effort, and research that went into creating these resources. If you are unsure about our Terms of Use, please
            contact <a href="mailto:support@adventuresinspeechpathology.com" className="text-blue-500 hover:underline transition-colors duration-200">support@adventuresinspeechpathology.com</a>.
          </p>

          <div className="flex flex-col md:flex-row gap-4">
            <img src={Terms1} alt="Terms of Use" className="max-w-full md:max-w-[50%]" />
            <img src={Terms2} alt="Terms of Use" className="max-w-full md:max-w-[50%]" />
          </div>

          {/* Footer */}
          <div className="mt-8 flex justify-between items-center text-sm text-gray-600">
            <div>
              <span>adventures in </span><span className="font-bold">SPEECH</span><span> pathology</span>
            </div>
            <span>2</span>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default TermsOfUsePage; 