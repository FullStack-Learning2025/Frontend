import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, GraduationCap, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useStudentSession } from '@/contexts/StudentSessionContext';

type EnrolledCourse = {
  courseId: string;
  courseTitle: string;
};

type ExamItem = {
  id: string;
  title: string; // derived (e.g., `${category} Exam`)
  course_name?: string; // teacher name
  status?: string;
  created_at?: string;
  total_attempts?: number;
  hasAttempted?: boolean;
  total_questions?: number;
  category?: string;
  complexity?: string;
  percentage?: number;
  attempts?: Array<{ submitted_at: string; percentage: number }>;
};

const StudentExams: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  // Embedded Exams tab state
  const [selectedCourse, setSelectedCourse] = useState<EnrolledCourse | null>(null);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loadingExams, setLoadingExams] = useState<boolean>(false);
  const [examAttendedMap, setExamAttendedMap] = useState<Record<string, string>>({});
  // Only complexity filter retained; remove course/attempt filters
  const [examComplexity, setExamComplexity] = useState<'all' | 'Easy' | 'Medium' | 'Hard'>('all');
  // Category filter (client-side based on API response)
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  // Attempt filter (submitted vs not submitted)
  const [attemptFilter, setAttemptFilter] = useState<'all' | 'attempted' | 'not_attempted'>('all');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);
  const [lastPageCount, setLastPageCount] = useState<number>(0);
  const [hasNext, setHasNext] = useState<boolean>(false);
  const [hasPrev, setHasPrev] = useState<boolean>(false);
  const [showAttempts, setShowAttempts] = useState(false);
  const [attemptsRows, setAttemptsRows] = useState<Array<{ date: string; total_questions?: number; correct?: number; wrong?: number; no_answer?: number; total_time_sec?: number | null; exam_time_sec?: number | null; percentage?: number | null }>>([]);
  const [attemptsExamTitle, setAttemptsExamTitle] = useState<string>('Progress');
  const [attemptsSummary, setAttemptsSummary] = useState<{ trials: number; best?: number | null; last5?: number[]; trend?: 'improving'|'declining'|'flat'|null; target?: number | null }>({ trials: 0, best: null, last5: [], trend: null, target: null });
  const [progressLoadingId, setProgressLoadingId] = useState<string | null>(null);

  // Sort by last attempt direction
  const [sortLastAttempt, setSortLastAttempt] = useState<'recent_first' | 'recent_last'>('recent_first');

  // Restore and persist sort choice
  useEffect(() => {
    try {
      const saved = localStorage.getItem('student_exams_sort_last_attempt');
      if (saved === 'recent_first' || saved === 'recent_last') setSortLastAttempt(saved);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('student_exams_sort_last_attempt', sortLastAttempt); } catch {}
  }, [sortLastAttempt]);

  // Helper to format seconds as HH:MM:SS and verbose tooltip
  const formatHMS = (sec?: number | null) => {
    const s = typeof sec === 'number' && isFinite(sec) ? Math.max(0, Math.floor(sec)) : null;
    if (s == null) return { text: '—', title: '' };
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    const text = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${r.toString().padStart(2,'0')}`;
    const title = `${h}h ${m}m ${r}s`;
    return { text, title };
  };

  // Session-selected course
  const { currentCourse, selectExam } = useStudentSession();
  const [examsIn, setExamsIn] = useState(false);

  // Reattempt confirmation dialog state
  const [showReattemptConfirm, setShowReattemptConfirm] = useState(false);
  const [pendingExam, setPendingExam] = useState<ExamItem | null>(null);

  const openExam = async (e: ExamItem) => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/students/get-all-questions`,
        { params: { examId: e.id }, headers: { Authorization: `Bearer ${token}` } }
      );
      const payload = res?.data?.data ?? res?.data;
      localStorage.setItem('student_questions_list', JSON.stringify({ examId: e.id, data: payload }));
      // set last selection so Questions tab can preselect
      try { localStorage.setItem('last_exam_selection', JSON.stringify({ examId: e.id, category: e.category })); } catch {}
      // Clear any previous completion/dismissal to allow reattempt
      try { localStorage.removeItem(`exam_status_${e.id}`); } catch {}
      try { localStorage.removeItem(`exam_answers_${e.id}_${e.category || 'all'}`); } catch {}
      // Mark exam as attended in progress (to show attended date)
      try {
        await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/progress`, {
          progress_name: 'exam_start',
          examId: e.id,
        }, { headers: { Authorization: `Bearer ${token}` } });
        // update attended map immediately
        setExamAttendedMap((prev) => ({ ...prev, [e.id]: new Date().toISOString() }));
      } catch {}
      // save selected exam in session (to reveal Questions tab)
      selectExam({ examId: e.id, examTitle: e.title, courseId: selectedCourse?.courseId });
      navigate('/student/questions');
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to load questions.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  // Load all categories for selected course from backend once
  useEffect(() => {
    const run = async () => {
      const cid = selectedCourse?.courseId || currentCourse?.courseId;
      if (!cid || !token) return;
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/exam-categories`, {
          params: { courseId: cid },
          headers: { Authorization: `Bearer ${token}` },
        });
        const cats = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        setAvailableCategories(cats);
      } catch {}
    };
    run();
  }, [selectedCourse, currentCourse, token]);

  // Helper to load exams for selected course with current complexity and pagination
  const loadExamsForCourse = async (c: EnrolledCourse, opts?: { resetPage?: boolean }) => {
    if (opts?.resetPage) setPage(1);
    const effectivePage = opts?.resetPage ? 1 : page;
    setLoadingExams(true);
    // prepare enter animation
    setExamsIn(false);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/students/get-all-exams`,
        {
          params: {
            courseId: c.courseId,
            complexity: examComplexity,
            page: effectivePage,
            pageSize,
            ...(selectedCategory && selectedCategory !== 'all' ? { category: selectedCategory } : {}),
          },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const items = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      // Persist so Questions page can read context later
      try { localStorage.setItem('student_exams_list', JSON.stringify({ courseId: c.courseId, courseTitle: c.courseTitle, items })); } catch {}
      // Normalize to ExamItem[] similar to Exams page
      const normalized: ExamItem[] = (items.length && Array.isArray(items[0]?.exams))
        ? items.flatMap((teacher: any) => (teacher.exams || []).map((ex: any) => ({
            id: ex.id,
            title: ex.title || (ex.category || 'Exam'),
            course_name: teacher.full_name || 'Teacher',
            status: ex.hasAttempted ? 'Attempted' : 'New',
            total_attempts: ex.hasAttempted ? 1 : 0,
            hasAttempted: !!ex.hasAttempted,
            total_questions: ex.total_questions,
            category: ex.category,
            complexity: ex.complexity,
            created_at: ex.created_at || ex.createdAt,
            attempts: Array.isArray(ex.attempts) ? ex.attempts : [],
            ...(typeof ex.percentage === 'number' ? { percentage: ex.percentage } : {})
          })))
        : (items as ExamItem[]).map((ex: any) => ({
            ...ex,
            created_at: ex.created_at || ex.createdAt,
            attempts: Array.isArray((ex as any).attempts) ? (ex as any).attempts : [],
          }));

      // Update available categories (union) using current page as fallback enrichment
      try {
        const pageCats = Array.from(new Set(normalized.map((e: any) => e.category).filter(Boolean)));
        if (pageCats.length) {
          setAvailableCategories((prev) => Array.from(new Set([...(prev || []), ...pageCats])));
        }
      } catch {}

      // Apply attempt filter (category handled server-side)
      const filtered = attemptFilter === 'all'
        ? normalized
        : attemptFilter === 'attempted'
          ? normalized.filter((e: any) => !!e.hasAttempted)
          : normalized.filter((e: any) => !e.hasAttempted);
      // set pagination flags from backend response
      const pagination = (res.data && (res.data.pagination || res.data.meta)) || null;
      setHasNext(Boolean(pagination?.hasNextPage));
      setHasPrev(Boolean(pagination?.hasPrevPage));

      // compute last page count from filtered items
      setLastPageCount(filtered.length || 0);

      setExams(filtered);
      // Fetch exam attended timestamps for these exams
      try {
        const ids = normalized.map(x => x.id).filter(Boolean);
        if (ids.length > 0) {
          const res3 = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/exam-progress`, {
            params: { examIds: ids.join(',') }, headers: { Authorization: `Bearer ${token}` }
          });
          const payload = res3?.data?.data ?? res3?.data ?? [];
          const map: Record<string, string> = {};
          (Array.isArray(payload) ? payload : []).forEach((row: any) => {
            const eid = row.examId || row.exam_id || row.id;
            const at = row.attended_at || row.updated_at || row.created_at;
            if (eid && at) map[eid] = at;
          });
          setExamAttendedMap(map);
        } else {
          setExamAttendedMap({});
        }
      } catch { setExamAttendedMap({}); }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load exams for this course.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      setExams([]);
    } finally {
      setLoadingExams(false);
      // trigger enter animation after data loaded
      requestAnimationFrame(() => setExamsIn(true));
    }
  };

  // React to complexity and page changes for current session selection
  useEffect(() => {
    if (!currentCourse) return;
    const c = { courseId: currentCourse.courseId, courseTitle: currentCourse.courseTitle } as EnrolledCourse;
    setSelectedCourse(c);
    loadExamsForCourse(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCourse, examComplexity, page, pageSize]);

  // Persist and react to category filter changes (refetch and apply)
  useEffect(() => {
    try { localStorage.setItem('student_exams_category_filter', selectedCategory); } catch {}
    if (!selectedCourse) return;
    // Re-load current page to apply filter and refresh categories if needed
    loadExamsForCourse(selectedCourse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  // Restore category filter from storage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('student_exams_category_filter');
      if (saved) setSelectedCategory(saved);
    } catch {}
  }, []);

  // Persist + apply page size changes
  useEffect(() => {
    try { localStorage.setItem('student_exams_page_size', String(pageSize)); } catch {}
    if (!selectedCourse) return;
    // When page size changes, best UX is to reset to page 1 to avoid out-of-range page
    loadExamsForCourse(selectedCourse, { resetPage: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  // Restore page size on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('student_exams_page_size');
      const n = saved ? parseInt(saved, 10) : NaN;
      if (n && [10,25,50,100].includes(n)) setPageSize(n);
    } catch {}
  }, []);

  // Persist + apply attempt filter changes
  useEffect(() => {
    try { localStorage.setItem('student_exams_attempt_filter', attemptFilter); } catch {}
    if (!selectedCourse) return;
    loadExamsForCourse(selectedCourse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptFilter]);

  // Restore attempt filter from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('student_exams_attempt_filter');
      if (saved === 'attempted' || saved === 'not_attempted' || saved === 'all') setAttemptFilter(saved);
    } catch {}
  }, []);

  // Enrich attempted exams with percentage (limits concurrency and avoids unnecessary state updates)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!token || !exams || exams.length === 0) return;
      // Only fetch for items that are attempted but missing percentage
      const targets = exams.filter((e) => e.hasAttempted && typeof (e as any).percentage !== 'number');
      if (targets.length === 0) return;
      const MAX_CONCURRENT = 6;
      const updatedMap = new Map<string, number>();
      const queue = [...targets];
      const workers: Promise<void>[] = [];
      const worker = async () => {
        while (!cancelled && queue.length > 0) {
          const e = queue.shift()!;
          try {
            const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/exams/${e.id}/result`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data?.data;
            if (data && typeof data.obtainedScore === 'number' && typeof data.totalScore === 'number' && data.totalScore > 0) {
              const percentage = Math.round((data.obtainedScore / data.totalScore) * 100);
              updatedMap.set(e.id, percentage);
              // update localStorage cache too
              try {
                const raw = localStorage.getItem('student_exams_list');
                if (raw) {
                  const parsed = JSON.parse(raw);
                  const items = parsed?.items;
                  if (Array.isArray(items)) {
                    if (items.length && Array.isArray(items[0]?.exams)) {
                      items.forEach((t: any) => {
                        (t.exams || []).forEach((ex: any) => { if (ex.id === e.id) ex.percentage = percentage; });
                      });
                    } else {
                      parsed.items = items.map((ex: any) => ex?.id === e.id ? { ...ex, percentage } : ex);
                    }
                    localStorage.setItem('student_exams_list', JSON.stringify(parsed));
                  }
                }
              } catch {}
            }
          } catch {}
        }
      };
      for (let i = 0; i < Math.min(MAX_CONCURRENT, queue.length); i++) {
        workers.push(worker());
      }
      await Promise.all(workers);
      if (cancelled) return;
      if (updatedMap.size === 0) return;
      // Build next exams array with updated percentages for changed items only
      const next = exams.map((ex) => updatedMap.has(ex.id) ? ({ ...ex, percentage: updatedMap.get(ex.id)! } as any) : ex);
      const sameLength = next.length === exams.length;
      const allSameRefs = sameLength && next.every((item, idx) => item === exams[idx]);
      if (!allSameRefs) {
        setExams(next);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [exams, token]);

  // Build a sorted list based on last attempt timestamp
  const sortedExams = React.useMemo(() => {
    const list = [...exams];
    const getLastAttemptTs = (e: ExamItem): number => {
      const attendedAt = examAttendedMap[e.id];
      let ts: number | null = null;
      if (attendedAt) {
        const t = Date.parse(attendedAt);
        if (!Number.isNaN(t)) ts = t;
      }
      if (!ts && Array.isArray(e.attempts) && e.attempts.length > 0) {
        // Use the most recent submitted_at in attempts array if available
        let maxT = -Infinity;
        for (const a of e.attempts) {
          if (a?.submitted_at) {
            const tt = Date.parse(a.submitted_at);
            if (!Number.isNaN(tt) && tt > maxT) maxT = tt;
          }
        }
        if (maxT !== -Infinity) ts = maxT;
      }
      return typeof ts === 'number' ? ts : -Infinity; // items with no attempts go last for recent_first
    };
    list.sort((ea, eb) => {
      const ta = getLastAttemptTs(ea);
      const tb = getLastAttemptTs(eb);
      if (sortLastAttempt === 'recent_first') return tb - ta; // newest first
      return ta - tb; // newest last
    });
    return list;
  }, [exams, examAttendedMap, sortLastAttempt]);

  const renderExamsSection = () => {
    if (!currentCourse || !selectedCourse) return null;
    if (loadingExams) {
      return (
        <div className="flex items-center justify-center min-h-[160px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading exams...</p>
          </div>
        </div>
      );
    }
    if (exams.length === 0) {
      return (
        <div className="text-center text-sm text-gray-500 py-6">No exams have been generated for this course yet.</div>
      );
    }
    return (
      <div className={`max-h-[28rem] overflow-auto p-2 transform transition-all duration-700 ${examsIn ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`} style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {sortedExams.map((e) => {
            const attendedAt = examAttendedMap[e.id];
            const isAttemptedCombined = !!e.hasAttempted || !!attendedAt;
            const attemptedClasses = 'border-emerald-400 bg-emerald-50 hover:border-emerald-500 hover:bg-emerald-100';
            const unattemptedClasses = 'border-rose-400 bg-rose-50 hover:border-rose-500 hover:bg-rose-100';
            const cardClasses = isAttemptedCombined ? attemptedClasses : unattemptedClasses;
            const createdAt = e.created_at ? new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
            return (
              <button
                key={e.id}
                type="button"
                onClick={async () => {
                  if (isAttemptedCombined) {
                    setPendingExam(e);
                    setShowReattemptConfirm(true);
                    return;
                  }
                  await openExam(e);
                }}
                className={`text-left mx-auto w-full max-w-[420px] flex flex-col gap-2 rounded-xl border transition px-4 py-2 ${cardClasses} hover:-translate-y-0.5 hover:shadow-md`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate pr-1 text-sm sm:text-base font-medium text-gray-800">{e.title}</div>
                    {e.category && (
                      <div className="text-xs text-gray-600 mt-0.5 truncate">{e.category}</div>
                    )}
                    {e.course_name && (
                      <div className="text-xs text-gray-500 mt-0.5 truncate">By {e.course_name}</div>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {createdAt && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 text-gray-700 px-2 py-0.5 text-[11px] sm:text-xs">
                          Created: {createdAt}
                        </span>
                      )}
                      {e.complexity && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 text-purple-700 px-2 py-0.5 text-[11px] sm:text-xs">
                          Complexity: {e.complexity}
                        </span>
                      )}
                      {isAttemptedCombined ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] sm:text-xs">
                          {attendedAt
                            ? `Attempted: ${new Date(attendedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                            : 'Attempted'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 text-rose-700 px-2 py-0.5 text-[11px] sm:text-xs">
                          Not Attempted
                        </span>
                      )}
                      {true && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            (async () => {
                              // open modal immediately with loading state
                              setAttemptsExamTitle(`${e.title || 'Exam'} – Progress`);
                              setAttemptsRows([]);
                              setAttemptsSummary({ trials: 0, best: null, last5: [], trend: null, target: null });
                              setShowAttempts(true);
                              setProgressLoadingId(e.id);
                              try {
                                const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/exam-attempts`, {
                                  params: { examId: e.id },
                                  headers: { Authorization: `Bearer ${token}` },
                                });
                                const data = res?.data?.data ?? res?.data;
                                const title = data?.examTitle || e.title || 'Progress';
                                setAttemptsExamTitle(`${title} – Progress`);
                                const rows = Array.isArray(data?.attempts) ? data.attempts.map((a: any) => ({
                                  date: a.submitted_at ? new Date(a.submitted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '-',
                                  total_questions: a.total_questions ?? undefined,
                                  correct: a.correct_count ?? undefined,
                                  wrong: a.wrong_count ?? undefined,
                                  no_answer: a.no_answer_count ?? undefined,
                                  total_time_sec: a.total_time_sec ?? null,
                                  exam_time_sec: a.exam_time_sec ?? null,
                                  percentage: a.percentage ?? null,
                                })) : [];
                                setAttemptsRows(rows);
                                setAttemptsSummary({
                                  trials: Number(data?.trials) || rows.length,
                                  best: typeof data?.bestAttempt?.percentage === 'number' ? data.bestAttempt.percentage : (rows.length ? Math.max(...rows.map(r => r.percentage ?? -1)) : null),
                                  last5: Array.isArray(data?.last5) ? data.last5 : rows.slice(0,5).map(r => r.percentage || 0),
                                  trend: (data?.trend === 'improving' || data?.trend === 'declining' || data?.trend === 'flat') ? data.trend : null,
                                  target: typeof data?.target === 'number' ? data.target : null,
                                });
                              } catch (err: any) {
                                toast({ title: 'Error', description: err?.response?.data?.error || 'Failed to load progress.', variant: 'destructive' });
                              } finally { setProgressLoadingId(null); }
                            })();
                          }}
                          onKeyDown={(ev) => {
                            if (ev.key === 'Enter' || ev.key === ' ') {
                              (ev.currentTarget as any).click();
                              ev.preventDefault();
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 text-purple-700 px-2 py-0.5 text-[11px] sm:text-xs hover:border-purple-300 hover:bg-purple-100 cursor-pointer"
                          title="View progress details"
                        >
                          {progressLoadingId === e.id ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full border-2 border-purple-300 border-t-transparent animate-spin"></span>
                              Loading
                            </span>
                          ) : (
                            <>
                              <History size={14} /> Progress
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <div className="h-16 w-24 rounded-md bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                      <GraduationCap className="h-10 w-10 text-gray-600" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto text-xs text-gray-500">
                  <div className="flex items-center gap-2"></div>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={14} /> Questions: {e.total_questions ?? 0}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-purple-700">Exams</h1>
        {currentCourse ? (
          <p className="text-gray-600 mt-1">You are viewing exams for <span className="font-medium text-purple-800">{currentCourse.courseTitle}</span>.</p>
        ) : (
          <p className="text-gray-600 mt-1">Please select a course from the Dashboard to view exams.</p>
        )}
      </div>

      {currentCourse && selectedCourse && (
        <div className="flex items-start gap-3">
          <div className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1 text-purple-800">
            <span className="text-sm sm:text-base font-semibold">Exams – {selectedCourse.courseTitle}</span>
          </div>
        </div>
      )}

    {/* Complexity filter + pagination */}
    <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          {(['all','Easy','Medium','Hard'] as const).map(val => (
            <button
              key={val}
              type="button"
              onClick={() => { setExamComplexity(val); setPage(1); }}
              className={`px-3 py-1.5 text-xs sm:text-sm ${examComplexity === val ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'} ${val !== 'all' ? 'border-l border-gray-200' : ''}`}
            >{val === 'all' ? 'All' : val}</button>
          ))}
        </div>
        {/* Category filter dropdown */}
        <div className="inline-flex items-center gap-2">
          <label htmlFor="exam-category" className="text-xs text-gray-600 hidden sm:block">Category</label>
          <select
            id="exam-category"
            className="px-2 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-md bg-white text-gray-700 hover:border-gray-300"
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); }}
          >
            <option value="all">All</option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        {/* Attempt status filter */}
        <div className="inline-flex items-center gap-2">
          <label htmlFor="exam-attempt" className="text-xs text-gray-600 hidden sm:block">Status</label>
          <select
            id="exam-attempt"
            className="px-2 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-md bg-white text-gray-700 hover:border-gray-300"
            value={attemptFilter}
            onChange={(e) => setAttemptFilter(e.target.value as any)}
          >
            <option value="all">All</option>
            <option value="attempted">Submitted</option>
            <option value="not_attempted">Not submitted</option>
          </select>
        </div>
        {/* Sort by last attempt */}
        <div className="inline-flex items-center gap-2">
          <label htmlFor="exam-sort-last" className="text-xs text-gray-600 hidden sm:block">Sort by</label>
          <select
            id="exam-sort-last"
            className="px-2 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-md bg-white text-gray-700 hover:border-gray-300"
            value={sortLastAttempt}
            onChange={(e) => setSortLastAttempt(e.target.value as 'recent_first' | 'recent_last')}
          >
            <option value="recent_first">Last attempt (recent first)</option>
            <option value="recent_last">Last attempt (recent last)</option>
          </select>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 px-1">
        {/* Page size selector */}
        <div className="inline-flex items-center gap-2 mr-2">
          <label htmlFor="exam-page-size" className="text-xs text-gray-600 hidden sm:block">Per page</label>
          <select
            id="exam-page-size"
            className="px-2 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-md bg-white text-gray-700 hover:border-gray-300"
            value={pageSize}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if ([10,25,50,100].includes(n)) {
                setPageSize(n);
                setPage(1);
              }
            }}
          >
            {[10,25,50,100].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!hasPrev} className={`px-3 py-1.5 text-xs rounded-md border ${!hasPrev ? 'text-gray-400 border-gray-200 bg-gray-50' : 'text-gray-700 border-gray-200 hover:bg-gray-50'}`}>Prev</button>
        <span className="text-xs text-gray-600">Page {page}</span>
        <button type="button" onClick={() => setPage(p => p + 1)} disabled={!hasNext} className={`px-3 py-1.5 text-xs rounded-md border ${!hasNext ? 'text-gray-400 border-gray-200 bg-gray-50' : 'text-gray-700 border-gray-200 hover:bg-gray-50'}`}>Next</button>
      </div>
    </div>

    {/* Exams list emerging from below */}
    {renderExamsSection()}

      <>
        {/* Reattempt confirmation modal */}
        <Dialog open={showReattemptConfirm} onOpenChange={setShowReattemptConfirm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reattempt exam?</DialogTitle>
              <DialogDescription>
                Starting a new attempt will open the same exam questions again.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => { setShowReattemptConfirm(false); setPendingExam(null); }}>Cancel</Button>
              <Button onClick={async () => {
                const e = pendingExam; setShowReattemptConfirm(false); setPendingExam(null);
                if (e) await openExam(e);
              }}>Start new attempt</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Attempts history modal */}
        <Dialog open={showAttempts} onOpenChange={setShowAttempts}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{attemptsExamTitle}</DialogTitle>
              <DialogDescription>Progress across your attempts for this exam</DialogDescription>
            </DialogHeader>
            {/* Summary Row */}
            <div className="mt-2 flex flex-wrap gap-2 text-xs sm:text-sm">
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 text-gray-700 px-2 py-0.5">Trials: {attemptsSummary.trials}</span>
              {typeof attemptsSummary.best === 'number' && <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-0.5">Best: {attemptsSummary.best}%</span>}
              {attemptsSummary.last5 && attemptsSummary.last5.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 text-purple-700 px-2 py-0.5">Last 5: {attemptsSummary.last5.join(', ')}%</span>
              )}
              {attemptsSummary.trend && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${attemptsSummary.trend === 'improving' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : attemptsSummary.trend === 'declining' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>Trend: {attemptsSummary.trend}</span>
              )}
              {typeof attemptsSummary.target === 'number' && (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 px-2 py-0.5">Target: {attemptsSummary.target}%</span>
              )}
            </div>
            <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
              {progressLoadingId && (
                <div className="flex items-center justify-center py-10">
                  <span className="h-6 w-6 rounded-full border-2 border-purple-300 border-t-transparent animate-spin mr-2"></span>
                  <span className="text-sm text-gray-600">Loading progress...</span>
                </div>
              )}
              <div className="max-h-[60vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Attempt Date & Time</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Total Qs</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Correct</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Wrong</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">No Answer</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Attempt Time (HH:MM:SS)</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Exam Time (HH:MM:SS)</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {attemptsRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-3 text-gray-500" colSpan={8}>No attempts yet.</td>
                    </tr>
                  ) : (
                    attemptsRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-purple-50">
                        <td className="px-4 py-2 text-gray-800">{row.date}</td>
                        <td className="px-4 py-2 text-gray-800">{row.total_questions ?? '—'}</td>
                        <td className="px-4 py-2 text-gray-800">{row.correct ?? '—'}</td>
                        <td className="px-4 py-2 text-gray-800">{row.wrong ?? '—'}</td>
                        <td className="px-4 py-2 text-gray-800">{row.no_answer ?? '—'}</td>
                        {(() => { const f = formatHMS(row.total_time_sec ?? null); return (<td className="px-4 py-2 text-gray-800"><span title={f.title}>{f.text}</span></td>); })()}
                        {(() => { const f = formatHMS(row.exam_time_sec ?? null); return (<td className="px-4 py-2 text-gray-800"><span title={f.title}>{f.text}</span></td>); })()}
                        <td className="px-4 py-2 text-gray-800">{typeof row.percentage === 'number' ? `${row.percentage}%` : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </div>
            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setShowAttempts(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </div>
  );
};

export default StudentExams;
