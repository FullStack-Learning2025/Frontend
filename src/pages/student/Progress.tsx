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

  // Color helpers: red -> amber -> green
  const colorFor = (p: number) => {
    if (p <= 30) return '#ef4444'; // red-500
    if (p <= 60) return '#f59e0b'; // amber-500
    if (p <= 85) return '#3b82f6'; // blue-500
    return '#10b981'; // emerald-500
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

        // Today's progress: fetch today's created items per type and check progress
        const start = new Date(); start.setHours(0,0,0,0);
        const end = new Date(); end.setHours(23,59,59,999);

        const isoStart = start.toISOString();
        const isoEnd = end.toISOString();

        // Fetch all lessons per course and filter today
        const perCourseLessons = await Promise.all(courseIds.map(async (cid) => {
          const r = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/get-all-lessons`, { params: { courseId: cid }, headers: { Authorization: `Bearer ${token}` } });
          const items = Array.isArray(r.data?.data) ? r.data.data : (Array.isArray(r.data) ? r.data : []);
          // r items may be grouped by teacher; flatten
          const lessons = Array.isArray(items) ? items.flatMap((group: any) => group?.lessons || []) : [];
          return lessons.filter((l: any) => l?.created_at && l.created_at >= isoStart && l.created_at <= isoEnd).map((l: any) => l.id);
        }));
        const todayLessonIds = perCourseLessons.flat();
        setTodayLessonsTotal(todayLessonIds.length);
        if (todayLessonIds.length > 0) {
          const prog = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/lesson-progress`, { params: { lessonIds: todayLessonIds.join(',') }, headers: { Authorization: `Bearer ${token}` } });
          const progressed = Array.isArray(prog.data?.data) ? prog.data.data : (Array.isArray(prog.data) ? prog.data : []);
          setTodayLessonsDone(progressed.length);
          setTodayLessonsPct(Math.round((progressed.length / todayLessonIds.length) * 100));
        } else setTodayLessonsPct(0);

        // Fetch all exams per course and filter today
        const perCourseExams = await Promise.all(courseIds.map(async (cid) => {
          const r = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/get-exams`, { params: { courseId: cid }, headers: { Authorization: `Bearer ${token}` } });
          const items = Array.isArray(r.data?.data) ? r.data.data : (Array.isArray(r.data) ? r.data : []);
          return (items || []).filter((e: any) => e?.created_at && e.created_at >= isoStart && e.created_at <= isoEnd).map((e: any) => e.id);
        }));
        const todayExamIds = perCourseExams.flat();
        setTodayExamsTotal(todayExamIds.length);
        if (todayExamIds.length > 0) {
          const prog = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/exam-progress`, { params: { examIds: todayExamIds.join(',') }, headers: { Authorization: `Bearer ${token}` } });
          const progressed = Array.isArray(prog.data?.data) ? prog.data.data : (Array.isArray(prog.data) ? prog.data : []);
          setTodayExamsDone(progressed.length);
          setTodayExamsPct(Math.round((progressed.length / todayExamIds.length) * 100));
        } else setTodayExamsPct(0);

        // Fetch all blogs per course and filter today
        const perCourseBlogs = await Promise.all(courseIds.map(async (cid) => {
          const r = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/all-blogs`, { params: { courseId: cid }, headers: { Authorization: `Bearer ${token}` } });
          const items = Array.isArray(r.data?.data) ? r.data.data : (Array.isArray(r.data) ? r.data : []);
          return (items || []).filter((b: any) => b?.created_at && b.created_at >= isoStart && b.created_at <= isoEnd).map((b: any) => b.id);
        }));
        const todayBlogIds = perCourseBlogs.flat();
        setTodayBlogsTotal(todayBlogIds.length);
        if (todayBlogIds.length > 0) {
          const prog = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/blog-progress`, { params: { blogIds: todayBlogIds.join(',') }, headers: { Authorization: `Bearer ${token}` } });
          const progressed = Array.isArray(prog.data?.data) ? prog.data.data : (Array.isArray(prog.data) ? prog.data : []);
          setTodayBlogsDone(progressed.length);
          setTodayBlogsPct(Math.round((progressed.length / todayBlogIds.length) * 100));
        } else setTodayBlogsPct(0);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-purple-700 flex items-center gap-2">
          <TrendingUp className="h-6 w-6" /> Progress
        </h1>
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
