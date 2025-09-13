import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { Clock, ChevronLeft, ChevronRight, CheckCircle2, ChevronsLeft, ChevronsRight, PlayCircle, Trophy, XCircle, AlertTriangle } from 'lucide-react';
// Removed filter dropdown imports
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Choice {
  key: string; // A, B, C, D
  text: string;
}

interface Question {
  id: string;
  question: string;
  options: Record<string, string> | string[];
  correct?: string; // not shown to students
  // Optional media support
  type?: 'text' | 'image' | 'video' | 'audio' | 'svg';
  mediaUrl?: string; // image/video/audio/svg URL
  svgContent?: string; // inline SVG markup if provided
  hint?: string;
  image?: string;
  video?: string;
}

interface ExamTitle {
  id: string;
  title: string;
  categories?: string[];
  durationMinutes?: number;
}

const PAGE_SIZE_OPTIONS = [10, 20, 30];
const examStoreKey = (examId: string, category: string) => `exam_answers_${examId}_${category}`;
const examStatusKey = (examId: string) => `exam_status_${examId}`;

const StudentExams: React.FC = () => {
  const { token } = useAuth();
  const { toast } = useToast();

  // Selections
  const [exams, setExams] = useState<ExamTitle[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  // Questions and answers
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> optionKey

  // Pagination
  const [pageSize, setPageSize] = useState<number>(1); // show only one question at a time
  const [currentPage, setCurrentPage] = useState(1);

  // Loading states
  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Timer
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [initialRemainingSec, setInitialRemainingSec] = useState<number | null>(null);
  const [resultScore, setResultScore] = useState<number | null>(null);
  const [resultTotal, setResultTotal] = useState<number | null>(null);
  const [correctMap, setCorrectMap] = useState<Record<string, string> | null>(null); // qid -> correct option key

  // Removed mark-for-review and filter controls

  // Exam start + global estimated minutes from API
  const [examStarted, setExamStarted] = useState(false);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(null);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [missingNumbers, setMissingNumbers] = useState<number[]>([]);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [resultItems, setResultItems] = useState<Array<{ question: string; selected: string | null; correct: string; isCorrect: boolean }>>([]);
  const [resultPercentage, setResultPercentage] = useState<number | null>(null);
  // Exam extras
  const [examNotes, setExamNotes] = useState<Array<{ id: string; title: string; content: string; note_type?: string; is_mandatory?: boolean }>>([]);
  const [examRules, setExamRules] = useState<Array<{ id: string; title: string; description: string; is_mandatory?: boolean }>>([]);
  // Per-question media answers
  const [answerMedia, setAnswerMedia] = useState<Record<string, { url: string; mime: string }>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Record<string, Blob[]>>({});
  // Recorder Dialog state
  const [recorderOpen, setRecorderOpen] = useState<boolean>(false);
  const [recorderQid, setRecorderQid] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const recStreamRef = useRef<MediaStream | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const playbackRef = useRef<HTMLVideoElement | null>(null);
  const [recordElapsedSec, setRecordElapsedSec] = useState<number>(0);
  const recordTimerRef = useRef<number | null>(null);
  const [canPlayRecorded, setCanPlayRecorded] = useState<boolean>(false);
  // Ensure stream attaches to live video when dialog opens
  useEffect(() => {
    try {
      if (recorderOpen && recStreamRef.current && liveVideoRef.current && !recordedUrl) {
        (liveVideoRef.current as any).srcObject = recStreamRef.current;
        liveVideoRef.current.play().catch(() => {});
      }
    } catch {}
  }, [recorderOpen, recordedUrl]);
  // Window focus/visibility enforcement
  const [hasFocus, setHasFocus] = useState<boolean>(true);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  // Removed anti-cheating resume popup state
  const [showFocusWarning, setShowFocusWarning] = useState<boolean>(false);
  const [focusLock, setFocusLock] = useState<boolean>(false);
  const [resumeSeconds, setResumeSeconds] = useState<number>(0);
  const resumeTimerRef = useRef<number | null>(null);
  // Flag to re-enter fullscreen on next user click if ESC was pressed
  const [needsFsReentry, setNeedsFsReentry] = useState<boolean>(false);
  const [resultMeta, setResultMeta] = useState<{ obtained?: number | null; total?: number | null } | null>(null);
  // Student level (for target details). Try to read from storage; default Beginner
  const [studentLevel, setStudentLevel] = useState<'Beginner' | 'Intermediate' | 'Pro' | 'Master'>('Beginner');
  useEffect(() => {
    try {
      const lvl = localStorage.getItem('student_level');
      if (lvl === 'Intermediate' || lvl === 'Pro' || lvl === 'Master' || lvl === 'Beginner') setStudentLevel(lvl);
    } catch {}
  }, []);
  
  // Helpers to read/write global exam status
  const getExamStatus = (examId: string): { completed?: boolean; dismissed?: boolean; lastResult?: any } | null => {
    try {
      const raw = localStorage.getItem(examStatusKey(examId));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };
  const isTwitterUrl = (url?: string) => !!url && /(twitter\.com|x\.com)\//i.test(url);
  const toTwitterEmbed = (url: string) => {
    // Use twitframe to embed any Tweet (including those with videos)
    try {
      const encoded = encodeURIComponent(url);
      return `https://twitframe.com/show?url=${encoded}`;
    } catch { return url; }
  };
  const isDailymotionUrl = (url?: string) => !!url && /dailymotion\.com\//i.test(url);
  const toDailymotionEmbed = (url: string) => {
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/').filter(Boolean);
      const idx = parts.indexOf('video');
      const id = idx >= 0 ? parts[idx + 1] : (parts[0] || '');
      return id ? `https://www.dailymotion.com/embed/video/${id}` : url;
    } catch { return url; }
  };
  const isFacebookUrl = (url?: string) => !!url && /(facebook\.com|fb\.watch)\//i.test(url);
  const toFacebookEmbed = (url: string) => {
    try {
      const encoded = encodeURIComponent(url);
      return `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=0&width=1280`;
    } catch { return url; }
  };
  const isTikTokUrl = (url?: string) => !!url && /tiktok\.com\//i.test(url);
  const toTikTokEmbed = (url: string) => {
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/').filter(Boolean);
      // Expected: /@user/video/{id}
      const vidIdx = parts.indexOf('video');
      const id = vidIdx >= 0 ? parts[vidIdx + 1] : parts.pop();
      return id ? `https://www.tiktok.com/embed/v2/${id}` : url;
    } catch { return url; }
  };

  // --- Media helpers (embedding + zoom + fullscreen) ---
  const isYouTubeUrl = (url?: string) => !!url && /(youtube\.com|youtu\.be)\//i.test(url);
  const toYouTubeEmbed = (url: string) => {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) {
        const id = u.pathname.replace('/', '');
        return id ? `https://www.youtube.com/embed/${id}` : url;
      }
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
      // shorts or embed patterns
      const parts = u.pathname.split('/').filter(Boolean);
      const idx = parts.findIndex(p => p === 'shorts' || p === 'embed');
      const vid = idx >= 0 && parts[idx + 1] ? parts[idx + 1] : parts[0];
      return vid ? `https://www.youtube.com/embed/${vid}` : url;
    } catch { return url; }
  };
  const isVimeoUrl = (url?: string) => !!url && /vimeo\.com\//i.test(url);
  const toVimeoEmbed = (url: string) => {
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/').filter(Boolean);
      const id = parts.pop();
      return id ? `https://player.vimeo.com/video/${id}` : url;
    } catch { return url; }
  };

  // Zoom factor per question (images/videos)
  const [mediaZoom, setMediaZoom] = useState<Record<string, number>>({});
  const getZoom = (qid: string) => mediaZoom[qid] ?? 1;
  const setZoom = (qid: string, factor: number) => setMediaZoom(z => ({ ...z, [qid]: Math.max(0.5, Math.min(3, Number.isFinite(factor) ? factor : 1)) }));
  const requestElFullscreen = async (el: HTMLElement | null) => {
    try {
      if (!el) return;
      const anyEl: any = el;
      const req = anyEl.requestFullscreen || anyEl.webkitRequestFullscreen || anyEl.msRequestFullscreen;
      if (!req) return;
      const docAny: any = document as any;
      const exitFs = document.exitFullscreen || docAny.webkitExitFullscreen || docAny.msExitFullscreen;
      if (document.fullscreenElement && document.fullscreenElement !== el && exitFs) {
        try { await exitFs.call(document); } catch {}
      }
      try { await req.call(anyEl); } catch {}
    } catch {}
  };

  // Track which image is in fullscreen to relax sizing constraints
  const [fullscreenImgQid, setFullscreenImgQid] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ qid: string; src: string } | null>(null);
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) {
        setFullscreenImgQid(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
    };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs as any);
    document.addEventListener('MSFullscreenChange', onFs as any);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs as any);
      document.removeEventListener('MSFullscreenChange', onFs as any);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Explicit user-gesture fullscreen (no throttle)
  const requestFullscreenImmediate = () => {
    try {
      const el: any = pageContainerRef.current || document.documentElement;
      if (!el) return;
      const active = !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).msFullscreenElement);
      if (!active) {
        let p: any = undefined;
        if (el.requestFullscreen) p = el.requestFullscreen.call(el);
        else if (el.webkitRequestFullscreen) p = el.webkitRequestFullscreen();
        else if (el.msRequestFullscreen) p = el.msRequestFullscreen();
        if (p && typeof p.catch === 'function') { void p.catch(() => {}); }
      }
    } catch {/* noop */}
  };
  const setExamStatus = (examId: string, updates: Partial<{ completed: boolean; dismissed: boolean; lastResult: any }>) => {
    try {
      const cur = getExamStatus(examId) || {};
      localStorage.setItem(examStatusKey(examId), JSON.stringify({ ...cur, ...updates }));
    } catch {}
  };
  
  // Close result and reset state
  const handleCloseResult = () => {
    setShowResultDialog(false);
    try {
      const lastRaw = localStorage.getItem('last_exam_selection');
      const lastSel = lastRaw ? JSON.parse(lastRaw) : null;
      const key = selectedExamId ? examStoreKey(selectedExamId, (lastSel?.examId === selectedExamId ? (lastSel?.category || 'all') : (selectedCategory || 'all'))) : null;
      if (key) {
        const prev = localStorage.getItem(key);
        const prevObj = prev ? JSON.parse(prev) : {};
        localStorage.setItem(key, JSON.stringify({ ...prevObj, resultDismissed: true }));
      }
      // Remove last selection so Questions page is reset
      localStorage.removeItem('last_exam_selection');
    } catch {}
    // Reset local UI state
    setSelectedExamId('');
    setSelectedCategory('');
    setQuestions([]);
    setAnswers({});
    setExamStarted(false);
    setSubmitted(false);
    setRemainingSec(null);
    setInitialRemainingSec(null);
  };

  // Helper: update localStorage exams list to reflect attempted + percentage
  const updateExamsListAttempted = (examId: string, percentage?: number | null) => {
    try {
      const raw = localStorage.getItem('student_exams_list');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const apply = (obj: any) => {
        if (!obj) return;
        if (Array.isArray(obj.items)) {
          // items may be flat or teacher[] with nested exams
          if (obj.items.length && Array.isArray(obj.items[0]?.exams)) {
            obj.items.forEach((t: any) => {
              if (Array.isArray(t.exams)) {
                t.exams.forEach((ex: any) => {
                  if (ex.id === examId) {
                    ex.hasAttempted = true;
                    if (typeof percentage === 'number') ex.percentage = Math.round(percentage);
                  }
                });
              }
            });
          } else {
            obj.items = obj.items.map((ex: any) => ex?.id === examId ? { ...ex, hasAttempted: true, percentage: (typeof percentage === 'number' ? Math.round(percentage) : ex?.percentage) } : ex);
          }
        }
      };
      apply(parsed);
      localStorage.setItem('student_exams_list', JSON.stringify(parsed));
    } catch {}
  };

  // Helper: refresh exams list from server to sync percentage
  const refreshExamsFromServer = async () => {
    try {
      const raw = localStorage.getItem('student_exams_list');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const courseId = parsed?.courseId;
      if (!courseId) return;
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/exams/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const serverItems = res.data?.data || [];
      // Keep existing shape: store under items; no teacher grouping here
      const updated = { ...parsed, items: serverItems };
      localStorage.setItem('student_exams_list', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to refresh exams from server', e);
    }
  };

  // Exam context details (parsed from Exams tab storage)
  const [examContext, setExamContext] = useState<{ courseTitle?: string; teacher?: string; category?: string; total_questions?: number; rating?: number; complexity?: string } | null>(null);

  // Pending scroll target for navigator
  const pendingScrollQidRef = useRef<string | null>(null);

  // Fetch student exams on mount (only once)
  const didFetchRef = useRef(false);
  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    setLoadingExams(true);
    try {
      const raw = localStorage.getItem('student_exams_list');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.items)) {
          setExams(parsed.items);
        }
      }
    } catch {}
    setLoadingExams(false);
    // Resume last selection
    try {
      const raw = localStorage.getItem('last_exam_selection');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.examId) setSelectedExamId(parsed.examId);
        if (parsed?.category) setSelectedCategory(parsed.category);
      }
    } catch {}
  }, [token, toast]);

  // Parse exam context details from stored exams, based on selected exam id
  useEffect(() => {
    try {
      const raw = localStorage.getItem('student_exams_list');
      if (!raw || !selectedExamId) { setExamContext(null); return; }
      const parsed = JSON.parse(raw);
      const items: any[] = Array.isArray(parsed?.items) ? parsed.items : [];
      let flat: any[] = [];
      if (items.length && Array.isArray(items[0]?.exams)) {
        flat = items.flatMap((teacher: any) => (teacher.exams || []).map((ex: any) => ({
          id: ex.id,
          category: ex.category,
          total_questions: ex.total_questions,
          rating: ex.rating,
          complexity: ex.complexity,
          teacher: teacher.full_name || teacher.display_name,
          courseTitle: parsed?.courseTitle,
        })));
      } else {
        flat = items;
      }
      const found = flat.find((f: any) => f.id === selectedExamId);
      if (found) {
        setExamContext({
          courseTitle: found.courseTitle || parsed?.courseTitle,
          teacher: found.teacher,
          category: found.category,
          total_questions: found.total_questions,
          rating: found.rating,
          complexity: found.complexity,
        });
      } else {
        setExamContext(null);
      }
    } catch {
      setExamContext(null);
    }
  }, [selectedExamId]);

  // After page changes or questions render, scroll to the target question card if requested
  useEffect(() => {
    if (!pendingScrollQidRef.current) return;
    const qid = pendingScrollQidRef.current;
    // Use rAF to wait until DOM has painted
    const handle = window.requestAnimationFrame(() => {
      const el = document.getElementById(`q-${qid}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      pendingScrollQidRef.current = null;
    });
    return () => window.cancelAnimationFrame(handle);
  }, [currentPage]);

  // When exam changes, fetch categories + duration
  useEffect(() => {
    const loadExamMeta = async () => {
      if (!selectedExamId || !token) return;
      try {
        // Check if this exam was completed previously and restore result UI
        try {
          const lastRaw = localStorage.getItem('last_exam_selection');
          const lastSel = lastRaw ? JSON.parse(lastRaw) : null;
          const key = examStoreKey(selectedExamId, (lastSel?.examId === selectedExamId ? (lastSel?.category || 'all') : (selectedCategory || 'all')));
          const savedRaw = localStorage.getItem(key);
          const status = getExamStatus(selectedExamId);
          if (status?.completed && status?.dismissed) {
            // Fully dismissed, keep page reset and do not show popup or fetch
            setExamStarted(false);
            setSubmitted(true);
            setRemainingSec(null);
            setInitialRemainingSec(null);
            setQuestions([]);
            return;
          }
          if (savedRaw) {
            const saved = JSON.parse(savedRaw);
            if (saved?.examCompleted) {
              setExamStarted(false);
              setSubmitted(true);
              setRemainingSec(null);
              setInitialRemainingSec(null);
              setQuestions([]);
              // If previously dismissed or global dismissed, do not reopen dialog
              if (saved?.resultDismissed || status?.dismissed) {
                return;
              }
              if (Array.isArray(saved.lastResult?.results)) setResultItems(saved.lastResult.results);
              if (typeof saved.lastResult?.percentage === 'number') setResultPercentage(saved.lastResult.percentage);
              if (typeof saved.lastResult?.obtainedScore === 'number' && typeof saved.lastResult?.totalScore === 'number') {
                setResultMeta({ obtained: saved.lastResult.obtainedScore, total: saved.lastResult.totalScore });
                setResultScore(saved.lastResult.obtainedScore);
                setResultTotal(saved.lastResult.totalScore);
              }
              // Also use global status lastResult if present
              if (status?.lastResult && typeof status.lastResult?.percentage === 'number') {
                setResultPercentage(status.lastResult.percentage);
              }
              setShowResultDialog(true);
              return; // Do not fetch meta/questions
            }
          }
        } catch {}
        // 1) Early restore from localStorage to continue seamlessly on refresh (compute locally to avoid async race)
        let restoredExamStarted: boolean | null = null;
        let restoredRemaining: number | null = null;
        let restoredInitial: number | null = null;
        let restoredAnswers: Record<string, string> | null = null;
        let restoredPageSize: number | null = null;
        let restoredCurrentPage: number | null = null;
        try {
          const rawLast = localStorage.getItem('last_exam_selection');
          const last = rawLast ? JSON.parse(rawLast) : null;
          const effectiveCategory = last?.examId === selectedExamId ? (last?.category || 'all') : (selectedCategory || 'all');
          const key = examStoreKey(selectedExamId, effectiveCategory);
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (typeof parsed.examStarted === 'boolean') restoredExamStarted = parsed.examStarted;
            if (typeof parsed.remainingSec === 'number') restoredRemaining = parsed.remainingSec;
            if (typeof parsed.initialRemainingSec === 'number') restoredInitial = parsed.initialRemainingSec;
            if (parsed && parsed.answers && typeof parsed.answers === 'object') restoredAnswers = parsed.answers;
            if (parsed && parsed.answerMedia && typeof parsed.answerMedia === 'object') setAnswerMedia(parsed.answerMedia);
            if (parsed && PAGE_SIZE_OPTIONS.includes(parsed.pageSize)) restoredPageSize = parsed.pageSize;
            if (typeof parsed.currentPage === 'number') restoredCurrentPage = parsed.currentPage;
          }
        } catch {}

        // Fetch duration or end time
        const metaRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/exams/${selectedExamId}` , {
          headers: { Authorization: `Bearer ${token}` }
        });
        const meta = metaRes.data?.data;
        // Prefer server-provided remainingSeconds; otherwise compute from end_time; fallback to durationMinutes
        let initialRemaining = meta?.remainingSeconds as number | undefined;
        if (initialRemaining == null && meta?.end_time) {
          const end = new Date(meta.end_time).getTime();
          initialRemaining = Math.max(0, Math.floor((end - Date.now()) / 1000));
        }
        if (initialRemaining == null && meta?.durationMinutes) {
          initialRemaining = Math.max(0, (meta?.durationMinutes ?? 0) * 60);
        }
        // Apply restored values synchronously; fall back to meta if none restored
        const finalInitial = restoredInitial ?? (initialRemaining ?? null);
        const finalRemaining = restoredRemaining ?? (initialRemaining ?? null);
        // If we have a restored remaining time but no explicit started flag, assume we were started
        if (restoredExamStarted != null) {
          setExamStarted(restoredExamStarted);
        } else if (finalRemaining != null && finalRemaining > 0) {
          setExamStarted(true);
        }
        setInitialRemainingSec(finalInitial);
        setRemainingSec(finalRemaining);
        if (restoredAnswers) setAnswers(restoredAnswers);
        if (restoredPageSize != null) setPageSize(restoredPageSize);
        if (restoredCurrentPage != null) setCurrentPage(restoredCurrentPage);

        // Do not clear questions here to avoid races with fetchQuestions on refresh
      } catch (e) {
        console.error(e);
        toast({ title: 'Error', description: 'Failed to load exam details.', variant: 'destructive' });
      }
    };
    loadExamMeta();
  }, [selectedExamId, exams, token, toast]);

  // When category changes (or none), fetch questions for the exam
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!selectedExamId || !token) return;
      // Skip fetching if exam is completed or dismissed (global or per-category)
      try {
        const lastRaw = localStorage.getItem('last_exam_selection');
        const lastSel = lastRaw ? JSON.parse(lastRaw) : null;
        const key = examStoreKey(selectedExamId, (lastSel?.examId === selectedExamId ? (lastSel?.category || 'all') : (selectedCategory || 'all')));
        const savedRaw = localStorage.getItem(key);
        const status = getExamStatus(selectedExamId);
        if (status?.completed && status?.dismissed) return;
        if (savedRaw) {
          const saved = JSON.parse(savedRaw);
          if (saved?.examCompleted || saved?.resultDismissed) {
            return;
          }
        }
      } catch {}
      setLoadingQuestions(true);
      try {
        // Prefer category from state; if empty, try last_exam_selection to avoid a blank fetch on refresh
        let effectiveCategory = selectedCategory;
        if (!effectiveCategory) {
          try {
            const rawLast = localStorage.getItem('last_exam_selection');
            const last = rawLast ? JSON.parse(rawLast) : null;
            if (last?.examId === selectedExamId && last?.category) {
              effectiveCategory = last.category;
              // Also reflect it in state to keep UI consistent
              setSelectedCategory(last.category);
            }
          } catch {}
        }

        const base = `${import.meta.env.VITE_BACKEND_URL}/api/exams/${selectedExamId}/questions`;
        const url = effectiveCategory ? `${base}?category=${encodeURIComponent(effectiveCategory)}` : base;
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = Array.isArray(res.data?.data) ? res.data.data : [];
        // Normalize to our Question interface (supports text/image/video/audio/svg)
        const normalized: Question[] = data.map((q: any) => {
          const type: Question['type'] = q.type
            || (q.image || q.image_url ? 'image'
              : q.video || q.video_url ? 'video'
              : q.audio || q.audio_url ? 'audio'
              : q.svg || q.svg_content ? 'svg'
              : 'text');
          const mediaUrl = q.mediaUrl || q.image || q.image_url || q.video || q.video_url || q.audio || q.audio_url || undefined;
          const svgContent = q.svg || q.svg_content || undefined;
          return {
            id: q.id,
            question: q.text ?? q.question ?? q.title ?? '',
            options: q.options,
            hint: q.hint,
            image: q.image,
            video: q.video,
            type,
            mediaUrl,
            svgContent,
          } as Question;
        });
        setQuestions(normalized);
        // Extract exam-level notes/rules if present on first item
        try {
          const first = (res.data?.data && Array.isArray(res.data.data) && res.data.data[0]) ? res.data.data[0] : null;
          const notes = Array.isArray(first?.exam_notes) ? first.exam_notes : [];
          const rules = Array.isArray(first?.exam_rules) ? first.exam_rules : [];
          setExamNotes(notes);
          setExamRules(rules);
        } catch {}
        // Pull global estimated time in minutes from the API response (same on each question)
        const estMin = data.length > 0 && typeof data[0]?.estimated_time_to_complete === 'number'
          ? data[0].estimated_time_to_complete
          : null;
        setEstimatedMinutes(estMin);
        // Try to restore previous session
        try {
          const keyPrimary = examStoreKey(selectedExamId, (effectiveCategory || selectedCategory || 'all'));
          let raw = localStorage.getItem(keyPrimary);
          // Fallback: if nothing yet and we do have a recently stored category
          if (!raw && effectiveCategory && effectiveCategory !== selectedCategory) {
            const keyFallback = examStoreKey(selectedExamId, (effectiveCategory || 'all'));
            raw = localStorage.getItem(keyFallback);
          }
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.answers && typeof parsed.answers === 'object') {
              setAnswers(parsed.answers);
            } else {
              setAnswers({});
            }
            // Always force pageSize = 1 for single-question view
            setPageSize(1);
            if (parsed && typeof parsed.currentPage === 'number') {
              // Clamp to bounds after considering loaded questions
              const totalPages = Math.max(1, Math.ceil(normalized.length / 1));
              setCurrentPage(Math.min(totalPages, Math.max(1, parsed.currentPage)));
            } else {
              setCurrentPage(1);
            }
            if (parsed && typeof parsed.examStarted === 'boolean') {
              setExamStarted(parsed.examStarted);
            }
            if (parsed && typeof parsed.remainingSec === 'number') {
              setRemainingSec(parsed.remainingSec);
              if (parsed.initialRemainingSec != null) setInitialRemainingSec(parsed.initialRemainingSec);
            }
          } else {
            setAnswers({});
            setPageSize(1);
            setCurrentPage(1);
          }
        } catch {
          setAnswers({});
          setPageSize(1);
          setCurrentPage(1);
        }
        // Removed mark-for-review reset
      } catch (e) {
        console.error(e);
        toast({ title: 'Error', description: 'Failed to load questions.', variant: 'destructive' });
      } finally {
        setLoadingQuestions(false);
      }
    };
    fetchQuestions();
  }, [selectedExamId, selectedCategory, token, toast]);

  // Utility: best-effort request fullscreen on the container (throttled, swallow rejections)
  const lastFsAttemptRef = useRef<number>(0);
  const requestFullscreen = () => {
    try {
      const now = Date.now();
      if (now - lastFsAttemptRef.current < 1200) return; // throttle attempts
      lastFsAttemptRef.current = now;
      const el: any = pageContainerRef.current || document.documentElement;
      if (!el) return;
      const active = !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).msFullscreenElement);
      if (!active) {
        let p: any = undefined;
        if (el.requestFullscreen) p = el.requestFullscreen.call(el);
        else if (el.webkitRequestFullscreen) p = el.webkitRequestFullscreen();
        else if (el.msRequestFullscreen) p = el.msRequestFullscreen();
        if (p && typeof p.catch === 'function') { void p.catch(() => {}); } else { /* non-promise vendor */ }
      }
    } catch {/* noop */}
  };

  // Enforce fullscreen during exam: prevent ESC; mark re-entry needed and wait for next user click
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Escape' || e.key === 'Esc') && examStarted && !submitted) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if ((e.key === 'Escape' || e.key === 'Esc') && examStarted && !submitted) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onFsChange = () => {
      const active = !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).msFullscreenElement);
      if (!active && examStarted && !submitted) {
        // Do NOT call requestFullscreen here (no user gesture). Mark to re-enter on next click.
        setNeedsFsReentry(true);
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    window.addEventListener('keyup', onKeyUp, { capture: true });
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange as any);
    document.addEventListener('MSFullscreenChange', onFsChange as any);
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true } as any);
      window.removeEventListener('keyup', onKeyUp, { capture: true } as any);
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange as any);
      document.removeEventListener('MSFullscreenChange', onFsChange as any);
    };
  }, [examStarted, submitted]);

  // Suppress noisy unhandledrejection for fullscreen permission checks
  useEffect(() => {
    const handler = (ev: PromiseRejectionEvent) => {
      try {
        const msg = (ev?.reason && (ev.reason.message || String(ev.reason))) || '';
        if (typeof msg === 'string' && msg.toLowerCase().includes('permissions check failed')) {
          ev.preventDefault();
        }
      } catch {}
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  // Track focus/visibility (anti-cheat disabled)
  useEffect(() => {
    const onFocus = () => {
      setHasFocus(true);
      // no-op for anti-cheat disabled
    };
    const onBlur = () => {
      setHasFocus(false);
      // anti-cheat disabled: do not lock or show popup
    };
    const onVisibility = () => {
      const visible = document.visibilityState === 'visible';
      setIsVisible(visible);
      // anti-cheat disabled
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    // Initialize state
    onVisibility();
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [examStarted, submitted]);

  // Anti-cheat resume countdown disabled
  useEffect(() => {
    if (resumeTimerRef.current) { window.clearInterval(resumeTimerRef.current); resumeTimerRef.current = null; }
    setResumeSeconds(0);
  }, [focusLock, hasFocus, isVisible]);

  // Removed beforeunload warning to allow seamless refresh/resume

  // Countdown timer (starts only after examStarted)
  useEffect(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (remainingSec == null || !examStarted || submitted) return;
    timerRef.current = window.setInterval(() => {
      setRemainingSec((s) => {
        if (s == null) return s as any;
        const next = Math.max(0, s - 1);
        if (next === 0) {
          // Time over: auto-submit once
          if (!submitted) {
            // Prevent multiple triggers by clearing timer first
            if (timerRef.current) {
              window.clearInterval(timerRef.current);
              timerRef.current = null;
            }
            // Trigger auto submit (non-blocking)
            setTimeout(() => handleSubmit(true), 0);
          }
        }
        return next;
      });
    }, 1000) as unknown as number;
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [remainingSec, examStarted, submitted]);

  // Persist answers and state to localStorage (also exam start + remaining time)
  useEffect(() => {
    if (!selectedExamId) return;
    const key = examStoreKey(selectedExamId, (selectedCategory || 'all'));
    try {
      const prevRaw = localStorage.getItem(key);
      const prevObj = prevRaw ? JSON.parse(prevRaw) : {};
      // If already completed, do not overwrite completion marker/state
      if (prevObj?.examCompleted) {
        localStorage.setItem('last_exam_selection', JSON.stringify({ examId: selectedExamId, category: selectedCategory }));
        return;
      }
      const payload = {
        ...prevObj, // keep any other fields
        answers,
        answerMedia,
        pageSize,
        currentPage,
        examStarted,
        remainingSec,
        initialRemainingSec,
        ts: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch {}
    try { localStorage.setItem('last_exam_selection', JSON.stringify({ examId: selectedExamId, category: selectedCategory })); } catch {}
  }, [answers, pageSize, currentPage, examStarted, remainingSec, initialRemainingSec, selectedExamId, selectedCategory]);

  const totalQuestions = questions?.length || 0;
  const pageCount = Math.max(1, Math.ceil(totalQuestions / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(totalQuestions, startIndex + pageSize);
  const currentQuestions = useMemo(() => questions.slice(startIndex, endIndex), [questions, startIndex, endIndex]);

  const handleSelectAnswer = (questionId: string, optionKey: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionKey }));
  };

  // Clear local caches for this exam (answers/state + per-question timers)
  const clearExamLocalCache = useCallback(() => {
    try {
      if (selectedExamId) {
        const key = examStoreKey(selectedExamId, (selectedCategory || 'all'));
        localStorage.removeItem(key);
        const tKey = `question_timers_${selectedExamId}`;
        localStorage.removeItem(tKey);
      }
    } catch {}
  }, [selectedExamId, selectedCategory]);

  const formatTime = (sec: number | null) => {
    if (sec == null) return '--:--';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  };

  const handleStartExam = () => {
    if (submitted) return;
    // If we don't yet have remainingSec, derive from estimatedMinutes
    if (remainingSec == null) {
      if (estimatedMinutes != null) {
        const sec = Math.max(0, Math.floor(estimatedMinutes * 60));
        setRemainingSec(sec);
        setInitialRemainingSec(sec);
      }
    }
    setExamStarted(true);
    // Try enter fullscreen for focused experience
    try {
      requestFullscreen();
    } catch {}
    setCurrentPage(1);
    // Scroll to first question after render
    requestAnimationFrame(() => {
      const el = document.getElementById('q-' + (questions[0]?.id || ''));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleRequestStart = () => {
    if (submitted || questions.length === 0 || examStarted) return;
    setShowStartConfirm(true);
  };

  const computeMissingNumbers = (): number[] => {
    if (!questions || questions.length === 0) return [];
    const arr: number[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!answers[q.id]) arr.push(i + 1);
    }
    return arr;
  };

  const handleRequestSubmit = async () => {
    if (!selectedExamId) return;
    if (submitted) return;
    const missing = computeMissingNumbers();
    setMissingNumbers(missing);
    setShowSubmitConfirm(true);
  };

  const handleSubmit = async (auto = false) => {
    if (!selectedExamId) return;
    if (submitted) return;
    setSubmitting(true);
    try {
      // Build ordered answers matching backend expectation: one object per question index
      const ordered = questions.map((q) => ({ [q.id]: answers[q.id] ?? null }));
      const payload = {
        questions: ordered,
        auto,
        media: answerMedia,
      };
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/exams/${selectedExamId}/submit`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmitted(true);
      // Read result if provided
      const data = res.data?.data || {};
      // Support both legacy {score,total} and new {obtainedScore,totalScore,percentage,results}
      if (typeof data.score === 'number') setResultScore(data.score);
      if (typeof data.total === 'number') setResultTotal(data.total);
      if (typeof data.obtainedScore === 'number') setResultScore(data.obtainedScore);
      if (typeof data.totalScore === 'number') setResultTotal(data.totalScore);
      if (typeof data.percentage === 'number') setResultPercentage(data.percentage);
      if (Array.isArray(data.results)) setResultItems(data.results);
      if (data.correctAnswers && typeof data.correctAnswers === 'object') {
        setCorrectMap(data.correctAnswers as Record<string, string>);
      }
      setResultMeta({ obtained: (data.obtainedScore ?? data.score) ?? null, total: (data.totalScore ?? data.total) ?? null });
      // Open result dialog BEFORE clearing UI (force)
      setShowResultDialog(true);
      // Update Exams list cache so the Exams tab reflects attempted + percentage
      const pct = typeof data.percentage === 'number' ? data.percentage : (typeof data.obtainedScore === 'number' && typeof data.totalScore === 'number' && data.totalScore > 0 ? (data.obtainedScore / data.totalScore) * 100 : null);
      updateExamsListAttempted(selectedExamId, pct);
      // Also refresh from server to sync
      await refreshExamsFromServer();

      // Persist completion flag and last result
      try {
        const lastRaw = localStorage.getItem('last_exam_selection');
        const lastSel = lastRaw ? JSON.parse(lastRaw) : null;
        const key = examStoreKey(selectedExamId, (lastSel?.examId === selectedExamId ? (lastSel?.category || 'all') : (selectedCategory || 'all')));
        const prev = localStorage.getItem(key);
        const prevObj = prev ? JSON.parse(prev) : {};
        const lastResult = { results: data.results, obtainedScore: data.obtainedScore ?? data.score, totalScore: data.totalScore ?? data.total, percentage: pct };
        localStorage.setItem(key, JSON.stringify({ ...prevObj, examCompleted: true, resultDismissed: false, lastResult, answers: {}, examStarted: false, remainingSec: null, initialRemainingSec: null }));
        // Also set global status so other categories won't reopen it
        setExamStatus(selectedExamId, { completed: true, dismissed: false, lastResult });
      } catch {}

      // Clear questions from page
      setQuestions([]);
      setAnswers({});
      setExamStarted(false);
      toast({ title: 'Submitted', description: auto ? 'Time is over. Your exam was auto-submitted.' : 'Your exam has been submitted.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to submit exam. Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const timeTaken = useMemo(() => {
    if (initialRemainingSec == null || remainingSec == null) return null;
    const diff = Math.max(0, initialRemainingSec - remainingSec);
    return diff;
  }, [initialRemainingSec, remainingSec]);

  // Timer progress percentage (0-100)
  const progressPercent = useMemo(() => {
    if (initialRemainingSec == null || remainingSec == null || initialRemainingSec <= 0) return 0;
    const passed = Math.max(0, initialRemainingSec - remainingSec);
    return Math.min(100, Math.round((passed / initialRemainingSec) * 100));
  }, [initialRemainingSec, remainingSec]);

  // Dynamic color for progress bar
  const progressColorClass = useMemo(() => {
    const p = progressPercent;
    if (p < 50) return 'bg-emerald-500';
    if (p < 75) return 'bg-yellow-400';
    if (p < 90) return 'bg-orange-500';
    return 'bg-red-600';
  }, [progressPercent]);
  const progressGlowClass = useMemo(() => (progressPercent >= 80 ? 'shadow-lg shadow-red-400/50' : ''), [progressPercent]);

  // Elapsed time (for tooltip on the global progress bar)
  const elapsedSec = useMemo(() => {
    if (initialRemainingSec == null || remainingSec == null) return null;
    return Math.max(0, initialRemainingSec - remainingSec);
  }, [initialRemainingSec, remainingSec]);

  // Per-question timers (accumulate time spent per question)
  const [questionTimers, setQuestionTimers] = useState<Record<string, number>>({});
  const currentQid = currentQuestions[0]?.id;
  const timersKey = useMemo(() => (selectedExamId ? `question_timers_${selectedExamId}` : null), [selectedExamId]);

  // Load persisted timers for this exam
  useEffect(() => {
    if (!timersKey) return;
    try {
      const raw = localStorage.getItem(timersKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        // Only keep timers for currently available questions to avoid bloat
        const ids = new Set((questions || []).map(q => q.id));
        const next: Record<string, number> = {};
        Object.keys(parsed).forEach((k) => {
          if (ids.has(k)) next[k] = Number(parsed[k]) || 0;
        });
        setQuestionTimers(next);
      }
    } catch {}
  }, [timersKey, questions]);
  useEffect(() => {
    if (!examStarted || submitted || !currentQid) return;
    const id = window.setInterval(() => {
      setQuestionTimers((prev) => {
        const next = { ...prev, [currentQid]: (prev[currentQid] || 0) + 1 };
        try { if (timersKey) localStorage.setItem(timersKey, JSON.stringify(next)); } catch {}
        return next;
      });
    }, 1000);
    return () => { window.clearInterval(id); };
  }, [examStarted, submitted, currentQid, timersKey]);

  const renderOptions = (q: Question) => {
    const opts: Choice[] = Array.isArray(q.options)
      ? (q.options as string[]).map((t, idx) => ({ key: String.fromCharCode(65 + idx), text: t }))
      : Object.entries(q.options as Record<string, string>).map(([key, text]) => ({ key, text }));
    // Determine layout based on longest option text length
    const longest = opts.reduce((m, o) => Math.max(m, (o.text || '').length), 0);
    const layout: 'single' | 'two' | 'stack' = longest <= 24 ? 'single' : (longest <= 64 ? 'two' : 'stack');
    const gridClass = layout === 'single'
      ? 'grid gap-2'
      : layout === 'two'
        ? 'grid grid-cols-2 gap-2'
        : 'grid grid-cols-1 gap-2';
    const gridStyle = layout === 'single' ? { gridTemplateColumns: `repeat(${opts.length}, minmax(0,1fr))` } as React.CSSProperties : undefined;
    return (
      <div className={gridClass} style={gridStyle}>
        {opts.map(opt => {
          const selected = answers[q.id] === opt.key;
          const isSubmitted = submitted;
          const correctKey = correctMap?.[q.id];
          const isCorrect = isSubmitted && correctKey === opt.key;
          const isWrongSelected = isSubmitted && selected && correctKey && correctKey !== opt.key;
          return (
            <label
              key={opt.key}
              className={cn(
                'flex items-center gap-2 rounded-md border cursor-pointer transition',
                layout === 'single' ? 'p-2 sm:p-3' : 'p-3',
                isSubmitted
                  ? isCorrect
                    ? 'border-green-500 bg-green-50'
                    : isWrongSelected
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200'
                  : selected
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
              )}
              onClick={() => handleSelectAnswer(q.id, opt.key)}
            >
              <input
                type="radio"
                name={`q-${q.id}`}
                className="h-4 w-4 text-purple-600"
                checked={selected}
                onChange={() => handleSelectAnswer(q.id, opt.key)}
                disabled={submitted}
              />
              <span className="font-medium text-gray-700 w-6">{opt.key}.</span>
              <span className={cn('text-gray-800', layout === 'single' ? 'truncate' : '')} title={opt.text}>{opt.text}</span>
              {!isSubmitted && selected && <CheckCircle2 className="ml-auto text-purple-600" size={16} />}
              {isSubmitted && isCorrect && <CheckCircle2 className="ml-auto text-green-600" size={16} />}
            </label>
          );
        })}
      </div>
    );
  };

  // Removed toggleMark (mark-for-review) functionality

  // Goto dropdown state (custom upward opening)
  const [showGoto, setShowGoto] = useState(false);
  const gotoRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!gotoRef.current) return;
      if (!gotoRef.current.contains(e.target as Node)) setShowGoto(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  return (
    <div
      ref={pageContainerRef}
      className={cn('space-y-4 sm:space-y-6 bg-white dark:bg-gray-900 min-h-[100dvh] h-[100dvh]', examStarted ? 'overflow-hidden' : 'overflow-auto')}
      onClick={() => {
        if (needsFsReentry) {
          setNeedsFsReentry(false);
          requestFullscreenImmediate();
        }
        if (needsFsReentry && examStarted && !submitted) {
          try { requestFullscreenImmediate(); } catch {}
          setNeedsFsReentry(false);
        }
      }}
    >
      {lightbox && (
        <div className="fixed inset-0 z-[75] bg-black/80 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <img src={lightbox.src} alt="Preview" className="max-h-[95vh] max-w-[95vw] object-contain" />
        </div>
      )}
      {/* Sticky header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800 px-2 sm:px-4 py-2">
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-semibold">
            <Clock size={18} />
            <span>{formatTime(remainingSec)}</span>
          </div>
          <div className="hidden sm:block h-5 w-px bg-gray-200 dark:bg-gray-800" />
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>Answered:</span>
            <span className="font-medium text-gray-800 dark:text-gray-100">{answeredCount}</span>
            <span>/</span>
            <span className="text-gray-500 dark:text-gray-400">{questions.length}</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
            <span className={selectedExamId ? 'text-green-700 font-medium' : ''}>1. Choose Exam</span>
            <ChevronRight size={16} className="text-gray-400" />
            <span className="font-medium">2. Answer Questions</span>
          </div>
          {/* Filter dropdown removed */}
          {/* Submit button aligned to right (desktop) */}
          <div className="sm:ml-auto">
            <Button
              type="button"
              onClick={handleRequestSubmit}
              disabled={submitting || submitted || !selectedExamId || !examStarted}
              className="inline-flex items-center gap-2"
            >
              {submitted ? 'Submitted' : 'Submit Exam'}
            </Button>
          </div>
        </div>
      </div>
      {/* Sticky timing bar below header */}
      <div className="sticky top-[44px] sm:top-[50px] z-20 px-2 sm:px-4">
        <div className="relative w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-visible">
          {/* Elapsed time tooltip that follows the moving progress head */}
          {elapsedSec != null && (
            <div
              className="absolute -top-8 inline-flex items-center gap-2 text-[11px] sm:text-xs text-purple-800 bg-white/95 dark:bg-gray-900/95 border border-purple-200 dark:border-gray-700 rounded-full px-2.5 py-1 shadow-sm pointer-events-none transform -translate-x-1/2"
              style={{ left: `${progressPercent}%` }}
            >
              <span className="opacity-70">Elapsed</span>
              <span className="font-semibold tabular-nums">{formatTime(elapsedSec)}</span>
            </div>
          )}
          <div
            className={`h-full ${progressColorClass} ${progressGlowClass}`}
            style={{ width: `${progressPercent}%`, transition: 'width 1s linear' }}
            aria-label="time-progress"
          />
          {/* Motivational hint near end */}
          {examStarted && !submitted && initialRemainingSec != null && remainingSec != null && remainingSec <= Math.max(30, Math.floor(initialRemainingSec * 0.1)) && (
            <div className="absolute -top-7 right-0 text-[11px] sm:text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-1 shadow-sm select-none">
              Keep it up! You're almost there — finish strong!
            </div>
          )}
        </div>
      </div>

      {/* Anti-cheating resume popup removed */}
      {/* Result summary after submission */}
      {examContext && (
        <div className="px-2 sm:px-4 -mt-2">
          <div className="text-[11px] sm:text-xs text-gray-500 flex items-center gap-2">
            {examContext.courseTitle && <span className="mr-2">Course: <span className="font-medium text-gray-700">{examContext.courseTitle}</span></span>}
            {examContext.category && <span className="mr-2">Exam: <span className="font-medium text-gray-700 capitalize">{examContext.category}</span></span>}
            {/* Centered per-question timer */}
            <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-orange-700 font-semibold">
              <span className="uppercase tracking-wide">Time on this question</span>
              <span className="tabular-nums">{formatTime(questionTimers[currentQid] || 0)}</span>
            </span>
            {typeof examContext.total_questions === 'number' && <span>Questions: <span className="font-medium text-gray-700">{examContext.total_questions}</span></span>}
          </div>
        </div>
      )}

      {/* Result summary after submission */}
      {submitted && (
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {resultScore != null && resultTotal != null && (
              <div className="font-medium text-gray-800 dark:text-gray-100">Result: {resultScore} / {resultTotal}</div>
            )}
            {timeTaken != null && (
              <div className="text-gray-600 dark:text-gray-300">Time taken: {formatTime(timeTaken)}</div>
            )}
            {remainingSec != null && initialRemainingSec != null && (
              <div className="text-gray-600 dark:text-gray-300">Time left: {formatTime(remainingSec)}</div>
            )}
          </div>
        </Card>
      )}

      {/* Navigator + Questions list */}
      <div className={cn('space-y-4', examStarted && 'max-h-[calc(dvh-140px)] overflow-auto pr-1')}>
        {/* Single-question controls removed */}
        <div id="questions-top" />
        {/* Compact bottom navigation with Go To dropdown */}
        {totalQuestions > 0 && (
          <Card className="bg-transparent border-0 shadow-none pl-4 pr-4">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex items-center gap-1" disabled={currentPage === 1 || !examStarted || submitted}
                  onClick={() => setCurrentPage(1)}>
                  <ChevronsLeft size={16} /> First
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-1" disabled={currentPage === 1 || !examStarted || submitted}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                  <ChevronLeft size={16} /> Prev
                </Button>
                <div className="text-sm text-gray-700">Question {currentPage} of {pageCount}</div>
              </div>
              <div className="flex items-center gap-2">
                {/* Global Answer with Video (for current question) */}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!examStarted || submitted}
                  onClick={async () => {
                    const currentQid = currentQuestions[0]?.id;
                    if (!currentQid) return;
                    try {
                      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                      recStreamRef.current = stream;
                      setRecorderQid(currentQid);
                      setRecorderOpen(true);
                      setIsRecording(false);
                      setIsPlaying(false);
                      setRecordedUrl(null);
                      setRecordedBlob(null);
                      setUploadedUrl(null);
                      setCanPlayRecorded(false);
                      if (recordTimerRef.current) { window.clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
                      setRecordElapsedSec(0);
                      setTimeout(() => {
                        try { if (liveVideoRef.current && recStreamRef.current) { (liveVideoRef.current as any).srcObject = recStreamRef.current; liveVideoRef.current.play().catch(()=>{}); } } catch {}
                      }, 50);
                    } catch (e) {
                      toast({ title: 'Camera error', description: 'Unable to access camera/mic.', variant: 'destructive' });
                    }
                  }}
                >Answer with Video</Button>
                {/* Go To dropdown */}
                <div ref={gotoRef} className="relative">
                  <button
                    type="button"
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white hover:border-purple-300 hover:bg-purple-50"
                    onClick={(e) => { e.stopPropagation(); setShowGoto(v => !v); }}
                    disabled={!examStarted || submitted}
                  >
                    Go to question
                  </button>
                  {showGoto && (
                    <div className="absolute top-full mt-2 right-0 w-48 max-h-64 overflow-auto rounded-lg border border-gray-200 shadow-lg bg-white z-30">
                      {Array.from({ length: pageCount }, (_, i) => i + 1).map(num => (
                        <button
                          key={num}
                          type="button"
                          className={cn('w-full text-left px-3 py-2 text-sm hover:bg-purple-50', num === currentPage && 'bg-purple-50 font-medium')}
                          onClick={() => { setCurrentPage(num); setShowGoto(false); }}
                        >
                          Question {num}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" className="flex items-center gap-1" disabled={currentPage === pageCount || !examStarted || submitted}
                  onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}>
                  Next <ChevronRight size={16} />
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-1" disabled={currentPage === pageCount || !examStarted || submitted}
                  onClick={() => setCurrentPage(pageCount)}>
                  Last <ChevronsRight size={16} />
                </Button>
              </div>
            </div>
          </Card>
        )}
        {loadingQuestions ? (
          <div className="text-sm text-gray-500">Loading questions...</div>
        ) : questions.length === 0 ? (
          <div className="text-sm text-gray-500">No questions found for this selection.</div>
        ) : (
          <div className="relative">
            {!examStarted && (
              <div className="absolute top-2 left-0 right-0 z-10 px-2 flex justify-center">
                <div className="w-full max-w-3xl space-y-3">
                  {/* Caution / guidance box */}
                  <div className="rounded-xl border border-amber-300 bg-amber-50/90 shadow-sm px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        <div className="h-8 w-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center animate-pulse shadow-[0_0_0.4rem_rgba(245,158,11,0.6)]">
                          <AlertTriangle className="h-5 w-5 text-amber-600" />
                        </div>
                      </div>
                      <p className="text-sm sm:text-base text-amber-800 leading-relaxed">
                        <span className="font-semibold">To get the most out of your tests and practice, please make sure to:</span> Be available to complete the entire test on time. Sit in as quiet a place as possible. Close all programs and browser windows and only open the exam page to avoid any distractions during the exam.
                      </p>
                    </div>
                  </div>

                  {/* Notes & Rules (if any) */}
                  {(Array.isArray(examNotes) && examNotes.length > 0) || (Array.isArray(examRules) && examRules.length > 0) ? (
                    <div className="rounded-xl border border-purple-200 bg-purple-50/70 shadow-sm px-4 py-3">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        {Array.isArray(examNotes) && examNotes.length > 0 && (
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-purple-800 mb-1">Notes</div>
                            <ul className="list-disc pl-5 text-xs text-purple-900 space-y-1">
                              {examNotes.map((n) => (
                                <li key={n.id}><span className="font-medium">{n.title}</span>: {n.content}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {Array.isArray(examRules) && examRules.length > 0 && (
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-purple-800 mb-1">Rules</div>
                            <ul className="list-disc pl-5 text-xs text-purple-900 space-y-1">
                              {examRules.map((r) => (
                                <li key={r.id}><span className="font-medium">{r.title}</span>: {r.description}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* Start bar */}
                  <div className="w-full flex justify-center">
                    <div className="inline-flex items-center gap-3 rounded-full border border-purple-200 bg-white/90 dark:bg-gray-900/90 shadow-sm px-4 py-2.5">
                      <div className="text-sm text-gray-700">Estimated time: {estimatedMinutes ?? (initialRemainingSec ? Math.floor(initialRemainingSec/60) : '--')} min</div>
                      <Button onClick={handleRequestStart} disabled={submitted || questions.length === 0 || examStarted} className="rounded-full inline-flex items-center gap-2 cursor-pointer">
                        <PlayCircle size={18} /> Start Exam
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className={cn((!examStarted) && 'blur-sm pointer-events-none select-none')}>
              {currentQuestions
                .map((q, idx) => (
                  <Card id={`q-${q.id}`} key={q.id} className={cn("border border-gray-200 dark:border-gray-1000 bg-white dark:bg-gray-900 ml-4 mr-4", examStarted ? "p-3 sm:p-4" : "p-4 sm:p-5")}>
                    <div className={cn(examStarted ? "space-y-2" : "space-y-4")}>
                      <div className="font-semibold text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-line">
                        <span className="text-gray-500 mr-1">{currentPage}.</span>
                        {q.question}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          {answerMedia[q.id]?.url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const entry = answerMedia[q.id];
                                if (entry) { try { URL.revokeObjectURL(entry.url); } catch {} }
                                setAnswerMedia((prev) => { const { [q.id]: _r, ...rest } = prev; return rest; });
                              }}
                            >Remove Video</Button>
                          )}
                        </div>
                        {/* Media block for image/video/audio/svg - centered, compact for exam mode */}
                        {q.type && q.type !== 'text' && (
                          <div className={cn("w-full flex justify-center", examStarted ? "mt-1" : "mt-3")}>
                            <div className={cn("w-full", examStarted ? "max-w-2xl mb-1" : "max-w-4xl mb-2")}>
                              {q.type === 'image' && (q.mediaUrl || q.image) && (
                                <div className="flex flex-col items-center">
                                  <div className={cn("flex items-center gap-2 text-sm", examStarted ? "mb-1" : "mb-3")}>
                                    <Button variant="outline" size="sm" onClick={() => setZoom(q.id, getZoom(q.id) - 0.25)}>-</Button>
                                    <span className="min-w-[60px] text-center font-medium">{Math.round(getZoom(q.id)*100)}%</span>
                                    <Button variant="outline" size="sm" onClick={() => setZoom(q.id, 1)}>Reset</Button>
                                    <Button variant="outline" size="sm" onClick={() => setZoom(q.id, getZoom(q.id) + 0.25)}>+</Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                      try {
                                        const el = (e.currentTarget.closest('[data-media-container]') as HTMLElement) || null;
                                        if (el) {
                                          setFullscreenImgQid(q.id);
                                          requestElFullscreen(el).catch(() => {
                                            setLightbox({ qid: q.id, src: (q.mediaUrl || q.image)! });
                                          });
                                        } else {
                                          setLightbox({ qid: q.id, src: (q.mediaUrl || q.image)! });
                                        }
                                      } catch {
                                        setLightbox({ qid: q.id, src: (q.mediaUrl || q.image)! });
                                      }
                                    }}
                                  >Fullscreen</Button>
                                </div>
                                <div
                                  data-media-container
                                  className={cn("w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white flex justify-center items-center", examStarted ? "max-h-[35vh]" : "max-h-[70vh]")}
                                  style={{ overflowY: getZoom(q.id) > 1 ? 'auto' : 'visible', overscrollBehaviorY: 'contain' }}
                                  onWheel={(e) => {
                                    try {
                                      const el = e.currentTarget as HTMLDivElement;
                                      const atTop = el.scrollTop <= 0;
                                      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
                                      if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
                                        e.preventDefault();
                                        pageContainerRef.current?.scrollBy({ top: e.deltaY, behavior: 'auto' });
                                      }
                                    } catch {}
                                  }}
                                >
                                  <img
                                    src={q.mediaUrl || q.image}
                                    alt={`Question ${startIndex + idx + 1}`}
                                    style={{ transform: `scale(${getZoom(q.id)})`, transformOrigin: 'center center' }}
                                    className={cn(
                                      'w-auto object-contain select-none',
                                      fullscreenImgQid === q.id ? 'max-h-screen' : (examStarted ? 'max-h-[35vh]' : 'max-h-[70vh]')
                                    )}
                                  />
                                </div>
                              </div>
                            )}
                            {q.type === 'video' && (q.mediaUrl || q.video) && (
                              (() => {
                                const url = q.mediaUrl || q.video!;
                                if (isYouTubeUrl(url)) {
                                  const embed = toYouTubeEmbed(url);
                                  return (
                                    <div className={cn("w-full mx-auto", examStarted ? "max-w-2xl" : "max-w-4xl")}>
                                      <div className={cn("relative w-full aspect-video", examStarted ? "max-h-[35vh]" : "max-h-[70vh]")}>
                                        <iframe
                                          src={embed}
                                          className="absolute inset-0 w-full h-full rounded-lg border border-gray-200 dark:border-gray-800"
                                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                          allowFullScreen
                                          title={`Question ${startIndex + idx + 1} Video`}
                                        />
                                      </div>
                                    </div>
                                  );
                                }
                                if (isVimeoUrl(url)) {
                                  const embed = toVimeoEmbed(url);
                                  return (
                                    <div className={cn("w-full mx-auto", examStarted ? "max-w-2xl" : "max-w-4xl")}>
                                      <div className={cn("relative w-full aspect-video", examStarted ? "max-h-[35vh]" : "max-h-[70vh]")}>
                                        <iframe
                                          src={embed}
                                          className="absolute inset-0 w-full h-full rounded-lg border border-gray-200 dark:border-gray-800"
                                          allow="autoplay; fullscreen; picture-in-picture"
                                          allowFullScreen
                                          title={`Question ${startIndex + idx + 1} Video`}
                                        />
                                      </div>
                                    </div>
                                  );
                                }
                                if (isDailymotionUrl(url)) {
                                  const embed = toDailymotionEmbed(url);
                                  return (
                                    <div className={cn("w-full mx-auto", examStarted ? "max-w-2xl" : "max-w-4xl")}>
                                      <div className={cn("relative w-full aspect-video", examStarted ? "max-h-[35vh]" : "max-h-[70vh]")}>
                                        <iframe
                                          src={embed}
                                          className="absolute inset-0 w-full h-full rounded-lg border border-gray-200 dark:border-gray-800"
                                          allow="autoplay; fullscreen; picture-in-picture"
                                          allowFullScreen
                                          title={`Question ${startIndex + idx + 1} Video`}
                                        />
                                      </div>
                                    </div>
                                  );
                                }
                                if (isFacebookUrl(url)) {
                                  const embed = toFacebookEmbed(url);
                                  return (
                                    <div className={cn("w-full mx-auto", examStarted ? "max-w-2xl" : "max-w-4xl")}>
                                      <div className={cn("relative w-full aspect-video", examStarted ? "max-h-[35vh]" : "max-h-[70vh]")}>
                                        <iframe
                                          src={embed}
                                          className="absolute inset-0 w-full h-full rounded-lg border border-gray-200 dark:border-gray-800"
                                          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                                          allowFullScreen
                                          title={`Question ${startIndex + idx + 1} Video`}
                                        />
                                      </div>
                                    </div>
                                  );
                                }
                                if (isTikTokUrl(url)) {
                                  const embed = toTikTokEmbed(url);
                                  return (
                                    <div className={cn("w-full mx-auto", examStarted ? "max-w-xs" : "max-w-md")}>
                                      <div className={cn("relative w-full", examStarted ? "max-h-[35vh]" : "")} style={{ paddingTop: examStarted ? '100%' : '140%' }}>
                                        <iframe
                                          src={embed}
                                          className={cn("absolute inset-0 w-full h-full rounded-lg border border-gray-200 dark:border-gray-800", examStarted ? "max-h-[35vh]" : "max-h-[70vh]")}
                                          allow="autoplay; fullscreen; picture-in-picture"
                                          allowFullScreen
                                          title={`Question ${startIndex + idx + 1} Video`}
                                        />
                                      </div>
                                    </div>
                                  );
                                }
                                if (isTwitterUrl(url)) {
                                  const embed = toTwitterEmbed(url);
                                  return (
                                    <div className={cn("w-full mx-auto", examStarted ? "max-w-xl" : "max-w-3xl")}>
                                      <div className={cn("relative w-full aspect-video", examStarted ? "max-h-[35vh]" : "max-h-[70vh]")}>
                                        <iframe
                                          src={embed}
                                          className="absolute inset-0 w-full h-full rounded-lg border border-gray-200 dark:border-gray-800"
                                          allow="autoplay; fullscreen; picture-in-picture"
                                          allowFullScreen
                                          title={`Question ${startIndex + idx + 1} Tweet`}
                                        />
                                      </div>
                                    </div>
                                  );
                                }
                                return (
                                  <div className="w-full flex flex-col items-center">
                                    <div className={cn("flex items-center gap-2 text-sm", examStarted ? "mb-1" : "mb-3")}>
                                      <Button variant="ghost" size="sm" onClick={(e) => requestElFullscreen((e.currentTarget.nextSibling as HTMLElement) || null)}>Fullscreen</Button>
                                    </div>
                                    <div className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-black">
                                      <video controls src={url} className={cn("w-full h-auto", examStarted ? "max-h-[35vh]" : "max-h-[70vh]")} />
                                    </div>
                                  </div>
                                );
                              })()
                            )}
                            {q.type === 'audio' && q.mediaUrl && (
                              <div className="w-full flex justify-center">
                                <audio controls src={q.mediaUrl} className="w-full max-w-2xl" />
                              </div>
                            )}
                            {q.type === 'svg' && (q.svgContent || q.mediaUrl) && (
                              q.svgContent ? (
                                <div
                                  className={cn("w-full overflow-auto border border-gray-200 dark:border-gray-800 rounded-lg bg-white", examStarted ? "p-2 max-h-[35vh]" : "p-4 max-h-[70vh]")}
                                  style={{ overflowY: 'auto', overscrollBehaviorY: 'contain' }}
                                  onWheel={(e) => {
                                    try {
                                      const el = e.currentTarget as HTMLDivElement;
                                      const atTop = el.scrollTop <= 0;
                                      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
                                      if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
                                        e.preventDefault();
                                        pageContainerRef.current?.scrollBy({ top: e.deltaY, behavior: 'auto' });
                                      }
                                    } catch {}
                                  }}
                                  dangerouslySetInnerHTML={{ __html: q.svgContent }}
                                />
                              ) : (
                                <div className="w-full flex justify-center">
                                  <img src={q.mediaUrl} alt={`Question ${startIndex + idx + 1} SVG`} className={cn("w-auto object-contain rounded-lg border border-gray-200 dark:border-gray-800 bg-white", examStarted ? "max-h-[35vh]" : "max-h-[70vh]")} />
                                </div>
                              )
                            )}
                            </div>
                        </div>
                      )}
                      </div>
                      {/* Mark for review and Clear buttons removed */}
                    </div>
                    {/* Hint */}
                    {q.hint && (
                      <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <span className="font-semibold mr-1">Hint:</span>
                        <span>{q.hint}</span>
                      </div>
                    )}
                    {renderOptions(q)}
                    {/* Recorded preview */}
                    {answerMedia[q.id]?.url && (
                      <div className="mt-3">
                        <div className="text-xs text-gray-600 mb-1">Your recorded answer (preview):</div>
                        <video controls src={answerMedia[q.id].url} className="w-full rounded-md border border-gray-200" />
                      </div>
                    )}
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* Start confirmation modal */}
        <Dialog open={showStartConfirm} onOpenChange={setShowStartConfirm}>
          <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start exam?</DialogTitle>
            <DialogDescription>
              The timer will begin and questions will be revealed.
            </DialogDescription>
          </DialogHeader>
          {/* Meta grid */}
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1">
              <span className="text-gray-600">Exam By</span>
              <span className="font-medium text-gray-800 truncate">{examContext?.teacher || 'N/A'}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1">
              <span className="text-gray-600">Questions</span>
              <span className="font-medium text-gray-800">{examContext?.total_questions ?? totalQuestions ?? 0}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1">
              <span className="text-gray-600">Rating</span>
              <span className="font-medium text-gray-800">{examContext?.rating != null ? examContext.rating : 'N/A'}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1">
              <span className="text-gray-600">Exam Duration</span>
              <span className="font-medium text-gray-800">{(estimatedMinutes ?? (initialRemainingSec ? Math.floor(initialRemainingSec/60) : null)) ?? '--'} min</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1">
              <span className="text-gray-600">Marks</span>
              <span className="font-medium text-gray-800">{examContext?.total_questions ?? totalQuestions ?? 0}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1">
              <span className="text-gray-600">Complexity</span>
              <span className="font-medium text-gray-800">{examContext?.complexity || 'N/A'}</span>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowStartConfirm(false)}>Cancel</Button>
            <Button onClick={() => { setShowStartConfirm(false); handleStartExam(); }} className="inline-flex items-center gap-2">
              <PlayCircle size={18} /> Start
            </Button>
          </DialogFooter>
          {/* Friendly wish message below actions */}
          <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 flex items-center gap-3">
            {/* Confetti/star SVG */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-6 w-6 text-purple-600 shrink-0"
            >
              <path d="M12 3l1.902 3.853 4.251.618-3.076 2.999.726 4.234L12 12.9l-3.803 1.804.726-4.234L5.847 7.47l4.25-.618L12 3z" />
              <path d="M4 20c1.2-.8 2.6-1.2 4-1 1.4.2 2.8 1 4 1s2.6-.8 4-1c1.4-.2 2.8.2 4 1" strokeLinecap="round" />
            </svg>
            <p className="text-sm sm:text-base font-semibold text-purple-800">
              Wishing you the <span className="underline decoration-purple-300">very best of luck</span> on your exam — you’ve got this!
            </p>
          </div>
        </DialogContent>
        </Dialog>

        {/* Recorder Fallback Overlay (non-portal) */}
        {recorderOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative z-[71] w-[95%] max-w-4xl rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl p-4">
              <div className="mb-3">
                <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Record your answer</div>
                <div className="text-xs text-gray-600">Use your webcam to record a short video answer. Max 5 minutes.</div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-gray-200 overflow-hidden bg-black">
                  {!recordedUrl ? (
                    <video ref={liveVideoRef} className="w-full h-60 object-contain" autoPlay muted playsInline style={{ transform: 'scaleX(-1)' }} />
                  ) : (
                    <video ref={playbackRef} className="w-full h-60 object-contain" src={recordedUrl || undefined} style={{ transform: 'scaleX(-1)' }} onLoadedMetadata={() => setCanPlayRecorded(true)} onEnded={() => setIsPlaying(false)} />
                  )}
                </div>
                <div className="flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      {/* <div className="text-xs text-gray-600">Question ID: {recorderQid || '-'}</div> */}
                      <div className="inline-flex items-center gap-2 text-xs">
                        <span className={cn('h-2 w-2 rounded-full', isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300')} />
                        <span className={cn('font-medium', isRecording ? 'text-red-600' : 'text-gray-600')}>{formatTime(recordElapsedSec)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="default" disabled={isRecording || !!recordedUrl || !recStreamRef.current} onClick={() => {
                        if (!recStreamRef.current) return;
                        let preferredType = 'video/webm;codecs=vp8,opus';
                        if (!(window as any).MediaRecorder?.isTypeSupported?.(preferredType)) {
                          preferredType = (window as any).MediaRecorder?.isTypeSupported?.('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm';
                        }
                        const rec = new MediaRecorder(recStreamRef.current, { mimeType: preferredType });
                        mediaRecorderRef.current = rec;
                        const qid = recorderQid!; mediaChunksRef.current[qid] = [];
                        rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) mediaChunksRef.current[qid].push(e.data); };
                        rec.onstop = () => {
                          const blob = new Blob(mediaChunksRef.current[qid], { type: rec.mimeType || 'video/webm' });
                          const url = URL.createObjectURL(blob);
                          setRecordedBlob(blob);
                          setRecordedUrl(url);
                          setIsRecording(false);
                          setIsPlaying(false);
                          setCanPlayRecorded(false);
                          // Pause and detach live preview to avoid confusion
                          try {
                            if (liveVideoRef.current) {
                              liveVideoRef.current.pause();
                              (liveVideoRef.current as any).srcObject = null;
                            }
                          } catch {}
                          // Stop camera tracks to turn off camera light
                          try {
                            if (recStreamRef.current) {
                              recStreamRef.current.getTracks().forEach(t => t.stop());
                              recStreamRef.current = null;
                            }
                          } catch {}
                          if (recordTimerRef.current) { window.clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
                        };
                        rec.start();
                        setIsRecording(true);
                        setRecordElapsedSec(0);
                        if (recordTimerRef.current) { window.clearInterval(recordTimerRef.current); }
                        recordTimerRef.current = window.setInterval(() => setRecordElapsedSec((s) => s + 1), 1000) as unknown as number;
                        setTimeout(() => { try { if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') mediaRecorderRef.current.stop(); } catch {} }, 5 * 60 * 1000);
                      }}>● Record</Button>
                      <Button variant="outline" disabled={!isRecording} onClick={() => { try { mediaRecorderRef.current?.stop(); } catch {}; setIsRecording(false); if (recordTimerRef.current) { window.clearInterval(recordTimerRef.current); recordTimerRef.current = null; } }}>■ Stop</Button>
                      <Button variant="outline" disabled={!recordedUrl || !canPlayRecorded} onClick={() => { const v = playbackRef.current; if (!v) return; if (v.paused) { v.play(); setIsPlaying(true); } else { v.pause(); setIsPlaying(false); } }}>{isPlaying ? 'Pause' : 'Play'}</Button>
                      <Button variant="outline" disabled={isRecording} onClick={async () => { if (recordedUrl) { try { URL.revokeObjectURL(recordedUrl); } catch {} } setRecordedUrl(null); setRecordedBlob(null); setUploadedUrl(null); setCanPlayRecorded(false); if (recordTimerRef.current) { window.clearInterval(recordTimerRef.current); recordTimerRef.current = null; } setRecordElapsedSec(0); try { if (!recStreamRef.current) { const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); recStreamRef.current = stream; } } catch {} setTimeout(() => { try { if (liveVideoRef.current && recStreamRef.current) { (liveVideoRef.current as any).srcObject = recStreamRef.current; liveVideoRef.current.play().catch(()=>{}); } } catch {} }, 50); }}>⟲ Remake</Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-xs text-gray-600">{uploadedUrl ? 'Uploaded' : (uploading ? 'Uploading...' : 'Not uploaded')}</div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" disabled={!recordedBlob || uploading} onClick={async () => { if (!recordedBlob || !recorderQid) return; try { setUploading(true); const file = new File([recordedBlob], `answer_${recorderQid}.webm`, { type: 'video/webm' }); const fd = new FormData(); fd.append('file', file); fd.append('folder', 'student-answers'); const up = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/storage/upload`, fd, { headers: { Authorization: `Bearer ${token}` } }); const url = up.data?.data?.public_url; if (url) { setUploadedUrl(url); setAnswerMedia(prev => ({ ...prev, [recorderQid]: { url, mime: 'video/webm' } })); toast({ title: 'Uploaded', description: 'Your video answer has been uploaded.' }); } else { toast({ title: 'Upload failed', description: 'No URL returned', variant: 'destructive' }); } } catch (e:any) { toast({ title: 'Upload error', description: e?.message || 'Failed to upload video', variant: 'destructive' }); } finally { setUploading(false); } }}>⬆ Save & Upload</Button>
                      <Button onClick={() => { try { if (recStreamRef.current) recStreamRef.current.getTracks().forEach(t=>t.stop()); } catch {} recStreamRef.current = null; setIsRecording(false); setIsPlaying(false); setRecorderOpen(false); setRecorderQid(null); if (recordTimerRef.current) { window.clearInterval(recordTimerRef.current); recordTimerRef.current = null; } setRecordElapsedSec(0); }}>Close</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Submit confirmation overlay (non-portal, works in fullscreen) */}
        {showSubmitConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            {/* Backdrop without click-to-close */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative z-[61] w-[95%] max-w-lg rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {missingNumbers.length > 0 ? 'Some questions are unanswered' : 'Submit exam?'}
                </div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {missingNumbers.length > 0 ? (
                    <>
                      You have not answered the following question numbers:
                      <div className="mt-2 text-gray-800 dark:text-gray-100 text-sm font-medium">{missingNumbers.join(', ')}</div>
                      Do you still want to submit?
                    </>
                  ) : (
                    <>Would you like to submit now or review first?</>
                  )}
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                  <div className="flex items-center justify-between"><span className="text-gray-500">Attempted</span><span className="font-medium">{answeredCount}</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-500">Missed</span><span className="font-medium">{Math.max(0, (questions?.length || 0) - answeredCount)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-500">Time taken</span><span className="font-medium">{timeTaken != null ? formatTime(timeTaken) : '--:--'}</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-500">Time left</span><span className="font-medium">{formatTime(remainingSec)}</span></div>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => { try { requestFullscreenImmediate(); } catch {}; setShowSubmitConfirm(false); }}>No, Review</Button>
                  <Button onClick={() => { setShowSubmitConfirm(false); handleSubmit(false); }} className="inline-flex items-center gap-2">Yes, Submit</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Unified Result Overlay: status banner + result modal + target details with 10px vertical gaps */}
        {showResultDialog && (
          (() => {
            const pct = resultPercentage != null ? Math.round(resultPercentage) : (resultScore != null && resultTotal ? Math.round((resultScore / (resultTotal || 1)) * 100) : 0);
            const passed = pct >= 70;
            return (
              <div className="fixed inset-0 z-[60] flex items-center justify-center px-3">
                {/* Backdrop without click-to-close */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                <div className="relative z-[61] w-full max-w-[52rem] flex flex-col items-center gap-[10px]">
                  {/* Status banner */}
                  <div className={`w-full max-w-xl rounded-xl border ${passed ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'} shadow-lg px-4 py-3`}>
                    <div className="flex items-start gap-2">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center ${passed ? 'bg-emerald-100 border border-emerald-300 text-emerald-700' : 'bg-rose-100 border border-rose-300 text-rose-700'}`}>{passed ? '✓' : '✕'}</div>
                      <div className="min-w-0">
                        <div className={`text-base sm:text-lg font-semibold ${passed ? 'text-emerald-800' : 'text-rose-800'}`}>{passed ? 'Passed' : 'Failed'}</div>
                        <div className="text-xs sm:text-sm text-gray-700 mt-0.5">{passed ? 'Great job! Keep up the momentum and aim even higher on your next challenge.' : 'Don’t be disheartened—every attempt is progress. Review, practice, and you’ll come back stronger!'}</div>
                      </div>
                      <div className="ml-auto text-xs text-gray-600">{pct}%</div>
                    </div>
                  </div>

                  {/* Main result modal */}
                  <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                      <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        <Trophy className="text-amber-500" size={22} />
                        Exam Result
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">Here are your results for this exam.</div>
                    </div>
                    <div className="p-4">
                      <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                        <div className="flex items-center justify-between"><span className="text-gray-500">Correct</span><span className="font-medium">{resultScore ?? resultMeta?.obtained ?? 0}</span></div>
                        <div className="flex items-center justify-between"><span className="text-gray-500">Total Questions</span><span className="font-medium">{resultTotal ?? resultMeta?.total ?? 0}</span></div>
                        <div className="flex items-center justify-between"><span className="text-gray-500">Obtained Percentage</span><span className="font-medium">{pct}%</span></div>
                      </div>
                      <div className="mt-4 flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={async () => {
                            try {
                              if (document.fullscreenElement && (document as any).exitFullscreen) { await (document as any).exitFullscreen(); }
                              else if ((document as any).webkitExitFullscreen) { (document as any).webkitExitFullscreen(); }
                            } catch {}
                            // Clear cached answers + timers after result is shown
                            clearExamLocalCache();
                            setExamStatus(selectedExamId, { dismissed: true });
                            handleCloseResult();
                            setShowResultDialog(false);
                          }}
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Target details */}
                  <div className="w-full max-w-xl rounded-xl border border-purple-200 bg-white shadow-lg">
                    <div className="px-4 py-3 border-b border-purple-200 bg-purple-50 rounded-t-xl">
                      <div className="text-sm sm:text-base font-semibold text-purple-800">Target Details</div>
                      <div className="text-[11px] sm:text-xs text-purple-700">Your roadmap to the next level</div>
                    </div>
                    <div className="px-4 py-3 text-xs sm:text-sm text-gray-700 space-y-2">
                      {studentLevel === 'Beginner' && (
                        <div className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-purple-400" /><div><span className="font-semibold">Beginner → Intermediate</span> requires <span className="font-semibold">70%</span>.</div></div>
                      )}
                      {studentLevel === 'Intermediate' && (
                        <div className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-purple-400" /><div><span className="font-semibold">Intermediate → Pro/Master</span> requires <span className="font-semibold">70%</span> in Intermediate.</div></div>
                      )}
                      {(studentLevel === 'Pro' || studentLevel === 'Master') && (
                        <div className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-purple-400" /><div>You are already at <span className="font-semibold">{studentLevel}</span> level. Keep refining to sustain top performance!</div></div>
                      )}
                      <div className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-gray-300" /><div><span className="font-semibold">Beginner → Intermediate</span>: target 70%.</div></div>
                      <div className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-gray-300" /><div><span className="font-semibold">Intermediate → Pro/Master</span>: target 70% in Intermediate.</div></div>
                    </div>
                    <div className="px-4 pb-3 flex items-center justify-end">
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            if (document.fullscreenElement && (document as any).exitFullscreen) { await (document as any).exitFullscreen(); }
                            else if ((document as any).webkitExitFullscreen) { (document as any).webkitExitFullscreen(); }
                          } catch {}
                          // Clear cached answers + timers after result is shown
                          clearExamLocalCache();
                          setExamStatus(selectedExamId, { dismissed: true });
                          handleCloseResult();
                          setShowResultDialog(false);
                        }}
                      >Close</Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
};

export default StudentExams;
