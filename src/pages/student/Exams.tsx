import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, FileText, History } from 'lucide-react';
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
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(12);
  const [lastPageCount, setLastPageCount] = useState<number>(0);
  const [currentPageItemsCount, setCurrentPageItemsCount] = useState<number>(0);
  const [pagination, setPagination] = useState<{
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null>(null);
  const [showAttempts, setShowAttempts] = useState(false);
  const [attemptsRows, setAttemptsRows] = useState<Array<{ date: string; percentage: number }>>([]);
  const [attemptsExamTitle, setAttemptsExamTitle] = useState<string>('Attempts');

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

  // Helper to load exams for selected course with current complexity and pagination
  const loadExamsForCourse = async (c: EnrolledCourse, opts?: { resetPage?: boolean }) => {
    if (opts?.resetPage) {
      setPage(1);
      setPagination(null);
      setCurrentPageItemsCount(0);
    }
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
          },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const items = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      const paginationData = res.data?.pagination || null;

      // Update pagination state
      if (paginationData) {
        setPagination(paginationData);
      }

      // Use pagination metadata for lastPageCount instead of items.length
      setLastPageCount(paginationData ? paginationData.totalCount : (items.length || 0));
      setCurrentPageItemsCount(items.length);

      // If we have pagination data and it shows there are more pages, enable Next button
      if (paginationData && paginationData.hasNextPage) {
        console.log('Pagination data received with hasNextPage:', paginationData.hasNextPage);
        console.log('Current page items count:', items.length);
      }
      // Persist so Questions page can read context later
      try { localStorage.setItem('student_exams_list', JSON.stringify({ courseId: c.courseId, courseTitle: c.courseTitle, items })); } catch {}
      // Normalize to ExamItem[] similar to Exams page
      const normalized: ExamItem[] = (items.length && Array.isArray(items[0]?.exams))
        ? items.flatMap((teacher: any) => (teacher.exams || []).map((ex: any) => ({
            id: ex.id,
            title: `${(ex.category || 'Exam')}`,
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
      setExams(normalized);
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
  }, [currentCourse, examComplexity, page]);

  // Debug pagination state changes
  useEffect(() => {
    console.log('Pagination state changed:', pagination);
    console.log('Current page items count:', currentPageItemsCount);
    console.log('Should Next button be enabled?', pagination === null ? (currentPageItemsCount >= 12) : pagination.hasNextPage);
  }, [pagination, currentPageItemsCount]);

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
          {exams.map((e) => {
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
                      {Array.isArray(e.attempts) && e.attempts.length > 0 && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            const rows = e.attempts!.map((a) => ({
                              date: new Date(a.submitted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }),
                              percentage: a.percentage ?? 0,
                            }));
                            setAttemptsExamTitle(`${e.title} – Attempts`);
                            setAttemptsRows(rows);
                            setShowAttempts(true);
                          }}
                          onKeyDown={(ev) => {
                            if (ev.key === 'Enter' || ev.key === ' ') {
                              (ev.currentTarget as any).click();
                              ev.preventDefault();
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 text-purple-700 px-2 py-0.5 text-[11px] sm:text-xs hover:border-purple-300 hover:bg-purple-100 cursor-pointer"
                          title="View attempt history"
                        >
                          <History size={14} /> History
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <div className="h-16 w-24 rounded-md bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                      <FileText className="h-5 w-5 text-gray-400" />
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
          {pagination && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-gray-600">
              <span className="text-xs sm:text-sm">Total: {pagination.totalCount} exams</span>
            </div>
          )}
        </div>
      )}

    {/* Complexity filter + pagination */}
    <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
      <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
        {(['all','Easy','Medium','Hard'] as const).map(val => (
          <button
            key={val}
            type="button"
            onClick={() => { setExamComplexity(val); setPage(1); setPagination(null); setCurrentPageItemsCount(0); }}
            className={`px-3 py-1.5 text-xs sm:text-sm ${examComplexity === val ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'} ${val !== 'all' ? 'border-l border-gray-200' : ''}`}
          >{val === 'all' ? 'All' : val}</button>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2 px-1">
        <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || !pagination?.hasPrevPage} className={`px-3 py-1.5 text-xs rounded-md border ${page <= 1 || !pagination?.hasPrevPage ? 'text-gray-400 border-gray-200 bg-gray-50' : 'text-gray-700 border-gray-200 hover:bg-gray-50'}`}>Prev</button>
        <span className="text-xs text-gray-600">Page {pagination?.currentPage || page} of {pagination?.totalPages || 1}</span>
        <button type="button" onClick={() => setPage(p => p + 1)} disabled={pagination === null ? (currentPageItemsCount < 12) : !pagination.hasNextPage} className={`px-3 py-1.5 text-xs rounded-md border ${pagination === null ? (currentPageItemsCount < 12) : !pagination.hasNextPage ? 'text-gray-400 border-gray-200 bg-gray-50' : 'text-gray-700 border-gray-200 hover:bg-gray-50'}`}>Next {pagination?.hasNextPage ? 'ENABLED' : 'DISABLED'}</button>
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
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{attemptsExamTitle}</DialogTitle>
              <DialogDescription>All your attempts for this exam</DialogDescription>
            </DialogHeader>
            <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Attempt Date & Time</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {attemptsRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-3 text-gray-500" colSpan={2}>No attempts yet.</td>
                    </tr>
                  ) : (
                    attemptsRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-purple-50">
                        <td className="px-4 py-2 text-gray-800">{row.date}</td>
                        <td className="px-4 py-2 text-gray-800">{row.percentage}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
