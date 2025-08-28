import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import purplelogo from '../assets/ExamWalk Purple Logo.svg'
import { LanguageSelector } from './LanguageSelector';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <nav className="w-full z-50 bg-white border-b border-gray-200 py-3">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <a href="/" className="flex items-center">
          <img src={purplelogo} alt="ExamWalk" className="h-12" />
        </a>
        <div className="hidden md:flex items-center space-x-8">
          <a href="#course-advantages" className="text-sm font-medium text-gray-700 hover:text-primary transition-colors">{t.whyExamWalk}</a>
          <a href="#platform-features" className="text-sm font-medium text-gray-700 hover:text-primary transition-colors">{t.features}</a>
          <a href="#mobile-app" className="text-sm font-medium text-gray-700 hover:text-primary transition-colors">{t.testimonials}</a>
          <a href="#footer" className="text-sm font-medium text-gray-700 hover:text-primary transition-colors">{t.contactUs}</a>
          <a href="/login" className="text-sm font-medium text-gray-700 hover:text-primary transition-colors">{t.login}</a>
          <a href="/signup" className="btn-primary">{t.getStarted}</a>
          <LanguageSelector />
        </div>
        <div className="md:hidden flex items-center gap-2">
          <LanguageSelector />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-gray-500 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden bg-white px-4 py-5 shadow-lg absolute w-full">
          <div className="flex flex-col space-y-4">
            <a href="#course-advantages" className="text-sm font-medium text-gray-700 hover:text-primary transition-colors">{t.whyExamWalk}</a>
            <a href="#platform-features" className="text-sm font-medium text-gray-700 hover:text-primary transition-colors">{t.features}</a>
            <a href="#mobile-app" className="text-sm font-medium text-gray-700 hover:text-primary transition-colors">{t.testimonials}</a>
            <a href="#footer" className="text-sm font-medium text-gray-700 hover:text-primary transition-colors">{t.contactUs}</a>
            <a href="/login" className="text-sm font-medium text-gray-700 hover:text-primary transition-colors">{t.login}</a>
            <a href="/signup" className="btn-primary w-full text-center">{t.getStarted}</a>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
