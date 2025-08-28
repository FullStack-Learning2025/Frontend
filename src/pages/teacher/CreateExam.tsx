import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, Youtube, HelpCircle, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import axios from "axios";

interface Question {
  id: string;
  question: string;
  options: {
    [key: string]: string;
  };
  correct: string;
  hint?: string;
  video?: string;
  category: string;
  position?: number;
}

interface Course {
  id: string;
  title: string;
}

interface CourseTitle {
  id: string;
  title: string;
}

const TeacherCreateExam = () => {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get('type') === 'edit';
  const examId = searchParams.get('id');
  const categoryFromUrl = searchParams.get('category');
  const courseIdFromUrl = searchParams.get('course_id');
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [complexity, setComplexity] = useState("medium");
  const [estimatedTimeToComplete, setEstimatedTimeToComplete] = useState(60);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState(courseIdFromUrl || "");
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryFromUrl || "");
  const [categories, setCategories] = useState<{ name: string }[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [examStatus, setExamStatus] = useState("draft");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/courses/titles`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const allCourses = response.data.data;

        const coursesByTitle = allCourses.reduce((acc: { [key: string]: CourseTitle[] }, current: CourseTitle) => {
          if (!acc[current.title]) {
            acc[current.title] = [];
          }
          acc[current.title].push(current);
          return acc;
        }, {});

        const uniqueCourses = Object.values(coursesByTitle).map((courses: CourseTitle[]) => {
          if (selectedCourseId) {
            const matchingCourse = courses.find(c => c.id === selectedCourseId);
            return matchingCourse || courses[0];
          }
          return courses[0];
        });

        setCourses(uniqueCourses);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch courses. Please try again.",
          variant: "destructive"
        });
      }
    };

    fetchCourses();
  }, [token]);

  useEffect(() => {
    const fetchExam = async () => {
      if (isEditMode && examId) {
        setIsLoading(true);
        try {
          const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/exams/${examId}`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          const examData = response.data.data;
          setTitle(examData.title);
          setDescription(examData.description || "");
          setComplexity(examData.complexity || "medium");
          setEstimatedTimeToComplete(examData.estimated_time_to_complete || 60);
          setSelectedCourseId(examData.course_id);
          setExamStatus(examData.status || "draft");
          
          // Extract question IDs from the exam questions
          if (examData.questions) {
            const questionIds = examData.questions.map((q: Question) => q.id);
            setSelectedQuestions(questionIds);
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to fetch exam data. Please try again.",
            variant: "destructive"
          });
          navigate("/teacher/exams");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchExam();
  }, [isEditMode, examId, token]);

  useEffect(() => {
    if (isEditMode && examId && courses.length > 0 && selectedCourseId) {
      // If selectedCourseId is already set from examData, check if it matches a course
      const matchById = courses.find(c => c.id === selectedCourseId);
      if (!matchById) {
        // Try to match by title
        const matchByTitle = courses.find(c => c.title.toLowerCase() === title.toLowerCase());
        if (matchByTitle) {
          setSelectedCourseId(matchByTitle.id);
        }
      }
    }
  }, [isEditMode, examId, courses, selectedCourseId, title]);

  useEffect(() => {
    const fetchCategories = async () => {
      if (!selectedCourseId) {
        setCategories([]);
        return;
      }

      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/courses/${selectedCourseId}/categories`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        if (response.data && response.data.data && response.data.data.category) {
          const formattedCategories = response.data.data.category.map((name: string) => ({
            name
          }));
          setCategories(formattedCategories);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch categories. Please try again.",
          variant: "destructive"
        });
      }
    };

    fetchCategories();
  }, [selectedCourseId, token]);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!selectedCourseId || !selectedCategoryId) {
        setAvailableQuestions([]);
        return;
      }

      setIsLoadingQuestions(true);
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/questions/courses/${selectedCourseId}/questions?category=${encodeURIComponent(selectedCategoryId)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (response.data && response.data.data) {
          setAvailableQuestions(response.data.data);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch questions. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    fetchQuestions();
  }, [selectedCourseId, selectedCategoryId, token]);

  const toggleExamStatus = async () => {
    const newStatus = examStatus === "published" ? "draft" : "published";
    
    try {
      if (isEditMode && examId) {
        const examData = {
          title,
          description,
          category: selectedCategoryId,
          status: newStatus,
          complexity,
          estimated_time_to_complete: estimatedTimeToComplete
        };

        await axios.put(
          `${import.meta.env.VITE_BACKEND_URL}/api/exams/${examId}`,
          examData,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
      }
      
      setExamStatus(newStatus);
      toast({
        title: "Success",
        description: `Exam ${newStatus === "published" ? "published" : "unpublished"} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${newStatus === "published" ? "publish" : "unpublish"} exam. Please try again.`,
        variant: "destructive"
      });
    }
  };

  const handleSelectQuestion = (questionId: string) => {
    if (selectedQuestions.includes(questionId)) {
      setSelectedQuestions(selectedQuestions.filter(id => id !== questionId));
    } else {
      setSelectedQuestions([...selectedQuestions, questionId]);
    }
  };

  const handleAddAllQuestions = () => {
    const allQuestionIds = availableQuestions.map(q => q.id);
    setSelectedQuestions(allQuestionIds);
    toast({
      title: "Success",
      description: `Added all ${allQuestionIds.length} questions to the exam.`
    });
  };

  const handleRemoveAllQuestions = () => {
    setSelectedQuestions([]);
    toast({
      title: "Success",
      description: "Removed all questions from the exam."
    });
  };

  const handleSave = async () => {
    if (isSaving) return; // Prevent multiple clicks

    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please add a title for your exam.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedCourseId) {
      toast({
        title: "Error",
        description: "Please select a course for this exam.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedCategoryId) {
      toast({
        title: "Error",
        description: "Please select a category for this exam.",
        variant: "destructive"
      });
      return;
    }

    if (selectedQuestions.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one question to the exam.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const examData = {
        title,
        description,
        category: selectedCategoryId,
        status: examStatus,
        complexity,
        estimated_time_to_complete: estimatedTimeToComplete,
        questionIds: selectedQuestions
      };

      if (isEditMode && examId) {
        // Update existing exam
        await axios.put(
          `${import.meta.env.VITE_BACKEND_URL}/api/exams/${examId}`,
          examData,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
      } else {
        // Create new exam
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/exams/courses/${selectedCourseId}`,
          examData,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
      }

      toast({
        title: "Success",
        description: `Exam ${isEditMode ? 'updated' : 'created'} successfully!`,
      });
      navigate("/teacher/exams");
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? 'update' : 'create'} exam. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getSelectedQuestions = () => {
    return availableQuestions.filter(q => selectedQuestions.includes(q.id));
  };

  const getCorrectAnswerText = (question: Question) => {
    return question.options[question.correct] || question.correct;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto py-4 sm:py-6 px-3 sm:px-4">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          {isEditMode ? 'Edit Exam' : 'Create New Exam'}
        </h1>
        {selectedCourseId && selectedCategoryId && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <Button
              variant="outline"
              onClick={toggleExamStatus}
              className="bg-white hover:opacity-80 text-black text-sm sm:text-base"
            >
              {examStatus === "published" ? "Unpublish" : "Publish"}
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="bg-primary hover:bg-primary-600 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {isEditMode ? 'Updating...' : 'Saving...'}
                </div>
              ) : (
                isEditMode ? 'Update Exam' : 'Save Exam'
              )}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div>
          <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-1">
            Select Course
          </label>
          <select
            id="course"
            value={selectedCourseId}
            onChange={(e) => {
              setSelectedCourseId(e.target.value);
              setSelectedCategoryId("");
              setSelectedQuestions([]);
            }}
            className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
            disabled={isEditMode}
          >
            <option value="">Select a course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Select Category to Add Questions
          </label>
          <select
            id="category"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
            disabled={!selectedCourseId}
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.name} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedCourseId || !selectedCategoryId ? (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {!selectedCourseId ? 'Select a Course' : 'Select a Category'}
            </h3>
            <p className="text-gray-500">
              {!selectedCourseId 
                ? 'Choose a course to start creating your exam'
                : 'Choose a category to access available questions for your exam'
              }
            </p>
          </div>
        </div>
      ) : (
        <>
          <Card className="mb-6 sm:mb-8 border border-gray-100">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label htmlFor="exam-title" className="block text-sm font-medium text-gray-700 mb-1">
                    Exam Title
                  </label>
                  <Input 
                    id="exam-title"
                    placeholder="Enter exam title" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    className="text-lg sm:text-xl"
                  />
                </div>
                
                <div>
                  <label htmlFor="exam-description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <Textarea
                    id="exam-description"
                    placeholder="Enter exam description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="text-sm sm:text-base"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="exam-complexity" className="block text-sm font-medium text-gray-700 mb-1">
                      Complexity Level
                    </label>
                    <select
                      id="exam-complexity"
                      value={complexity}
                      onChange={(e) => setComplexity(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="exam-time" className="block text-sm font-medium text-gray-700 mb-1">
                      Estimated Time to Complete (minutes)
                    </label>
                    <Input
                      id="exam-time"
                      type="number"
                      min="1"
                      placeholder="60"
                      value={estimatedTimeToComplete}
                      onChange={(e) => setEstimatedTimeToComplete(parseInt(e.target.value) || 60)}
                      className="text-sm sm:text-base"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Show selected questions */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg sm:text-xl font-semibold">
              Selected Questions ({selectedQuestions.length})
            </h2>
            {selectedQuestions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveAllQuestions}
                className="bg-white hover:bg-gray-50"
              >
                Remove All Questions
              </Button>
            )}
          </div>

          <div className="space-y-4 sm:space-y-6 mb-8">
            {selectedQuestions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No questions selected yet. Select questions from below to add them to your exam.
              </p>
            ) : (
              getSelectedQuestions().map((question, qIndex) => (
                <Card key={question.id} className="border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 border-b border-gray-200">
                    <h3 className="font-medium text-sm sm:text-base">Question {qIndex + 1}</h3>
                    <div className="flex items-center gap-1 sm:gap-2">
                      {question.hint && (
                        <div className="flex items-center text-gray-600 text-xs sm:text-sm px-2 sm:px-3">
                          <HelpCircle size={16} className="mr-1" />
                          Has Hint
                        </div>
                      )}
                      {question.video && (
                        <div className="flex items-center text-gray-600 text-xs sm:text-sm px-2 sm:px-3">
                          <Youtube size={16} className="mr-1" />
                          Has Video
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-red-500 p-1 sm:p-2"
                        onClick={() => handleSelectQuestion(question.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                    <div>
                      <p className="text-sm sm:text-base">{question.question}</p>
                    </div>

                    <div className="space-y-2 sm:space-y-3">
                      {Object.entries(question.options).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 sm:gap-4">
                          <div 
                            className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full border-2 flex items-center justify-center ${
                              question.correct === key
                                ? 'border-primary bg-primary text-white' 
                                : 'border-gray-300'
                            }`}
                          >
                            {question.correct === key && <Check size={12} className="sm:hidden" />}
                            {question.correct === key && <Check size={14} className="hidden sm:block" />}
                          </div>
                          <p className={`flex-1 text-sm sm:text-base ${question.correct === key ? 'font-medium' : ''}`}>
                            {key}. {value}
                          </p>
                        </div>
                      ))}
                    </div>
                    
                    {question.hint && (
                      <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start gap-2">
                        <HelpCircle size={16} className="text-yellow-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-yellow-800">Hint:</p>
                          <p className="text-xs sm:text-sm text-yellow-700">{question.hint}</p>
                        </div>
                      </div>
                    )}
                    
                    {question.video && (
                      <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-gray-50 border border-gray-200 rounded-md flex items-start gap-2">
                        <Youtube size={16} className="text-gray-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-800">Video Tutorial:</p>
                          <p className="text-xs sm:text-sm text-gray-700 break-all">{question.video}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Show available questions section */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg sm:text-xl font-semibold">
              Available Questions ({availableQuestions.length})
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddAllQuestions}
              className="bg-white hover:bg-gray-50"
            >
              Add All Questions
            </Button>
          </div>

          <Card className="mb-6">
            <CardContent className="p-4">
              {isLoadingQuestions ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading questions...</p>
                </div>
              ) : availableQuestions.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No questions available for this category</p>
              ) : (
                <div className="space-y-3">
                  {availableQuestions.map((question) => (
                    <div 
                      key={question.id} 
                      className="flex items-center justify-between border rounded-lg p-3 hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{question.question}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Correct Answer: {getCorrectAnswerText(question)} | 
                          {question.hint && ' Has Hint |'} 
                          {question.video && ' Has Video'}
                        </p>
                      </div>
                      <Button
                        variant={selectedQuestions.includes(question.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSelectQuestion(question.id)}
                      >
                        {selectedQuestions.includes(question.id) ? 'Selected' : 'Add Question'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default TeacherCreateExam;