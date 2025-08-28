import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

const CoursesSection = () => {
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

  const courses = [
    { title: "RRB NTPC CBT1" },
    { title: "RRB NTPC CBT1" },
    { title: "RRB NTPC (CBT1 + CBT2)" },
    { title: "RRB NTPC (CBT1 + CBT2)" },
    { title: "RRB JE CBT1" },
    { title: "RRB JE CBT1" },
    { title: "Railway (All in one)" },
  ];

  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900 animate-on-scroll text-center pt-10">
          Some Courses You May Like
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {courses.map((course, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-md flex flex-col justify-between min-h-[140px] animate-on-scroll">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">{course.title}</h3>
              </div>
              <div className="flex justify-end">
                <button 
                  onClick={() => navigate('/login')}
                  className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
                >
                  View Details <span className="ml-1">&gt;</span>
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-10 animate-on-scroll">
          <button 
            onClick={() => navigate('/login')}
            className="bg-blue-700 text-white px-10 py-4 rounded-lg font-semibold text-lg shadow-md hover:bg-blue-800 transition-colors"
          >
            Explore All Courses
          </button>
        </div>
      </div>
    </section>
  );
};

export default CoursesSection;
