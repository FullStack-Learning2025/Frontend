import React from 'react';

const Hero = () => {
  return (
    <section
      className="w-[90%] max-w-[1400px] mx-auto min-h-[420px] flex items-center justify-center px-10 py-8 mt-20"
      style={{
        background: 'linear-gradient(90deg, #DDDDFC 0%, #FFFCDA 50%, #E5D8FF 100%)',
        borderRadius: '24px',
        margin: '20px auto',
      }}
    >
      <div className="flex flex-col lg:flex-row items-center justify-between w-full gap-8">
        <div className="flex flex-col items-start justify-center flex-1 px-2 md:px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Exam<br />Unlocked!</h1>
          <p className="text-lg md:text-xl text-gray-700 mb-8 font-medium">
            Dive Into The Ocean of Courses and Test Series
          </p>
          <a
            href="#"
            className="inline-flex items-center bg-black rounded-lg px-6 py-3 text-white text-lg font-semibold shadow-lg hover:bg-gray-800 transition-colors"
            style={{ minWidth: 180 }}
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
              alt="Get it on Google Play"
              className="h-10 w-auto mr-2"
              style={{ background: 'transparent' }}
            />
          </a>
        </div>
        <div className="flex flex-row items-center justify-center flex-1 gap-4 md:gap-6 ">
          <img
            src="https://www.examys.com/_next/image?url=%2Fbanners%2Fandroid.png&w=384&q=75"
            alt="Mobile App Screenshot"
            className="max-h-64 md:max-h-80 w-auto rounded-xl shadow-xl object-contain max-w-[180px] hidden md:block"
          />
          <img
            src="https://www.examys.com/_next/image?url=%2Fbanners%2Fmac.png&w=640&q=75"
            alt="Web App Screenshot"
            className="max-h-64 md:max-h-80 w-auto rounded-xl shadow-xl object-contain max-w-full md:max-w-[400px]"
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;
