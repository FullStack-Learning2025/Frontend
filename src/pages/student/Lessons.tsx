import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useStudentSession } from '@/contexts/StudentSessionContext';

// Reuse the same course structure
type EnrolledCourse = {
  courseId: string;
  courseTitle: string;
};

// Placeholder lesson item type (adjust when API is defined)
type LessonItem = {
  id: string;
  title: string;
  teacher?: string;
  status?: string;
  created_at?: string;
};

const StudentLessons: React.FC = () => {
  const { token } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState<boolean>(false);
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [lessonStats, setLessonStats] = useState<Record<string, { total: number; attended: number; unattempted: number }>>({});
  const fetchedRef = useRef(false);

  // Selected course + embedded lessons
  const [selectedCourse, setSelectedCourse] = useState<EnrolledCourse | null>(null);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [loadingLessons, setLoadingLessons] = useState<boolean>(false);
  const [showLessonDialog, setShowLessonDialog] = useState<boolean>(false);
  const [activeLesson, setActiveLesson] = useState<LessonItem | null>(null);
  const [activeLessonDetail, setActiveLessonDetail] = useState<any>(null);
  const [loadingLessonDetail, setLoadingLessonDetail] = useState<boolean>(false);
  // Per-course lessons filter (viewing panel)
  // Confirm view dialog state
  const [showConfirmView, setShowConfirmView] = useState<boolean>(false);
  const [pendingLesson, setPendingLesson] = useState<LessonItem | null>(null);
  // Attended timestamps map: lessonId -> ISO string
  const [attendedMap, setAttendedMap] = useState<Record<string, string>>({});

  // Session-selected course
  const { currentCourse } = useStudentSession();
  const [lessonsIn, setLessonsIn] = useState(false);

  // Removed palettes as they are no longer used after standardized coloring

  // Load enrolled courses
  useEffect(() => {
    const fetchRecent = async () => {
      if (fetchedRef.current) return;
      fetchedRef.current = true;
      setLoading(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/recent-enrolled-course`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        const normalized: EnrolledCourse[] = data.map((d: any) => ({
          courseId: d.courseId || d.course_id || d.enrolled_course || d.id,
          courseTitle: d.courseTitle || d.course_title || d.title || 'Untitled Course',
        }));
        setCourses(normalized);
        // Batch fetch per-course lesson stats (total/attended/unattempted)
        try {
          const ids = normalized.map(c => c.courseId).filter(Boolean);
          if (ids.length > 0) {
            const res2 = await axios.get(
              `${import.meta.env.VITE_BACKEND_URL}/api/students/lesson-stats`,
              { params: { courseIds: ids.join(',') }, headers: { Authorization: `Bearer ${token}` } }
            );
            const payload = res2?.data?.data ?? res2?.data ?? [];
            const map: Record<string, { total: number; attended: number; unattempted: number }> = {};
            (Array.isArray(payload) ? payload : []).forEach((row: any) => {
              const cid = row.courseId || row.course_id || row.id;
              const total = Number(row.totalLessons ?? 0);
              const attended = Number(row.attendedLessons ?? 0);
              const unattempted = Number(row.unattemptedLessons ?? Math.max(0, total - attended));
              if (cid) map[cid] = { total, attended, unattempted };
            });
            setLessonStats(map);

            // Fallback: if all totals are 0 but we have courses, compute totals client-side for visible cards
            const allZero = ids.every((id) => (map[id]?.total ?? 0) === 0);
            if (allZero && ids.length > 0) {
              const limited = ids; // compute for all courses
              try {
                const results = await Promise.all(limited.map(async (cid) => {
                  try {
                    const rr = await axios.get(
                      `${import.meta.env.VITE_BACKEND_URL}/api/students/get-all-lessons`,
                      { params: { courseId: cid }, headers: { Authorization: `Bearer ${token}` } }
                    );
                    const pl = rr?.data?.data ?? rr?.data ?? [];
                    const flat = Array.isArray(pl) && pl.length && Array.isArray(pl[0]?.lessons)
                      ? pl.flatMap((t: any) => (t.lessons || []))
                      : (Array.isArray(pl) ? pl : []);
                    const total = flat.length;
                    return { cid, total };
                  } catch { return { cid, total: 0 }; }
                }));
                setLessonStats((prev) => {
                  const next = { ...prev };
                  results.forEach(({ cid, total }) => {
                    const cur = next[cid] || { total: 0, attended: 0, unattempted: 0 };
                    next[cid] = { total, attended: cur.attended || 0, unattempted: Math.max(0, total - (cur.attended || 0)) };
                  });
                  return next;
                });
              } catch {}
            }
          }
        } catch {}
      } catch (e: any) {
        const msg = e?.response?.data?.message || e?.message || 'Failed to load enrolled courses.';
        toast({ title: 'Error', description: msg, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchRecent();
  }, [token, toast]);

  // Helpers to render rich content professionally (component scope)
  const getFirstUrl = (detail: any): string | null => {
    if (!detail) return null;
    const fields = ['video_link','file_url','media_url','document_url','attachment','url','link'];
    for (const f of fields) {
      const v = detail[f];
      if (typeof v === 'string' && v.startsWith('http')) return v;
    }
    const desc: string | undefined = detail.description || detail.content || '';
    if (desc && typeof desc === 'string') {
      const m = desc.match(/https?:\/\/\S+/);
      if (m) return m[0];
    }
    return null;
  };

  const isYouTube = (url: string) => /youtube\.com\/watch\?v=|youtu\.be\//i.test(url);
  const extOf = (url: string) => {
    try { const u = new URL(url); return (u.pathname.split('.').pop() || '').toLowerCase(); } catch { return ''; }
  };

  const renderLessonContent = () => {
    if (loadingLessonDetail) {
      return (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      );
    }
    const d = activeLessonDetail || {};
    const url = getFirstUrl(d);
    const ext = url ? extOf(url) : '';
    const description = d.description || d.content || '';

    if (url) {
      if (isYouTube(url)) {
        const embed = url.replace('watch?v=', 'embed/');
        return (
          <div className="w-full">
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
              <iframe className="absolute inset-0 w-full h-full" src={embed} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Lesson Video" />
            </div>
            {description && <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{description}</p>}
          </div>
        );
      }
      if (['mp4','webm','ogg'].includes(ext)) {
        return (
          <div>
            <video className="w-full rounded-lg border border-gray-200" controls src={url} />
            {description && <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{description}</p>}
          </div>
        );
      }
      if (['mp3','wav','aac','ogg'].includes(ext)) {
        return (
          <div>
            <audio className="w-full" controls src={url} />
            {description && <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{description}</p>}
          </div>
        );
      }
      if (['png','jpg','jpeg','gif','webp','svg'].includes(ext)) {
        return (
          <div>
            <img src={url} alt={activeLesson?.title || 'Lesson Image'} className="w-full rounded-lg border border-gray-200 object-contain max-h-[70vh] bg-white" />
            {description && <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{description}</p>}
          </div>
        );
      }
      if (ext === 'pdf') {
        return (
          <div className="w-full">
            <div className="h-[70vh] w-full rounded-lg overflow-hidden border border-gray-200 bg-white">
              <object data={url} type="application/pdf" className="w-full h-full">
                <iframe src={url} className="w-full h-full" title="Lesson PDF" />
              </object>
            </div>
            <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-purple-700 underline">Open PDF in new tab</a>
            {description && <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{description}</p>}
          </div>
        );
      }
      return (
        <div>
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-purple-700 underline">Open attachment</a>
          {description && <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{description}</p>}
        </div>
      );
    }

    return description ? (
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{description}</p>
    ) : (
      <div className="text-gray-500">No additional details.</div>
    );
  };

  // On select course: load lessons from backend
  const handleSelectCourse = async (c: EnrolledCourse) => {
    setSelectedCourse(c);
    setLoadingLessons(true);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/students/get-all-lessons`,
        { params: { courseId: c.courseId }, headers: { Authorization: `Bearer ${token}` } }
      );
      const payload = res?.data?.data ?? res?.data ?? [];
      // Backend groups lessons by teacher: [{ user_id, full_name, profile_image, lessons: [...] }]
      let flat: any[] = [];
      if (Array.isArray(payload) && payload.length && Array.isArray(payload[0]?.lessons)) {
        flat = payload.flatMap((t: any) => (t.lessons || []).map((lesson: any) => ({ ...lesson, _teacher_full_name: t.full_name })));
      } else {
        flat = Array.isArray(payload) ? payload : [];
      }
      const normalized: LessonItem[] = flat.map((x: any) => ({
        id: x.id || x.lesson_id || x._id,
        title: x.title || x.name || 'Untitled Lesson',
        teacher: x.teacher || x.teacher_name || x.created_by_name || x._teacher_full_name,
        status: x.status,
        created_at: x.created_at || x.createdAt,
      }));
      setLessons(normalized);
      // Fetch attended timestamps for these lessons
      try {
        const ids = normalized.map(x => x.id).filter(Boolean);
        if (ids.length > 0) {
          const res2 = await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/api/students/lesson-progress`,
            { params: { lessonIds: ids.join(',') }, headers: { Authorization: `Bearer ${token}` } }
          );
          const payload = res2?.data?.data ?? res2?.data ?? [];
          const map: Record<string, string> = {};
          (Array.isArray(payload) ? payload : []).forEach((row: any) => {
            const lid = row.lessonId || row.lesson_id || row.id;
            const at = row.attended_at || row.updated_at || row.created_at;
            if (lid && at) map[lid] = at;
          });
          setAttendedMap(map);
        } else {
          setAttendedMap({});
        }
      } catch { setAttendedMap({}); }
      // Fallback: update per-course total count immediately so card badges reflect
      setLessonStats((prev) => {
        const prevStats = prev[c.courseId] || { total: 0, attended: 0, unattempted: 0 };
        const total = normalized.length;
        const attended = prevStats.attended || 0;
        return { ...prev, [c.courseId]: { total, attended, unattempted: Math.max(0, total - attended) } };
      });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load lessons for this course.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      setLessons([]);
    } finally {
      setLoadingLessons(false);
    }
  };

  // Session-based: watch currentCourse and load lessons for it
  useEffect(() => {
    if (!currentCourse) return;
    const c = { courseId: currentCourse.courseId, courseTitle: currentCourse.courseTitle } as EnrolledCourse;
    setSelectedCourse(c);
    void handleSelectCourse(c);
    setLessonsIn(false);
    window.requestAnimationFrame(() => setLessonsIn(true));
  }, [currentCourse]);

  // Open a single lesson detail in a modal (professional inline view)
  const openLesson = async (lesson: LessonItem) => {
    setActiveLesson(lesson);
    setShowLessonDialog(true);
    setLoadingLessonDetail(true);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/lessons/${lesson.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const d = res?.data?.data ?? res?.data ?? null;
      setActiveLessonDetail(d);
    } catch (err: any) {
      setActiveLessonDetail(null);
      const msg = err?.response?.data?.message || err?.message || 'Failed to load lesson details.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoadingLessonDetail(false);
    }
  };

  return (
    <>
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-purple-700">Lessons</h1>
        {!currentCourse ? (
          <p className="text-gray-600 mt-1">Please select a course from the Dashboard to view lessons.</p>
        ) : (
          <p className="text-gray-600 mt-1">You are viewing lessons for <span className="font-medium text-purple-800">{currentCourse.courseTitle}</span>.</p>
        )}
      </div>

      {/* Session Detail view */}
      {currentCourse && selectedCourse && (
        <div>
          <div className="flex items-start gap-3">
            <div className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1 text-purple-800">
              <span className="text-sm sm:text-base font-semibold">Lessons – {selectedCourse.courseTitle}</span>
            </div>
          </div>
        </div>
      )}
      {/* Lessons emerging from below */}
      {currentCourse && selectedCourse && (
        <div className={`mt-6 transform transition-all duration-700 ${lessonsIn ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`} style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
          {/* Lesson filter buttons removed as requested */}
          {loadingLessons ? (
            <div className="flex items-center justify-center min-h-[160px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading lessons...</p>
              </div>
            </div>
          ) : lessons.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-6">No lessons have been added for this course yet.</div>
          ) : (
            <div className="max-h-[28rem] overflow-auto p-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {lessons
                  .filter(() => true)
                  .map((l) => {
                  const attendedAt = attendedMap[l.id];
                  const createdAt = l.created_at ? new Date(l.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
                  return (
                  <button key={l.id} type="button" onClick={() => { setPendingLesson(l); setShowConfirmView(true); }} className="text-left mx-auto w-full max-w-[420px] flex flex-col gap-2 rounded-xl border border-purple-400 bg-purple-50 px-4 py-3 hover:bg-purple-100 hover:border-purple-500 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate pr-1 text-sm sm:text-base font-medium text-gray-800">{l.title}</div>
                        {l.teacher && (
                          <div className="text-xs text-gray-500 mt-0.5 truncate">By {l.teacher}</div>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {createdAt && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 text-gray-700 px-2 py-0.5 text-[11px] sm:text-xs">
                              Created: {createdAt}
                            </span>
                          )}
                          {attendedAt ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] sm:text-xs">
                              Attended: {new Date(attendedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 text-rose-700 px-2 py-0.5 text-[11px] sm:text-xs">
                              Unattended
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
                  </button>
                );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    {/* Lesson detail modal (large, professional) */}
    <Dialog open={showLessonDialog} onOpenChange={setShowLessonDialog}>
      <DialogContent className="sm:max-w-4xl w-[95vw] z-[70]">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{activeLesson?.title || 'Lesson'}</DialogTitle>
          {activeLesson?.teacher && (
            <DialogDescription className="flex items-center gap-2">
              By {activeLesson.teacher}
              {activeLesson?.created_at && (
                <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs px-2 py-0.5 rounded-full border border-gray-200 text-gray-600 bg-gray-50">
                  {new Date(activeLesson.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                </span>
              )}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="mt-2 text-sm text-gray-700 min-h-[80px]">{renderLessonContent()}</div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setShowLessonDialog(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Confirm view dialog */}
    <Dialog open={showConfirmView} onOpenChange={setShowConfirmView}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>View lesson?</DialogTitle>
          <DialogDescription>
            We will mark this lesson as attended for your progress.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 text-sm text-gray-700">
          {pendingLesson?.title || 'Selected lesson'}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => { setShowConfirmView(false); setPendingLesson(null); }}>Cancel</Button>
          <Button onClick={async () => {
            const l = pendingLesson; setShowConfirmView(false);
            if (!l) return;
            try {
              // Mark attended in backend
              await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/progress`, {
                progress_name: 'lesson_view',
                lessonId: l.id,
              }, { headers: { Authorization: `Bearer ${token}` } });
              // Update per-lesson attended map immediately
              setAttendedMap((prev) => ({ ...prev, [l.id]: new Date().toISOString() }));
              // Refresh stats for the current course to reflect attended/unattempted
              const cid = selectedCourse?.courseId;
              if (cid) {
                try {
                  const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/lesson-stats`, {
                    params: { courseIds: cid }, headers: { Authorization: `Bearer ${token}` }
                  });
                  const arr = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
                  const row = Array.isArray(arr) ? arr[0] : null;
                  if (row) {
                    const total = Number(row.totalLessons ?? 0);
                    const attended = Number(row.attendedLessons ?? 0);
                    const unattempted = Number(row.unattemptedLessons ?? Math.max(0, total - attended));
                    setLessonStats((prev) => ({ ...prev, [cid]: { total, attended, unattempted } }));
                  }
                } catch {}
              }
              // Also refetch server-side attended timestamps for current list to persist state
              try {
                const ids = lessons.map(x => x.id).filter(Boolean);
                if (ids.length > 0) {
                  const res3 = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/lesson-progress`, {
                    params: { lessonIds: ids.join(',') }, headers: { Authorization: `Bearer ${token}` }
                  });
                  const payload = res3?.data?.data ?? res3?.data ?? [];
                  const map: Record<string, string> = {};
                  (Array.isArray(payload) ? payload : []).forEach((row: any) => {
                    const lid = row.lessonId || row.lesson_id || row.id;
                    const at = row.attended_at || row.updated_at || row.created_at;
                    if (lid && at) map[lid] = at;
                  });
                  setAttendedMap((prev) => ({ ...prev, ...map }));
                }
              } catch {}
            } catch (err: any) {
              const msg = err?.response?.data?.message || err?.message || 'Failed to record progress. Showing local update.';
              // Optimistic update if backend fails so UX remains correct
              const cid = selectedCourse?.courseId;
              if (cid) {
                setLessonStats((prev) => {
                  const cur = prev[cid] || { total: 0, attended: 0, unattempted: 0 };
                  const attended = cur.attended + 1;
                  const unattempted = Math.max(0, cur.unattempted - 1);
                  return { ...prev, [cid]: { total: cur.total, attended, unattempted } };
                });
              }
              // Also mark lesson as attended in the map for immediate UI feedback
              setAttendedMap((prev) => ({ ...prev, [l.id]: new Date().toISOString() }));
              toast({ title: 'Notice', description: msg, variant: 'default' });
            }
            // Open the lesson content
            await openLesson(l);
            setPendingLesson(null);
          }}>Yes, View</Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default StudentLessons;
