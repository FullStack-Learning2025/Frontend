import { useState, useEffect, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";

interface Exam {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  category?: string | string[];
  status: "published" | "draft";
  user_id: string;
  rating?: number;
  attempted?: number;
  submissions?: number;
  created_at: string;
  updated_at: string;
  course_name: string;
  total_questions?: number;
}

const Exams = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSizeOptions = [25, 50, 100];
  const [itemsPerPage, setItemsPerPage] = useState(pageSizeOptions[0]);

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

  const getCategoriesArray = (category: Exam["category"]): string[] => {
    if (Array.isArray(category)) {
      return category;
    }
    if (typeof category === "string" && category.trim().length > 0) {
      return [category.trim()];
    }
    return [];
  };

  const categoryOptions = useMemo(() => {
    const categoriesSet = new Set<string>();
    exams.forEach((exam) => {
      const categories = getCategoriesArray(exam.category);
      categories
        .map((cat) => cat.trim())
        .filter((cat) => cat.length > 0)
        .forEach((cat) => categoriesSet.add(cat));
    });
    return Array.from(categoriesSet).sort((a, b) => a.localeCompare(b));
  }, [exams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, itemsPerPage]);

  const filteredExams = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return exams.filter((exam) => {
      const categories = getCategoriesArray(exam.category);

      const matchesSearch =
        exam.title.toLowerCase().includes(term) ||
        exam.course_name.toLowerCase().includes(term) ||
        categories.join(" ").toLowerCase().includes(term);

      if (!matchesSearch) {
        return false;
      }

      if (selectedCategory === "all") {
        return true;
      }

      if (selectedCategory === "none") {
        return categories.length === 0;
      }

      return categories.includes(selectedCategory);
    });
  }, [exams, searchTerm, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredExams.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedExams = filteredExams.slice(startIndex, startIndex + itemsPerPage);

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
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start sm:gap-4">
          <div className="relative w-full sm:w-72 md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search exams, courses, or categories..."
              className="h-10 w-full pl-10 text-sm sm:text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-60 md:w-64">
            <Select
              value={selectedCategory}
              onValueChange={(value) => setSelectedCategory(value)}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="none">No category</SelectItem>
                {categoryOptions.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <div className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
              <span>Rows per page</span>
              <Select
                value={String(itemsPerPage)}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Pagination className="mx-0 w-auto justify-start">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      setCurrentPage((prev) => Math.max(prev - 1, 1));
                    }}
                    className="pointer-events-auto"
                    aria-disabled={safeCurrentPage <= 1}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-3 py-2 text-sm text-gray-700">
                    Page {safeCurrentPage} of {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                    }}
                    className="pointer-events-auto"
                    aria-disabled={safeCurrentPage >= totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
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
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-900 bg-gray-50 whitespace-nowrap text-center">Questions</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm font-medium text-gray-900 bg-gray-50 whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedExams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No exams created yet. Click "Add Exam" to create your first exam.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedExams.map((exam) => {
                    const examCategories = getCategoriesArray(exam.category);
                    return (
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
                          {examCategories.length > 0 ? examCategories.join(", ") : "No Category"}
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
                      <TableCell className="text-center text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                        {typeof exam.total_questions === 'number' ? exam.total_questions : 0}
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
                  );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <p className="text-sm text-gray-600">
            Showing {paginatedExams.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + paginatedExams.length, filteredExams.length)} of {filteredExams.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Exams;
