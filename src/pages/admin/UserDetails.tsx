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
import { ArrowLeft, Mail, Phone, Calendar, MapPin } from "lucide-react";
import UserPerformanceChart from "@/components/admin/UserPerformanceChart";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import defaultAvatar from "@/assets/default.jpg";

interface Student {
  id: string;
  full_name: string;
  display_name: string;
  email: string;
  contact_number: string;
  profile_image: string | null;
  created_at: string;
  updated_at: string;
  role: string;
  weekly_progress: { date: string; activity_count: number }[];
  enrolled_courses: {
    id: string;
    title: string;
    description: string;
    lesson_count: number;
    status: string;
    rating: number;
    category: string;
  }[];
  completed_exams: {
    id: string;
    title: string;
    description: string;
    submitted_at: string;
    obtainedScore: number;
    totalScore: number;
  }[];
}

const UserDetails = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("courses");
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  console.log('UserDetails component rendered with userId:', userId);

  useEffect(() => {
    const fetchStudent = async () => {
      console.log('Fetching student with userId:', userId, 'token:', token ? 'exists' : 'missing');
      setIsLoading(true);
      try {
        const url = `${import.meta.env.VITE_BACKEND_URL}/api/admin/student/${userId}`;
        console.log('Making request to:', url);
        const response = await axios.get(
          url,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        console.log('Response received:', response.data);
        setStudent(response.data);
      } catch (error: any) {
        console.error('Error fetching student:', error);
        console.error('Error response:', error?.response);
        toast({
          title: "Error",
          description: error?.response?.data?.error || "Failed to fetch user details.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    if (userId && token) {
      console.log('Starting fetchStudent with userId:', userId);
      fetchStudent();
    } else {
      console.log('Not fetching student - userId:', userId, 'token exists:', !!token);
    }
  }, [userId, token]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/admin/users")}> 
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Users
        </Button>
        <h1 className="text-2xl font-bold">User Details</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center text-center mb-6">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage
                  src={student.profile_image || defaultAvatar}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = defaultAvatar;
                  }}
                />
                <AvatarFallback>{student.full_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">{student.full_name}</h2>
              <Badge className="mt-2" variant="default">
                {student.role.charAt(0).toUpperCase() + student.role.slice(1)}
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p>{student.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p>{student.contact_number}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Joined Date</p>
                  <p>{formatDate(student.created_at)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="md:col-span-2 space-y-6">
          {/* Weekly Progress Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Weekly Performance</CardTitle>
              <CardDescription>User's activity and performance metrics for the last week</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <UserPerformanceChart data={student.weekly_progress} />
            </CardContent>
          </Card>

          {/* Tabs for different sections */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="courses">Enrolled Courses</TabsTrigger>
              <TabsTrigger value="exams">Completed Exams</TabsTrigger>
            </TabsList>
            <TabsContent value="courses" className="pt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Enrolled Courses</CardTitle>
                  <CardDescription>All courses this user has enrolled in</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course Title</TableHead>
                        <TableHead>Lessons</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {student.enrolled_courses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No enrolled courses
                          </TableCell>
                        </TableRow>
                      ) : (
                        student.enrolled_courses.map((course) => (
                          <TableRow key={course.id}>
                            <TableCell className="font-medium">{course.title}</TableCell>
                            <TableCell>{course.lesson_count}</TableCell>
                            <TableCell>{Array.isArray(course.category) ? course.category.join(", ") : course.category}</TableCell>
                            <TableCell></TableCell>
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
                  <CardTitle>Completed Exams</CardTitle>
                  <CardDescription>Results from all exams taken by this user</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exam Title</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {student.completed_exams.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            No completed exams
                          </TableCell>
                        </TableRow>
                      ) : (
                        student.completed_exams.map((exam) => (
                          <TableRow key={exam.id}>
                            <TableCell className="font-medium">{exam.title}</TableCell>
                            <TableCell>
                              <Badge variant={exam.obtainedScore / exam.totalScore >= 0.8 ? "default" : "outline"}>
                                {exam.obtainedScore}/{exam.totalScore}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(exam.submitted_at)}</TableCell>
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

export default UserDetails;
