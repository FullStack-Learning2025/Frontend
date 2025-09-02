import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Menu,
  ChevronRight,
  LogOut,
  Globe,
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

const StudentLayout = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { logout, token } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
    else setSidebarOpen(true);
  }, [isMobile]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/user-profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setUserProfile(data);
        }
      } catch (e) {
        // silent fail for header badge
      }
    };

    if (token) fetchUserProfile();
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { title: t.dashboard, icon: <LayoutDashboard className="h-5 w-5" />, path: "/student/dashboard" },
    { title: t.courses, icon: <BookOpen className="h-5 w-5" />, path: "/student/courses" },
    { title: t.exams, icon: <FileText className="h-5 w-5" />, path: "/student/exams" },
    { title: t.blogs, icon: <FileText className="h-5 w-5" />, path: "/student/blogs" },
    { type: "divider" },
    { title: t.language, icon: <Globe className="h-5 w-5" />, isLanguageSelector: true },
    { title: t.logout, icon: <LogOut className="h-5 w-5" />, action: handleLogout },
  ];

  return (
    <div className="flex h-screen bg-gray-50 w-full overflow-hidden">
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-md transform transition-transform duration-300 ease-in-out flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-20"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <Link to="/" className="flex items-center">
            <img src={purplelogo} alt="ExamWalk" className={cn("h-14", !sidebarOpen && "lg:mx-auto")} />
          </Link>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-gray-100 rounded-md lg:hidden">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

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
                        <button className={cn("flex items-center w-full px-4 py-2.5 text-gray-700 hover:bg-purple-50 hover:text-purple-700", "transition-all duration-200 ease-in-out")}> 
                          <span className={cn("", !sidebarOpen && "lg:mx-auto")}>{item.icon}</span>
                          {(sidebarOpen || isMobile) && <span className="ml-3">{item.title}</span>}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setLanguage('en')} className={language === 'en' ? 'bg-muted' : ''}>
                          {t.english}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLanguage('ar')} className={language === 'ar' ? 'bg-muted' : ''}>
                          {t.arabic}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : item.action ? (
                    <button onClick={item.action} className={cn("flex items-center w-full px-4 py-2.5 text-gray-700 hover:bg-purple-50 hover:text-purple-700", "transition-all duration-200 ease-in-out")}> 
                      <span className={cn("", !sidebarOpen && "lg:mx-auto")}>{item.icon}</span>
                      {(sidebarOpen || isMobile) && <span className="ml-3">{item.title}</span>}
                    </button>
                  ) : (
                    <Link to={item.path} onClick={() => isMobile && setSidebarOpen(false)} className={cn("flex items-center px-4 py-2.5 text-gray-700 hover:bg-purple-50 hover:text-purple-700", "transition-all duration-200 ease-in-out", window.location.pathname === item.path && "bg-purple-50 text-purple-700 font-medium")}> 
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

      <div className={cn("flex-1 transition-all duration-300 ease-in-out w-full", sidebarOpen ? "lg:ml-64" : "lg:ml-20")}> 
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-md text-gray-600 hover:bg-purple-50 hover:text-purple-600 focus:outline-none">
              {sidebarOpen ? <ChevronRight className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700" role="presentation">
                {userProfile?.display_name || 'Student'}
              </span>
              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-medium overflow-hidden">
                {userProfile?.profile_image ? (
                  <img
                    src={userProfile.profile_image}
                    alt={userProfile.display_name || 'Student'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span role="presentation">
                    {(userProfile?.display_name?.[0] || 'S').toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="p-2 sm:p-4 lg:p-6 w-full overflow-y-auto" style={{ height: "calc(100vh - 3.5rem)" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;
