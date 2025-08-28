import { useEffect } from 'react';

const Features = () => {
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
    <section id="features" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="section-title animate-on-scroll">Why ExamWalk?</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Feature 1 */}
          <div className="feature-card animate-on-scroll flex flex-col h-full items-center">
            <div className="rounded-lg mb-6 flex justify-center">
              <img 
                src="https://examwalk.site/assets/features%20copy-GC_99ShY.png" 
                alt="Goal Oriented Plans" 
                className="w-full max-w-[240px] mx-auto h-auto"
              />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-center">Goal-Oriented Plans</h3>
            <p className="text-gray-600 text-center text-sm">
              We help design plans that cater to your learning needs and schedule, ensuring optimal progress.
            </p>
          </div>
          
          {/* Feature 2 */}
          <div className="feature-card animate-on-scroll flex flex-col h-full items-center">
            <div className="rounded-lg mb-6 flex justify-center">
              <img 
                src="https://examwalk.site/assets/features-icon6-DGweomJj.png" 
                alt="Video Courses" 
                className="w-full max-w-[240px] mx-auto h-auto"
              />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-center">Video Courses</h3>
            <p className="text-gray-600 text-center text-sm">
              Learn at your own pace with our detailed video guides that break down complex topics.
            </p>
          </div>
          
          {/* Feature 3 */}
          <div className="feature-card animate-on-scroll flex flex-col h-full items-center">
            <div className="rounded-lg mb-6 flex justify-center">
              <img 
                src="https://examwalk.site/assets/smart-feedback-CP3OeSgC.png" 
                alt="Smart Feedback" 
                className="w-full max-w-[240px] mx-auto h-auto"
              />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-center">Smart Feedback</h3>
            <p className="text-gray-600 text-center text-sm">
              Receive personalized insights on your progress and tips on how to improve your scores.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
