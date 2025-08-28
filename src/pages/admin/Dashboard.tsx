import { useEffect, useState } from 'react';
import { 
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen,
  FileText,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  PenTool,
  GraduationCap,
  Star,
  Book,
  Users
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from '@/contexts/LanguageContext';

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

interface Exam {
  id: string;
  title: string;
  course_name: string;
  created_at: string;
  status: string;
  rating: number;
  total_attempts: number;
}

interface Blog {
  id: string;
  title: string;
  course_name: string;
  created_at: string;
  status: string;
  rating: number;
  views: number;
}

interface DashboardStats {
  total_lessons: number;
  total_exams: number;
  total_blogs: number;
  total_courses: number;
  total_students: number;
  total_teachers: number;
}

const TeacherDashboard = () => {
  const [loading, setLoading] = useState(true);
  const { user, token } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [teachers, setTeachers] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [timeRange, setTimeRange] = useState('week');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const usersData = [
    { id: 1, name: 'Jane Cooper', email: 'jane@example.com', date: '2023-05-04', status: 'Active' },
    { id: 2, name: 'Wade Warren', email: 'wade@example.com', date: '2023-05-03', status: 'Active' },
    { id: 3, name: 'Esther Howard', email: 'esther@example.com', date: '2023-05-02', status: 'Inactive' },
    { id: 4, name: 'Cameron Williamson', email: 'cameron@example.com', date: '2023-05-01', status: 'Active' },
    { id: 5, name: 'Brooklyn Simmons', email: 'brooklyn@example.com', date: '2023-04-30', status: 'Pending' },
  ];
  
  const teachersData = [
    { id: 1, name: 'Leslie Alexander', subject: 'Mathematics', date: '2023-05-04', rating: 4.8 },
    { id: 2, name: 'Guy Hawkins', subject: 'Physics', date: '2023-05-03', rating: 4.5 },
    { id: 3, name: 'Robert Fox', subject: 'Chemistry', date: '2023-05-02', rating: 4.9 },
    { id: 4, name: 'Jacob Jones', subject: 'Biology', date: '2023-05-01', rating: 4.7 },
    { id: 5, name: 'Jenny Wilson', subject: 'English', date: '2023-04-30', rating: 4.6 },
  ];

  const transformPerformanceData = (data) => {
    return Object.entries(data).map(([name, value]) => ({
      name,
      value: Number(value)
    }));
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch lessons using the correct endpoint
      const lessonsResponse = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/courses/lessons/teacher`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setLessons(lessonsResponse.data.data);

      // Fetch exams
      const examsResponse = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/exams`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setExams(examsResponse.data.data);

      // Fetch blogs
      const blogsResponse = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/blogs`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setBlogs(blogsResponse.data.data);

      // Fetch teachers
      const teachersResponse = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/teachers`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setTeachers(teachersResponse.data);

      // Fetch performance data based on time range
      const performanceResponse = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/teacher/performance?range=${timeRange}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setPerformanceData(transformPerformanceData(performanceResponse.data));

      // Fetch dashboard stats
      const statsResponse = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/full-details`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setStats(statsResponse.data);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token, timeRange]);

  const StatCard = ({ title, value, change, icon, color, isLoading = false }) => {
    const isPositive = change >= 0;
    
    return (
      <Card className="overflow-hidden">
        <CardHeader className={`flex flex-row items-center justify-between pb-2 space-y-0 ${color}`}>
          <CardTitle className="text-xl font-bold text-white">{title}</CardTitle>
          <div className="p-2 bg-white/20 rounded-full">
            {icon}
          </div>
        </CardHeader>
        <CardContent className={`pt-4 ${color}`}>
          {isLoading ? (
            <Skeleton className="h-10 w-24 bg-white/20" />
          ) : (
            <div className="text-3xl font-bold text-white">{value}</div>
          )}
        </CardContent>
      </Card>
    );
  };

  const DataTable = ({ 
    title, 
    data, 
    columns, 
    viewAllLink = "#", 
    isLoading = false 
  }) => (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle>{title}</CardTitle>
        <Link to={viewAllLink} className="flex items-center text-sm text-purple-700 hover:underline">
          {t.viewAllLink}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No {title.toLowerCase()} found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key}>{column.title}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 5).map((row) => (
                <TableRow key={row.id}>
                  {columns.map((column) => (
                    <TableCell key={`${row.id}-${column.key}`}>
                      {column.render ? column.render(row) : row[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.adminDashboard}</h1>
        <p className="text-muted-foreground">{t.welcome}, {user?.display_name || 'Admin'}! {t.manageYourPlatform}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard 
          title={t.totalLectures} 
          value={stats?.total_lessons || 0} 
          change={8}
          icon={<BookOpen className="h-4 w-4 text-white" />}
          color="bg-gradient-to-r from-purple-500 to-purple-600"
          isLoading={loading}
        />
        <StatCard 
          title={t.totalExams} 
          value={stats?.total_exams || 0} 
          change={12}
          icon={<FileText className="h-4 w-4 text-white" />}
          color="bg-gradient-to-r from-blue-500 to-blue-600"
          isLoading={loading}
        />
        <StatCard 
          title={t.totalBlogs} 
          value={stats?.total_blogs || 0} 
          change={5}
          icon={<PenTool className="h-4 w-4 text-white" />}
          color="bg-gradient-to-r from-amber-500 to-amber-600"
          isLoading={loading}
        />
        <StatCard 
          title={t.totalCourses} 
          value={stats?.total_courses || 0} 
          change={10}
          icon={<Book className="h-4 w-4 text-white" />}
          color="bg-gradient-to-r from-green-500 to-green-600"
          isLoading={loading}
        />
        <StatCard 
          title={t.totalStudents} 
          value={stats?.total_students || 0} 
          change={15}
          icon={<Users className="h-4 w-4 text-white" />}
          color="bg-gradient-to-r from-pink-500 to-pink-600"
          isLoading={loading}
        />
        <StatCard 
          title={t.totalTeachers} 
          value={stats?.total_teachers || 0} 
          change={8}
          icon={<GraduationCap className="h-4 w-4 text-white" />}
          color="bg-gradient-to-r from-indigo-500 to-indigo-600"
          isLoading={loading}
        />
      </div>

      {/* Statistics */}
      <div>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{t.performanceStatistics}</CardTitle>
            <CardDescription>
              {/* <Tabs defaultValue="week" onValueChange={setTimeRange}>
                <TabsList className="grid w-[200px] grid-cols-2">
                  <TabsTrigger value="week">This Week</TabsTrigger>
                  <TabsTrigger value="month">This Month</TabsTrigger>
                </TabsList>
              </Tabs> */}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-6">
                <Skeleton className="h-[200px] w-full" />
              </div>
            ) : (
              <ChartContainer 
                config={{
                  value: { label: "Student Engagement" },
                }}
                className="h-[300px] w-full"
              >
                <AreaChart data={performanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" />
                  <ChartTooltip 
                    content={({active, payload}) => 
                      active && payload?.length ? (
                        <ChartTooltipContent payload={payload} />
                      ) : null
                    }
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    name="value"
                    stroke="#8884d8" 
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <DataTable 
          title={t.recentUsers} 
          data={usersData} 
          viewAllLink="/admin/users"
          isLoading={loading}
          columns={[
            { key: 'name', title: 'Name' },
            { key: 'email', title: 'Email' },
            { key: 'date', title: 'Joined Date' },
            { 
              key: 'status', 
              title: 'Status',
              render: (row) => (
                <span className={`px-2 py-1 text-xs rounded-full ${
                  row.status === 'Active' ? 'bg-green-100 text-green-800' :
                  row.status === 'Inactive' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {row.status}
                </span>
              )
            }
          ]}
        />

        <DataTable 
          title={t.recentTeachers} 
          data={teachers} 
          viewAllLink="/admin/teachers"
          isLoading={loading}
          columns={[
            { key: 'full_name', title: 'Name' },
            { key: 'email', title: 'Email' },
            { 
              key: 'joined_date', 
              title: 'Joined Date',
              render: (row) => new Date(row.joined_date).toLocaleDateString()
            },
            { 
              key: 'total_courses', 
              title: 'Courses',
              render: (row) => (
                <div className="font-medium">{row.total_courses || 0}</div>
              )
            }
          ]}
        />

        <DataTable 
          title={t.yourLessonsRecent} 
          data={lessons} 
          viewAllLink="/admin/lessons"
          isLoading={loading}
          columns={[
            { key: 'title', title: 'Lesson Title' },
            { 
              key: 'course_title', 
              title: 'Course',
              render: (row) => (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  {row.course_title}
                </Badge>
              )
            },
            { key: 'category', title: 'Category' },
            { 
              key: 'created_at', 
              title: 'Date Created',
              render: (row) => new Date(row.created_at).toLocaleDateString()
            }
          ]}
        />

        <DataTable 
          title={t.yourExamsRecent} 
          data={exams} 
          viewAllLink="/admin/exams"
          isLoading={loading}
          columns={[
            { key: 'course_name', title: 'Course Name' },
            { key: 'title', title: 'Title' },
            { 
              key: 'created_at', 
              title: 'Date Created',
              render: (row) => new Date(row.created_at).toLocaleDateString()
            },
            { 
              key: 'total_attempts', 
              title: 'Total Attempts',
              render: (row) => (
                <div className="font-medium">{row.total_attempts || 0}</div>
              )
            }
          ]}
        />

        <DataTable 
          title={t.yourBlogsRecent} 
          data={blogs} 
          viewAllLink="/admin/blogs"
          isLoading={loading}
          columns={[
            { key: 'course_name', title: 'Course Name' },
            { key: 'title', title: 'Title' },
            { 
              key: 'created_at', 
              title: 'Date Created',
              render: (row) => new Date(row.created_at).toLocaleDateString()
            },
            { 
              key: 'views', 
              title: 'Views',
              render: (row) => (
                <div className="font-medium">{row.views || 0}</div>
              )
            }
          ]}
        />
      </div>
    </div>
  );
};

export default TeacherDashboard;
