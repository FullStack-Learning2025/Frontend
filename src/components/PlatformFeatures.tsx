
import { useEffect } from 'react';
import { Check } from 'lucide-react';
import platform from '../assets/platform.png';

const PlatformFeatures = () => {
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
    "Progress tracking & metrics",
    "Over 5,000 practice questions",
    "Detailed solutions",
    "Mock Tests & Live sessions",
    "Study & Performance Analytics",
    "Mobile & Desktop Access"
  ];

  return (
    <section id="platform-features" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center">
          <div className="w-full lg:w-1/3 lg:mr-10 mb-10 lg:mb-0 animate-on-scroll">
            <img 
              src={platform} 
              alt="Platform Features" 
              className="mx-auto max-w-full h-auto"
            />
          </div>
          
          <div className="w-full lg:w-1/2 animate-on-scroll">
            <h2 className="text-3xl font-bold mb-8">Platform Features</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="mt-1 bg-primary rounded-full p-1">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-gray-800">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PlatformFeatures;
