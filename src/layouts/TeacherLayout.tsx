import { useEffect, useState, HTMLAttributes } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  BookOpen, 
  Menu,
  ChevronRight,
  LogOut,
  Award,
  Globe,
  Upload,
  X
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import purplelogo from '../assets/ExamWalk Purple Logo.svg'
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "react-toastify";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const TeacherLayout = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { logout, token } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    display_name: '',
    full_name: '',
    contact_number: '',
    profile_image: ''
  });
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/user-profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setUserProfile(data);
      setForm({
        display_name: data.display_name || '',
        full_name: data.full_name || '',
        contact_number: data.contact_number || '',
        profile_image: data.profile_image || ''
      });
      setImagePreview(data.profile_image || '');
    } catch (error) {
      toast.error('Failed to load profile');
    }
  };

  const uploadToBackend = async (file) => {
    const data = new FormData();
    data.append("file", file);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/storage/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: data,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      if (result.success && result.data.public_url) {
        return result.data.public_url;
      } else {
        throw new Error("Upload failed: Invalid response");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      throw new Error("Failed to upload image");
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      const url = await uploadToBackend(file);
      setForm(prev => ({ ...prev, profile_image: url }));
      setImagePreview(url);
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload image');
      console.error('Upload error:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/user-profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data = await response.json();
      setUserProfile(data);
      toast.success('Profile updated successfully');
      setShowProfileModal(false);
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Menu items configuration
  const menuItems = [
    {
      title: t.dashboard,
      icon: <LayoutDashboard className="h-5 w-5" />,
      path: "/teacher/dashboard",
    },
    {
      title: t.exams,
      icon: <FileText className="h-5 w-5" />,
      path: "/teacher/exams",
    },
    {
      title: t.questions,
      icon: <FileText className="h-5 w-5" />,
      path: "/teacher/questions",
    },
    {
      title: t.lessons,
      icon: <BookOpen className="h-5 w-5" />,
      path: "/teacher/lessons",
    },
    {
      title: t.blogs,
      icon: <FileText className="h-5 w-5" />,
      path: "/teacher/blogs",
    },
    {
      title: t.winningQuestions,
      icon: <Award className="h-5 w-5" />,
      path: "/teacher/winningquestion",
    },
    { type: "divider" },
    {
      title: t.createExam,
      icon: <FileText className="h-5 w-5" />,
      path: "/teacher/create-exam",
    },

    {
      title: t.createLesson,
      icon: <BookOpen className="h-5 w-5" />,
      path: "/teacher/create-lesson",
    },
    {
      title: t.createQuestion,
      icon: <FileText className="h-5 w-5" />,
      path: "/teacher/create-question",
    },
    {
      title: t.createBlog,
      icon: <FileText className="h-5 w-5" />,
      path: "/teacher/create-blog",
    },
    {
      title: t.createWinningQuestion,
      icon: <Award className="h-5 w-5" />,
      path: "/teacher/create-winning-question",
    },
    { type: "divider" },
    {
      title: t.language,
      icon: <Globe className="h-5 w-5" />,
      isLanguageSelector: true,
    },
    {
      title: t.logout,
      icon: <LogOut className="h-5 w-5" />,
      action: handleLogout,
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50 w-full overflow-hidden">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-md transform transition-transform duration-300 ease-in-out flex flex-col", 
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-20"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b">
          <Link to="/" className="flex items-center">
            <img 
              src={purplelogo} 
              alt="ExamWalk" 
              className={cn("h-14", !sidebarOpen && "lg:mx-auto")}
            />
          </Link>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-md lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Menu Items */}
        <nav className="py-4 flex-1 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item, index) => 
              item.type === "divider" ? (
                <li key={`divider-${index}`} className="mx-4 my-2 border-t border-gray-200" />
              ) : (
                <li key={item.title || index}>
                  {item.isLanguageSelector ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button 
                          className={cn(
                            "flex items-center w-full px-4 py-2.5 text-gray-700 hover:bg-purple-50 hover:text-purple-700",
                            "transition-all duration-200 ease-in-out",
                          )}
                        >
                          <span className={cn("", !sidebarOpen && "lg:mx-auto")}>{item.icon}</span>
                          {(sidebarOpen || isMobile) && <span className="ml-3">{item.title}</span>}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => setLanguage('en')}
                          className={language === 'en' ? 'bg-muted' : ''}
                        >
                          {t.english}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setLanguage('ar')}
                          className={language === 'ar' ? 'bg-muted' : ''}
                        >
                          {t.arabic}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : item.action ? (
                    <button 
                      onClick={item.action}
                      className={cn(
                        "flex items-center w-full px-4 py-2.5 text-gray-700 hover:bg-purple-50 hover:text-purple-700",
                        "transition-all duration-200 ease-in-out",
                      )}
                    >
                      <span className={cn("", !sidebarOpen && "lg:mx-auto")}>{item.icon}</span>
                      {(sidebarOpen || isMobile) && <span className="ml-3">{item.title}</span>}
                    </button>
                  ) : (
                    <Link 
                      to={item.path} 
                      onClick={() => isMobile && setSidebarOpen(false)}
                      className={cn(
                        "flex items-center px-4 py-2.5 text-gray-700 hover:bg-purple-50 hover:text-purple-700",
                        "transition-all duration-200 ease-in-out",
                        window.location.pathname === item.path && "bg-purple-50 text-purple-700 font-medium"
                      )}
                    >
                      <span className={cn("", !sidebarOpen && "lg:mx-auto")}>{item.icon}</span>
                      {(sidebarOpen || isMobile) && <span className="ml-3">{item.title}</span>}
                    </Link>
                  )}
                </li>
              )
            )}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div className={cn(
        "flex-1 transition-all duration-300 ease-in-out w-full",
        sidebarOpen ? "lg:ml-64" : "lg:ml-20"
      )}>
        {/* Navbar */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between px-4 py-3">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="p-2 rounded-md text-gray-600 hover:bg-purple-50 hover:text-purple-600 focus:outline-none"
            >
              {sidebarOpen ? 
                <ChevronRight className="h-5 w-5" /> : 
                <Menu className="h-5 w-5" />
              }
            </button>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700" role="presentation">
                {userProfile?.display_name || 'Teacher'}
              </span>
              <button
                onClick={() => setShowProfileModal(true)}
                className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-medium overflow-hidden"
              >
                {userProfile?.profile_image ? (
                  <img 
                    src={userProfile.profile_image} 
                    alt={userProfile.display_name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span role="presentation">
                    {userProfile?.display_name?.[0]?.toUpperCase() || 'T'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Profile Edit Modal */}
        <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogTitle className="flex items-center justify-between">
              Edit Profile
              <button
                onClick={() => setShowProfileModal(false)}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogTitle>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Profile Image Upload */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-purple-100">
                  {imagePreview ? (
                    <img 
                      src={imagePreview} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-purple-700 text-2xl font-bold">
                      {form.display_name?.[0]?.toUpperCase() || 'T'}
                    </div>
                  )}
                  <label 
                    className="absolute bottom-0 right-[35%] p-1 bg-purple-600 rounded-full cursor-pointer hover:bg-purple-700 transition-colors"
                    htmlFor="profile-image"
                  >
                    <Upload className="h-4 w-4 text-white" />
                  </label>
                  <input
                    type="file"
                    id="profile-image"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
                {uploadingImage && <p className="text-sm text-purple-600">Uploading image...</p>}
              </div>
              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={form.display_name}
                    onChange={(e) => setForm(prev => ({ ...prev, display_name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number
                  </label>
                  <PhoneInput
                    country={'us'}
                    value={form.contact_number}
                    onChange={(value) => setForm(prev => ({ ...prev, contact_number: value }))}
                    inputClass="!w-full !rounded-lg !border !border-gray-300 !px-3 !py-2 !focus:outline-none !focus:border-purple-500"
                    inputStyle={{ width: '100%' }}
                    specialLabel=""
                  />
                </div>
              </div>
              {/* Submit Button */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || uploadingImage}
                  className={cn(
                    "px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg",
                    "hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2",
                    (loading || uploadingImage) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Page Content */}
        <main className="p-2 sm:p-4 lg:p-6 w-full overflow-y-auto" style={{ height: "calc(100vh - 3.5rem)" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;
