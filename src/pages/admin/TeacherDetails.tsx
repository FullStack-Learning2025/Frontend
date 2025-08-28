import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Mail, Phone, Calendar, School, Star, Eye, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

interface Lesson {
  id: string;
  title: string;
  description: string;
  course_id?: string;
  course_title: string;
  category: string;
  date_created: string;
}

interface Exam {
  id: string;
  course_name: string;
  title: string;
  category: string;
  date_created: string;
  status: "published" | "draft";
  course_id: string;
}

interface Blog {
  id: string;
  course_name: string;
  title: string;
  date_created: string;
  status: string;
}

interface Teacher {
  id: string;
  full_name: string;
  email: string;
  contact_number: string;
  joined_date: string;
  profile_image?: string;
  status: "active" | "inactive";
  statistics: {
    total_lessons: number;
    total_exams: number;
    total_blogs: number;
  };
  lessons: Lesson[];
  exams: Exam[];
  blogs: Blog[];
}

const TeacherDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("lessons");
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();
  const { toast } = useToast();

  const fetchTeacherDetails = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/teacher/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setTeacher(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch teacher details. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherDetails();
  }, [id, token]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading teacher details...</p>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Teacher not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/admin/teachers")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Teachers
        </Button>
        <h1 className="text-2xl font-bold">Teacher Details</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Teacher Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center text-center mb-6">
              <Avatar className="h-24 w-24 mb-4">
                {teacher.profile_image ? (
                  <AvatarImage src={teacher.profile_image} />
                ) : (
                  <AvatarFallback>{teacher.full_name.charAt(0)}</AvatarFallback>
                )}
              </Avatar>
              <h2 className="text-xl font-bold">{teacher.full_name}</h2>
              <Badge className="mt-2" variant={teacher.status === "active" ? "default" : "destructive"}>
                {teacher.status === "active" ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p>{teacher.email}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p>{teacher.contact_number}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Joined Date</p>
                  <p>{formatDate(teacher.joined_date)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-center text-2xl">{teacher.statistics.total_lessons}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-center text-muted-foreground">Lessons Created</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-center text-2xl">{teacher.statistics.total_exams}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-center text-muted-foreground">Exams Created</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-center text-2xl">{teacher.statistics.total_blogs}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-center text-muted-foreground">Blogs Published</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for different sections */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="lessons">Lessons</TabsTrigger>
              <TabsTrigger value="exams">Exams</TabsTrigger>
              <TabsTrigger value="blogs">Blogs</TabsTrigger>
            </TabsList>
            
            <TabsContent value="lessons" className="pt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Created Lessons</CardTitle>
                  <CardDescription>All lessons created by this teacher</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lesson Title</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teacher.lessons.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No lessons found
                          </TableCell>
                        </TableRow>
                      ) : (
                        teacher.lessons.map((lesson) => (
                          <TableRow key={lesson.id}>
                            <TableCell className="font-medium">{lesson.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs px-2 py-0.5">
                                {lesson.course_title}
                              </Badge>
                            </TableCell>
                            <TableCell>{lesson.category}</TableCell>
                            <TableCell>{formatDate(lesson.date_created)}</TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => navigate(`/admin/create-lesson?type=edit&id=${lesson.id}&category=${lesson.category}&course_id=${lesson.course_id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="exams" className="pt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Created Exams</CardTitle>
                  <CardDescription>All exams created by this teacher</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Course</TableHead>
                        <TableHead className="text-xs sm:text-sm">Title</TableHead>
                        <TableHead className="text-xs sm:text-sm">Category</TableHead>
                        <TableHead className="text-xs sm:text-sm">Date Created</TableHead>
                        <TableHead className="text-xs sm:text-sm">Status</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teacher.exams.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No exams found
                          </TableCell>
                        </TableRow>
                      ) : (
                        teacher.exams.map((exam) => (
                          <TableRow key={exam.id}>
                            <TableCell className="text-xs sm:text-sm">
                              <Badge variant="outline" className="text-xs px-2 py-0.5">
                                {exam.course_name}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-xs sm:text-sm">{exam.title}</TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                {exam.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">{formatDate(exam.date_created)}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={exam.status === "published" ? "default" : "outline"}
                                className="text-xs sm:text-sm"
                              >
                                {exam.status === "published" ? "Published" : "Draft"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => navigate(`/admin/create-exam?type=edit&id=${exam.id}&category=${exam.category}&course_id=${exam.course_id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="blogs" className="pt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Published Blogs</CardTitle>
                  <CardDescription>All blogs published by this teacher</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Blog Title</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teacher.blogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No blogs found
                          </TableCell>
                        </TableRow>
                      ) : (
                        teacher.blogs.map((blog) => (
                          <TableRow key={blog.id}>
                            <TableCell className="font-medium">{blog.title}</TableCell>
                            <TableCell>{blog.course_name}</TableCell>
                            <TableCell>{formatDate(blog.date_created)}</TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => navigate(`/admin/create-blog?type=edit&id=${blog.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default TeacherDetails;
