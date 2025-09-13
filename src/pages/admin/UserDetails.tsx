import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Mail, Phone, Calendar, MapPin, Video } from "lucide-react";
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
  // Exam attempts modal state
  const [showExamAttempts, setShowExamAttempts] = useState(false);
  const [examAttempts, setExamAttempts] = useState<Array<{ id: string; submitted_at: string; obtainedScore: number; totalScore: number; percentage: number; hasMedia?: boolean }>>([]);
  const [examAttemptsTitle, setExamAttemptsTitle] = useState<string>('Exam Attempts');
  const [examComplexity, setExamComplexity] = useState<'easy' | 'medium' | 'hard' | string | null>(null);
  // Attempt detail state
  const [showAttemptDetail, setShowAttemptDetail] = useState(false);
  const [attemptLoading, setAttemptLoading] = useState(false);
  const [attemptDetail, setAttemptDetail] = useState<any>(null);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  // Map of examId -> { avgPct, bestPct }
  const [examStats, setExamStats] = useState<Record<string, { avgPct: number; bestPct: number }>>({});
  // Enrolled courses (admin fetch by userId)
  const [enrolledCourses, setEnrolledCourses] = useState<Array<{ id: string; title: string; description?: string; lesson_count?: number; categories?: string[]; category?: any; joined_date?: string | null }>>([]);

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

  // Fetch enrolled courses for this user (admin view)
  useEffect(() => {
    const run = async () => {
      if (!userId || !token) return;
      try {
        const url = `${import.meta.env.VITE_BACKEND_URL}/api/admin/student/${userId}/courses`;
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        const raw = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        // Normalize recent-enrolled-course items to { id, title }
        const list = raw.map((d: any) => {
          // Prefer categories from API, else parse category
          let categories: string[] | undefined = Array.isArray(d.categories) ? d.categories.map(String) : undefined;
          let categoryValue: any = d.category;
          if (typeof categoryValue === 'string') {
            const trimmed = categoryValue.trim();
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
              try { categoryValue = JSON.parse(trimmed); } catch { /* leave as string */ }
            }
          }
          if (!categories) {
            if (Array.isArray(categoryValue)) categories = categoryValue.map(String);
            else if (typeof categoryValue === 'string' && categoryValue) categories = [categoryValue];
            else categories = [];
          }
          return {
            id: d.courseId || d.id,
            title: d.courseTitle || d.title || 'Untitled Course',
            lesson_count: d.lesson_count,
            categories,
            category: categoryValue, // keep for compatibility in UI rendering
            joined_date: d.joined_date || undefined,
          };
        });
        setEnrolledCourses(list);
      } catch (error: any) {
        toast({ title: 'Error', description: error?.response?.data?.error || 'Failed to fetch enrolled courses for this user.', variant: 'destructive' });
        setEnrolledCourses([]);
      }
    };
    run();
  }, [userId, token]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  // Short month, two-digit day, full year e.g. Feb 12, 2025
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

  // Build a unique list of completed exams by (exam.id + category) keeping latest attempt
  const uniqueCompletedExams = useMemo(() => {
    const raw = student?.completed_exams ?? [];
    type Row = typeof raw[number] & { catKey?: string; catLabel?: string };
    const expanded: Row[] = [];
    for (const it of raw) {
      const cat = (it as any)?.category;
      if (Array.isArray(cat) && cat.length) {
        for (const c of cat) {
          expanded.push({ ...(it as any), catKey: String(c), catLabel: String(c) });
        }
      } else if (typeof cat === 'string' && cat.trim()) {
        expanded.push({ ...(it as any), catKey: cat.trim(), catLabel: cat.trim() });
      } else {
        expanded.push({ ...(it as any), catKey: 'uncategorized', catLabel: 'Uncategorized' });
      }
    }
    const byKey = new Map<string, Row>();
    for (const item of expanded) {
      const key = `${String(item.id)}::${item.catKey || 'uncategorized'}`;
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, item);
      } else {
        const prevDate = new Date(prev.submitted_at).getTime();
        const curDate = new Date(item.submitted_at).getTime();
        if (curDate > prevDate) byKey.set(key, item);
      }
    }
    return Array.from(byKey.values());
  }, [student?.completed_exams]);

  // Fetch attempts for each unique exam to compute average and best
  useEffect(() => {
    const run = async () => {
      if (!userId || !token) return;
      if (!uniqueCompletedExams || uniqueCompletedExams.length === 0) return;
      try {
        const entries = await Promise.all(
          uniqueCompletedExams.map(async (ex) => {
            try {
              const url = `${import.meta.env.VITE_BACKEND_URL}/api/admin/student/${userId}/exam/${ex.id}/attempts`;
              const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
              const attempts: Array<{ percentage: number }> = Array.isArray(res?.data?.data?.attempts)
                ? res.data.data.attempts
                : Array.isArray(res?.data?.attempts)
                ? res.data.attempts
                : [];
              if (attempts.length === 0) return [String(ex.id), { avgPct: 0, bestPct: 0 }] as const;
              const nums = attempts.map((a) => Number(a.percentage) || 0);
              const sum = nums.reduce((acc, n) => acc + n, 0);
              const avg = Math.round((sum / nums.length) * 100) / 100; // 2 decimals
              const best = Math.max(...nums);
              return [String(ex.id), { avgPct: avg, bestPct: best }] as const;
            } catch {
              return [String(ex.id), { avgPct: 0, bestPct: 0 }] as const;
            }
          })
        );
        setExamStats(Object.fromEntries(entries));
      } catch {
        // ignore per-exam failures to avoid blocking UI
      }
    };
    run();
  }, [uniqueCompletedExams, userId, token]);

  const openExamAttempts = async (examId: string) => {
    if (!userId) return;
    setAttemptsLoading(true);
    setExamAttempts([]);
    setShowExamAttempts(true);
    try {
      const url = `${import.meta.env.VITE_BACKEND_URL}/api/admin/student/${userId}/exam/${examId}/attempts`;
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = res?.data?.data ?? res?.data ?? {};
      const title = data.examTitle || 'Exam';
      const attempts = Array.isArray(data.attempts) ? data.attempts : [];
      // Load exam complexity for badge
      try {
        const meta = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/exams/${examId}`, { headers: { Authorization: `Bearer ${token}` } });
        const cx = meta?.data?.data?.complexity ?? meta?.data?.complexity ?? null;
        setExamComplexity(cx);
      } catch {}
      setExamAttemptsTitle(`${title} – Attempts`);
      setExamAttempts(attempts);
    } catch (error: any) {
      toast({ title: 'Error', description: error?.response?.data?.error || 'Failed to load exam attempts.', variant: 'destructive' });
    } finally {
      setAttemptsLoading(false);
    }
  };

  const viewAttemptDetail = async (submissionId: string) => {
    if (!submissionId) return;
    try {
      setAttemptLoading(true);
      setAttemptDetail(null);
      setShowAttemptDetail(true);
      const url = `${import.meta.env.VITE_BACKEND_URL}/api/exams/submissions/${submissionId}`;
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      const detail = res?.data?.data ?? res?.data ?? null;
      setAttemptDetail(detail);
    } catch (error: any) {
      toast({ title: 'Error', description: error?.response?.data?.message || 'Failed to load submission detail.', variant: 'destructive' });
    } finally {
      setAttemptLoading(false);
    }
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
                      {enrolledCourses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No enrolled courses
                          </TableCell>
                        </TableRow>
                      ) : (
                        enrolledCourses.map((course, idx) => (
                          <TableRow key={`${course.id}-${course.joined_date || idx}`}>
                            <TableCell className="font-medium">{course.title}</TableCell>
                            <TableCell>{course.lesson_count ?? 0}</TableCell>
                            <TableCell>
                              {(() => {
                                // Prefer normalized categories
                                if (Array.isArray(course.categories)) return course.categories.join(', ');
                                // Fallbacks to parse category
                                const cat = course.category;
                                if (Array.isArray(cat)) return cat.map(String).join(', ');
                                if (typeof cat === 'string') {
                                  const s = cat.trim();
                                  // Try JSON array
                                  try {
                                    if (s.startsWith('[') && s.endsWith(']')) {
                                      const arr = JSON.parse(s);
                                      if (Array.isArray(arr)) return arr.map(String).join(', ');
                                    }
                                  } catch {}
                                  // Comma-separated fallback
                                  return s
                                    .split(',')
                                    .map((c) => c.replace(/^[\[\s\"]+|[\]\s\"]+$/g, '').trim())
                                    .filter(Boolean)
                                    .join(', ');
                                }
                                return '-';
                              })()}
                            </TableCell>
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
                        <TableHead>Category</TableHead>
                        <TableHead>Average</TableHead>
                        <TableHead>Highest</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uniqueCompletedExams.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            No completed exams
                          </TableCell>
                        </TableRow>
                      ) : (
                        uniqueCompletedExams.map((exam) => (
                          <TableRow key={`${exam.id}-${(exam as any).catKey || 'uncategorized'}-${exam.submitted_at}`} className="cursor-pointer hover:bg-purple-50" onClick={() => openExamAttempts(exam.id)}>
                            <TableCell className="font-medium">{exam.title}</TableCell>
                            <TableCell>
                              <Badge variant={exam.obtainedScore / exam.totalScore >= 0.8 ? "default" : "outline"}>
                                {exam.obtainedScore}/{exam.totalScore}
                              </Badge>
                            </TableCell>
                            <TableCell>{(exam as any).catLabel || 'Uncategorized'}</TableCell>
                            <TableCell>
                              {examStats[String(exam.id)] ? `${examStats[String(exam.id)].avgPct}%` : '—'}
                            </TableCell>
                            <TableCell>
                              {examStats[String(exam.id)] ? `${examStats[String(exam.id)].bestPct}%` : '—'}
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

      {/* Exam Attempts Modal */}
      <Dialog open={showExamAttempts} onOpenChange={setShowExamAttempts}>
        <DialogContent className="sm:max-w-xl px-4 sm:px-6 py-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span>{examAttemptsTitle}</span>
              {examComplexity && (
                <Badge variant="outline" className={
                  examComplexity === 'easy' ? 'border-emerald-300 text-emerald-700' :
                  examComplexity === 'medium' ? 'border-amber-300 text-amber-700' :
                  examComplexity === 'hard' ? 'border-rose-300 text-rose-700' : 'border-gray-300 text-gray-700'
                }>
                  {String(examComplexity).charAt(0).toUpperCase() + String(examComplexity).slice(1)}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>All attempts by this user for the selected exam</DialogDescription>
          </DialogHeader>
          <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 min-h-[120px]">
            {attemptsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Attempt Date & Time</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Score</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Percentage</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Media</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {examAttempts.length === 0 ? (
                    <tr>
                      <td className="px-4 py-3 text-gray-500" colSpan={4}>No attempts found.</td>
                    </tr>
                  ) : (
                    examAttempts.map((a) => (
                      <tr key={a.id} className="hover:bg-purple-50 cursor-pointer" onClick={() => viewAttemptDetail(a.id)}>
                        <td className="px-4 py-2 text-gray-800">{fmtDate(a.submitted_at)}</td>
                        <td className="px-4 py-2 text-gray-800">{a.obtainedScore}/{a.totalScore}</td>
                        <td className="px-4 py-2 text-gray-800">{a.percentage}%</td>
                        <td className="px-4 py-2 text-gray-800">
                          {a.hasMedia ? (
                            <span className="inline-flex items-center gap-1 text-purple-700">
                              <Video className="h-4 w-4" />
                              <span className="text-xs">Video</span>
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowExamAttempts(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attempt Detail Modal */}
      <Dialog open={showAttemptDetail} onOpenChange={setShowAttemptDetail}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto px-4 sm:px-6 py-4">
          <DialogHeader>
            <DialogTitle>
              {attemptDetail?.examTitle ? `${attemptDetail.examTitle} – Attempt Detail` : 'Attempt Detail'}
            </DialogTitle>
            <DialogDescription>
              {attemptDetail ? (
                <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                  <span>Date: {fmtDate(attemptDetail.submitted_at)}</span>
                  <span>Score: {attemptDetail.obtainedScore}/{attemptDetail.totalScore} ({Math.round((attemptDetail.obtainedScore / (attemptDetail.totalScore || 1)) * 100)}%)</span>
                </div>
              ) : 'Loading attempt details...'}
            </DialogDescription>
          </DialogHeader>
          {attemptLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : attemptDetail ? (
            <div className="space-y-3 max-h-[70vh] overflow-auto pr-2 pb-4">
              {(attemptDetail.results || []).map((r: any, idx: number) => {
                const isCorrect = !!r.isCorrect;
                const mediaUrl = attemptDetail.media && r.questionId && attemptDetail.media[r.questionId]?.url;
                return (
                  <Card key={`${r.questionId || idx}-${idx}`} className={`border ${isCorrect ? 'border-emerald-300' : 'border-rose-300'}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-gray-900">Q{idx + 1}. {r.question}</div>
                          <div className="text-xs text-gray-700">Selected: <span className="font-medium">{r.selected ?? '-'}</span> | Correct: <span className="font-medium">{r.correct ?? '-'}</span></div>
                        </div>
                        <Badge variant={isCorrect ? 'default' : 'outline'} className={isCorrect ? '' : 'border-rose-300 text-rose-700'}>
                          {isCorrect ? 'Correct' : 'Wrong'}
                        </Badge>
                      </div>
                      {mediaUrl && (
                        <div className="mt-3">
                          <div className="text-xs text-gray-600 mb-1">Recorded answer:</div>
                          <video controls src={mediaUrl} className="w-full rounded-md border border-gray-200 bg-black" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-600">No details available.</div>
          )}
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowAttemptDetail(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserDetails;
