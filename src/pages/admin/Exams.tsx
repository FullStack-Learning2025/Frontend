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

interface Exam {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  category?: string;
  status: "published" | "draft";
  user_id: string;
  rating?: number;
  attempted?: number;
  submissions?: number;
  created_at: string;
  updated_at: string;
  course_name: string;
}

const Exams = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  
  const fetchExams = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/exams`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setExams(response.data.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch exams. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [token]);

  const filteredExams = exams?.filter(exam => 
    exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (exam.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const deleteExam = async (examId: string) => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/exams/${examId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setExams(exams.filter(exam => exam.id !== examId));
      toast({
        title: "Success",
        description: "Exam deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete exam. Please try again.",
        variant: "destructive"
      });
    }
  };

  const toggleExamStatus = async (examId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "published" ? "draft" : "published";
      await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/exams/${examId}`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setExams(exams.map(exam => 
        exam.id === examId 
          ? { ...exam, status: newStatus }
          : exam
      ));
      
      toast({
        title: "Success",
        description: `Exam ${newStatus === "published" ? "published" : "unpublished"} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update exam status. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading exams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full px-2 sm:px-4 lg:px-6">
      <div className="space-y-4 sm:space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Exams Management</h1>
          <Button 
            variant="default"
            onClick={() => navigate("/admin/create-exam")}
            className="w-full sm:w-auto text-sm sm:text-base"
          >
            Add Exam
          </Button>
        </div>

        {/* Search Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="relative w-full sm:w-1/3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search exams, courses, or categories..."
              className="pl-10 text-sm sm:text-base w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table Section */}
        <div className="w-full overflow-hidden rounded-md border shadow">
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-900 bg-gray-50 whitespace-nowrap">Course</TableHead>
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-900 bg-gray-50 whitespace-nowrap">Title</TableHead>
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-900 bg-gray-50 whitespace-nowrap">Category</TableHead>
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-900 bg-gray-50 whitespace-nowrap">Date Created</TableHead>
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-900 bg-gray-50 whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm font-medium text-gray-900 bg-gray-50 whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No exams created yet. Click "Add Exam" to create your first exam.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExams.map((exam) => (
                    <TableRow key={exam.id} className="hover:bg-gray-50">
                      <TableCell className="text-xs sm:text-sm">
                        <Badge variant="outline" className="text-xs px-2 py-0.5 whitespace-nowrap">
                          {exam.course_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm text-gray-900 max-w-[200px] sm:max-w-none truncate">
                        {exam.title}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        <Badge variant="secondary" className="text-xs px-2 py-0.5 whitespace-nowrap">
                          {exam.category || "No Category"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(exam.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={exam.status === "published" ? "default" : "outline"}
                            className="text-xs sm:text-sm whitespace-nowrap"
                          >
                            {exam.status === "published" ? "Published" : "Draft"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExamStatus(exam.id, exam.status)}
                            className="text-xs px-2 py-1"
                          >
                            {exam.status === "published" ? "Unpublish" : "Publish"}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1 sm:gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
                            onClick={() => navigate(`/admin/create-exam?type=edit&id=${exam.id}&category=${exam.category}&course_id=${exam.course_id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
                            onClick={() => navigate(`/admin/create-exam?type=edit&id=${exam.id}&category=${exam.category}&course_id=${exam.course_id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this exam?')) {
                                deleteExam(exam.id);
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

export default Exams;
