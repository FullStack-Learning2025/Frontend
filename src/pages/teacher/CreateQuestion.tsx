import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, Youtube, HelpCircle, Check, Image, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import axios from "axios";

interface Choice {
  id: string;
  key: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  choices: Choice[];
  hint?: string;
  videoUrl?: string;
  imageUrl?: string;
  isNew?: boolean;
  rules?: string[];
  notes?: string[];
}

interface Course {
  id: string;
  title: string;
  categories?: string[];
  rules?: string[];
  notes?: string[];
}

interface Category {
  name: string;
}

const CreateQuestion = () => {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditMode = searchParams.get('type') === 'edit' || !!searchParams.get('id');
  const questionId = searchParams.get('id');
  const categoryFromUrl = searchParams.get('category');
  const courseIdFromUrl = searchParams.get('course_id');

  const [selectedCourseId, setSelectedCourseId] = useState(courseIdFromUrl || "");
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryFromUrl || "");
  const [courses, setCourses] = useState<Course[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [courseRules, setCourseRules] = useState<string[]>([]);
  const [courseNotes, setCourseNotes] = useState<string[]>([]);
  const didFetchRef = useRef(false);
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: "1",
      text: "",
      choices: [
        { id: "c1", key: "A", text: "", isCorrect: false },
        { id: "c2", key: "B", text: "", isCorrect: false },
        { id: "c3", key: "C", text: "", isCorrect: false },
        { id: "c4", key: "D", text: "", isCorrect: false }
      ],
      isNew: true
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [hintDialogOpen, setHintDialogOpen] = useState(false);
  const [hintText, setHintText] = useState("");
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  // Filters
  const [filterIncomplete, setFilterIncomplete] = useState(false);
  const [filterMissingRules, setFilterMissingRules] = useState(false);

  // Additional UI state (dialogs)
  const [selectedRule, setSelectedRule] = useState("");
  const [noteText, setNoteText] = useState("");
  // Per-question dropdown open state and refs
  const [openRulesId, setOpenRulesId] = useState<string | null>(null);
  const [openNotesId, setOpenNotesId] = useState<string | null>(null);
  const rulesDropdownRef = useRef<HTMLDivElement | null>(null);
  const notesDropdownRef = useRef<HTMLDivElement | null>(null);
  // Per-question Rules/Notes toggles
  const toggleQuestionRule = (qid: string, rule: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qid) return q;
      const current = q.rules || [];
      const next = current.includes(rule) ? current.filter(r => r !== rule) : [...current, rule];
      return { ...q, rules: next };
    }));
  };
  const toggleQuestionNote = (qid: string, note: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qid) return q;
      const current = q.notes || [];
      const next = current.includes(note) ? current.filter(n => n !== note) : [...current, note];
      return { ...q, notes: next };
    }));
  };

  // Close currently open dropdowns on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (openRulesId && rulesDropdownRef.current && !rulesDropdownRef.current.contains(t)) {
        setOpenRulesId(null);
      }
      if (openNotesId && notesDropdownRef.current && !notesDropdownRef.current.contains(t)) {
        setOpenNotesId(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openRulesId, openNotesId]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [questionsPerPage] = useState(100);

  const { toast } = useToast();

  // Keep a snapshot of server-fetched questions to detect changes
  const originalQuestionsRef = useRef<Question[]>([]);

  const normalizeQuestion = (q: Question) => ({
    text: q.text.trim(),
    hint: (q.hint || '').trim(),
    videoUrl: (q.videoUrl || '').trim(),
    imageUrl: (q.imageUrl || '').trim(),
    choices: q.choices.map(c => ({ key: c.key, text: c.text.trim(), isCorrect: !!c.isCorrect }))
  });

  // Fetch courses on component mount
  useEffect(() => {
    const fetchCourses = async () => {
      if (didFetchRef.current) return;
      didFetchRef.current = true;
      
      setIsLoadingCourses(true);
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/courses/titles`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        if (response.data && response.data.data) {
          const coursesData = response.data.data;
          setAllCourses(coursesData);
          setCourses(coursesData);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch courses. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingCourses(false);
      }
    };

    if (token) {
      fetchCourses();
    }
  }, [token]);

  // When course is selected, populate categories, rules, notes from titles response
  useEffect(() => {
    const selectedCourse = allCourses.find(course => course.id === selectedCourseId);

    if (selectedCourse?.categories?.length) {
      setCategories(selectedCourse.categories.map(cat => ({ name: cat })));
    } else {
      setCategories([]);
    }

    if (selectedCourse?.rules?.length) {
      setCourseRules(selectedCourse.rules);
    } else {
      setCourseRules([]);
    }

    if (selectedCourse?.notes?.length) {
      setCourseNotes(selectedCourse.notes);
    } else {
      setCourseNotes([]);
    }

    // Reset dependent selections when course changes (but not on initial load via URL)
    if (selectedCourseId && !categoryFromUrl) {
      setSelectedCategoryId("");
      setSelectedRule("");
      setNoteText("");
    }
  }, [selectedCourseId, allCourses]);

  // Fetch questions when both course and category are selected
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!selectedCourseId || !selectedCategoryId) {
        return;
      }

      setIsLoadingQuestions(true);
      try {
        const noAnswersParam = filterIncomplete ? "&noAnswers=true" : "";
        const noRulesParam = filterMissingRules ? "&noRules=true" : "";
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/questions/courses/${selectedCourseId}/questions?category=${selectedCategoryId}&only=current${noAnswersParam}${noRulesParam}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (response.data?.data) {
          const formattedQuestions = response.data.data.map((q: any, index: number) => {
            // Handle options as array or object
            let choices;
            if (Array.isArray(q.options)) {
              choices = q.options.map((option: string, optIndex: number) => ({
                id: `c${optIndex + 1}`,
                key: String.fromCharCode(65 + optIndex),
                text: option,
                isCorrect: q.correct === String.fromCharCode(65 + optIndex)
              }));
            } else {
              choices = Object.entries(q.options).map(([key, value]: [string, any], optIndex: number) => ({
                id: `c${optIndex + 1}`,
                key,
                text: value,
                isCorrect: q.correct === key
              }));
            }

            return {
              id: q.id || `${index + 1}`,
              text: q.question,
              choices,
              hint: q.hint || "",
              videoUrl: q.video || "",
              imageUrl: q.image || "",
              rules: Array.isArray(q.rules) ? q.rules : [],
              notes: Array.isArray(q.notes) ? q.notes : [],
              isNew: false
            } as Question;
          });

          setQuestions(formattedQuestions);
          originalQuestionsRef.current = formattedQuestions.map(q => ({ ...q, choices: q.choices.map(c => ({ ...c })) }));
          setCurrentPage(1);
        }
      } catch (error) {
        console.log(error);
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
  }, [selectedCourseId, selectedCategoryId, token, filterIncomplete, filterMissingRules]);

  // Fetch single question in edit mode
  useEffect(() => {
    const fetchQuestion = async () => {
      if (isEditMode && questionId) {
        setIsLoading(true);
        try {
          const response = await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/api/questions/${questionId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );

          const questionData = response.data?.data;
          if (questionData) {
            // Handle options as array or object
            let choices;
            if (Array.isArray(questionData.options)) {
              // If options is an array, map it to choices with A, B, C, D keys
              choices = questionData.options.map((option: string, optIndex: number) => ({
                id: `c${optIndex + 1}`,
                key: String.fromCharCode(65 + optIndex), // A, B, C, D
                text: option,
                isCorrect: questionData.correct === String.fromCharCode(65 + optIndex)
              }));
            } else {
              // If options is an object, use Object.entries
              choices = Object.entries(questionData.options).map(([key, value]: [string, any], optIndex: number) => ({
                id: `c${optIndex + 1}`,
                key,
                text: value,
                isCorrect: questionData.correct === key
              }));
            }

            const formattedQuestion = {
              id: questionData.id,
              text: questionData.question,
              choices,
              hint: questionData.hint || "",
              videoUrl: questionData.video || "",
              imageUrl: questionData.image || "",
              rules: Array.isArray(questionData.rules) ? questionData.rules : [],
              notes: Array.isArray(questionData.notes) ? questionData.notes : [],
              isNew: false
            };
            
            setQuestions([formattedQuestion]);
            // snapshot
            originalQuestionsRef.current = [{ ...formattedQuestion, choices: formattedQuestion.choices.map(c => ({ ...c })) }];
            setSelectedCourseId(questionData.course_id);
            setSelectedCategoryId(questionData.category);
          }
        } catch (error) {
          console.log(error);
          toast({
            title: "Error",
            description: "Failed to fetch question. Please try again.",
            variant: "destructive"
          });
          navigate("teacher/questions");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchQuestion();
  }, [isEditMode, questionId, token]);

  const handleQuestionChange = (id: string, text: string) => {
    setQuestions(questions.map(q => (q.id === id ? { ...q, text } : q)));
  };

  const handleChoiceChange = (questionId: string, choiceId: string, text: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          choices: q.choices.map(c => c.id === choiceId ? { ...c, text } : c)
        };
      }
      return q;
    }));
  };

  const handleCorrectAnswerChange = (questionId: string, choiceId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          choices: q.choices.map(c => ({ ...c, isCorrect: c.id === choiceId }))
        };
      }
      return q;
    }));
  };

  const addNewQuestion = () => {
    const newId = Date.now().toString();
    setQuestions([
      ...questions,
      {
        id: newId,
        text: "",
        choices: [
          { id: `${newId}-c1`, key: "A", text: "", isCorrect: false },
          { id: `${newId}-c2`, key: "B", text: "", isCorrect: false },
          { id: `${newId}-c3`, key: "C", text: "", isCorrect: false },
          { id: `${newId}-c4`, key: "D", text: "", isCorrect: false }
        ],
        isNew: true
      }
    ]);
  };

  const deleteQuestion = async (id: string) => {
    if (questions.length > 1) {
      // Check if this is an existing question (has a UUID-like id) or a temporary one
      const isExistingQuestion = id.length > 10; // UUIDs are longer than our temporary IDs
      
      if (isExistingQuestion) {
        try {
          await axios.delete(
            `${import.meta.env.VITE_BACKEND_URL}/api/questions/${id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );
          
          toast({
            title: "Success",
            description: "Question deleted successfully",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to delete question. Please try again.",
            variant: "destructive"
          });
          return;
        }
      }
      
      setQuestions(questions.filter(q => q.id !== id));
    } else {
      toast({
        title: "Cannot Delete",
        description: "You need at least one question.",
        variant: "destructive"
      });
    }
  };

  const openVideoDialog = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    setVideoUrl(question?.videoUrl || "");
    setActiveQuestionId(questionId);
    setVideoDialogOpen(true);
  };

  const saveVideoUrl = () => {
    if (activeQuestionId) {
      setQuestions(questions.map(q => {
        if (q.id === activeQuestionId) {
          return { ...q, videoUrl };
        }
        return q;
      }));
    }
    setVideoDialogOpen(false);
  };

  const openHintDialog = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    setHintText(question?.hint || "");
    setActiveQuestionId(questionId);
    setHintDialogOpen(true);
  };

  const saveHint = () => {
    if (activeQuestionId) {
      setQuestions(questions.map(q => {
        if (q.id === activeQuestionId) {
          return { ...q, hint: hintText };
        }
        return q;
      }));
    }
    setHintDialogOpen(false);
  };

  const openImageDialog = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    setImageUrl(question?.imageUrl || "");
    setActiveQuestionId(questionId);
    setImageDialogOpen(true);
  };

  const saveImageUrl = () => {
    if (activeQuestionId) {
      setQuestions(questions.map(q => {
        if (q.id === activeQuestionId) {
          return { ...q, imageUrl };
        }
        return q;
      }));
    }
    setImageDialogOpen(false);
  };

  const uploadToBackend = async (file: File) => {
    const data = new FormData();
    data.append("file", file);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/storage/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: data,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      if (result.success && result.data.public_url) {
        return result.data.public_url;
      } else {
        throw new Error("Upload failed: Invalid response");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      throw new Error("Failed to upload image");
    }
  };

  const handleImageUpload = async () => {
    if (!imageFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload.",
        variant: "destructive"
      });
      return;
    }

    setIsUploadingImage(true);
    try {
      const uploadedUrl = await uploadToBackend(imageFile);
      setImageUrl(uploadedUrl);
      toast({
        title: "Success",
        description: "Image uploaded successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!selectedCourseId) {
      toast({
        title: "Error",
        description: "Please select a course.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedCategoryId) {
      toast({
        title: "Error",
        description: "Please select a category.",
        variant: "destructive"
      });
      return;
    }

    // Validate questions
    const emptyQuestions = questions.filter(q => !q.text.trim());
    if (emptyQuestions.length > 0) {
      toast({
        title: "Error",
        description: "All questions must have text.",
        variant: "destructive"
      });
      return;
    }

    const questionsWithNoCorrectAnswer = questions.filter(
      q => !q.choices.some(c => c.isCorrect)
    );
    if (questionsWithNoCorrectAnswer.length > 0) {
      toast({
        title: "Error",
        description: "Each question must have at least one correct answer.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Only send changed questions
      for (const question of questions) {
        const options = question.choices.reduce((acc, choice) => {
          acc[choice.key] = choice.text;
          return acc;
        }, {} as { [key: string]: string });
        
        const correctAnswer = question.choices.find(c => c.isCorrect)?.key;

        const questionData = {
          category: selectedCategoryId,
          question: question.text,
          options,
          correct: correctAnswer,
          hint: question.hint || "",
          video: question.videoUrl || "",
          image: question.imageUrl || "",
          rules: question.rules || [],
          notes: question.notes || []
        };

        const isExistingQuestion = !question.isNew;

        if (isExistingQuestion) {
          // compare to original snapshot
          const original = originalQuestionsRef.current.find(q => q.id === question.id);
          if (original) {
            const changed = JSON.stringify(normalizeQuestion(question)) !== JSON.stringify(normalizeQuestion(original));
            const metaChanged = JSON.stringify(question.rules || []) !== JSON.stringify((original as any).rules || []) ||
                               JSON.stringify(question.notes || []) !== JSON.stringify((original as any).notes || []);
            if (!changed && !metaChanged) continue;
          }

          await axios.put(
            `${import.meta.env.VITE_BACKEND_URL}/api/questions/${question.id}`,
            questionData,
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );
        } else {
          await axios.post(
            `${import.meta.env.VITE_BACKEND_URL}/api/questions/courses/${selectedCourseId}/questions`,
            questionData,
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );
        }
      }

      toast({
        title: "Success",
        description: "Questions saved successfully!",
      });

      // Reset questions to a fresh blank state after save
      const blank = {
        id: "1",
        text: "",
        choices: [
          { id: "c1", key: "A", text: "", isCorrect: false },
          { id: "c2", key: "B", text: "", isCorrect: false },
          { id: "c3", key: "C", text: "", isCorrect: false },
          { id: "c4", key: "D", text: "", isCorrect: false }
        ],
        hint: "",
        videoUrl: "",
        imageUrl: "",
        isNew: true
      } as Question;
      setQuestions([blank]);
      originalQuestionsRef.current = [{ ...blank, choices: blank.choices.map(c => ({ ...c })) }];
      setCurrentPage(1);
    } catch (error) {
      console.log(error);
      toast({
        title: "Error",
        description: "Failed to save questions. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const startIndex = (currentPage - 1) * questionsPerPage;
  const endIndex = startIndex + questionsPerPage;
  const currentQuestions = questions.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const renderEmptyState = () => {
    if (!selectedCourseId) {
      return (
        <div className="text-center p-6 sm:p-12 border-2 border-dashed border-gray-200 rounded-md">
          <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2 sm:mb-3">
            <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
          </div>
          <h3 className="text-base sm:text-lg font-medium text-gray-900">
            Select a Course
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Choose a course to start creating questions
          </p>
        </div>
      );
    }

    if (!selectedCategoryId) {
      return (
        <div className="text-center p-6 sm:p-12 border-2 border-dashed border-gray-200 rounded-md">
          <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2 sm:mb-3">
            <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
          </div>
          <h3 className="text-base sm:text-lg font-medium text-gray-900">
            Select a Category
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Choose a category to manage questions
          </p>
        </div>
      );
    }

    return (
      <div className="text-center p-6 sm:p-12 border-2 border-dashed border-gray-200 rounded-md">
        <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2 sm:mb-3">
          <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
        </div>
        <h3 className="text-base sm:text-lg font-medium text-gray-900">
          No Questions Added
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Start by adding your first question
        </p>
        <Button 
          onClick={addNewQuestion}
          variant="outline"
          className="mt-4"
        >
          <Plus size={16} className="mr-2" /> Add First Question
        </Button>
      </div>
    );
  };

  if (isLoading || isLoadingCourses || isLoadingQuestions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const showQuestionSection = selectedCourseId && selectedCategoryId;

  return (
    <div className="max-w-full mx-auto py-4 sm:py-6 px-3 sm:px-4">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 sticky top-0 z-30 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b px-2 sm:px-4 py-2">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost"
            onClick={() => navigate('/teacher/questions')}
            className="text-gray-600"
          >
            ← Back to Questions
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            {isEditMode ? 'Edit Question' : 'Create Question'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                checked={filterIncomplete}
                onChange={(e) => setFilterIncomplete(e.target.checked)}
              />
              Incomplete Questions
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                checked={filterMissingRules}
                onChange={(e) => setFilterMissingRules(e.target.checked)}
              />
              Missing Rules
            </label>
          </div>
          <Button 
            onClick={addNewQuestion}
            variant="outline"
            className="text-sm sm:text-base"
            disabled={!showQuestionSection}
          >
            <Plus size={16} className="mr-2" /> Add Question
          </Button>
          <Button 
            onClick={handleSave} 
            className="bg-primary hover:bg-primary-600 text-sm sm:text-base"
            disabled={!showQuestionSection || questions.length === 0}
          >
            {isEditMode ? 'Update Question' : 'Create Question'}
          </Button>
        </div>
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
              if (!isEditMode) {
                setSelectedCourseId(e.target.value);
                setSelectedCategoryId("");
                setQuestions([{
                  id: "1",
                  text: "",
                  choices: [
                    { id: "c1", key: "A", text: "", isCorrect: false },
                    { id: "c2", key: "B", text: "", isCorrect: false },
                    { id: "c3", key: "C", text: "", isCorrect: false },
                    { id: "c4", key: "D", text: "", isCorrect: false }
                  ],
                  isNew: true
                }]);
              }
            }}
            className={cn(
              "w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base",
              isEditMode && "bg-gray-100"
            )}
            disabled={isLoadingCourses || isEditMode}
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
            Select Category
          </label>
          <select
            id="category"
            value={selectedCategoryId}
            onChange={(e) => {
              if (!isEditMode) {
                setSelectedCategoryId(e.target.value);
                setQuestions([{
                  id: "1",
                  text: "",
                  choices: [
                    { id: "c1", key: "A", text: "", isCorrect: false },
                    { id: "c2", key: "B", text: "", isCorrect: false },
                    { id: "c3", key: "C", text: "", isCorrect: false },
                    { id: "c4", key: "D", text: "", isCorrect: false }
                  ],
                  isNew: true
                }]);
              }
            }}
            className={cn(
              "w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base",
              !selectedCourseId && "opacity-50 cursor-not-allowed",
              isEditMode && "bg-gray-100"
            )}
            disabled={!selectedCourseId || isLoadingCategories || isEditMode}
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

      {showQuestionSection ? (
        <>
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-4">
              <h2 className="text-lg sm:text-xl font-semibold">Questions</h2>
              {questions.length > 0 && (
                <span className="text-sm text-gray-500">
                  Showing {startIndex + 1}-{Math.min(endIndex, questions.length)} of {questions.length} questions
                </span>
              )}
            </div>
            {/* <Button 
              onClick={addNewQuestion}
              variant="outline"
              className="flex items-center gap-2 text-sm sm:text-base"
            >
              <Plus size={16} /> Add Question
            </Button> */}
          </div>

          <div className="space-y-4 sm:space-y-6">
            {questions.length === 0 ? renderEmptyState() : (
              currentQuestions.map((question, qIndex) => (
                <Card key={question.id} className="border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-sm sm:text-base">Question {startIndex + qIndex + 1}</h3>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-primary text-xs sm:text-sm px-2 sm:px-3"
                        onClick={() => openHintDialog(question.id)}
                      >
                        <HelpCircle size={16} className="sm:hidden" />
                        <span className="hidden sm:inline-block"><HelpCircle size={16} className="mr-1" /></span>
                        {question.hint ? 'Edit Hint' : 'Add Hint'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-primary text-xs sm:text-sm px-2 sm:px-3"
                        onClick={() => openVideoDialog(question.id)}
                      >
                        <Youtube size={16} className="sm:hidden" />
                        <span className="hidden sm:inline-block"><Youtube size={16} className="mr-1" /></span>
                        {question.videoUrl ? 'Edit Video' : 'Add Video'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-primary text-xs sm:text-sm px-2 sm:px-3"
                        onClick={() => openImageDialog(question.id)}
                      >
                        <Image size={16} className="sm:hidden" />
                        <span className="hidden sm:inline-block"><Image size={16} className="mr-1" /></span>
                        {question.imageUrl ? 'Edit Image' : 'Add Image'}
                      </Button>
                      {questions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-600 hover:text-red-500 p-1 sm:p-2"
                          onClick={() => deleteQuestion(question.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                    <div>
                      <Textarea
                        placeholder="Enter question text"
                        value={question.text}
                        onChange={(e) => handleQuestionChange(question.id, e.target.value)}
                        className="w-full text-sm sm:text-base"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2 sm:space-y-3">
                      {question.choices.map((choice) => (
                        <div key={choice.id} className="flex items-center gap-2 sm:gap-4">
                          <div 
                            className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full border-2 flex items-center justify-center cursor-pointer ${
                              choice.isCorrect ? 'border-primary bg-primary text-white' : 'border-gray-300'
                            }`}
                            onClick={() => handleCorrectAnswerChange(question.id, choice.id)}
                          >
                            {choice.isCorrect && <Check size={14} />}
                          </div>
                          <Input
                            value={choice.text}
                            onChange={(e) => handleChoiceChange(question.id, choice.id, e.target.value)}
                            placeholder={`Option ${choice.key}`}
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Per-question Rules - dropdown */}
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Rule(s)</label>
                        <div className="relative" ref={openRulesId === question.id ? rulesDropdownRef : null}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left text-sm hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-primary"
                            onClick={() => setOpenRulesId(prev => prev === question.id ? null : question.id)}
                          >
                            {(question.rules || []).length > 0 ? `${(question.rules || []).length} rule(s) selected` : 'Select rules'}
                          </button>
                          {openRulesId === question.id && (
                            <div className="absolute bottom-full mb-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-2 max-h-60 overflow-auto z-50">
                              {courseRules.length === 0 ? (
                                <p className="text-sm text-gray-500 px-2 py-1">No rules available</p>
                              ) : (
                                courseRules.map(rule => (
                                  <label key={rule} className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded-md cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                      checked={(question.rules || []).includes(rule)}
                                      onChange={() => toggleQuestionRule(question.id, rule)}
                                    />
                                    <span className="text-sm text-gray-700">{rule}</span>
                                  </label>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                        {(question.rules || []).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(question.rules || []).map(r => (
                              <span key={`r-${r}`} className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 text-purple-700 px-3 py-1 text-xs">
                                {r}
                                <button type="button" className="text-purple-600 hover:text-purple-800" onClick={() => toggleQuestionRule(question.id, r)}>×</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Per-question Notes - dropdown */}
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Note(s)</label>
                        <div className="relative" ref={openNotesId === question.id ? notesDropdownRef : null}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left text-sm hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-primary"
                            onClick={() => setOpenNotesId(prev => prev === question.id ? null : question.id)}
                          >
                            {(question.notes || []).length > 0 ? `${(question.notes || []).length} note(s) selected` : 'Select notes'}
                          </button>
                          {openNotesId === question.id && (
                            <div className="absolute bottom-full mb-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-2 max-h-60 overflow-auto z-50">
                              {courseNotes.length === 0 ? (
                                <p className="text-sm text-gray-500 px-2 py-1">No notes available</p>
                              ) : (
                                courseNotes.map(note => (
                                  <label key={note} className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded-md cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                      checked={(question.notes || []).includes(note)}
                                      onChange={() => toggleQuestionNote(question.id, note)}
                                    />
                                    <span className="text-sm text-gray-700">{note}</span>
                                  </label>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                        {(question.notes || []).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(question.notes || []).map(n => (
                              <span key={`n-${n}`} className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 px-3 py-1 text-xs">
                                {n}
                                <button type="button" className="text-indigo-600 hover:text-indigo-800" onClick={() => toggleQuestionNote(question.id, n)}>×</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
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
                    
                    {question.videoUrl && (
                      <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-gray-50 border border-gray-200 rounded-md flex items-start gap-2">
                        <Youtube size={16} className="text-gray-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-800">Video Tutorial:</p>
                          <p className="text-xs sm:text-sm text-gray-700 break-all">{question.videoUrl}</p>
                        </div>
                      </div>
                    )}
                    
                    {question.imageUrl && (
                      <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-gray-50 border border-gray-200 rounded-md flex items-start gap-2">
                        <Image size={16} className="text-gray-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-800">Question Image:</p>
                          <img 
                            src={question.imageUrl} 
                            alt="Question" 
                            className="mt-2 max-w-full h-auto max-h-48 object-contain rounded"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {questions.length > questionsPerPage && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft size={16} />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        renderEmptyState()
      )}

      {/* Video URL Dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="sm:max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Add Video Tutorial</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-2">
            <p className="text-xs sm:text-sm text-gray-500">
              Enter a YouTube or video URL to help students understand this question.
            </p>
            <Input 
              placeholder="https://youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="text-sm sm:text-base"
            />
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setVideoDialogOpen(false)}
                className="text-sm sm:text-base"
              >
                Cancel
              </Button>
              <Button 
                onClick={saveVideoUrl}
                className="text-sm sm:text-base"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hint Dialog */}
      <Dialog open={hintDialogOpen} onOpenChange={setHintDialogOpen}>
        <DialogContent className="sm:max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Add Hint</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-2">
            <p className="text-xs sm:text-sm text-gray-500">
              Add a hint to help students who are stuck on this question.
            </p>
            <Textarea 
              placeholder="Enter hint text..."
              value={hintText}
              onChange={(e) => setHintText(e.target.value)}
              rows={4}
              className="text-sm sm:text-base"
            />
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setHintDialogOpen(false)}
                className="text-sm sm:text-base"
              >
                Cancel
              </Button>
              <Button 
                onClick={saveHint}
                className="text-sm sm:text-base"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image URL Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="sm:max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Add Question Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-2">
            <p className="text-xs sm:text-sm text-gray-500">
              Upload an image or enter an image URL to add a visual element to this question.
            </p>
            
            <div className="space-y-2 sm:space-y-4">
              <h3 className="font-medium text-sm text-gray-700">Upload Image File</h3>
              <div className="flex gap-2">
                <Input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="flex-1 text-sm sm:text-base"
                />
                <Button 
                  onClick={handleImageUpload}
                  disabled={!imageFile || isUploadingImage}
                  className="text-sm sm:text-base"
                >
                  {isUploadingImage ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Uploading...
                    </div>
                  ) : (
                    'Upload'
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                PNG, JPG, GIF up to 10MB
              </p>
            </div>
            
            <div className="space-y-2 sm:space-y-4">
              <h3 className="font-medium text-sm text-gray-700">Or Enter Image URL</h3>
              <div className="flex gap-2">
                <Input 
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="flex-1 text-sm sm:text-base"
                />
                <Button 
                  onClick={saveImageUrl}
                  className="text-sm sm:text-base"
                >
                  Save URL
                </Button>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setImageDialogOpen(false)}
                className="text-sm sm:text-base"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateQuestion;