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
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import defaultAvatar from "../../assets/default.jpg";

interface User {
  id: string;
  full_name: string;
  display_name: string;
  email: string;
  contact_number: string;
  profile_image: string | null;
  created_at: string;
  updated_at: string;
  role: string;
  status: "active" | "inactive";
  level?: 'Beginner' | 'Intermediate' | 'Pro' | 'Master' | null;
}

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/students`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setUsers(response.data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to fetch users. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchUsers();
  }, [token]);

  const filteredUsers = users
    .filter(user =>
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (a.status === b.status) return 0;
      if (a.status === "active") return -1;
      return 1;
    });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const toggleUserStatus = async (userId: string) => {
    const prevUsers = [...users];
    // Optimistically update UI
    setUsers(users.map(user =>
      user.id === userId
        ? { ...user, status: user.status === "active" ? "inactive" : "active" }
        : user
    ));
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/student/status/${userId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      const updatedUser = response.data.user;
      setUsers(users => users.map(user =>
        user.id === userId ? { ...user, status: updatedUser.status } : user
      ));
      toast({
        title: "Success",
        description: response.data.message || "User status updated successfully",
      });
    } catch (error: any) {
      setUsers(prevUsers); // revert UI
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to update user status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const viewUserDetails = (userId: string) => {
    navigate(`/admin/users/${userId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">{t.usersManagement || 'Users Management'}</h1>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="relative w-full sm:w-1/3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t.searchUsers || "Search users..."}
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
              <TableHead className="text-xs sm:text-sm">Level</TableHead>
              <TableHead className="text-xs sm:text-sm">{t.joinedDate || 'Joined Date'}</TableHead>
              <TableHead className="text-xs sm:text-sm">{t.status || 'Status'}</TableHead>
              <TableHead className="text-right text-xs sm:text-sm">{t.actions || 'Actions'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {(() => {
                          const src = (user.profile_image && user.profile_image.startsWith("http"))
                            ? user.profile_image
                            : defaultAvatar;
                          return (
                            <AvatarImage
                              src={src}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = defaultAvatar;
                              }}
                            />
                          );
                        })()}

                      </Avatar>
                      <div>{user.full_name}</div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.contact_number}</TableCell>
                  <TableCell>
                    {user.level ? (
                      <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50">
                        {user.level}
                      </Badge>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={user.status === "active"}
                        onCheckedChange={() => toggleUserStatus(user.id)}
                      />
                      <Badge variant={user.status === "active" ? "default" : "destructive"}>
                        {user.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => viewUserDetails(user.id)}
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

export default Users;
