import React from 'react';

const supporters = [
  {
    icon: (
      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-blue-500 bg-blue-50 text-blue-600 text-2xl mr-4">
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-git-merge"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>
      </span>
    ),
    title: "Course Journey",
    subtitle: "Insights that deliver result.",
    description: "Every course has a 'course journey' section to accelerate your preparation and, ultimately, help you crack the exam.",
    link: "Click here to know more"
  },
  {
    icon: (
      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-blue-500 bg-blue-50 text-blue-600 text-2xl mr-4">
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-bar-chart-2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      </span>
    ),
    title: "Examys AI",
    subtitle: "Analyzing trend that boosts your confidence.",
    description: "Every course has a 'Trend analysis' section which is powered by examys ai to know the exam pattern.",
    link: "Click here to know more"
  },
  {
    icon: (
      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-blue-500 bg-blue-50 text-blue-600 text-2xl mr-4">
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-users"><path d="M17 21v-2a4 4 0 0 0-3-3.87"/><path d="M7 21v-2a4 4 0 0 1 3-3.87"/><circle cx="12" cy="7" r="4"/></svg>
      </span>
    ),
    title: "Course Design and Team",
    subtitle: "Learning path that connects and team that inspires.",
    description: "Every course has a 'course design & team' section to know about the team & faculties and their inspiring story.",
    link: "Click here to know more"
  }
];

const CourseSupportedBy = () => {
  return (
    <section className="py-14 bg-[#f7f8fc]">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold mb-10 text-gray-900 text-left">
          Courses Supported by
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {supporters.map((supporter, idx) => (
            <div
              key={idx}
              className="bg-white border border-blue-200 rounded-xl shadow-sm p-6 flex flex-col items-start min-h-[200px]"
              style={{ boxShadow: '0 2px 8px 0 rgba(44, 62, 80, 0.07)' }}
            >
              <div className="flex items-center mb-2">
                {supporter.icon}
                <div>
                  <div className="text-lg font-bold text-gray-900 leading-tight">{supporter.title}</div>
                  <div className="text-sm text-gray-700 font-medium leading-tight">{supporter.subtitle}</div>
                </div>
              </div>
              <div className="text-gray-700 text-sm mb-3 mt-2 text-left">
                {supporter.description}
              </div>
              <a href="/login" className="text-blue-600 text-sm font-medium hover:underline mt-auto">
                {supporter.link}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CourseSupportedBy;
