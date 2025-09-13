import { useEffect, useRef, useState } from "react";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Course {
  id: string;
  title: string;
  description: string;
  category: any;
  categories?: string[];
  rules?: string[] | string | null;
  notes?: string[] | string | null;
  cover_image: string;
  teacher_id: string;
  created_at: string;
  updated_at: string;
  status: "published" | "draft";
}

interface Teacher {
  id: string;
  full_name: string;
  email: string;
}

interface AssignedTeacher {
  id?: string;
  full_name: string;
  email: string;
  assigned_at?: string;
  profile_image?: string | null;
  status?: string;
}

const AssignCourse = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const didFetchCourses = useRef(false);
  // pagination states for teachers
  const [teacherPage, setTeacherPage] = useState(1);
  const [teacherPageSize, setTeacherPageSize] = useState(6);
  const [teacherTotal, setTeacherTotal] = useState(0);
  const [teacherTotalPages, setTeacherTotalPages] = useState(1);

  // Assigned teachers dialog state and cache
  const [assignedDialogOpen, setAssignedDialogOpen] = useState(false);
  const [assignedForCourse, setAssignedForCourse] = useState<Course | null>(null);
  const [assignedTeachers, setAssignedTeachers] = useState<AssignedTeacher[]>([]);
  const [assignedLoading, setAssignedLoading] = useState(false);

  const fetchAssignedTeachers = async (courseId: string) => {
    try {
      setAssignedLoading(true);
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/assigned-teachers`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { courseId },
        }
      );
      const raw = res?.data;
      let list: AssignedTeacher[] = [];
      if (Array.isArray(raw) && raw[0]?.teachers) {
        list = raw[0].teachers as AssignedTeacher[];
      } else if (raw?.data && Array.isArray(raw.data) && raw.data[0]?.teachers) {
        list = raw.data[0].teachers as AssignedTeacher[];
      } else if (Array.isArray(raw?.teachers)) {
        list = raw.teachers as AssignedTeacher[];
      } else if (Array.isArray(raw?.data)) {
        list = raw.data as AssignedTeacher[];
      } else {
        list = (raw?.data || raw || []) as AssignedTeacher[];
      }
      setAssignedTeachers(list);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to load assigned teachers.',
        variant: 'destructive',
      });
      setAssignedTeachers([]);
    } finally {
      setAssignedLoading(false);
    }
  };

  const fetchTeachers = async (page: number, limit: number) => {
    try {
      setTeachersLoading(true);
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/teachers`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { page, limit },
        }
      );
      // Flexible mapping depending on backend response shape
      const data = res.data;
      const items = (data?.data || data?.teachers || [])
        .slice()
        .sort((a: any, b: any) => (a?.full_name || '').localeCompare(b?.full_name || ''));
      const total = data?.pagination?.total ?? data?.total ?? data?.count ?? items.length;
      const totalPages = data?.pagination?.totalPages ?? (total ? Math.max(1, Math.ceil(total / (data?.pagination?.limit ?? teacherPageSize))) : 1);
      setTeachers(items);
      setTeacherTotal(total);
      setTeacherTotalPages(totalPages);
      // sync page if backend returns it
      if (typeof data?.pagination?.page === 'number') {
        setTeacherPage(data.pagination.page);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load teachers.",
        variant: "destructive",
      });
    } finally {
      setTeachersLoading(false);
    }
  };

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/courses`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setCourses(response.data.data || []);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch courses. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (!didFetchCourses.current && token) {
      didFetchCourses.current = true;
      fetchCourses();
    }
  }, [token]);

  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const parseStringArray = (val: unknown): string[] => {
    if (Array.isArray(val)) return (val as any[])
      .map((x) => (typeof x === 'string' ? x : (x && typeof (x as any).name === 'string' ? (x as any).name : '')))
      .map((s) => String(s).trim())
      .filter(Boolean);
    if (typeof val === 'string') {
      const s = val.trim();
      try {
        if (s.startsWith('[') && s.endsWith(']')) {
          const arr = JSON.parse(s);
          if (Array.isArray(arr)) {
            return arr
              .map((x: any) => (typeof x === 'string' ? x : (x && typeof x.name === 'string' ? x.name : '')))
              .map((v: any) => String(v).trim())
              .filter(Boolean);
          }
        }
      } catch {}
      return s.split(',').map((x) => x.replace(/^[\[\s\"]+|[\]\s\"]+$/g, '').trim()).filter(Boolean);
    }
    return [];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full px-2 sm:px-4 lg:px-6">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Assign Course</h1>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="relative w-full sm:w-1/3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              className="pl-10 text-sm sm:text-base w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-hidden rounded-md border shadow">
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-900 bg-gray-50 whitespace-nowrap">Course Name</TableHead>
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-900 bg-gray-50 whitespace-nowrap">Category</TableHead>
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-900 bg-gray-50 whitespace-nowrap">Rules</TableHead>
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-900 bg-gray-50 whitespace-nowrap">Notes</TableHead>
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-900 bg-gray-50 whitespace-nowrap">Date Created</TableHead>
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-900 bg-gray-50 whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-900 bg-gray-50 whitespace-nowrap">View Assigned</TableHead>
                  <TableHead className="text-xs sm:text-sm font-medium text-gray-900 bg-gray-50 whitespace-nowrap w-0">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No courses found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCourses.map((course) => (
                    <TableRow key={course.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-xs sm:text-sm text-gray-900 max-w-[150px] sm:max-w-none truncate">
                        {course.title}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-gray-900">
                        {(() => {
                          const cats = (Array.isArray(course.categories) ? course.categories : parseStringArray(course.category)) || [];
                          return cats.join(', ');
                        })()}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-gray-900">
                        {parseStringArray(course.rules ?? []).join(', ')}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-gray-900">
                        {parseStringArray(course.notes ?? []).join(', ')}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(course.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={course.status === "published" ? "default" : "outline"}
                            className="text-xs sm:text-sm whitespace-nowrap"
                          >
                            {course.status === "published" ? "Published" : "Draft"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="h-8 w-8 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                          aria-label="View Assigned"
                          onClick={async () => {
                            setAssignedForCourse(course);
                            setAssignedDialogOpen(true);
                            await fetchAssignedTeachers(course.id);
                          }}
                        >
                          <Users className="h-4 w-4" />
                        </button>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Button
                          className="rounded-full border border-green-600 text-green-700 bg-green-500/10 hover:bg-green-500/20 text-xs px-3 py-1 transition-colors"
                          onClick={async () => {
                            setSelectedCourse(course);
                            setSelectedTeacherId("");
                            setTeachers([]);
                            setDialogOpen(true);
                            // initial fetch for first page
                            setTeacherPage(1);
                            await fetchTeachers(1, teacherPageSize);
                          }}
                        >
                          Assign Course
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        {/* Assign Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="w-[95vw] sm:max-w-[900px]">
            <DialogTitle className="text-lg font-semibold">Assign Course</DialogTitle>
            <div className="space-y-4">
              <div className="rounded-md border p-3 bg-gray-50">
                <p className="text-sm text-gray-600">Course</p>
                <p className="text-base font-medium text-gray-900">{selectedCourse?.title}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(() => {
                    const cats = (Array.isArray(selectedCourse?.categories) ? selectedCourse.categories : parseStringArray(selectedCourse?.category)) || [];
                    return cats.map((c, i) => (
                      <Badge key={`${c}-${i}`} variant="secondary" className="text-xs px-2 py-0.5">
                        {c}
                      </Badge>
                    ));
                  })()}
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600 mb-1">Rules</p>
                  <div className="flex flex-wrap gap-1">
                    {(() => {
                      const rules = parseStringArray(selectedCourse?.rules ?? []);
                      return rules.length > 0 ? rules.map((rule, i) => (
                        <Badge key={`rule-${i}`} variant="outline" className="text-xs px-2 py-0.5">
                          {rule}
                        </Badge>
                      )) : (
                        <span className="text-xs text-gray-500">No rules specified</span>
                      );
                    })()}
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600 mb-1">Notes</p>
                  <div className="flex flex-wrap gap-1">
                    {(() => {
                      const notes = parseStringArray(selectedCourse?.notes ?? []);
                      return notes.length > 0 ? notes.map((note, i) => (
                        <Badge key={`note-${i}`} variant="outline" className="text-xs px-2 py-0.5">
                          {note}
                        </Badge>
                      )) : (
                        <span className="text-xs text-gray-500">No notes specified</span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Teacher list */}
              <div className="max-h-[60vh] overflow-auto pr-1">
                {teachersLoading ? (
                  <div className="text-sm text-gray-500">Loading teachers...</div>
                ) : teachers.length === 0 ? (
                  <div className="text-sm text-gray-500">No teachers found.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {teachers.map((t) => {
                      const selected = selectedTeacherId === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedTeacherId(t.id);
                            setSelectedTeacher(t as any);
                            setConfirmOpen(true);
                          }}
                          className={
                            `m-1 text-left rounded-md border p-2 transition-colors ` +
                            `${selected ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:bg-red-500/10'}`
                          }
                        >
                          <div className="text-[13px] font-medium text-gray-900 truncate">{t.full_name}</div>
                          <div className="text-[12px] text-gray-600 truncate">{(t as any).email}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pagination controls */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <div className="text-gray-600">
                  {(() => {
                    const start = teachers.length === 0 ? 0 : (teacherPage - 1) * teacherPageSize + 1;
                    const end = Math.min(teacherPage * teacherPageSize, teacherTotal || start - 1 + teachers.length);
                    const total = teacherTotal || teachers.length;
                    return `Showing ${start}-${end} of ${total}`;
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-7 w-7 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 shadow-sm cursor-pointer disabled:cursor-not-allowed"
                    onClick={async () => {
                      if (teacherPage > 1) {
                        const newPage = teacherPage - 1;
                        setTeacherPage(newPage);
                        await fetchTeachers(newPage, teacherPageSize);
                      }
                    }}
                    disabled={teacherPage === 1 || teachersLoading}
                    aria-label="Previous page"
                  >
                    ‹
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="h-7 px-2 rounded-md border border-gray-300 bg-white text-gray-700 cursor-pointer hover:bg-gray-100 shadow-sm"
                      >
                        Items/page: {teacherPageSize}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" align="end">
                      {[6, 12, 18].map((n) => (
                        <DropdownMenuItem
                          key={n}
                          onClick={async () => {
                            setTeacherPageSize(n);
                            setTeacherPage(1);
                            await fetchTeachers(1, n);
                          }}
                          className={n === teacherPageSize ? 'bg-muted' : ''}
                        >
                          {n} per page
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="h-7 px-2 rounded-md border border-gray-300 bg-white text-gray-700 cursor-pointer hover:bg-gray-100 shadow-sm"
                      >
                        Go to: Page {teacherPage}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" align="end" className="max-h-56 overflow-auto">
                      {(() => {
                        const total = teacherTotal || teachers.length || 1;
                        const pagesCount = teacherTotalPages || Math.max(1, Math.ceil(total / teacherPageSize));
                        const pages = Array.from({ length: pagesCount }, (_, i) => i + 1);
                        return pages.slice(0, 200).map((p) => (
                          <DropdownMenuItem
                            key={p}
                            onClick={async () => {
                              setTeacherPage(p);
                              await fetchTeachers(p, teacherPageSize);
                            }}
                            className={p === teacherPage ? 'bg-muted' : ''}
                          >
                            Page {p}
                          </DropdownMenuItem>
                        ));
                      })()}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <button
                    type="button"
                    className="h-7 w-7 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 shadow-sm cursor-pointer disabled:cursor-not-allowed"
                    onClick={async () => {
                      const maxPage = teacherTotalPages || Math.ceil((teacherTotal || teacherPage * teacherPageSize) / teacherPageSize);
                      if (teacherPage < maxPage) {
                        const newPage = teacherPage + 1;
                        setTeacherPage(newPage);
                        await fetchTeachers(newPage, teacherPageSize);
                      }
                    }}
                    disabled={teachersLoading}
                    aria-label="Next page"
                  >
                    ›
                  </button>
                </div>
              </div>

              
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirm Assignment Dialog */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent noOverlay className="w-[92vw] sm:max-w-[620px]">
            <DialogTitle className="text-lg font-semibold">Confirm Assignment</DialogTitle>
            <div className="space-y-4">
              <div className="rounded-md border p-3 bg-gray-50">
                <p className="text-sm text-gray-700">
                  Are you sure to assign
                  <span className="font-semibold text-gray-900"> {selectedCourse?.title} </span>
                  to
                  <span className="font-semibold text-gray-900"> {selectedTeacher?.full_name}</span>
                  {selectedTeacher?.email && (
                    <span className="text-gray-700"> ({selectedTeacher.email})</span>
                  )}
                  ?
                </p>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-full border border-red-600 text-red-700 bg-red-500/10 hover:bg-red-500/20 transition-colors text-sm"
                  onClick={() => setConfirmOpen(false)}
                >
                  No
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 rounded-full border border-green-600 text-green-700 bg-green-500/10 hover:bg-green-500/20 transition-colors text-sm ${assignLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                  disabled={assignLoading || !selectedTeacher?.id || !selectedCourse?.id}
                  onClick={async () => {
                    if (!selectedTeacher?.id || !selectedCourse?.id) return;
                    try {
                      setAssignLoading(true);
                      const res = await axios.post(
                        `${import.meta.env.VITE_BACKEND_URL}/api/admin/assign-course`,
                        {
                          teacherId: selectedTeacher.id,
                          courseId: selectedCourse.id,
                        },
                        {
                          headers: { Authorization: `Bearer ${token}` },
                        }
                      );
                      toast({
                        title: res?.data?.success === false ? 'Info' : 'Success',
                        description: res?.data?.message || 'Operation completed.',
                      });
                      setConfirmOpen(false);
                    } catch (error: any) {
                      toast({
                        title: 'Error',
                        description: error?.response?.data?.message || error?.message || 'Failed to assign course. Please try again.',
                        variant: 'destructive',
                      });
                    } finally {
                      setAssignLoading(false);
                    }
                  }}
                >
                  {assignLoading ? 'Assigning...' : 'Yes'}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Assigned Dialog */}
        <Dialog open={assignedDialogOpen} onOpenChange={setAssignedDialogOpen}>
          <DialogContent className="w-[95vw] sm:max-w-[720px] max-h-[80vh] overflow-auto">
            <DialogTitle className="text-lg font-semibold">This Course Has Been Assigned To The Following Teachers</DialogTitle>
            <div className="space-y-4">
              <div className="rounded-md border p-3 bg-gray-50">
                <p className="text-sm text-gray-600">Course</p>
                <p className="text-base font-medium text-gray-900">{assignedForCourse?.title}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(() => {
                    const cats = (Array.isArray(assignedForCourse?.['categories']) ? (assignedForCourse as any).categories : parseStringArray(assignedForCourse?.category)) || [];
                    return cats.map((c, i) => (
                      <Badge key={`${c}-${i}`} variant="secondary" className="text-xs px-2 py-0.5">
                        {c}
                      </Badge>
                    ));
                  })()}
                </div>
              </div>

              <div className="max-h-[60vh] overflow-auto pr-1">
                {assignedLoading ? (
                  <div className="text-sm text-gray-500">Loading assigned teachers...</div>
                ) : assignedTeachers.length === 0 ? (
                  <div className="text-sm text-gray-500">No teachers assigned yet.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {assignedTeachers.map((t, idx) => (
                      <div key={`${t.id || idx}`} className="m-1 rounded-md border border-gray-200 p-3 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-xs font-semibold text-gray-600">
                          {t.profile_image ? (
                            <img src={t.profile_image} alt={t.full_name} className="h-full w-full object-cover" />
                          ) : (
                            (t.full_name?.[0] || '?').toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{t.full_name}</div>
                          <div className="text-xs text-gray-600 truncate">{t.email}</div>
                          {t.assigned_at && (
                            <div className="text-[11px] text-gray-500 mt-0.5">Assigned: {new Date(t.assigned_at).toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AssignCourse;
