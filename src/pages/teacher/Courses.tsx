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
  category: string[];
  cover_image: string;
  teacher_id: string;
  created_at: string;
  updated_at: string;
  status: "published" | "draft";
}

const TeacherCourses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  
  const fetchCourses = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/courses/teacher`,
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
    fetchCourses();
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
        `${import.meta.env.VITE_BACKEND_URL}/api/courses/${courseId}`,
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
          <p className="mt-4 text-gray-600">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">Courses Management</h1>
        <Button 
          variant="default"
          onClick={() => navigate("/teacher/create-course")}
          className="text-sm sm:text-base"
        >
          Add Course
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="relative w-full sm:w-1/3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            className="pl-10 text-sm sm:text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border shadow overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs sm:text-sm">Course Name</TableHead>
              <TableHead className="text-xs sm:text-sm">Category</TableHead>
              <TableHead className="text-xs sm:text-sm">Date Created</TableHead>
              <TableHead className="text-xs sm:text-sm">Status</TableHead>
              <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCourses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No courses created yet. Click "Add Course" to create your first course.
                </TableCell>
              </TableRow>
            ) : (
              filteredCourses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium text-xs sm:text-sm">{course.title}</TableCell>
                  <TableCell className="text-xs sm:text-sm">
                    <div className="flex flex-wrap gap-1">
                      {course.category?.map((cat, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className="text-xs px-2 py-0.5"
                        >
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm">{formatDate(course.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={course.status === "published" ? "default" : "outline"}
                        className="text-xs sm:text-sm"
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
                        className="h-8 w-8 sm:h-10 sm:w-10"
                        onClick={() => navigate(`/teacher/create-course?type=edit&id=${course.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 sm:h-10 sm:w-10"
                        onClick={() => navigate(`/teacher/create-course?type=edit&id=${course.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 sm:h-10 sm:w-10"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this course?')) {
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
  );
};

export default TeacherCourses;
