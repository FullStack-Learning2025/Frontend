import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const PAGE_SIZES = [10, 20, 50, 100];

type FeedbackRow = {
  id: string;
  question_id: string;
  user_id: string;
  exam_id?: string | null;
  message: string;
  meta?: any;
  status: 'open'|'reviewed'|'resolved'|'dismissed';
  created_at: string;
  updated_at: string;
  student?: { id: string; name?: string; email?: string } | null;
  question?: { id: string; text?: string } | null;
};

export default function AdminQuestionsFeedback() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [questionId, setQuestionId] = useState<string>('');
  // Expand/collapse states for long text
  const [expandedQuestion, setExpandedQuestion] = useState<Record<string, boolean>>({});
  const [expandedMessage, setExpandedMessage] = useState<Record<string, boolean>>({});

  const pages = useMemo(() => Math.max(1, Math.ceil((total || 0) / pageSize)), [total, pageSize]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/questions/feedback`, {
        params: { page, pageSize, ...(status ? { status } : {}), ...(questionId ? { questionId } : {}) },
        headers: { Authorization: `Bearer ${token}` },
      });
      setRows(res.data?.data || []);
      setTotal(res.data?.meta?.total || 0);
    } catch (e: any) {
      toast({ title: 'Error', description: e?.response?.data?.message || 'Failed to load feedback', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, pageSize, status, questionId]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Questions Feedback</h1>
        <p className="text-muted-foreground">Submitted feedback from students on questions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <select
            className="border rounded px-2 py-1 text-sm"
            value={status}
            onChange={(e) => { setPage(1); setStatus(e.target.value); }}
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
          <input
            placeholder="Filter by Question ID"
            className="border rounded px-2 py-1 text-sm w-64"
            value={questionId}
            onChange={(e) => { setPage(1); setQuestionId(e.target.value.trim()); }}
          />
          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs text-gray-600">Per page</label>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Date</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead className="w-40">Student</TableHead>
                  <TableHead className="w-56">Email</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">No feedback found</TableCell>
                  </TableRow>
                ) : rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="max-w-[520px] text-sm text-gray-800">
                        {expandedQuestion[r.id] ? (
                          <>
                            <span>{r.question?.text || '—'}</span>
                            {(r.question?.text && r.question.text.length > 120) && (
                              <button className="ml-2 text-purple-700 hover:underline text-xs" onClick={() => setExpandedQuestion(prev => ({ ...prev, [r.id]: false }))}>Show less</button>
                            )}
                          </>
                        ) : (
                          <>
                            <span title={r.question?.text || ''}>{(r.question?.text || '—').slice(0, 120)}{(r.question?.text && r.question.text.length > 120) ? '…' : ''}</span>
                            {(r.question?.text && r.question.text.length > 120) && (
                              <button className="ml-2 text-purple-700 hover:underline text-xs" onClick={() => setExpandedQuestion(prev => ({ ...prev, [r.id]: true }))}>Show more</button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{r.student?.name || '—'}</TableCell>
                    <TableCell>{r.student?.email || '—'}</TableCell>
                    <TableCell>
                      <div className="max-w-[520px] text-sm text-gray-800">
                        {expandedMessage[r.id] ? (
                          <>
                            <span>{r.message}</span>
                            {(r.message && r.message.length > 160) && (
                              <button className="ml-2 text-purple-700 hover:underline text-xs" onClick={() => setExpandedMessage(prev => ({ ...prev, [r.id]: false }))}>Show less</button>
                            )}
                          </>
                        ) : (
                          <>
                            <span title={r.message}>{(r.message || '').slice(0, 160)}{(r.message && r.message.length > 160) ? '…' : ''}</span>
                            {(r.message && r.message.length > 160) && (
                              <button className="ml-2 text-purple-700 hover:underline text-xs" onClick={() => setExpandedMessage(prev => ({ ...prev, [r.id]: true }))}>Show more</button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{r.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <button
          className="border rounded px-3 py-1 text-sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
        >Prev</button>
        <span className="text-sm">Page {page} / {pages}</span>
        <button
          className="border rounded px-3 py-1 text-sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= pages || loading}
        >Next</button>
      </div>
    </div>
  );
}
