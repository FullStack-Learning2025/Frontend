import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  cover_image: string;
  teacher_id: string;
  created_at: string;
  updated_at: string;
  status: "published" | "draft";
  courses?: {
    title: string;
  };
}

const TeacherBlogs = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  
  const fetchBlogs = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/blogs`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setCourses(response.data.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch courses. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, [token]);

  const filteredCourses = courses?.filter(course => 
    course.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const deleteCourse = async (courseId: string) => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/blogs/${courseId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setCourses(courses.filter(course => course.id !== courseId));
      toast({
        title: "Success",
        description: "Course deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete course. Please try again.",
        variant: "destructive"
      });
    }
  };

  const toggleCourseStatus = async (courseId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "published" ? "draft" : "published";
      await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/courses/${courseId}/status`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setCourses(courses.map(course => 
        course.id === courseId 
          ? { ...course, status: newStatus }
          : course
      ));
      
      toast({
        title: "Success",
        description: `Course ${newStatus === "published" ? "published" : "unpublished"} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update course status. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading blogs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full px-2 sm:px-4 lg:px-6">
      <div className="space-y-4 sm:space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Blogs Management</h1>
          <Button 
            variant="default"
            onClick={() => navigate("/teacher/create-blog")}
            className="w-full sm:w-auto text-sm sm:text-base"
          >
            Add Blog
          </Button>
        </div>

        {/* Search Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="relative w-full sm:w-1/3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search blogs..."
              className="pl-10 text-sm sm:text-base w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table Section */}
        <div className="w-full overflow-hidden rounded-md border shadow">
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-900 bg-gray-50 whitespace-nowrap">Course Name</TableHead>
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-900 bg-gray-50 whitespace-nowrap">Title</TableHead>
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-900 bg-gray-50 whitespace-nowrap">Date Created</TableHead>
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-900 bg-gray-50 whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm font-medium text-gray-900 bg-gray-50 whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No blogs created yet. Click "Add Blog" to create your first blog.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCourses.map((course) => (
                    <TableRow key={course.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-xs sm:text-sm text-gray-900 max-w-[120px] sm:max-w-none truncate">
                        {course.title || 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm text-gray-900 max-w-[150px] sm:max-w-none truncate">
                        {course.title}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(course.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={course.status === "published" ? "default" : "outline"}
                            className="text-xs sm:text-sm whitespace-nowrap"
                          >
                            {course.status === "published" ? "Published" : "Draft"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1 sm:gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
                            onClick={() => navigate(`/teacher/create-blog?type=edit&id=${course.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
                            onClick={() => navigate(`/teacher/create-blog?type=edit&id=${course.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this blog?')) {
                                deleteCourse(course.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherBlogs;