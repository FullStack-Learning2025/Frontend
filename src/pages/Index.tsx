
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import CourseAdvantages from '@/components/CourseAdvantages';
import CoursesSection from '@/components/CoursesSection';
import CourseSupportedBy from '@/components/CourseSupportedBy';
import MockTestSection from '@/components/MockTestSection';
import TestSeriesSection from '@/components/TestSeriesSection';
import TestSeriesSupportedBy from '@/components/TestSeriesSupportedBy';
import CurrentAffairsSection from '@/components/CurrentAffairsSection';
import MobileApp from '@/components/MobileApp';
import Footer from '@/components/Footer';
import { setupScrollAnimations, setupMouseFollowEffect } from '@/utils/animations';

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, role, isLoading } = useAuth();

  // If already logged in, send user to their dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && role) {
      if (role === 'admin') navigate('/admin/dashboard');
      else if (role === 'teacher') navigate('/teacher/dashboard');
      else if (role === 'student') navigate('/student/dashboard');
    }
  }, [isAuthenticated, role, isLoading, navigate]);

  useEffect(() => {
    // Setup animations
    const cleanupScrollAnimations = setupScrollAnimations();
    const cleanupMouseEffect = setupMouseFollowEffect();
    
    return () => {
      cleanupScrollAnimations();
      cleanupMouseEffect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <div className='bg-[#F8F8FF]'>

      <CourseAdvantages />
      <CoursesSection />
      <CourseSupportedBy />
      <MockTestSection />
      <TestSeriesSection />
      <TestSeriesSupportedBy />
      {/* <CurrentAffairsSection /> */}
      <MobileApp />
      </div>
      <Footer />
    </div>
  );
};

export default Index;
