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
import { Search, Eye, Edit, Trash2, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  course_id: string;
  category: string;
  question: string;
  options: {
    [key: string]: string;
  };
  correct: string;
  hint?: string;
  video?: string;
  exam_id?: string;
  rating?: number;
  created_at: string;
  updated_at: string;
  course_name: string;
}

interface GroupedQuestion {
  course_id: string;
  course_name: string;
  category: string;
  questionCount: number;
  questions: Question[];
  latestCreatedAt: string;
}

const AdminQuestions = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [groupedQuestions, setGroupedQuestions] = useState<GroupedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  
  const fetchQuestions = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/questions/teacher`,
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
        description: "Failed to fetch questions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [token]);

  // Group questions by course and category
  useEffect(() => {
    const grouped = questions.reduce((acc: { [key: string]: GroupedQuestion }, question) => {
      const key = `${question.course_id}-${question.category}`;
      
      if (!acc[key]) {
        acc[key] = {
          course_id: question.course_id,
          course_name: question.course_name,
          category: question.category,
          questionCount: 0,
          questions: [],
          latestCreatedAt: question.created_at
        };
      }
      
      acc[key].questionCount += 1;
      acc[key].questions.push(question);
      
      // Update latest created date
      if (new Date(question.created_at) > new Date(acc[key].latestCreatedAt)) {
        acc[key].latestCreatedAt = question.created_at;
      }
      
      return acc;
    }, {});

    setGroupedQuestions(Object.values(grouped));
  }, [questions]);

  const filteredGroupedQuestions = groupedQuestions?.filter(group => 
    group.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const deleteQuestionGroup = async (courseId: string, category: string) => {
    try {
      // Delete all questions in this category for this course
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/questions/courses/${courseId}/category`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          data: {
            category: category
          }
        }
      );
      
      // Remove the group from state
      setGroupedQuestions(groupedQuestions.filter(group => 
        !(group.course_id === courseId && group.category === category)
      ));
      
      toast({
        title: "Success",
        description: "All questions in this category deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete questions. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">Questions Management</h1>
        <Button 
          variant="default"
          onClick={() => navigate("/admin/create-question")}
          className="text-sm sm:text-base"
        >
          Add Question
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="relative w-full sm:w-1/3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courses or categories..."
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
              <TableHead className="text-xs sm:text-sm">Course</TableHead>
              <TableHead className="text-xs sm:text-sm">Category</TableHead>
              <TableHead className="text-xs sm:text-sm">Total Questions</TableHead>
              <TableHead className="text-xs sm:text-sm">Last Updated</TableHead>
              <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGroupedQuestions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No questions created yet. Click "Add Question" to create your first question.
                </TableCell>
              </TableRow>
            ) : (
              filteredGroupedQuestions.map((group) => (
                <TableRow key={`${group.course_id}-${group.category}`}>
                  <TableCell className="text-xs sm:text-sm">
                    <Badge variant="outline" className="text-xs px-2 py-0.5">
                      {group.course_name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm">
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                      {group.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm">
                    <Badge variant="default" className="text-xs px-2 py-0.5">
                      {group.questionCount} Questions
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm">
                    {formatDate(group.latestCreatedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1 sm:gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 sm:h-10 sm:w-10"
                        onClick={() => navigate(`/admin/create-question?type=edit&course_id=${group.course_id}&category=${group.category}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 sm:h-10 sm:w-10"
                        onClick={() => navigate(`/admin/create-question?course_id=${group.course_id}&category=${group.category}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 sm:h-10 sm:w-10"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete all ${group.questionCount} questions in the "${group.category}" category?`)) {
                            deleteQuestionGroup(group.course_id, group.category);
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

export default AdminQuestions; 