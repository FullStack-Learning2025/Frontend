import React from 'react';

const MobileApp = () => {
  return (
    <section id="mobile-app" className="w-[95%] max-w-[1000px] py-10 mx-auto min-h-[340px] flex items-center justify-center px-4 py-8 my-12">
      <div
        className="w-full flex flex-col lg:flex-row items-center gap-8 rounded-2xl"
        style={{
          background: 'linear-gradient(90deg, #b6c7f7 0%, #b6a7f7 50%, #a7a7f7 100%)',
          borderRadius: '24px',
        }}
      >
        <div className="flex flex-col items-start justify-center flex-1 px-6 py-8">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            Experience<br />
            <span className="text-[#6c63ff]">Examys</span>
          </h2>
          <a
            href="#"
            className="inline-flex items-center bg-black rounded-lg px-2 py-2 text-white text-lg font-semibold shadow-lg hover:bg-gray-800 transition-colors mt-4"
            style={{ minWidth: 180 }}
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
              alt="Get it on Google Play"
              className="h-12 w-auto"
              style={{ background: 'transparent' }}
            />
          </a>
        </div>
        <div className="flex items-center justify-center w-full max-w-xs py-6 relative">
          <img
            src="https://www.examys.com/_next/image?url=%2Fbanners%2Fandroid.png&w=384&q=75"
            alt="Examys Mobile App"
            className="w-full object-contain h-[380px] hidden md:block absolute"
          />
        </div>
      </div>
    </section>
  );
};

export default MobileApp;
