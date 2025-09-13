import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FileText, Trophy, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

 type WinningQuestion = {
  id: string;
  title?: string;
  question?: string;
  answer?: string;
  subject?: string;
  courseTitle?: string;
  teacher?: string;
  created_at?: string;
  updated_at?: string;
};

const StudentWinningQuestions: React.FC = () => {
  const { token } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<WinningQuestion[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showDialog, setShowDialog] = useState(false);
  const [active, setActive] = useState<WinningQuestion | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/students/winning-questions`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const payload = res?.data?.data ?? res?.data ?? [];
        const arr: any[] = Array.isArray(payload) ? payload : [];
        const mapped: WinningQuestion[] = arr.map((x: any) => ({
          id: x.id || x._id || x.question_id || crypto.randomUUID(),
          title: x.title || x.name || x.question_title,
          question: x.question || x.content || x.text,
          answer: x.answer || x.solution || x.correct_answer,
          subject: x.subject || x.topic || x.category,
          courseTitle: x.courseTitle || x.course_title || x.course,
          teacher: x.teacher || x.teacher_name || x.created_by_name,
          created_at: x.created_at || x.createdAt,
          updated_at: x.updated_at || x.updatedAt,
        }))
        // Client-side safety sort: newest first
        .sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        });
        setItems(mapped);
      } catch (e: any) {
        const msg = e?.response?.data?.message || e?.message || 'Failed to load winning questions';
        toast({ title: 'Error', description: msg, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token, toast]);

  const openQuestion = (q: WinningQuestion) => {
    setActive(q);
    setShowDialog(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center">
          <Trophy className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-purple-700">Winning Questions</h1>
          <p className="text-gray-600 mt-1">Top-picked questions curated for you.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        {loading ? (
          <div className="flex items-center justify-center min-h-[160px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading winning questions...</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center text-sm text-gray-500 py-10">
            No winning questions found.
          </div>
        ) : (
          <div className="max-h-[28rem] overflow-auto rounded-xl border border-gray-100 p-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {items.map((q) => {
                const createdAt = q.created_at
                  ? new Date(q.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : null;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => openQuestion(q)}
                    className="text-left mx-auto w-full max-w-[420px] flex flex-col gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 hover:border-purple-300 hover:bg-purple-100 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate pr-1 text-sm sm:text-base font-medium text-gray-800">
                          {q.title || q.subject || 'Winning Question'}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {q.courseTitle && (
                            <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs px-2 py-0.5 rounded-full border border-gray-200 bg-white/60 text-gray-800">
                              <FileText size={14} /> {q.courseTitle}
                            </span>
                          )}
                          {q.subject && (
                            <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs px-2 py-0.5 rounded-full border border-purple-200 text-purple-700 bg-purple-50">
                              <Sparkles size={14} /> {q.subject}
                            </span>
                          )}
                          {createdAt && (
                            <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs px-2 py-0.5 rounded-full border border-gray-200 text-gray-700 bg-gray-50">
                              Created: {createdAt}
                            </span>
                          )}
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

      {/* Modal for question view (read-only until submit API is available) */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-600" /> {active?.title || active?.subject || 'Winning Question'}
            </DialogTitle>
            <DialogDescription>
              View the winning question below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Question</label>
              <div className="w-full rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 min-h-[96px] whitespace-pre-wrap">
                {active?.question || 'No question text provided.'}
              </div>
            </div>
            {active?.answer && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reference Answer</label>
                <div className="w-full rounded-md border border-gray-200 p-3 text-sm text-gray-700 whitespace-pre-wrap">
                  {active.answer}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentWinningQuestions;
