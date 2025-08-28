
import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const MockTestSection = () => {
  const { t } = useLanguage();

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
    {
      image: "/lovable-uploads/5c7591c7-6fbd-48ee-967a-35878adb3d89.png",
      title: t.realTimeAnalysis,
      description: t.realTimeAnalysisDesc
    },
    {
      image: "/lovable-uploads/17392b7e-6768-44b1-ae10-ac09ccd6ec8c.png",
      title: t.adaptiveLearning,
      description: t.adaptiveLearningDesc
    },
    {
      image: "/lovable-uploads/8baddf18-46ca-4c44-b167-21e7378a7243.png",
      title: t.competitiveRanking,
      description: t.competitiveRankingDesc
    }
  ];

  return (
    <section id='platform-features' className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-on-scroll">
          <h2 className="text-3xl font-bold mb-4">{t.mockTestEdge}</h2>
          <p className="text-gray-700 max-w-2xl mx-auto">
            {t.mockTestEdgeDesc}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {features.map((feature, index) => (
            <div key={index} className="text-center animate-on-scroll">
              <div className="mb-6 flex justify-center">
                <img 
                  src={feature.image} 
                  alt={feature.title}
                  className="w-46 h-46 object-contain"
                />
              </div>
              <h3 className="text-lg font-semibold mb-3">{feature.title}</h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
        
        <div className="text-center animate-on-scroll">
          <a href="/login" className="btn-primary">
            {t.startMockTest}
          </a>
        </div>
      </div>
    </section>
  );
};

export default MockTestSection;
