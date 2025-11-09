import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useStudentSession } from '@/contexts/StudentSessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Clock, History, BookOpen } from 'lucide-react';

type GeneratedExam = {
  id: string;
  title: string;
  subject: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questionCount: number;
  timeLimit: number;
  createdAt: string;
  status: 'draft' | 'ready';
};

const defaultSubjects = ['ACT Math', 'ACT Science', 'SAT Reading', 'SAT Writing', 'IELTS Listening'];

const RandomExams: React.FC = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const { currentCourse } = useStudentSession();
  const [randomSubject, setRandomSubject] = useState('');
  const [randomDifficulty, setRandomDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [randomQuestionCount, setRandomQuestionCount] = useState<number>(20);
  const [randomTimeLimit, setRandomTimeLimit] = useState<number>(30);
  const [randomGenerating, setRandomGenerating] = useState(false);
  const [previewExam, setPreviewExam] = useState<GeneratedExam | null>(null);
  const [generatedExams, setGeneratedExams] = useState<GeneratedExam[]>([]);
  const [fetchedSubjects, setFetchedSubjects] = useState<string[]>([]);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!token || !currentCourse) return;
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/students/exam-categories`,
          {
            params: { courseId: currentCourse.courseId },
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
        const normalized: string[] = [];
        for (const item of list) {
          if (typeof item === 'string') {
            const trimmed = item.trim();
            if (trimmed) normalized.push(trimmed);
          }
        }
        setFetchedSubjects(normalized);
      } catch {}
    };
    fetchSubjects();
  }, [token, currentCourse]);

  const subjectOptions = useMemo(() => {
    const set = new Set<string>(defaultSubjects);
    for (const item of fetchedSubjects) {
      if (item) set.add(item);
    }
    return Array.from(set);
  }, [fetchedSubjects]);

  useEffect(() => {
    if (!randomSubject && subjectOptions.length > 0) {
      setRandomSubject(subjectOptions[0]);
    }
  }, [subjectOptions, randomSubject]);

  const handleGenerate = async () => {
    if (!randomSubject.trim()) {
      toast({
        title: 'Subject required',
        description: 'Please choose or enter a subject before generating an exam.',
        variant: 'destructive',
      });
      return;
    }
    setRandomGenerating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      const now = new Date().toISOString();
      const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `random-${Date.now()}`;
      const exam: GeneratedExam = {
        id,
        title: `${randomSubject.trim()} – ${randomDifficulty} Challenge`,
        subject: randomSubject.trim(),
        difficulty: randomDifficulty,
        questionCount: randomQuestionCount,
        timeLimit: randomTimeLimit,
        createdAt: now,
        status: 'draft',
      };
      setPreviewExam(exam);
      setGeneratedExams((prev) => [exam, ...prev]);
      toast({ title: 'Preview generated', description: 'AI integration will replace this mock preview with live questions.' });
    } finally {
      setRandomGenerating(false);
    }
  };

  const formatCreatedAt = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 text-purple-700">
          <Sparkles className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Random Generated Exams</h1>
        </div>
        <p className="text-gray-600 text-sm sm:text-base">
          Craft practice exams on demand. Select your preferences and our AI partner will build fresh questions once the integration is live.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a random exam</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Subject</label>
              <select
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-purple-400 focus:outline-none"
                value={randomSubject}
                onChange={(event) => setRandomSubject(event.target.value)}
              >
                {subjectOptions.length === 0 && <option value="">Enter a subject</option>}
                {subjectOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
                {subjectOptions.length > 0 && !subjectOptions.includes(randomSubject) && randomSubject && (
                  <option value={randomSubject}>{randomSubject}</option>
                )}
              </select>
              <Input
                placeholder="Or type any subject (e.g., ACT Science)"
                value={randomSubject}
                onChange={(event) => setRandomSubject(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Difficulty</label>
              <select
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-purple-400 focus:outline-none"
                value={randomDifficulty}
                onChange={(event) => setRandomDifficulty(event.target.value as 'Easy' | 'Medium' | 'Hard')}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Number of questions</label>
              <Input
                type="number"
                min={5}
                max={100}
                step={5}
                value={randomQuestionCount}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isFinite(next)) {
                    const bounded = Math.min(Math.max(next, 5), 100);
                    setRandomQuestionCount(bounded);
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Time limit (minutes)</label>
              <Input
                type="number"
                min={5}
                max={240}
                step={5}
                value={randomTimeLimit}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isFinite(next)) {
                    const bounded = Math.min(Math.max(next, 5), 240);
                    setRandomTimeLimit(bounded);
                  }
                }}
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-gray-500">
              Tip: Start with Medium difficulty and 20 questions for a balanced challenge.
            </p>
            <Button onClick={handleGenerate} disabled={randomGenerating} className="inline-flex items-center gap-2">
              {randomGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating preview...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate preview
                </>
              )}
            </Button>
          </div>
          {previewExam && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600/10 text-purple-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="space-y-1 text-sm text-purple-900">
                  <p className="font-semibold">Preview ready</p>
                  <p>{previewExam.title}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-purple-700">
                    <span className="rounded-full border border-purple-200 bg-white px-2 py-0.5">Subject: {previewExam.subject}</span>
                    <span className="rounded-full border border-purple-200 bg-white px-2 py-0.5">Difficulty: {previewExam.difficulty}</span>
                    <span className="rounded-full border border-purple-200 bg-white px-2 py-0.5">{previewExam.questionCount} questions</span>
                    <span className="rounded-full border border-purple-200 bg-white px-2 py-0.5">{previewExam.timeLimit} minutes</span>
                  </div>
                  <p className="text-xs text-purple-700/70">When the AI service is connected, you will be able to launch this exam immediately.</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved random exams</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {generatedExams.length === 0 ? (
            <p className="text-sm text-gray-500">No random exams created yet. Generate one above to see it listed here.</p>
          ) : (
            generatedExams.map((exam) => (
              <div key={exam.id} className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{exam.title}</h3>
                    <Badge variant="secondary">{exam.status === 'ready' ? 'Ready' : 'Draft'}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1"><BookOpen className="h-4 w-4" />{exam.questionCount} questions</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{exam.timeLimit} minutes</span>
                    <span className="inline-flex items-center gap-1"><History className="h-4 w-4" />Created {formatCreatedAt(exam.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-purple-700">{exam.subject}</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-purple-700">{exam.difficulty}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RandomExams;
