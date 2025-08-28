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
  PenTool
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

const TeacherDashboard = () => {
  const [loading, setLoading] = useState(true);
  const { user, token } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [timeRange, setTimeRange] = useState('week');

  const transformPerformanceData = (data) => {
    return Object.entries(data).map(([name, value]) => ({
      name,
      value: Number(value)
    }));
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch lessons
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

      const performanceResponse = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/teacher/performance?range=${timeRange}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setPerformanceData(transformPerformanceData(performanceResponse.data));

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
          {t.viewAll}
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
        <h1 className="text-2xl font-bold tracking-tight">{t.teacherDashboard}</h1>
        <p className="text-muted-foreground">{t.welcome}, {user?.display_name || 'Teacher'}! {t.manageYourLessons}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard 
          title={t.lessons} 
          value={lessons.length} 
          change={8}
          icon={<BookOpen className="h-4 w-4 text-white" />}
          color="bg-gradient-to-r from-purple-500 to-purple-600"
          isLoading={loading}
        />
        <StatCard 
          title={t.exams} 
          value={exams.length} 
          change={12}
          icon={<FileText className="h-4 w-4 text-white" />}
          color="bg-gradient-to-r from-blue-500 to-blue-600"
          isLoading={loading}
        />
        <StatCard 
          title={t.blogs} 
          value={blogs.length} 
          change={5}
          icon={<PenTool className="h-4 w-4 text-white" />}
          color="bg-gradient-to-r from-amber-500 to-amber-600"
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
          title={t.lessons} 
          data={lessons} 
          viewAllLink="/teacher/lessons"
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
          title={t.exams} 
          data={exams} 
          viewAllLink="/teacher/exams"
          isLoading={loading}
          columns={[
            { key: 'course_name', title: 'Course Name' },
            { key: 'title', title: 'Title' },
            { 
              key: 'created_at', 
              title: 'Date Created',
              render: (row) => new Date(row.created_at).toLocaleDateString()
            }
          ]}
        />

        <DataTable 
          title={t.blogs} 
          data={blogs} 
          viewAllLink="/teacher/blogs"
          isLoading={loading}
          columns={[
            { key: 'course_name', title: 'Course Name' },
            { key: 'title', title: 'Title' },
            { 
              key: 'created_at', 
              title: 'Date Created',
              render: (row) => new Date(row.created_at).toLocaleDateString()
            }
          ]}
        />
      </div>
    </div>
  );
};

export default TeacherDashboard;
