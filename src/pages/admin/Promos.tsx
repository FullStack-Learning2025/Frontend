import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

interface Promo {
  id: string;
  heading: string;
  sub_description?: string;
  description?: string;
  price: number;
  created_at: string;
  updated_at: string;
}

const AdminPromos = () => {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const fetchPromos = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/promo`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setPromos(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch promos. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, [token]);

  const filteredPromos = promos?.filter(promo =>
    promo.heading.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (promo.sub_description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (promo.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const deletePromo = async (promoId: string) => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/promo/${promoId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setPromos(promos.filter(promo => promo.id !== promoId));
      toast({
        title: "Success",
        description: "Promo deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete promo. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading promos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">Promos Management</h1>
        <Button
          variant="default"
          onClick={() => navigate("/admin/create-promo")}
          className="text-sm sm:text-base"
        >
          Add Promo
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="relative w-full sm:w-1/3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search promos..."
            className="pl-10 text-sm sm:text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>      </div>

      <div className="rounded-md border shadow overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs sm:text-sm">Heading</TableHead>
              <TableHead className="text-xs sm:text-sm">Sub Description</TableHead>
              <TableHead className="text-xs sm:text-sm">Description</TableHead>
              <TableHead className="text-xs sm:text-sm">Price</TableHead>
              <TableHead className="text-xs sm:text-sm">Date Created</TableHead>
              <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPromos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No promos created yet. Click "Add Promo" to create your first promo.
                </TableCell>
              </TableRow>
            ) : (
              filteredPromos.map((promo) => (
                <TableRow key={promo.id}>
                  <TableCell className="font-medium text-xs sm:text-sm">{promo.heading}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{promo.sub_description}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{promo.description}</TableCell>
                  <TableCell className="text-xs sm:text-sm">${promo.price.toFixed(2)}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{formatDate(promo.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1 sm:gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-10 sm:w-10"
                        onClick={() => navigate(`/admin/edit-promo/${promo.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-10 sm:w-10"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this promo?')) {
                            deletePromo(promo.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

export default AdminPromos; 