import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";

const PrivacyPolicyAdmin = () => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { token } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchPrivacyPolicy();
  }, []);

  const fetchPrivacyPolicy = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/privacy-policy`);
      if (response.data && response.data.content) {
        setContent(response.data.content);
      } else {
        setContent("");
      }
    } catch (error) {
      console.log("No privacy policy found or error fetching:", error);
      setContent("");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Privacy policy content cannot be empty.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/privacy-policy`,
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({
        title: "Success",
        description: "Privacy policy saved successfully."
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to save privacy policy.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Privacy Policy Management</h1>
        <p className="text-muted-foreground">Manage your application's privacy policy content.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Privacy Policy Content</CardTitle>
          <CardDescription>
            Enter the privacy policy content that will be displayed to users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-medium">Privacy Policy Text</label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your privacy policy content here..."
                className="min-h-96 w-full"
                disabled={loading}
              />
            </div>
            <Button 
              onClick={handleSave} 
              className="w-full" 
              disabled={saving || loading}
            >
              {saving ? "Saving..." : "Save Privacy Policy"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyPolicyAdmin;
