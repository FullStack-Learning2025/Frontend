
import { Play, Apple } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-primary-600 text-white py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold mb-6">Download the ExamWalk App</h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">
            Prepare for your exams with our comprehensive platform available on both Android and iOS.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="#" className="flex items-center bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
              <Play className="h-5 w-5 mr-2" fill="white" />
              <div>
                <div className="text-xs">Download on</div>
                <div className="font-medium">Google Play</div>
              </div>
            </a>
            <a href="#" className="flex items-center bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
              <Apple className="h-5 w-5 mr-2" />
              <div>
                <div className="text-xs">Download on the</div>
                <div className="font-medium">App Store</div>
              </div>
            </a>
          </div>
        </div>
        
        <div className="border-t border-white/20 pt-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <Link 
                to="/privacy-policy" 
                className="text-white/80 hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
              <Link 
                to="/terms-conditions" 
                className="text-white/80 hover:text-white transition-colors"
              >
                Terms & Conditions
              </Link>
            </div>
            <p className="text-center text-white/60 text-sm">
              &copy; {new Date().getFullYear()} ExamWalk. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
