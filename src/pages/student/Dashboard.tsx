import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, ClipboardList, Activity as ActivityIcon, PlusCircle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import defaultCover from '@/assets/default.jpg';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type TabKey = 'courses' | 'exams' | 'lessons' | 'blogs' | 'activity';

const StudentDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('courses');
  const [courses, setCourses] = useState<Array<{ id: string; title: string; cover_image?: string }>>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [courseToEnroll, setCourseToEnroll] = useState<{ id: string; title: string } | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const coursesFetchedRef = useRef(false);

  // Student stats (moved from Progress page, now with API attempt and fallback)
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [studentStats, setStudentStats] = useState<{ lessons: number; exams: number; blogs: number; others: number }>(
    { lessons: 0, exams: 0, blogs: 0, others: 0 }
  );
  // Unattempted exams list state
  const [unattemptedExams, setUnattemptedExams] = useState<Array<{ id: string; course_title: string | null; category?: string; total_questions?: number; created_at?: string }>>([]);
  const [loadingUnattempted, setLoadingUnattempted] = useState<boolean>(false);
  // Unattended lessons list state
  const [unattendedLessons, setUnattendedLessons] = useState<Array<{ id: string; title: string; course_title: string | null; created_at?: string }>>([]);
  const [loadingUnattendedLessons, setLoadingUnattendedLessons] = useState<boolean>(false);
  // Unread blogs list state (Dashboard: show list directly)
  const [unreadBlogs, setUnreadBlogs] = useState<Array<{ id: string; title: string; course_title: string | null; created_at?: string }>>([]);
  const [loadingUnreadBlogs, setLoadingUnreadBlogs] = useState<boolean>(false);
  // Blogs by selected course
  const [blogCourses, setBlogCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [blogSelectedCourse, setBlogSelectedCourse] = useState<{ id: string; title: string } | null>(null);
  const [courseBlogs, setCourseBlogs] = useState<Array<{ id: string; title: string; created_at?: string; course_title?: string }>>([]);
  const [loadingCourseBlogs, setLoadingCourseBlogs] = useState<boolean>(false);
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [activeBlog, setActiveBlog] = useState<{ id: string; title: string; created_at?: string; content?: string } | null>(null);

  // Fallback image for courses without cover_image

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const rawName = user?.display_name || user?.full_name || 'Student';
  const name = useMemo(() => {
    return rawName
      .split(/\s+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }, [rawName]);

  // Student level (highest across enrolled courses)
  const [studentLevel, setStudentLevel] = useState<'Beginner' | 'Intermediate' | 'Pro' | 'Master' | null>(null);
  useEffect(() => {
    const run = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/level`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const lvl = res?.data?.data?.level ?? res?.data?.level ?? null;
        if (lvl === 'Beginner' || lvl === 'Intermediate' || lvl === 'Pro' || lvl === 'Master') setStudentLevel(lvl);
        else setStudentLevel(null);
      } catch {}
    };
    if (token) run();
  }, [token]);

  // Counts derived from currently displayed course cards
  const enrolledCount = useMemo(() => {
    if (!courses?.length) return 0;
    let count = 0;
    const ids = enrolledIds;
    for (const c of courses) {
      if (ids.has(c.id)) count++;
    }
    return count;
  }, [courses, enrolledIds]);

  const unenrolledCount = useMemo(() => {
    return Math.max((courses?.length || 0) - enrolledCount, 0);
  }, [courses, enrolledCount]);

  // Fetch courses whenever the Courses tab becomes active
  useEffect(() => {
    const fetchCourses = async () => {
      if (activeTab !== 'courses') return;
      // Prevent double-invocation in React StrictMode (dev) and multiple tab toggles
      if (coursesFetchedRef.current) return;
      coursesFetchedRef.current = true;
      setLoadingCourses(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        // normalize minimal shape
        const normalized = list.map((c: any) => ({
          id: c.id ?? String(c.title),
          title: c.title ?? c.name ?? 'Untitled Course',
          cover_image: c.cover_image ?? c.coverImage ?? c.image ?? undefined,
        }));
        normalized.sort((a: any, b: any) => (a.title || '').localeCompare(b.title || ''));
        setCourses(normalized);

        // Also fetch enrolled courses to pre-populate enrolled status
        try {
          const enr = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/recent-enrolled-course`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const enrData = Array.isArray(enr.data?.data) ? enr.data.data : Array.isArray(enr.data) ? enr.data : [];
          const ids = new Set<string>();
          // Build map of current courses for quick existence check
          const existingIds = new Set<string>(normalized.map(n => n.id));
          const merged = [...normalized];
          enrData.forEach((item: any) => {
            const cid = item.enrolled_course || item.course_id || item.courseId;
            const ctitle = item.courseTitle || item.course_title || item.title;
            if (cid) {
              ids.add(cid);
              if (!existingIds.has(cid) && ctitle) {
                merged.push({ id: cid, title: ctitle });
                existingIds.add(cid);
              }
            }
          });
          // Sort merged after possible additions
          merged.sort((a: any, b: any) => (a.title || '').localeCompare(b.title || ''));
          setCourses(merged);
          setEnrolledIds(ids);
        } catch {}
      } catch (e) {
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, [activeTab, token]);

  // When Blogs tab becomes active, fetch unread blogs list directly
  useEffect(() => {
    const loadUnread = async () => {
      if (activeTab !== 'blogs') return;
      setLoadingUnreadBlogs(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/unread-blogs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const items = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
        setUnreadBlogs(items.map((b: any) => ({ id: b.id, title: b.title || 'Blog', course_title: b.course_title ?? null, created_at: b.created_at })));
      } catch (e) {
        setUnreadBlogs([]);
      } finally {
        setLoadingUnreadBlogs(false);
      }
    };
    loadUnread();
  }, [activeTab, token]);

  // Fetch student stats once: exams (unattempted count) + lessons (unattended count)
  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        // Get counts from backend
        let lessons = 0, blogs = 0, others = 0, exams = 0;
        try {
          const res2 = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/unattempted-exams/count`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const d2 = res2?.data?.data || res2?.data;
          exams = Number(d2?.count ?? 0);
        } catch {}
        try {
          const res3 = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/unattended-lessons/count`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const d3 = res3?.data?.data || res3?.data;
          lessons = Number(d3?.count ?? 0);
        } catch {}
        try {
          const res4 = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/unread-blogs/count`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const d4 = res4?.data?.data || res4?.data;
          blogs = Number(d4?.count ?? 0);
        } catch {}
        if (mounted) setStudentStats({ lessons, exams, blogs, others });
      } catch {
        // Fallback minimal
        if (mounted) setStudentStats({ lessons: 0, exams: 0, blogs: 0, others: 0 });
      } finally {
        if (mounted) setStatsLoading(false);
      }
    };
    fetchStats();
    return () => { mounted = false; };
  }, [token]);

  // When Exams tab becomes active, fetch the unattempted exams list
  useEffect(() => {
    const loadUnattempted = async () => {
      if (activeTab !== 'exams') return;
      setLoadingUnattempted(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/unattempted-exams`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const items = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
        setUnattemptedExams(items.map((e: any) => ({
          id: e.id,
          course_title: e.course_title ?? null,
          category: e.category,
          total_questions: e.total_questions,
          created_at: e.created_at || e.createdAt,
        })));
      } catch (e: any) {
        setUnattemptedExams([]);
      } finally {
        setLoadingUnattempted(false);
      }
    };
    loadUnattempted();
  }, [activeTab, token]);

  // When Lessons tab becomes active, fetch unattended lessons list
  useEffect(() => {
    const loadUnattended = async () => {
      if (activeTab !== 'lessons') return;
      setLoadingUnattendedLessons(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/unattended-lessons`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const items = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
        setUnattendedLessons(items.map((l: any) => ({
          id: l.id,
          title: l.title || 'Lesson',
          course_title: l.course_title ?? null,
          created_at: l.created_at,
        })));
      } catch (e: any) {
        setUnattendedLessons([]);
      } finally {
        setLoadingUnattendedLessons(false);
      }
    };
    loadUnattended();
  }, [activeTab, token]);

  // Local StatCard styled similar to admin dashboard cards
  const StatCard = ({ title, value, icon, color, isLoading = false, onClick }:{
    title: string; value: number; icon: React.ReactNode; color: string; isLoading?: boolean; onClick?: () => void;
  }) => {
    return (
      <Card
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : -1}
        onClick={onClick}
        onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
        className={`overflow-hidden h-full min-h-[128px] flex flex-col focus:outline-none ${onClick ? 'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-purple-300' : ''}`}
      >
        <CardHeader className={`px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0 ${color}`}>
          <CardTitle className="text-base sm:text-lg font-bold text-white">{title}</CardTitle>
          <div className="p-2 bg-white/20 rounded-full">
            {icon}
          </div>
        </CardHeader>
        <CardContent className={`p-4 ${color} flex-1 flex items-end`}>
          <div className="text-2xl sm:text-3xl font-bold text-white leading-none">
            {isLoading ? '—' : value}
          </div>
        </CardContent>
      </Card>
    );
  };

  const onClickEnroll = (course: { id: string; title: string }) => {
    setCourseToEnroll(course);
    setConfirmOpen(true);
  };

  const confirmEnroll = async () => {
    if (!courseToEnroll) return;
    setEnrolling(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/students/enroll`,
        {
          courseId: courseToEnroll.id,
          course_id: courseToEnroll.id,
          student_id: user?.id,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const serverMsg = res?.data?.message || `You have been enrolled in ${courseToEnroll.title}.`;
      toast({ title: 'Enrolled', description: serverMsg });
      setConfirmOpen(false);
      setEnrolledIds(prev => new Set(prev).add(courseToEnroll.id));
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Failed to enroll. Please try again.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Greeting header (+ level badge on right) */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-purple-700">
            {greeting}, {name}
          </h1>
          <p className="text-gray-600 mt-1">Welcome to your dashboard. Here you will find your courses, exams, and updates.</p>
        </div>
        {studentLevel && (
          <span className="inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-50 text-purple-700 px-3 py-1 text-xs sm:text-sm">
            Level: {studentLevel}
          </span>
        )}
      </div>

      {/* Student Counters (moved from Progress and restyled like admin cards) */}
      <div className="grid items-stretch gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Enrolled Courses card - first, clickable to open Courses and refresh */}
          <Card
            role="button"
            tabIndex={0}
            onClick={() => { coursesFetchedRef.current = false; setActiveTab('courses'); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); coursesFetchedRef.current = false; setActiveTab('courses'); } }}
            className="overflow-hidden h-full min-h-[128px] flex flex-col focus:outline-none cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-purple-300"
          >
            <CardHeader className={`px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0 bg-gradient-to-r from-purple-500 to-purple-600`}>
              <CardTitle className="text-base sm:text-lg font-bold text-white">Enrolled Courses</CardTitle>
              <div className="p-2 bg-white/20 rounded-full">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent className={`p-4 bg-gradient-to-r from-purple-500 to-purple-600 flex-1 flex items-end`}>
              <div className="w-full flex items-center justify-between">
                <div className="text-2xl sm:text-3xl font-bold text-white">{enrolledCount}</div>
                <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-white/20 text-white/95 border border-white/30">
                  Unenrolled: {unenrolledCount}
                </span>
              </div>
            </CardContent>
          </Card>
        <StatCard 
          title="Lessons"
          value={studentStats.lessons}
          icon={<BookOpen className="h-4 w-4 text-white" />}
          color="bg-gradient-to-r from-indigo-500 to-indigo-600"
          isLoading={statsLoading}
          onClick={() => { setActiveTab('lessons'); }}
        />
        <StatCard 
          title="Exams"
          value={studentStats.exams}
          icon={<ClipboardList className="h-4 w-4 text-white" />}
          color="bg-gradient-to-r from-blue-500 to-blue-600"
          isLoading={statsLoading}
          onClick={() => { setActiveTab('exams'); }}
        />
        <StatCard 
          title="Blogs"
          value={studentStats.blogs}
          icon={<ActivityIcon className="h-4 w-4 text-white" />}
          color="bg-gradient-to-r from-amber-500 to-amber-600"
          isLoading={statsLoading}
          onClick={() => { setActiveTab('blogs'); }}
        />
      </div>

    {/* Enroll confirmation dialog */}
    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Enrollment</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-gray-700">
          Are you sure to enroll in <span className="font-semibold">{courseToEnroll?.title}</span> course?
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            className="px-4 py-1.5 rounded-full border border-red-400 text-red-700 bg-red-50 hover:bg-red-100 hover:border-red-500 transition"
          >
            No
          </button>
          <button
            type="button"
            onClick={confirmEnroll}
            disabled={enrolling}
            className="px-4 py-1.5 rounded-full border border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-600 transition disabled:opacity-60"
          >
            Yes
          </button>
        </div>
      </DialogContent>
    </Dialog>

      {/* Tab buttons removed as requested */}

      {/* Tab content panels */}
      <div className="bg-white rounded-xl shadow p-4">
        {activeTab === 'courses' && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Available Courses</h3>
            {loadingCourses ? (
              <div className="flex items-center justify-center min-h-[160px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading courses...</p>
                </div>
              </div>
            ) : courses.length === 0 ? (
              <p className="text-sm text-gray-500">You are not enrolled in any courses yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {courses.map((c) => (
                  <div
                    key={c.id}
                    className="mx-auto w-full max-w-[420px] flex flex-col gap-2 rounded-xl border border-gray-200 hover:border-blue-400 transition hover:bg-blue-50 px-4 py-2"
                  >
                    {/* Left column: title + action, Right column: image */}
                    <div className="grid grid-cols-[1fr_auto] items-start gap-3">
                      <div className="min-w-0 flex flex-col">
                        <div className="truncate pr-1 text-sm sm:text-base font-medium text-gray-800">{c.title}</div>
                        <div className="mt-1">
                          {enrolledIds.has(c.id) ? (
                            <button
                              type="button"
                              disabled
                              className="flex items-center gap-1 text-xs sm:text-sm px-3 py-1 rounded-full border border-green-500 text-green-700 bg-green-50"
                              title={`Enrolled in ${c.title}`}
                            >
                              <CheckCircle2 size={16} /> Enrolled
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onClickEnroll(c)}
                              className="flex items-center gap-1 text-xs sm:text-sm px-3 py-1 rounded-full border border-blue-400 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:border-blue-500 transition"
                              title={`Enroll in ${c.title}`}
                            >
                              <PlusCircle size={16} /> Enroll
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 justify-self-end self-start">
                        <img
                          src={c.cover_image || (defaultCover as string)}
                          alt={`${c.title} cover`}
                          className="h-16 w-24 object-cover rounded-md border border-gray-200 shadow-sm"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === 'lessons' && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Unattended Lessons</h3>
            {loadingUnattendedLessons ? (
              <div className="flex items-center justify-center min-h-[160px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading unattended lessons...</p>
                </div>
              </div>
            ) : unattendedLessons.length === 0 ? (
              <div className="text-sm text-gray-500">Great work! You have no unattended lessons.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {unattendedLessons.map((l) => {
                  const createdAt = l.created_at ? new Date(l.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
                  return (
                    <div key={l.id} className="rounded-xl border border-gray-200 p-3 bg-white hover:bg-indigo-50 hover:border-indigo-300 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-800 truncate">{l.title}</div>
                          {l.course_title && (
                            <div className="text-xs text-gray-500 mt-0.5 truncate">Course: {l.course_title}</div>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs">
                            {createdAt && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 text-gray-700 px-2 py-0.5">
                                Created: {createdAt}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 text-rose-700 px-2 py-0.5">
                              Not Attended
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <div className="h-12 w-12 rounded-md bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-indigo-500" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {activeTab === 'exams' && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Unattempted Exams</h3>
            {loadingUnattempted ? (
              <div className="flex items-center justify-center min-h-[160px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading unattempted exams...</p>
                </div>
              </div>
            ) : unattemptedExams.length === 0 ? (
              <div className="text-sm text-gray-500">Great work! You have no unattempted exams.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {unattemptedExams.map((ex) => {
                  const createdAt = ex.created_at ? new Date(ex.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
                  return (
                    <div key={ex.id} className="rounded-xl border border-gray-200 p-3 bg-white hover:bg-purple-50 hover:border-purple-300 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-800 truncate">{ex.category || 'Exam'}</div>
                          {ex.course_title && (
                            <div className="text-xs text-gray-500 mt-0.5 truncate">Course: {ex.course_title}</div>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs">
                            {createdAt && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 text-gray-700 px-2 py-0.5">
                                Created: {createdAt}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 text-rose-700 px-2 py-0.5">
                              Not Attempted
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <div className="h-12 w-12 rounded-md bg-purple-50 border border-purple-200 flex items-center justify-center">
                            <ClipboardList className="h-5 w-5 text-purple-500" />
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">Questions: <span className="font-medium text-gray-800">{ex.total_questions ?? 0}</span></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {activeTab === 'activity' && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Recent Activity</h3>
            <p className="text-sm text-gray-500">No recent activity.</p>
          </div>
        )}
        {activeTab === 'blogs' && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Unread Blogs</h3>
            {loadingUnreadBlogs ? (
              <div className="flex items-center justify-center min-h-[160px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading unread blogs...</p>
                </div>
              </div>
            ) : unreadBlogs.length === 0 ? (
              <div className="text-sm text-gray-500">Great work! You have no unread blogs.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {unreadBlogs.map((b) => {
                  const createdAt = b.created_at ? new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
                  return (
                    <div key={b.id} className="rounded-xl border border-gray-200 p-3 bg-white hover:bg-amber-50 hover:border-amber-300 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-800 truncate">{b.title}</div>
                          {b.course_title && (
                            <div className="text-xs text-gray-500 mt-0.5 truncate">Course: {b.course_title}</div>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs">
                            {createdAt && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 text-gray-700 px-2 py-0.5">
                                Created: {createdAt}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 text-rose-700 px-2 py-0.5">
                              Not Read
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <div className="h-12 w-12 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center">
                            <ActivityIcon className="h-5 w-5 text-amber-600" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
