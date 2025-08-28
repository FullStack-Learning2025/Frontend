
import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const CurrentAffairsSection = () => {
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

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center">
          <div className="w-full lg:w-1/2 mb-10 lg:mb-0 animate-on-scroll">
            <h2 className="text-3xl font-bold mb-6">{t.currentAffairs}</h2>
            <p className="text-gray-700 mb-8">
              {t.currentAffairsDesc}
            </p>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                <span className="text-gray-700">{t.dailyUpdates}</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                <span className="text-gray-700">{t.monthlyMagazines}</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                <span className="text-gray-700">{t.yearlyCompilation}</span>
              </div>
            </div>
            <a href="/current-affairs" className="btn-primary mt-8 inline-block">
              {t.exploreCurrentAffairs}
            </a>
          </div>
          
          <div className="w-full lg:w-1/2 animate-on-scroll">
            <div className="relative mx-auto max-w-[400px]">
              <img 
                src="/lovable-uploads/80c6970c-907e-4b3a-8e5d-f465c645c9f6.png" 
                alt="Current Affairs"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CurrentAffairsSection;
