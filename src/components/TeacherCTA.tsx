
import { useEffect } from 'react';

const TeacherCTA = () => {
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
      <div className="container mx-auto px-4 max-w-3xl text-center animate-on-scroll">
        <h2 className="text-3xl font-bold mb-6">Are You a Teacher?</h2>
        <p className="text-gray-700 mb-8">
          Unlock your potential as an educator. Join ExamWalk to share your knowledge and help students across the world succeed in their exams.
        </p>
        <a href="#contact" className="btn-primary inline-block">
          Get in Touch
        </a>
      </div>
    </section>
  );
};

export default TeacherCTA;
