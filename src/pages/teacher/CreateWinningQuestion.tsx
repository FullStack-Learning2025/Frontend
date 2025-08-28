
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const CreateWinningQuestion = () => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question || !answer) {
      toast({
        title: t.error,
        description: t.fillBothFields,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/winningquestion`, 
        { question, answer },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: t.success,
        description: t.questionCreated,
      });
      
      navigate("/teacher/dashboard");
    } catch (error) {
      console.error("Error creating winning question:", error);
      toast({
        title: t.error,
        description: t.failedToCreate,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.winningQuestionTitle}</h1>
        <p className="text-muted-foreground">{t.winningQuestionDesc}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.winningQuestionFormTitle}</CardTitle>
          <CardDescription>
            {t.winningQuestionFormDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="question" className="text-sm font-medium">{t.question}</label>
              <Input
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t.enterQuestion}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="answer" className="text-sm font-medium">{t.answer}</label>
              <Textarea
                id="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={t.enterAnswer}
                className="min-h-24 w-full"
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t.saving : t.saveQuestion}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateWinningQuestion;
