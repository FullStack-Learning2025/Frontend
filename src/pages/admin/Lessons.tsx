
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

interface Lesson {
  id: string;
  title: string;
  description: string;
  course_id: string;
  course_title: string;
  category: string;
  created_at: string;
  updated_at: string;
}

const AdminLessons = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  
  const fetchLessons = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/courses/lessons/teacher`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setLessons(response.data.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch lessons. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, [token]);

  const filteredLessons = lessons?.filter(lesson => 
    lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lesson.course_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const deleteLesson = async (lessonId: string) => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/courses/lessons/${lessonId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setLessons(lessons.filter(lesson => lesson.id !== lessonId));
      toast({
        title: "Success",
        description: "Lesson deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete lesson. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading lessons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">Lessons Management</h1>
        <Button 
          variant="default"
          onClick={() => navigate("/admin/create-lesson")}
          className="text-sm sm:text-base"
        >
          Add Lesson
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="relative w-full sm:w-1/3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search lessons or courses..."
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
              <TableHead className="text-xs sm:text-sm">Lesson Title</TableHead>
              <TableHead className="text-xs sm:text-sm">Course</TableHead>
              <TableHead className="text-xs sm:text-sm">Category</TableHead>
              <TableHead className="text-xs sm:text-sm">Date Created</TableHead>
              <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLessons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No lessons created yet. Click "Add Lesson" to create your first lesson.
                </TableCell>
              </TableRow>
            ) : (
              filteredLessons.map((lesson) => (
                <TableRow key={lesson.id}>
                  <TableCell className="font-medium text-xs sm:text-sm">{lesson.title}</TableCell>
                  <TableCell className="text-xs sm:text-sm">
                    <Badge variant="outline" className="text-xs px-2 py-0.5">
                      {lesson.course_title}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm">
                    {lesson.category}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm">{formatDate(lesson.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1 sm:gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 sm:h-10 sm:w-10"
                        onClick={() => navigate(`/admin/create-lesson?type=edit&id=${lesson.id}&category=${lesson.category}&course_id=${lesson.course_id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 sm:h-10 sm:w-10"
                        onClick={() => navigate(`/admin/create-lesson?type=edit&id=${lesson.id}&category=${lesson.category}&course_id=${lesson.course_id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 sm:h-10 sm:w-10"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this lesson?')) {
                            deleteLesson(lesson.id);
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

export default AdminLessons;
