import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type SelectedCourse = { courseId: string; courseTitle: string };
export type SelectedExam = { examId: string; examTitle?: string; courseId?: string };

type SessionCtx = {
  selectedCourses: SelectedCourse[];
  currentCourse: SelectedCourse | null;
  selectCourse: (c: SelectedCourse) => void;
  clearSelection: () => void;
  currentExam: SelectedExam | null;
  selectExam: (e: SelectedExam) => void;
  clearExam: () => void;
};

const Ctx = createContext<SessionCtx | undefined>(undefined);

const STORAGE_KEY = 'student_selected_courses';
const STORAGE_EXAM_KEY = 'student_selected_exam';

export const StudentSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCourses, setSelectedCourses] = useState<SelectedCourse[]>([]);
  const [currentExam, setCurrentExam] = useState<SelectedExam | null>(null);

  // load from storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setSelectedCourses(arr.filter(Boolean));
      }
      const eraw = localStorage.getItem(STORAGE_EXAM_KEY);
      if (eraw) {
        const ex = JSON.parse(eraw);
        if (ex && ex.examId) setCurrentExam(ex);
      }
    } catch {}
  }, []);

  // persist to storage
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCourses)); } catch {}
  }, [selectedCourses]);

  useEffect(() => {
    try {
      if (currentExam) localStorage.setItem(STORAGE_EXAM_KEY, JSON.stringify(currentExam));
      else localStorage.removeItem(STORAGE_EXAM_KEY);
    } catch {}
  }, [currentExam]);

  const selectCourse = useCallback((c: SelectedCourse) => {
    setSelectedCourses((prev) => {
      const filtered = prev.filter(x => x.courseId !== c.courseId);
      return [c, ...filtered].slice(0, 10); // keep most recent 10
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedCourses([]), []);
  const selectExam = useCallback((e: SelectedExam) => setCurrentExam(e), []);
  const clearExam = useCallback(() => setCurrentExam(null), []);

  const value = useMemo<SessionCtx>(() => ({
    selectedCourses,
    currentCourse: selectedCourses[0] ?? null,
    selectCourse,
    clearSelection,
    currentExam,
    selectExam,
    clearExam,
  }), [selectedCourses, selectCourse, currentExam, selectExam, clearExam]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useStudentSession = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStudentSession must be used within StudentSessionProvider');
  return ctx;
};
