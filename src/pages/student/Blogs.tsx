import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Activity as ActivityIcon } from 'lucide-react';

type EnrolledCourse = { id: string; title: string };
type BlogItem = {
  id: string;
  title: string;
  created_at?: string;
  full_name?: string;
  profile_image?: string;
  content?: string;
  // When backend provides structured content blocks
  content_blocks?: Array<Record<string, string>>;
  image_url?: string;
  video_link?: string;
  file_url?: string;
  media_url?: string;
  document_url?: string;
  attachment?: string;
  url?: string;
  link?: string;
};

const StudentBlogs: React.FC = () => {
  const { token } = useAuth();
  const { toast } = useToast();

  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState<boolean>(false);
  const fetchedRef = useRef(false);

  const [selectedCourse, setSelectedCourse] = useState<EnrolledCourse | null>(null);
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [loadingBlogs, setLoadingBlogs] = useState<boolean>(false);
  const [blogFilter, setBlogFilter] = useState<'all' | 'unread' | 'read'>('all');

  const [showBlogModal, setShowBlogModal] = useState(false);
  const [activeBlog, setActiveBlog] = useState<BlogItem | null>(null);

  const [readMap, setReadMap] = useState<Record<string, string>>({}); // blogId -> ISO read_at
  const [blogStats, setBlogStats] = useState<Record<string, { total: number; read: number; unread: number }>>({}); // courseId -> stats

  // Load enrolled courses
  useEffect(() => {
    const run = async () => {
      if (fetchedRef.current) return;
      fetchedRef.current = true;
      setLoadingCourses(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/recent-enrolled-course`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        const normalized: EnrolledCourse[] = data.map((d: any) => ({
          id: d.courseId || d.course_id || d.enrolled_course || d.id,
          title: d.courseTitle || d.course_title || d.title || 'Untitled Course',
        })).filter(c => !!c.id);
        setCourses(normalized);
        // Fetch per-course blog stats
        try {
          const ids = normalized.map(c => c.id).filter(Boolean);
          if (ids.length > 0) {
            const res2 = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/blog-stats`, {
              params: { courseIds: ids.join(',') }, headers: { Authorization: `Bearer ${token}` }
            });
            const payload = res2?.data?.data ?? res2?.data ?? [];
            const map: Record<string, { total: number; read: number; unread: number }> = {};
            (Array.isArray(payload) ? payload : []).forEach((row: any) => {
              const cid = String(row.courseId || row.course_id || row.id);
              const total = Number(row.totalBlogs ?? 0);
              const read = Number(row.readBlogs ?? 0);
              const unread = Number(row.unreadBlogs ?? Math.max(0, total - read));
              if (cid) map[cid] = { total, read, unread };
            });
            setBlogStats(map);
          } else setBlogStats({});
        } catch { setBlogStats({}); }
      } catch (e: any) {
        toast({ title: 'Error', description: e?.response?.data?.message || e?.message || 'Failed to load courses.', variant: 'destructive' });
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };
    run();
  }, [token, toast]);

  // Fetch blogs for selected course
  const loadBlogsForCourse = async (course: EnrolledCourse) => {
    setSelectedCourse(course);
    setLoadingBlogs(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/all-blogs`, {
        params: { courseId: course.id }, headers: { Authorization: `Bearer ${token}` }
      });
      const items = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      const mapped: BlogItem[] = (items || []).map((b: any) => ({
        id: b.id,
        title: b.title || 'Blog',
        created_at: b.created_at || b.createdAt,
        full_name: b.full_name,
        profile_image: b.profile_image,
        content: b.content,
        image_url: b.image_url || b.image || b.cover_image,
        video_link: b.video_link || b.video,
        file_url: b.file_url || b.file,
        media_url: b.media_url,
        document_url: b.document_url,
        attachment: b.attachment,
        url: b.url,
        link: b.link,
      }));
      setBlogs(mapped);
      // Fetch read progress for these blogs
      try {
        const ids = mapped.map(m => m.id).filter(Boolean);
        if (ids.length > 0) {
          const res2 = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/students/blog-progress`, {
            params: { blogIds: ids.join(',') }, headers: { Authorization: `Bearer ${token}` }
          });
          const payload = res2?.data?.data ?? res2?.data ?? [];
          const map: Record<string, string> = {};
          (Array.isArray(payload) ? payload : []).forEach((row: any) => {
            const bid = row.blogId || row.blog_id || row.id; const at = row.read_at || row.updated_at || row.created_at;
            if (bid && at) map[bid] = at;
          });
          setReadMap(map);
        } else setReadMap({});
      } catch { setReadMap({}); }
    } catch (e: any) {
      toast({ title: 'Error', description: e?.response?.data?.message || e?.message || 'Failed to load blogs.', variant: 'destructive' });
      setBlogs([]);
    } finally {
      setLoadingBlogs(false);
    }
  };

  const openBlog = async (b: BlogItem) => {
    // Fetch full blog details from blogRoutes (public student fetch)
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/blogs/${b.id}`);
      const blog = Array.isArray(res.data?.data) ? res.data.data?.[0] : (res.data?.data || res.data || {});
      const blocks = Array.isArray(blog.content) ? blog.content : (Array.isArray((blog as any)?.content_blocks) ? (blog as any).content_blocks : undefined);
      const merged: BlogItem = {
        ...b,
        title: blog.title || b.title,
        created_at: blog.created_at || b.created_at,
        content: blog.content ?? b.content,
        content_blocks: blocks,
        image_url: blog.image_url || blog.image || blog.cover_image || b.image_url,
        video_link: blog.video_link || blog.video || b.video_link,
        file_url: blog.file_url || blog.file || b.file_url,
        media_url: blog.media_url || b.media_url,
        document_url: blog.document_url || b.document_url,
        attachment: blog.attachment || b.attachment,
        url: blog.url || b.url,
        link: blog.link || b.link,
      };
      setActiveBlog(merged);
      setShowBlogModal(true);
    } catch {
      // Fallback to existing minimal data
      setActiveBlog(b);
      setShowBlogModal(true);
    }
    // Mark as read (progress)
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/progress`, {
        progress_name: 'blog_read', blogId: b.id,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setReadMap(prev => ({ ...prev, [b.id]: new Date().toISOString() }));
    } catch {}
  };

  const renderMedia = (b?: BlogItem) => {
    if (!b) return null;
    const urls: string[] = [];
    const candidates = [b.image_url, b.video_link, b.file_url, b.media_url, b.document_url, b.attachment, b.url, b.link];
    candidates.forEach((u) => { if (typeof u === 'string' && /^https?:\/\//.test(u)) urls.push(u); });
    // Also scan content for URLs
    const contentText = typeof b.content === 'string' ? b.content : (b as any)?.content?.text || '';
    if (contentText) {
      const matches = contentText.match(/https?:\/\/\S+/g);
      if (matches) urls.push(...matches);
    }
    // If content blocks array exists, collect urls from known fields
    if (Array.isArray(b.content_blocks)) {
      b.content_blocks.forEach((blk) => {
        const vals = Object.values(blk || {});
        vals.forEach((v) => { if (typeof v === 'string' && /^https?:\/\//.test(v)) urls.push(v); });
      });
    }
    const unique = Array.from(new Set(urls));
    if (unique.length === 0) return null;
    // Try to render the first as preview, list the rest as links
    const first = unique[0];
    const rest = unique.slice(1);
    const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(first);
    const isVideo = /\.(mp4|webm|ogg)$/i.test(first) || /youtube\.com|youtu\.be|vimeo\.com/.test(first);
    return (
      <div className="space-y-2">
        {isImage && (
          <img src={first} alt="Blog media" className="w-full rounded-md border border-gray-200" />
        )}
        {!isImage && isVideo && /\.(mp4|webm|ogg)$/i.test(first) && (
          <video controls className="w-full rounded-md border border-gray-200">
            <source src={first} />
          </video>
        )}
        {!isImage && isVideo && !/\.(mp4|webm|ogg)$/i.test(first) && (
          <a href={first} target="_blank" rel="noreferrer" className="text-blue-600 underline">Open video</a>
        )}
        {!isImage && !isVideo && (
          <a href={first} target="_blank" rel="noreferrer" className="text-blue-600 underline">Open file</a>
        )}
        {rest.length > 0 && (
          <div className="text-sm text-gray-600">
            Additional links:
            <ul className="list-disc ml-5">
              {rest.map((u) => (
                <li key={u}><a href={u} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all">{u}</a></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-purple-700">Blogs</h1>
          <p className="text-gray-600 mt-1">Select a course to view its blogs.</p>
        </div>
        {/* Global blog filters (always visible) */}
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setBlogFilter('all')}
            className={`px-3 py-1.5 text-xs sm:text-sm ${blogFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >All</button>
          <button
            type="button"
            onClick={() => setBlogFilter('unread')}
            className={`px-3 py-1.5 text-xs sm:text-sm border-l border-gray-200 ${blogFilter === 'unread' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >Unread</button>
          <button
            type="button"
            onClick={() => setBlogFilter('read')}
            className={`px-3 py-1.5 text-xs sm:text-sm border-l border-gray-200 ${blogFilter === 'read' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >Read</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        {loadingCourses ? (
          <div className="flex items-center justify-center min-h-[160px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading your courses...</p>
            </div>
          </div>
        ) : courses.length === 0 ? (
          <p className="text-sm text-gray-500">No enrolled courses found.</p>
        ) : (
          <div className="rounded-xl border border-gray-100 p-2 bg-white max-h-[22rem] overflow-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {courses
                .filter((c) => {
                  const stats = blogStats[c.id] || { total: 0, read: 0, unread: 0 };
                  if (blogFilter === 'all') return true;
                  if (blogFilter === 'unread') return stats.unread > 0;
                  // 'read' -> fully read courses (no unread). If no blogs, hide.
                  return stats.total > 0 && stats.unread === 0;
                })
                .map((c) => {
                const isSelected = selectedCourse?.id === c.id;
                const stats = blogStats[c.id] || { total: 0, read: 0, unread: 0 };
                const isZero = stats.unread === 0;
                const hasUnread = stats.unread > 0;
                // Base accent classes driven by unread state (green for all-read, red for pending). No rings/glow.
                const borderColor = isZero
                  ? 'border-emerald-500'
                  : 'border-rose-500';
                const bgColor = isZero
                  ? (isSelected ? 'bg-emerald-100' : 'bg-emerald-50')
                  : (isSelected ? 'bg-rose-100' : 'bg-rose-50');
                const glowClass = '';
                const hoverClasses = isZero
                  ? 'hover:border-emerald-500 hover:bg-emerald-100'
                  : 'hover:border-rose-500 hover:bg-rose-100';
                // Selection override: blue 1px border + solid light blue bg, no ring/glow, no shadow
                const selBorder = 'border-sky-500';
                const selBg = 'bg-sky-100';
                const selRing = '';
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => loadBlogsForCourse(c)}
                    className={`group text-left mx-auto w-full max-w-[420px] flex flex-col gap-2 rounded-xl border ${isSelected ? selBorder : borderColor} ${isSelected ? selBg : bgColor} ${isSelected ? selRing : glowClass} ${isSelected ? 'shadow-none' : 'shadow-sm'} px-4 py-3 transition cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${hoverClasses}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {/* Sleek blog icon (no background) */}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            className="h-7 w-7 text-amber-600 shrink-0"
                            aria-hidden="true"
                          >
                            <path d="M5 7a2 2 0 0 1 2-2h9a3 3 0 0 1 3 3v10a2 2 0 0 1-2 2H8a3 3 0 0 1-3-3V7Z" />
                            <path d="M8 7h8M8 11h8M8 15h6" />
                          </svg>
                          <span className="truncate pr-1 text-sm sm:text-base font-medium text-gray-800">{c.title}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-amber-700">
                          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white/60 text-gray-800 px-2 py-0.5">
                            Blogs: {stats.total}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-0.5">
                            Read: {stats.read}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="flex flex-col items-end justify-center">
                          <div className={`leading-none text-3xl sm:text-4xl font-black tracking-tight tabular-nums ${isZero ? 'text-emerald-600' : 'text-rose-700'}`}>
                            {stats.unread}
                          </div>
                          <div className={`mt-1 text-[11px] sm:text-xs font-semibold uppercase tracking-wide ${isZero ? 'text-emerald-700' : 'text-rose-700'}`}>Unread Blogs</div>
                        </div>
                      </div>
                    </div>
                    <div className={`mt-1 text-xs ${isZero ? 'text-emerald-700' : 'text-rose-700'} ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition`}>
                      {isSelected ? 'Viewing blogs' : (hasUnread ? 'View blogs' : 'All caught up')}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Blogs list */}
      {!selectedCourse ? (
        <div className="bg-white rounded-xl shadow p-6 text-center text-gray-600">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1">Select a course to view its blogs</h3>
          <p className="text-sm">Click a course above to browse available blogs here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow p-4">
          <div className="mb-3">
            <h3 className="font-semibold text-gray-800">Blogs for: <span className="text-amber-700">{selectedCourse.title}</span></h3>
          </div>
          {loadingBlogs ? (
            <div className="flex items-center justify-center min-h-[160px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading blogs...</p>
              </div>
            </div>
          ) : blogs.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-6">No blogs have been added for this course yet.</div>
          ) : (
            <div className="max-h-[28rem] overflow-auto rounded-xl border border-gray-100 p-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {blogs
                  .filter((b) => blogFilter === 'all' ? true : (blogFilter === 'unread' ? !readMap[b.id] : !!readMap[b.id]))
                  .map((b) => {
                  const createdAt = b.created_at ? new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
                  const readAt = readMap[b.id];
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => openBlog(b)}
                      className="text-left mx-auto w-full max-w-[420px] flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 hover:border-amber-300 hover:bg-amber-100 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate pr-1 text-sm sm:text-base font-medium text-gray-800">{b.title}</div>
                          {b.full_name && (
                            <div className="text-xs text-gray-500 mt-0.5 truncate">By {b.full_name}</div>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs">
                            {createdAt && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 text-gray-700 px-2 py-0.5">
                                Created: {createdAt}
                              </span>
                            )}
                            {readAt ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-0.5">
                                Read: {new Date(readAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 text-rose-700 px-2 py-0.5">
                                Not Read
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0">
                          <div className="h-16 w-24 rounded-md bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                            <ActivityIcon className="h-5 w-5 text-amber-500" />
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

      {/* Blog viewer modal (simple) */}
      <Dialog open={showBlogModal} onOpenChange={setShowBlogModal}>
        <DialogContent className="max-w-3xl md:max-w-4xl w-[95vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeBlog?.title || 'Blog'}</DialogTitle>
            <DialogDescription>
              {activeBlog?.created_at ? `Created: ${new Date(activeBlog.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
            </DialogDescription>
          </DialogHeader>
          {/* Structured content blocks rendering */}
          {Array.isArray(activeBlog?.content_blocks) && activeBlog!.content_blocks!.length > 0 ? (
            <div className="space-y-4">
              {activeBlog!.content_blocks!.map((blk, idx) => {
                const key = Object.keys(blk || {})[0];
                const val = key ? (blk as any)[key] : undefined;
                if (!key || !val) return null;
                if (key === 'text') {
                  return (
                    <p key={idx} className="text-sm sm:text-base leading-7 text-gray-800">{val}</p>
                  );
                }
                if (key === 'image') {
                  const isUrl = typeof val === 'string' && /^https?:\/\//.test(val);
                  return (
                    <figure key={idx} className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                      {isUrl ? (
                        <img src={val} alt="Blog image" className="w-full object-cover" />
                      ) : null}
                      <figcaption className="px-3 py-2 text-xs text-gray-500">Image</figcaption>
                    </figure>
                  );
                }
                if (key === 'video') {
                  const url = String(val);
                  const isFile = /\.(mp4|webm|ogg)$/i.test(url);
                  return (
                    <div key={idx}>
                      {isFile ? (
                        <video controls className="w-full rounded-md border border-gray-200">
                          <source src={url} />
                        </video>
                      ) : (
                        <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 underline">Open video</a>
                      )}
                    </div>
                  );
                }
                if (key === 'file' || key === 'document' || key === 'url' || key === 'link') {
                  const url = String(val);
                  return (
                    <a key={idx} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-600 underline break-all">
                      Open file
                    </a>
                  );
                }
                // Fallback render as text
                return (
                  <p key={idx} className="text-sm sm:text-base leading-7 text-gray-800">{String(val)}</p>
                );
              })}
            </div>
          ) : (
            // Legacy single-string content
            (() => {
              const raw = activeBlog?.content as any;
              const text = typeof raw === 'string' ? raw : (raw && typeof raw.text === 'string' ? raw.text : '');
              return text ? (
                <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">{text}</div>
              ) : null;
            })()
          )}
          {/* Additional inferred media/links */}
          <div className="mt-4">{renderMedia(activeBlog)}</div>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowBlogModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentBlogs;
