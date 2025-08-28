import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";

const TermsConditionsAdmin = () => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { token } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchTermsConditions();
  }, []);

  const fetchTermsConditions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/terms-conditions`);
      if (response.data && response.data.content) {
        setContent(response.data.content);
      } else {
        setContent("");
      }
    } catch (error) {
      console.log("No terms & conditions found or error fetching:", error);
      setContent("");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Terms & conditions content cannot be empty.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/terms-conditions`,
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({
        title: "Success",
        description: "Terms & conditions saved successfully."
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to save terms & conditions.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Terms & Conditions Management</h1>
        <p className="text-muted-foreground">Manage your application's terms & conditions content.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Terms & Conditions Content</CardTitle>
          <CardDescription>
            Enter the terms & conditions content that will be displayed to users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-medium">Terms & Conditions Text</label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your terms & conditions content here..."
                className="min-h-96 w-full"
                disabled={loading}
              />
            </div>
            <Button 
              onClick={handleSave} 
              className="w-full" 
              disabled={saving || loading}
            >
              {saving ? "Saving..." : "Save Terms & Conditions"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TermsConditionsAdmin;
