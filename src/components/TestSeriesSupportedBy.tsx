import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

const TestSeriesSupportedBy = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          }
        });
      },
      { threshold: 0.1 }
    );
    
    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach(el => observer.observe(el));
    
    return () => {
      elements.forEach(el => observer.unobserve(el));
    };
  }, []);

  const features = [
    "Unlimited Mock Tests",
    "Detailed Solutions",
    "Performance Analytics",
    "24/7 Support",
    "Mobile App Access",
    "Progress Tracking"
  ];

  return (
    <section className="py-12 bg-gradient-to-r from-blue-600 to-purple-600">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center text-white mb-8 animate-on-scroll">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Test Pass Pro +
          </h2>
          <p className="text-xl opacity-90">
            Get access to all premium features and unlimited practice
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white bg-opacity-10 rounded-lg p-4 text-white animate-on-scroll">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                <span className="font-medium">{feature}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-center mt-8">
          <button 
            onClick={() => navigate('/login')}
            className="bg-white text-blue-600 px-10 py-3 rounded-lg font-semibold text-lg shadow-md hover:bg-gray-100 transition-colors"
          >
            Unlock Test Pass Pro +
          </button>
        </div>
      </div>
    </section>
  );
};

export default TestSeriesSupportedBy;
