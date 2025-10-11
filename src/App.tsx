
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';

import Index from './pages/Index';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NotFound from './pages/NotFound';
import PrivacyPolicyPublic from './pages/PrivacyPolicy';
import TermsConditionsPublic from './pages/TermsConditions';
import PrivacyPolicyStandalone from './pages/PrivacyPolicyStandalone';
import TermsConditionsStandalone from './pages/TermsConditionsStandalone';

// Admin components
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminUserDetails from './pages/admin/UserDetails';
import AdminTeachers from './pages/admin/Teachers';
import AdminTeacherDetails from './pages/admin/TeacherDetails';
import AdminCourses from './pages/admin/Courses';
import AdminCreateCourse from './pages/admin/CreateCourse';
import AdminAssignCourse from './pages/admin/AssignCourse';
import AdminLessons from './pages/admin/Lessons';
import AdminExams from './pages/admin/Exams';
import AdminCreateExam from './pages/admin/CreateExam';
import AdminQuestions from './pages/admin/Questions';
import AdminCreateQuestions from './pages/admin/crateQeuestions';
import AdminWinningQuestions from './pages/admin/WinningQuestions';
import AdminCreateWinningQuestion from './pages/admin/CreateWinningQuestion';
import AdminBlogs from './pages/admin/Blogs';
import AdminCreateBlog from './pages/admin/CreateBlog';
import AdminPromos from './pages/admin/Promos';
import AdminPromoDetail from './pages/admin/PromoDetail';
import PrivacyPolicyAdmin from './pages/admin/PrivacyPolicy';
import TermsConditionsAdmin from './pages/admin/TermsConditions';
import AdminQuestionsFeedback from './pages/admin/QuestionsFeedback';

// Teacher components
import TeacherLayout from './layouts/TeacherLayout';
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherCourses from './pages/teacher/Courses';
import TeacherCreateCourse from './pages/teacher/CreateCourse';
import TeacherLessons from './pages/teacher/Lessons';
import TeacherCreateLesson from './pages/teacher/CreateLesson';
import TeacherExams from './pages/teacher/Exams';
import TeacherCreateExam from './pages/teacher/CreateExam';
import TeacherQuestions from './pages/teacher/Questions';
import TeacherCreateQuestion from './pages/teacher/CreateQuestion';
import TeacherWinningQuestions from './pages/teacher/WinningQuestion';
import TeacherCreateWinningQuestion from './pages/teacher/CreateWinningQuestion';
import TeacherBlogs from './pages/teacher/Blogs';
import TeacherCreateBlog from './pages/teacher/CreateBlog';

import ProtectedRoute from './components/ProtectedRoute';
// Student components
import StudentLayout from './layouts/StudentLayout';
import StudentDashboard from './pages/student/Dashboard';
import StudentExams from './pages/student/Exams';
import StudentQuestions from './pages/student/Questions';
import StudentLessons from './pages/student/Lessons';
import StudentBlogs from './pages/student/Blogs';
import StudentProgress from './pages/student/Progress';
import StudentWinningQuestions from './pages/student/WinningQuestions.tsx';

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <div className="App">
          <Toaster />
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
          <Router>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/privacy-policy-standalone" element={<PrivacyPolicyStandalone />} />
              <Route path="/terms-conditions-standalone" element={<TermsConditionsStandalone />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPublic />} />
              <Route path="/terms-conditions" element={<TermsConditionsPublic />} />

              {/* Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="users/:userId" element={<AdminUserDetails />} />
                  <Route path="teachers" element={<AdminTeachers />} />
                  <Route path="teachers/:id" element={<AdminTeacherDetails />} />
                  <Route path="courses" element={<AdminCourses />} />
                  <Route path="create-course" element={<AdminCreateCourse />} />
                  <Route path="assign-course" element={<AdminAssignCourse />} />
                  <Route path="lessons" element={<AdminLessons />} />
                  <Route path="exams" element={<AdminExams />} />
                  <Route path="create-exam" element={<AdminCreateExam />} />
                  <Route path="questions" element={<AdminQuestions />} />
                  <Route path="create-question" element={<AdminCreateQuestions />} />
                  <Route path="winningquestion" element={<AdminWinningQuestions />} />
                  <Route path="create-lesson" element={<TeacherCreateLesson />} />
                  <Route path="create-winning-question" element={<AdminCreateWinningQuestion />} />
                  <Route path="blogs" element={<AdminBlogs />} />
                  <Route path="create-blog" element={<AdminCreateBlog />} />
                  <Route path="promos" element={<AdminPromos />} />
                  <Route path="promo-detail/:id" element={<AdminPromoDetail />} />
                  <Route path="create-promo" element={<AdminPromoDetail />} />
                  <Route path="questions-feedback" element={<AdminQuestionsFeedback />} />
                  <Route path="privacy-policy" element={<PrivacyPolicyAdmin />} />
                  <Route path="terms-conditions" element={<TermsConditionsAdmin />} />
                </Route>
              </Route>

              {/* Student Routes */}
              <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                <Route path="/student" element={<StudentLayout />}>
                  <Route path="dashboard" element={<StudentDashboard />} />
                  {/* Rename: Courses -> Exams view (keep courses path for backward-compat) */}
                  <Route path="exams" element={<StudentExams />} />
                  <Route path="questions" element={<StudentQuestions />} />
                  {/* New Lessons tab (formerly Exams) */}
                  <Route path="lessons" element={<StudentLessons />} />
                  <Route path="blogs" element={<StudentBlogs />} />
                  <Route path="winningquestion" element={<StudentWinningQuestions />} />
                  <Route path="progress" element={<StudentProgress />} />
                </Route>
              </Route>

              {/* Teacher Routes */}
              <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
                <Route path="/teacher" element={<TeacherLayout />}>
                  <Route path="dashboard" element={<TeacherDashboard />} />
                  <Route path="courses" element={<TeacherCourses />} />
                  <Route path="create-course" element={<TeacherCreateCourse />} />
                  <Route path="lessons" element={<TeacherLessons />} />
                  <Route path="create-lesson" element={<TeacherCreateLesson />} />
                  <Route path="exams" element={<TeacherExams />} />
                  <Route path="create-exam" element={<TeacherCreateExam />} />
                  <Route path="questions" element={<TeacherQuestions />} />
                  <Route path="create-question" element={<TeacherCreateQuestion />} />
                  <Route path="winningquestion" element={<TeacherWinningQuestions />} />
                  <Route path="create-winning-question" element={<TeacherCreateWinningQuestion />} />
                  <Route path="blogs" element={<TeacherBlogs />} />
                  <Route path="create-blog" element={<TeacherCreateBlog />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </div>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
