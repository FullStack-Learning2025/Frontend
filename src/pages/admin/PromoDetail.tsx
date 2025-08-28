import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";

const PromoDetail = () => {
  const { id } = useParams<{ id?: string }>();
  const [heading, setHeading] = useState("");
  const [subDescription, setSubDescription] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      setLoading(true);
      axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/promo/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          const promo = res.data;
          setHeading(promo.heading || "");
          setSubDescription(promo.sub_description || "");
          setDescription(promo.description || "");
          setPrice(promo.price ? promo.price.toString() : "");
        })
        .catch(() => {
          toast({
            title: "Error",
            description: "Failed to load promo details.",
            variant: "destructive"
          });
        })
        .finally(() => setLoading(false));
    }
  }, [id, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heading || !price) {
      toast({
        title: "Error",
        description: "Heading and price are required.",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      if (id) {
        // Edit
        await axios.put(
          `${import.meta.env.VITE_BACKEND_URL}/api/admin/promo/${id}`,
          {
            heading,
            sub_description: subDescription,
            description,
            price: parseFloat(price)
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast({ title: "Success", description: "Promo updated successfully." });
      } else {
        // Create
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/admin/promo`,
          {
            heading,
            sub_description: subDescription,
            description,
            price: parseFloat(price)
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast({ title: "Success", description: "Promo created successfully." });
      }
      navigate("/admin/promos");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to save promo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{id ? "Edit Promo" : "Create Promo"}</h1>
        <p className="text-muted-foreground">{id ? "Update promo details below." : "Fill out the form to create a new promo."}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{id ? "Edit Promo" : "Create Promo"}</CardTitle>
          <CardDescription>
            {id ? "Edit the details of your promo." : "Enter the details for your new promo."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="heading" className="text-sm font-medium">Heading<span className="text-red-500">*</span></label>
              <Input
                id="heading"
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                placeholder="Promo heading"
                className="w-full"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="subDescription" className="text-sm font-medium">Sub Description</label>
              <Input
                id="subDescription"
                value={subDescription}
                onChange={(e) => setSubDescription(e.target.value)}
                placeholder="Promo sub description (optional)"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">Description</label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Promo description (optional)"
                className="min-h-24 w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="price" className="text-sm font-medium">Price<span className="text-red-500">*</span></label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Promo price"
                className="w-full"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (id ? "Saving..." : "Creating...") : (id ? "Save Changes" : "Create Promo")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PromoDetail; 