
import { useEffect } from 'react';

const Testimonials = () => {
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
    <section id="testimonials" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="section-title animate-on-scroll">What Our Users Say</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow animate-on-scroll">
            <p className="text-gray-700 mb-4 italic">
              "ExamWalk was the secret weapon I needed. Their clear guidance and practice tests helped me score much higher than I expected."
            </p>
            <p className="font-semibold text-primary">Amanda Carlson</p>
          </div>
          
          <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow animate-on-scroll">
            <p className="text-gray-700 mb-4 italic">
              "The personalized study plan and on-the-go access made it easy to prepare effectively. I passed with excellent marks!"
            </p>
            <p className="font-semibold text-primary">Md. Hasna Taufiq</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
