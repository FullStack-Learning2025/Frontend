
import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Eye, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

interface Teacher {
  id: string;
  full_name: string;
  email: string;
  contact_number: string;
  profile_image?: string;
  created_at: string;
  joined_date: string;
  status: "active" | "inactive";
  total_courses: number;
}

const Teachers = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  
  const fetchTeachers = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/teachers`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setTeachers(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch teachers. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [token]);

  const filteredTeachers = teachers.filter(teacher => 
    teacher.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    teacher.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const toggleTeacherStatus = async (teacherId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/teacher/status/${teacherId}`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setTeachers(teachers.map(teacher => 
        teacher.id === teacherId 
          ? { ...teacher, status: newStatus }
          : teacher
      ));
      
      toast({
        title: "Success",
        description: `Teacher ${newStatus === "active" ? "activated" : "deactivated"} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update teacher status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const viewTeacherDetails = (teacherId: string) => {
    navigate(`/admin/teachers/${teacherId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading teachers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">{t.teachersManagement || 'Teachers Management'}</h1>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="relative w-full sm:w-1/3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t.searchTeachers || "Search teachers..."}
            className="pl-10 text-sm sm:text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border shadow overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs sm:text-sm">{t.name || 'Name'}</TableHead>
              <TableHead className="text-xs sm:text-sm">{t.email || 'Email'}</TableHead>
              <TableHead className="text-xs sm:text-sm">{t.contact || 'Contact'}</TableHead>
              <TableHead className="text-xs sm:text-sm">{t.joinedDate || 'Joined Date'}</TableHead>
              <TableHead className="text-xs sm:text-sm">{t.courses || 'Courses'}</TableHead>
              <TableHead className="text-xs sm:text-sm">{t.status || 'Status'}</TableHead>
              <TableHead className="text-right text-xs sm:text-sm">{t.actions || 'Actions'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTeachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No teachers found
                </TableCell>
              </TableRow>
            ) : (
              filteredTeachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {teacher.profile_image ? (
                          <AvatarImage src={teacher.profile_image} />
                        ) : (
                          <AvatarFallback>{teacher.full_name.charAt(0)}</AvatarFallback>
                        )}
                      </Avatar>
                      <div>{teacher.full_name}</div>
                    </div>
                  </TableCell>
                  <TableCell>{teacher.email}</TableCell>
                  <TableCell>{teacher.contact_number}</TableCell>
                  <TableCell>{formatDate(teacher.joined_date)}</TableCell>
                  <TableCell>{teacher.total_courses}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={teacher.status === "active"} 
                        onCheckedChange={() => toggleTeacherStatus(teacher.id, teacher.status)}
                      />
                      <Badge variant={teacher.status === "active" ? "default" : "destructive"}>
                        {teacher.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => viewTeacherDetails(teacher.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Teachers;
