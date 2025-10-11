import React, { useEffect, useMemo, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Target } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';

const CircleProgress: React.FC<{ value: number; size?: number; stroke?: number; color?: string; }> = ({ value, size = 140, stroke = 10, color = '#10b981' }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="block">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#E5E7EB"
        strokeWidth={stroke}
        fill="transparent"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={stroke}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-gray-800 font-semibold" fontSize={20}>
        {value}%
      </text>
    </svg>
  );
};

const StudentProgress: React.FC = () => {
  const { token } = useAuth();

  // Course selection
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  // Overall totals
  const [totalLessons, setTotalLessons] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(0);
  const [totalExams, setTotalExams] = useState(0);
  const [attemptedExams, setAttemptedExams] = useState(0);
  const [totalBlogs, setTotalBlogs] = useState(0);
  const [readBlogs, setReadBlogs] = useState(0);

  // Loading
  const [loading, setLoading] = useState(true);

  // Today progress (percent 0-100)
  const [todayLessonsPct, setTodayLessonsPct] = useState(0);
  const [todayExamsPct, setTodayExamsPct] = useState(0);
  const [todayBlogsPct, setTodayBlogsPct] = useState(0);
  const [todayLessonsDone, setTodayLessonsDone] = useState(0);
  const [todayLessonsTotal, setTodayLessonsTotal] = useState(0);
  const [todayExamsDone, setTodayExamsDone] = useState(0);
  const [todayExamsTotal, setTodayExamsTotal] = useState(0);
  const [todayBlogsDone, setTodayBlogsDone] = useState(0);
  const [todayBlogsTotal, setTodayBlogsTotal] = useState(0);

  const todayProgress = useMemo(() => {
    const parts = [todayLessonsPct, todayExamsPct, todayBlogsPct];
    const active = parts.filter(p => !Number.isNaN(p));
    if (active.length === 0) return 0;
    return Math.round(active.reduce((a, b) => a + b, 0) / active.length);
  }, [todayLessonsPct, todayExamsPct, todayBlogsPct]);

  const lessonsPct = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const examsPct = totalExams ? Math.round((attemptedExams / totalExams) * 100) : 0;
  const blogsPct = totalBlogs ? Math.round((readBlogs / totalBlogs) * 100) : 0;
  const overall = useMemo(() => {
    const parts = [lessonsPct, examsPct, blogsPct];
    const active = parts.filter(p => !Number.isNaN(p));
    if (active.length === 0) return 0;
    return Math.round(active.reduce((a, b) => a + b, 0) / active.length);
  }, [lessonsPct, examsPct, blogsPct]);

  // Responsive circle size
  const [circleSize, setCircleSize] = useState(140);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  // Today's exams across all courses
  const [todayExams, setTodayExams] = useState<Array<any>>([]);
  // Course exams overall list (paginated) and attempts modal
  const [overallExams, setOverallExams] = useState<Array<any>>([]);
  const [overallExamsTotal, setOverallExamsTotal] = useState(0);
  const [overallExamsPage, setOverallExamsPage] = useState(1);
  const [overallExamsPageSize] = useState(10);
  const [overallExamsHasPrev, setOverallExamsHasPrev] = useState(false);
  const [overallExamsHasNext, setOverallExamsHasNext] = useState(false);
  const [overallExamsLoading, setOverallExamsLoading] = useState(true);
  // Client-side sorting and filtering (applies to current page items)
  const [examsSortKey, setExamsSortKey] = useState<'title' | 'created_at' | 'attempts_count' | 'exam_time_sec'>('created_at');
  const [examsSortDir, setExamsSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterTitle, setFilterTitle] = useState('');
  const [filterMinAttempts, setFilterMinAttempts] = useState<string>('');
  const [attemptsOpen, setAttemptsOpen] = useState(false);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [attemptsData, setAttemptsData] = useState<{ examTitle?: string | null; attempts: Array<any> }>({ attempts: [] });

  // Color helpers: red -> amber -> green
  const colorFor = (p: number) => {
    if (p <= 30) return '#ef4444'; // red-500
    if (p <= 60) return '#f59e0b'; // amber-500
    if (p <= 85) return '#3b82f6'; // blue-500
    return '#10b981'; // emerald-500
  };

  // Derived view: filter + sort (current page only)
  const viewOverallExams = useMemo(() => {
    let rows = Array.isArray(overallExams) ? [...overallExams] : [];
    const minAtt = Number(filterMinAttempts);
    if (filterTitle.trim()) {
      const q = filterTitle.trim().toLowerCase();
      rows = rows.filter(r => String(r.title || '').toLowerCase().includes(q));
    }
    if (!Number.isNaN(minAtt) && filterMinAttempts !== '') {
      rows = rows.filter(r => Number(r.attempts_count || 0) >= minAtt);
    }
    const cmp = (a: any, b: any) => {
      const dir = examsSortDir === 'asc' ? 1 : -1;
      const va = a?.[examsSortKey];
      const vb = b?.[examsSortKey];
      if (examsSortKey === 'title') {
        return String(va || '').localeCompare(String(vb || '')) * dir;
      }
      // dates or numbers
      const na = examsSortKey === 'created_at' ? new Date(va || 0).getTime() : Number(va || 0);
      const nb = examsSortKey === 'created_at' ? new Date(vb || 0).getTime() : Number(vb || 0);
      if (na === nb) return 0;
      return na > nb ? dir : -dir;
    };
    rows.sort(cmp);
    return rows;
  }, [overallExams, filterTitle, filterMinAttempts, examsSortKey, examsSortDir]);

  const onSort = (key: 'title' | 'created_at' | 'attempts_count' | 'exam_time_sec') => {
    if (examsSortKey === key) {
      setExamsSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setExamsSortKey(key);
      setExamsSortDir(key === 'title' ? 'asc' : 'desc');
    }
  };

  const lessonsColor = colorFor(lessonsPct);
  const examsColor = colorFor(examsPct);
  const blogsColor = colorFor(blogsPct);
  const overallColor = colorFor(overall);
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (w < 640) setCircleSize(110);
      else if (w < 1024) setCircleSize(130);
      else setCircleSize(140);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  useEffect(() => {
    // Fetch enrolled courses first
    const run = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/recent-enrolled-course`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const arr = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        const courseIds: string[] = arr.map((r: any) => r.courseId || r.course_id || r.enrolled_course || r.id).filter(Boolean);
        const courseList = arr.map((r: any) => ({ id: r.courseId || r.course_id || r.enrolled_course || r.id, title: r.courseTitle || r.title || 'Course' })).filter(c => c.id);
        setCourses(courseList);
        if (!selectedCourseId && courseList.length) setSelectedCourseId(courseList[0].id);

        // Aggregate overall stats in parallel
        const [lessonStatsRes, examStatsRes, blogStatsRes] = await Promise.all([
          courseIds.length ? axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/lesson-stats`, { params: { courseIds: courseIds.join(',') }, headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve({ data: { data: [] } }),
          courseIds.length ? axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/get-all-exams`, { params: { courseIds: courseIds.join(',') }, headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve({ data: { data: [] } }),
          courseIds.length ? axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/blog-stats`, { params: { courseIds: courseIds.join(',') }, headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve({ data: { data: [] } }),
        ]);

        // Lessons overall
        const lessonStats = lessonStatsRes?.data?.data ?? lessonStatsRes?.data ?? [];
        let tLessons = 0, cLessons = 0;
        (Array.isArray(lessonStats) ? lessonStats : []).forEach((row: any) => {
          tLessons += Number(row.totalLessons ?? 0);
          cLessons += Number(row.attendedLessons ?? 0);
        });
        setTotalLessons(tLessons);
        setCompletedLessons(cLessons);

        // Exams overall (controller returns stats when courseIds is given)
        const examStats = examStatsRes?.data?.data ?? examStatsRes?.data ?? [];
        let tExams = 0, aExams = 0;
        (Array.isArray(examStats) ? examStats : []).forEach((row: any) => {
          tExams += Number(row.totalExams ?? 0);
          aExams += Number(row.attemptedExams ?? 0);
        });
        setTotalExams(tExams);
        setAttemptedExams(aExams);

        // Blogs overall
        const blogStats = blogStatsRes?.data?.data ?? blogStatsRes?.data ?? [];
        let tBlogs = 0, rBlogs = 0;
        (Array.isArray(blogStats) ? blogStats : []).forEach((row: any) => {
          tBlogs += Number(row.totalBlogs ?? 0);
          rBlogs += Number(row.readBlogs ?? 0);
        });
        setTotalBlogs(tBlogs);
        setReadBlogs(rBlogs);

        // Today's progress is now per selected course via a dedicated endpoint
      } catch (e) {
        setTotalLessons(0); setCompletedLessons(0);
        setTotalExams(0); setAttemptedExams(0);
        setTotalBlogs(0); setReadBlogs(0);
        setTodayLessonsPct(0); setTodayExamsPct(0); setTodayBlogsPct(0);
        setTodayLessonsDone(0); setTodayLessonsTotal(0);
        setTodayExamsDone(0); setTodayExamsTotal(0);
        setTodayBlogsDone(0); setTodayBlogsTotal(0);
      }
      setLoading(false);
      setLastUpdated(new Date().toLocaleString());
    };
    run();
  }, [token]);

  // When selected course changes, fetch today's stats for that course
  useEffect(() => {
    const fetchTodayForCourse = async () => {
      if (!selectedCourseId) return;
      // Show loader immediately before any network calls
      setOverallExamsLoading(true);
      try {
        // Compute local day bounds and pass to server for UTC-safe filtering
        const start = new Date(); start.setHours(0,0,0,0);
        const end = new Date(); end.setHours(23,59,59,999);
        const params = { courseId: selectedCourseId, from: start.toISOString(), to: end.toISOString() } as any;
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/today-stats-by-course`, {
          params,
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.data?.data || res.data;
        const lessons = data?.lessons || { total: 0, doneToday: 0 };
        const exams = data?.exams || { total: 0, doneToday: 0 };
        const blogs = data?.blogs || { total: 0, doneToday: 0 };
        setTodayLessonsTotal(Number(lessons.total || 0));
        setTodayLessonsDone(Number(lessons.doneToday || 0));
        setTodayLessonsPct(lessons.total ? Math.round((Number(lessons.doneToday || 0) / Number(lessons.total)) * 100) : 0);
        setTodayExamsTotal(Number(exams.total || 0));
        setTodayExamsDone(Number(exams.doneToday || 0));
        setTodayExamsPct(exams.total ? Math.round((Number(exams.doneToday || 0) / Number(exams.total)) * 100) : 0);
        setTodayBlogsTotal(Number(blogs.total || 0));
        setTodayBlogsDone(Number(blogs.doneToday || 0));
        setTodayBlogsPct(blogs.total ? Math.round((Number(blogs.doneToday || 0) / Number(blogs.total)) * 100) : 0);

        // Fetch today's detailed items for selected course
        // Fetch today's exams across all courses
        const todayExamsRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/today-exams`, {
          params: { from: params.from, to: params.to },
          headers: { Authorization: `Bearer ${token}` },
        });
        const det = todayExamsRes.data?.data || todayExamsRes.data || {};
        setTodayExams(Array.isArray(det.exams) ? det.exams : []);

        // Fetch overall exams for selected course (attempted only, first page)
        const overallRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/overall-exams-by-course`, {
          params: { courseId: selectedCourseId, attemptedOnly: true, page: 1, pageSize: overallExamsPageSize },
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = overallRes.data?.data || overallRes.data || {};
        setOverallExams(Array.isArray(payload.items) ? payload.items : []);
        setOverallExamsTotal(Number(payload.total || 0));
        setOverallExamsPage(Number(payload.page || 1));
        setOverallExamsHasPrev(Boolean(payload.hasPrev));
        setOverallExamsHasNext(Boolean(payload.hasNext));
        setOverallExamsLoading(false);
      } catch {
        setTodayLessonsTotal(0); setTodayLessonsDone(0); setTodayLessonsPct(0);
        setTodayExamsTotal(0); setTodayExamsDone(0); setTodayExamsPct(0);
        setTodayBlogsTotal(0); setTodayBlogsDone(0); setTodayBlogsPct(0);
        setTodayExams([]);
        setOverallExams([]);
        setOverallExamsTotal(0);
        setOverallExamsPage(1);
        setOverallExamsHasPrev(false);
        setOverallExamsHasNext(false);
        setOverallExamsLoading(false);
      }
    };
    fetchTodayForCourse();
  }, [selectedCourseId, token]);

  // Pagination handlers
  const loadOverallExamsPage = async (page: number) => {
    if (!selectedCourseId) return;
    try {
      setOverallExamsLoading(true);
      const overallRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/overall-exams-by-course`, {
        params: { courseId: selectedCourseId, attemptedOnly: true, page, pageSize: overallExamsPageSize },
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = overallRes.data?.data || overallRes.data || {};
      setOverallExams(Array.isArray(payload.items) ? payload.items : []);
      setOverallExamsTotal(Number(payload.total || 0));
      setOverallExamsPage(Number(payload.page || 1));
      setOverallExamsHasPrev(Boolean(payload.hasPrev));
      setOverallExamsHasNext(Boolean(payload.hasNext));
      setOverallExamsLoading(false);
    } catch {
      // keep state
      setOverallExamsLoading(false);
    }
  };

  // Open attempts modal and fetch attempts for an exam
  const openAttemptsModal = async (exam: any) => {
    setAttemptsOpen(true);
    setAttemptsLoading(true);
    try {
      const resp = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/exam-attempts`, {
        params: { examId: exam.id },
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = resp.data?.data || resp.data || {};
      const attempts = Array.isArray(payload.attempts)
        ? payload.attempts
        : (Array.isArray(payload) ? payload : []);
      setAttemptsData({ attempts, examTitle: exam.title });
    } catch {
      setAttemptsData({ attempts: [], examTitle: exam.title });
    } finally {
      setAttemptsLoading(false);
    }
  };

  // Helper: seconds to HH:MM:SS
  const fmtHHMMSS = (sec?: number | null) => {
    const s = Math.max(0, Number(sec || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = Math.floor(s % 60);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(ss)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-purple-700 flex items-center gap-2">
          <TrendingUp className="h-6 w-6" /> Progress
        </h1>
      </div>

    {/* Course Exams (Overall list for selected course) */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-gray-800">Course Exams</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{overallExamsTotal} attempted exams</span>
          <div className="flex items-center gap-1">
            <button
              className="px-2 py-0.5 text-xs rounded border border-gray-200 disabled:opacity-50"
              onClick={() => loadOverallExamsPage(Math.max(1, overallExamsPage - 1))}
              disabled={!overallExamsHasPrev}
            >Prev</button>
            <span className="text-xs text-gray-500">Page {overallExamsPage}</span>
            <button
              className="px-2 py-0.5 text-xs rounded border border-gray-200 disabled:opacity-50"
              onClick={() => loadOverallExamsPage(overallExamsPage + 1)}
              disabled={!overallExamsHasNext}
            >Next</button>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={filterTitle}
            onChange={e => setFilterTitle(e.target.value)}
            placeholder="Search title..."
            className="h-8 px-2 rounded border border-gray-200 text-sm"
          />
          {/* <input
            value={filterMinAttempts}
            onChange={e => setFilterMinAttempts(e.target.value)}
            placeholder="Min attempts"
            className="h-8 w-28 px-2 rounded border border-gray-200 text-sm"
          /> */}
        </div>
      </div>
      <div className="overflow-auto max-h-96 rounded-md border border-gray-100">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b">
              <th
                className="py-2 pr-3 sticky top-0 bg-white z-10 cursor-pointer select-none"
                aria-sort={examsSortKey === 'title' ? (examsSortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                onClick={() => onSort('title')}
              >
                Title {examsSortKey === 'title' ? (examsSortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th className="py-2 pr-3 sticky top-0 bg-white z-10">Total Q</th>
              <th className="py-2 pr-3 sticky top-0 bg-white z-10">Exam Time</th>
              <th
                className="py-2 pr-3 sticky top-0 bg-white z-10 cursor-pointer select-none"
                aria-sort={examsSortKey === 'created_at' ? (examsSortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                onClick={() => onSort('created_at')}
              >
                Created On {examsSortKey === 'created_at' ? (examsSortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th
                className="py-2 pr-3 sticky top-0 bg-white z-10 cursor-pointer select-none"
                aria-sort={examsSortKey === 'attempts_count' ? (examsSortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                onClick={() => onSort('attempts_count')}
              >
                Attempts {examsSortKey === 'attempts_count' ? (examsSortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th className="py-2 pr-3 sticky top-0 bg-white z-10">Actions</th>
            </tr>
          </thead>
          <tbody>
            {overallExamsLoading ? (
              <tr>
                <td className="py-4 text-gray-500" colSpan={6}>
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    <span>Loading exam records...</span>
                  </div>
                </td>
              </tr>
            ) : (viewOverallExams || []).length === 0 ? (
              <tr><td className="py-3 text-gray-500" colSpan={6}>No exams attempted against this course.</td></tr>
            ) : (
              viewOverallExams.map((e, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium text-gray-800">{e.title || '-'}</td>
                  <td className="py-2 pr-3">{e.total_questions ?? '-'}</td>
                  <td className="py-2 pr-3">{e.exam_time_sec != null ? fmtHHMMSS(e.exam_time_sec) : '-'}</td>
                  <td className="py-2 pr-3 text-gray-600">{e.created_at ? new Date(e.created_at).toLocaleString() : '-'}</td>
                  <td className="py-2 pr-3">{e.attempts_count ?? 0}</td>
                  <td className="py-2 pr-3">
                    <button
                      className="px-2 py-1 text-xs rounded bg-purple-600 text-white hover:bg-purple-700"
                      onClick={() => openAttemptsModal(e)}
                    >View Attempts</button>
                  </td>
                </tr>
              ))
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attempts Modal */}
      {attemptsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" role="dialog" aria-modal="true">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">{attemptsData.examTitle || 'Exam'} — Attempts</h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setAttemptsOpen(false)}>✕</button>
            </div>
            <div className="p-4">
              {attemptsLoading ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600 border-b">
                        <th className="py-2 pr-3">Submitted At</th>
                        <th className="py-2 pr-3">Total Q</th>
                        <th className="py-2 pr-3">Correct</th>
                        <th className="py-2 pr-3">Wrong</th>
                        <th className="py-2 pr-3">No Ans</th>
                        <th className="py-2 pr-3">Attempt Time</th>
                        <th className="py-2 pr-3">Exam Time</th>
                        <th className="py-2 pr-3">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(attemptsData.attempts || []).length === 0 ? (
                        <tr><td className="py-3 text-gray-500" colSpan={8}>No attempts yet.</td></tr>
                      ) : (
                        attemptsData.attempts.map((a, idx) => (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="py-2 pr-3 text-gray-600">{a.submitted_at ? new Date(a.submitted_at).toLocaleString() : '-'}</td>
                            <td className="py-2 pr-3">{a.total_questions ?? '-'}</td>
                            <td className="py-2 pr-3 text-emerald-700">{a.correct_count ?? '-'}</td>
                            <td className="py-2 pr-3 text-red-600">{a.wrong_count ?? '-'}</td>
                            <td className="py-2 pr-3">{a.no_answer_count ?? '-'}</td>
                            <td className="py-2 pr-3">{fmtHHMMSS(a.total_time_sec)}</td>
                            <td className="py-2 pr-3">{a.exam_time_sec ? fmtHHMMSS(a.exam_time_sec) : '-'}</td>
                            <td className="py-2 pr-3 font-semibold">{a.percentage != null ? `${a.percentage}%` : '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end">
              <button className="px-3 py-1 text-sm rounded-md border border-gray-200 hover:bg-gray-50" onClick={() => setAttemptsOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Today's Exams (All Courses) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Today's Exams</h2>
        </div>
        <div className="overflow-auto max-h-96 rounded-md border border-gray-100">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b">
                <th className="py-2 pr-3 sticky top-0 bg-white z-10">Title</th>
                <th className="py-2 pr-3 sticky top-0 bg-white z-10">Submitted At</th>
                <th className="py-2 pr-3 sticky top-0 bg-white z-10">Total Q</th>
                <th className="py-2 pr-3 sticky top-0 bg-white z-10">Correct</th>
                <th className="py-2 pr-3 sticky top-0 bg-white z-10">Wrong</th>
                <th className="py-2 pr-3 sticky top-0 bg-white z-10">No Ans</th>
                <th className="py-2 pr-3 sticky top-0 bg-white z-10">Attempt Time</th>
                <th className="py-2 pr-3 sticky top-0 bg-white z-10">Exam Time</th>
                <th className="py-2 pr-3 sticky top-0 bg-white z-10">%</th>
              </tr>
            </thead>
            <tbody>
              {(todayExams || []).length === 0 ? (
                <tr><td className="py-3 text-gray-500" colSpan={9}>No exams attempted today.</td></tr>
              ) : (
                todayExams.map((row, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium text-gray-800">{row.exam_title || '-'}</td>
                    <td className="py-2 pr-3 text-gray-600">{new Date(row.submitted_at).toLocaleString()}</td>
                    <td className="py-2 pr-3">{row.total_questions ?? '-'}</td>
                    <td className="py-2 pr-3 text-emerald-700">{row.correct_count ?? '-'}</td>
                    <td className="py-2 pr-3 text-red-600">{row.wrong_count ?? '-'}</td>
                    <td className="py-2 pr-3 text-gray-700">{row.no_answer_count ?? '-'}</td>
                    <td className="py-2 pr-3">{fmtHHMMSS(row.total_time_sec)}</td>
                    <td className="py-2 pr-3">{row.exam_time_sec ? fmtHHMMSS(row.exam_time_sec) : '-'}</td>
                    <td className="py-2 pr-3 font-semibold">{row.percentage != null ? `${row.percentage}%` : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Streak config */}
      {/** 70% target streak indicator in header **/}
      {/** Keeping logic local; for multi-day streaks we can extend with backend support **/}
      {(() => null)()}

      {/* Today Progress */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-800">Today's Progress</h2>
          <div className="flex items-center gap-3">
            <select
              className="border rounded-md text-sm px-2 py-1"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            {!loading && lastUpdated && (
              <span className="hidden sm:inline text-[11px] text-gray-400">Updated: {lastUpdated}</span>
            )}
            {/** 70% streak chip **/}
            {(() => {
              const meets = todayProgress >= 70;
              return (
                <span
                  title={meets ? 'Great! You hit the 70% daily target.' : 'Aim for at least 70% today to keep the streak.'}
                  className={`hidden xs:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] border ${meets ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                >
                  {meets ? 'On Streak 70%+' : 'Target 70%+'}
                </span>
              );
            })()}
            <span className="text-sm text-gray-500">{todayProgress}%</span>
          </div>
        </div>
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-3 bg-gray-100 rounded" />
            <div className="h-3 bg-gray-100 rounded w-11/12" />
          </div>
        ) : (
          <>
            <Progress value={todayProgress} className="h-3" />
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs text-gray-500">Lessons Today</div>
                  <span className="inline-flex items-center rounded-full bg-purple-50 text-purple-700 px-2 py-0.5 text-[11px] border border-purple-200">{todayLessonsPct}%</span>
                </div>
                <Progress value={todayLessonsPct} className="h-2" />
                <div className="mt-1 text-xs text-gray-600">{todayLessonsDone}/{todayLessonsTotal} completed</div>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs text-gray-500">Exams Today</div>
                  <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[11px] border border-indigo-200">{todayExamsPct}%</span>
                </div>
                <Progress value={todayExamsPct} className="h-2" />
                <div className="mt-1 text-xs text-gray-600">{todayExamsDone}/{todayExamsTotal} attempted</div>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs text-gray-500">Blogs Today</div>
                  <span className="inline-flex items-center rounded-full bg-pink-50 text-pink-700 px-2 py-0.5 text-[11px] border border-pink-200">{todayBlogsPct}%</span>
                </div>
                <Progress value={todayBlogsPct} className="h-2" />
                <div className="mt-1 text-xs text-gray-600">{todayBlogsDone}/{todayBlogsTotal} read</div>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {(() => {
                const p = todayProgress;
                if (p < 30) return 'Slow start — try a short lesson or quick blog read to build momentum!';
                if (p < 60) return 'Nice progress — keep up the pace with one more activity!';
                if (p < 85) return 'Great job — you are on track today!';
                return 'Fantastic — you are crushing your goals today!';
              })()}
            </p>
          </>
        )}
      </div>

      {/* Overall progress with individual wheels */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-purple-600" />
          <h3 className="text-xl font-semibold text-gray-800">Overall Progress</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 place-items-center">
          <div className="text-center" title={`Lessons: ${completedLessons}/${totalLessons} (${lessonsPct}%)`}>
            <CircleProgress value={lessonsPct} size={circleSize} color={lessonsColor} />
            <div className="mt-2 text-sm text-gray-700 font-medium">Lessons</div>
            <div className="text-xs text-gray-500">{completedLessons}/{totalLessons} completed</div>
          </div>
          <div className="text-center" title={`Exams: ${attemptedExams}/${totalExams} (${examsPct}%)`}>
            <CircleProgress value={examsPct} size={circleSize} color={examsColor} />
            <div className="mt-2 text-sm text-gray-700 font-medium">Exams</div>
            <div className="text-xs text-gray-500">{attemptedExams}/{totalExams} attempted</div>
          </div>
          <div className="text-center" title={`Blogs: ${readBlogs}/${totalBlogs} (${blogsPct}%)`}>
            <CircleProgress value={blogsPct} size={circleSize} color={blogsColor} />
            <div className="mt-2 text-sm text-gray-700 font-medium">Blogs</div>
            <div className="text-xs text-gray-500">{readBlogs}/{totalBlogs} read</div>
          </div>
          <div className="text-center" title={`Overall average: ${overall}%`}>
            <CircleProgress value={overall} size={circleSize} color={overallColor} />
            <div className="mt-2 text-sm text-gray-700 font-medium">Overall</div>
            <div className="text-xs text-gray-500">Avg of all</div>
          </div>
        </div>
        {/* Legend */}
        <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-purple-500"></span> Lessons</div>
          <div className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-indigo-500"></span> Exams</div>
          <div className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-pink-500"></span> Blogs</div>
          <div className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span> Overall</div>
        </div>
      </div>
    </div>
  );
};

export default StudentProgress;
