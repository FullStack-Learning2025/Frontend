import React from 'react';
import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const CourseAdvantages = () => {
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

  const advantages = [
    {
      image: "/lovable-uploads/51878aa4-d0d5-4015-b148-83e0e313ff46.png",
      title: "Complete Syllabus with Clear Course Design",
      description: (
        <>
          Each course has 4 sections:
          <ol className="list-decimal list-inside mt-2 text-left">
            <li>Foundation + In-depth: Live class, videos, pdfs followed by quizzes.</li>
            <li>Previous year questions discussion.</li>
            <li>Question-pattern trend analysis by Examys AI.</li>
            <li>Test Series.</li>
          </ol>
        </>
      )
    },
    {
      image: "/lovable-uploads/57c40c3e-2c31-4e62-884b-d351785649d1.png",
      title: "Systematic but Flexible Learning Path",
      description: (
        <>
          You can start with any section without order as live classes, videos, pdfs and tests are not only designed in a systematic path but also curated with flexibility.
          Foundation is supported by 'Course Journey' to check
          <ol className="list-decimal list-inside mt-2 text-left ml-4">
            <li>How is your foundation?</li>
            <li>Your competitive Index.</li>
          </ol>
        </>
      )
    },
    {
      image: "/lovable-uploads/a4751d8b-44f3-4efa-ab89-b8aa48c01c16.png",
      title: "Introducing Sefi, The Examys AI for Quetion trend",
      description: (
        <>
          Make your preparation strong with Examys AI by analyzing question pattern trend for any competitive exam in India.
          <ol className="list-decimal list-inside mt-2 text-left ml-4">
            <li>Question-pattern trend</li>
            <li>Question level analysis</li>
            <li>Course availability</li>
          </ol>
        </>
      )
    },
    {
      image: "/lovable-uploads/a63484b4-98f0-44fa-bc28-0c321cf82414.png",
      title: "Comprehensive Test Series",
      description: (
        <>
          Give test to maximize your score and get succeed with an all-round approach.
          <ol className="list-decimal list-inside mt-2 text-left">
            <li>Mock test: Chapter test, section test & full length test</li>
            <li>Previous year test</li>
            <li>Practice trend test for pattern analysis</li>
            <li>Access to live test series</li>
          </ol>
        </>
      )
    }
  ];

  return (
    <section id="course-advantages" className="py-16 bg-[#f5f6fa]">
      <div className="w-[95%] max-w-[1200px] mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-2 text-gray-900">Examys Course Advantages</h2>
        <p className="text-center text-lg text-gray-500 mb-12 font-medium">
          Access online courses for Govt. Exams systematically with Video classes, pdfs and quizzes
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {advantages.map((adv, idx) => (
            <div key={idx} className="flex flex-col items-center text-center bg-transparent p-0">
              <img src={adv.image} alt={adv.title} className="w-28 h-28 object-contain mb-6" />
              <h3 className="text-xl font-bold mb-3 text-gray-900">{adv.title}</h3>
              <div className="text-gray-800 text-base leading-relaxed">{adv.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CourseAdvantages;
