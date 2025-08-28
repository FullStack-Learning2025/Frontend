
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";

const TermsConditionsPublic = () => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTermsConditions();
  }, []);

  const fetchTermsConditions = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/terms-conditions`);
      if (response.data && response.data.length > 0) {
        // Get the latest terms (assuming the first one is the latest)
        const latestTerms = response.data[0];
        setContent(latestTerms.content || "Terms & conditions content not available.");
      } else {
        setContent("Terms & conditions content not available.");
      }
    } catch (error) {
      setContent("Terms & conditions content not available.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Terms & Conditions</CardTitle>
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

export default TermsConditionsPublic;
