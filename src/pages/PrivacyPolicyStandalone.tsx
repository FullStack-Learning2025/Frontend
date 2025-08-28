
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import axios from "axios";

const PrivacyPolicyStandalone = () => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrivacyPolicy();
  }, []);

  const fetchPrivacyPolicy = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/privacy-policy`);

      if (response.data) {
        setContent(response.data.content || "Privacy policy content not available.");
      } else {
        setContent("Privacy policy content not available.");
      }
    } catch (error) {
      setContent("Privacy policy content not available.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    window.close();
    // Fallback if window.close() doesn't work
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" className="mb-4" onClick={handleGoBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            ) : (
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {content}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicyStandalone;
