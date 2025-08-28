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

interface WinningQuestion {
  id: string;
  question: string;
  answer: string;
  created_at: string;
  updated_at: string;
}

const AdminWinningQuestions = () => {
  const [questions, setQuestions] = useState<WinningQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  
  const fetchWinningQuestions = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/winningquestion/teacher`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setQuestions(response.data.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch winning questions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWinningQuestions();
  }, [token]);

  const filteredQuestions = questions?.filter(question => 
    question.question.toLowerCase().includes(searchTerm.toLowerCase())
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
      
      setQuestions(questions.filter(question => question.id !== courseId));
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
      
      setQuestions(questions.map(question => 
        question.id === courseId 
          ? { ...question, status: newStatus }
          : question
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
          <p className="mt-4 text-gray-600">Loading winning questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">Winning Questions Management</h1>
        <Button 
          variant="default"
          onClick={() => navigate("/admin/create-winning-question")}
          className="text-sm sm:text-base"
        >
          Add Winning Question
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="relative w-full sm:w-1/3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search winning questions..."
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
              <TableHead className="text-xs sm:text-sm">Question</TableHead>
              <TableHead className="text-xs sm:text-sm">Answer</TableHead>
              <TableHead className="text-xs sm:text-sm">Date Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQuestions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  No winning questions created yet. Click "Add Winning Question" to create your first winning question.
                </TableCell>
              </TableRow>
            ) : (
              filteredQuestions.map((question) => (
                <TableRow key={question.id}>
                  <TableCell className="font-medium text-xs sm:text-sm">{question.question}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{question.answer}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{formatDate(question.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminWinningQuestions;
