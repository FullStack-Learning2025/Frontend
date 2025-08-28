import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, Video, GripVertical, Link } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface Lesson {
  id: string;
  title: string;
  description: string;
  videoFile: File | null;
  videoUrl?: string;
  embeddedUrl?: string;
  arrangement_no: number;
}

interface Course {
  id: string;
  title: string;
}

interface Category {
  name: string;
}

const CreateLesson = () => {
  const { token } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isEditMode = searchParams.get('type') === 'edit';
  const lessonId = searchParams.get('id');
  const categoryFromUrl = searchParams.get('category');
  const courseIdFromUrl = searchParams.get('course_id');
  
  const [selectedCourseId, setSelectedCourseId] = useState(courseIdFromUrl || "");
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryFromUrl || "");
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [draggedLessonId, setDraggedLessonId] = useState<string | null>(null);
  const [videoInputType, setVideoInputType] = useState<'upload' | 'embedded'>('upload');
  
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Determine embeddable player source for a given URL (YouTube/Vimeo/direct file/fallback)
  const getEmbedInfo = (url: string): { type: 'iframe' | 'video'; src: string } => {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.replace('www.', '').toLowerCase();

      // YouTube
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        let videoId = '';
        if (hostname.includes('youtu.be')) {
          videoId = parsed.pathname.slice(1).split('/')[0];
        } else if (parsed.searchParams.has('v')) {
          videoId = parsed.searchParams.get('v') || '';
        } else if (parsed.pathname.includes('/embed/')) {
          videoId = parsed.pathname.split('/embed/')[1]?.split('/')[0] || '';
        }
        if (videoId) {
          return { type: 'iframe', src: `https://www.youtube.com/embed/${videoId}` };
        }
      }

      // Vimeo
      if (hostname.includes('vimeo.com')) {
        const parts = parsed.pathname.split('/').filter(Boolean);
        const videoId = parts[0];
        if (videoId) {
          return { type: 'iframe', src: `https://player.vimeo.com/video/${videoId}` };
        }
      }

      // Direct video file
      if (/\.(mp4|webm|ogg)$/i.test(parsed.pathname)) {
        return { type: 'video', src: url };
      }

      // Fallback to iframe
      return { type: 'iframe', src: url };
    } catch {
      return { type: 'iframe', src: url };
    }
  };

  useEffect(() => {
    const fetchCourses = async () => {
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
          setCourses(response.data.data);
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

    fetchCourses();
  }, [token]);

  useEffect(() => {
    const fetchCategories = async () => {
      if (!selectedCourseId) {
        setCategories([]);
        return;
      }

      setIsLoadingCategories(true);
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
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [selectedCourseId, token]);

  useEffect(() => {
    const fetchLessons = async () => {
      if (!selectedCourseId || !selectedCategoryId) {
        setLessons([]);
        return;
      }
      
      setIsLoading(true);
      try {
        const lessonsResponse = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/courses/${selectedCourseId}/lessons?category=${selectedCategoryId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const lessonsData = lessonsResponse.data.data.map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          videoFile: null,
          videoUrl: lesson.video_link,
          embeddedUrl: lesson.video_link,
          arrangement_no: lesson.arrangement_no
        }));

        setLessons(lessonsData);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load lessons. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLessons();
  }, [selectedCourseId, selectedCategoryId, token]);

  useEffect(() => {
    const fetchSingleLesson = async () => {
      if (isEditMode && lessonId && selectedCourseId && selectedCategoryId) {
        setIsLoading(true);
        try {
          const response = await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/api/courses/${selectedCourseId}/lessons/${lessonId}?category=${selectedCategoryId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );

          const lessonData = response.data.data;
          setActiveLesson({
            id: lessonData.id,
            title: lessonData.title,
            description: lessonData.description,
            videoFile: null,
            videoUrl: lessonData.video_link,
            embeddedUrl: lessonData.video_link,
            arrangement_no: lessonData.arrangement_no
          });
          setVideoDialogOpen(true);
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to fetch lesson details. Please try again.",
            variant: "destructive"
          });
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchSingleLesson();
  }, [isEditMode, lessonId, selectedCourseId, selectedCategoryId, token]);

  const uploadToBackend = async (file: File) => {
    const data = new FormData();
    data.append("file", file);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/storage/upload`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success && response.data.data.public_url) {
        return response.data.data.public_url;
      } else {
        throw new Error("Upload failed: Invalid response");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      throw new Error("Failed to upload video");
    }
  };

  const addNewLesson = () => {
    const newLesson: Lesson = {
      id: Date.now().toString(),
      title: "",
      description: "",
      videoFile: null,
      arrangement_no: lessons.length + 1
    };
    
    setActiveLesson(newLesson);
    setVideoDialogOpen(true);
    setVideoInputType('upload'); // Reset to upload by default
  };

  const editLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
    
    // Determine the video input type based on the existing video link
    if (lesson.videoUrl || lesson.embeddedUrl) {
      const videoLink = lesson.videoUrl || lesson.embeddedUrl;
      // Check if it's an uploaded video (from our storage) or an embedded URL
      const isUploadedVideo = videoLink?.includes(import.meta.env.VITE_BACKEND_URL) || 
                             videoLink?.includes('supabase') || 
                             /\.(mp4|webm|ogg)$/i.test(videoLink || '');
      
      setVideoInputType(isUploadedVideo ? 'upload' : 'embedded');
      
      // Set the appropriate field and clear the other
      if (isUploadedVideo) {
        setActiveLesson(prev => prev ? {
          ...prev,
          videoUrl: videoLink,
          embeddedUrl: undefined
        } : null);
      } else {
        setActiveLesson(prev => prev ? {
          ...prev,
          videoUrl: undefined,
          embeddedUrl: videoLink
        } : null);
      }
    } else {
      setVideoInputType('upload');
    }
    
    setVideoDialogOpen(true);
  };

  const deleteLesson = async (id: string) => {
    if (!selectedCourseId || !selectedCategoryId) return;

    try {
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/courses/${selectedCourseId}/lessons/${id}?category=${selectedCategoryId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setLessons(lessons.filter(lesson => lesson.id !== id));
      toast({
        title: "Success",
        description: "Lesson deleted successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete lesson. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleVideoInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeLesson) {
      setIsUploadingVideo(true);
      try {
        const videoUrl = await uploadToBackend(file);
        setActiveLesson(prev => prev ? {
          ...prev,
          videoFile: file,
          videoUrl: videoUrl,
          embeddedUrl: undefined // Clear embedded URL when uploading new video
        } : null);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to upload video. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsUploadingVideo(false);
      }
    }
  };

  const handleSaveLesson = async () => {
    if (!activeLesson || !selectedCourseId || !selectedCategoryId || isSubmitting) return;
    
    if (!activeLesson.title.trim()) {
      toast({
        title: "Error",
        description: "Lesson title is required.",
        variant: "destructive"
      });
      return;
    }
    
    // Check for either videoUrl or embeddedUrl
    if (!activeLesson.videoUrl && !activeLesson.embeddedUrl) {
      toast({
        title: "Error",
        description: "Please upload a video or add an embedded URL.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const existingLessonIndex = lessons.findIndex(l => l.id === activeLesson.id);
      
      // Use videoUrl if available, otherwise use embeddedUrl
      const videoLink = activeLesson.videoUrl || activeLesson.embeddedUrl;
      
      if (existingLessonIndex === -1) {
        // Create new lesson
        const response = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/courses/${selectedCourseId}/lessons?category=${selectedCategoryId}`,
          {
            title: activeLesson.title,
            description: activeLesson.description,
            video_link: videoLink,
            category: selectedCategoryId,
            arrangement_no: lessons.length + 1
          },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        // Fetch updated lessons
        const lessonsResponse = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/courses/${selectedCourseId}/lessons?category=${selectedCategoryId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const lessonsData = lessonsResponse.data.data.map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          videoFile: null,
          videoUrl: lesson.video_link,
          embeddedUrl: lesson.video_link,
          arrangement_no: lesson.arrangement_no
        }));

        setLessons(lessonsData);
      } else {
        // Update existing lesson
        await axios.put(
          `${import.meta.env.VITE_BACKEND_URL}/api/courses/${selectedCourseId}/lessons/${activeLesson.id}?category=${selectedCategoryId}`,
          {
            title: activeLesson.title,
            description: activeLesson.description,
            video_link: videoLink,
            arrangement_no: existingLessonIndex + 1
          },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        // Fetch updated lessons
        const lessonsResponse = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/courses/${selectedCourseId}/lessons?category=${selectedCategoryId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const lessonsData = lessonsResponse.data.data.map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          videoFile: null,
          videoUrl: lesson.video_link,
          embeddedUrl: lesson.video_link,
          arrangement_no: lesson.arrangement_no
        }));

        setLessons(lessonsData);
      }
      
      toast({
        title: "Success",
        description: "Lesson saved successfully!",
      });
      
      setVideoDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save lesson. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedLessonId(id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (targetId: string) => {
    if (!draggedLessonId || draggedLessonId === targetId || !selectedCourseId || !selectedCategoryId) return;
    
    const reorderedLessons = [...lessons];
    const draggedIndex = reorderedLessons.findIndex(l => l.id === draggedLessonId);
    const targetIndex = reorderedLessons.findIndex(l => l.id === targetId);
    
    const draggedLesson = reorderedLessons[draggedIndex];
    
    // Remove the dragged item
    reorderedLessons.splice(draggedIndex, 1);
    
    // Insert at the target position
    reorderedLessons.splice(targetIndex, 0, draggedLesson);
    
    // Update arrangement numbers
    const updatedLessons = reorderedLessons.map((lesson, index) => ({
      ...lesson,
      arrangement_no: index + 1
    }));
    
    setLessons(updatedLessons);
    setDraggedLessonId(null);

    try {
      // Update lesson order in backend
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/courses/${selectedCourseId}/lessons/reorder?category=${selectedCategoryId}`,
        {
          lessonIds: updatedLessons.map(lesson => lesson.id)
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      toast({
        title: "Success",
        description: "Lesson order updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update lesson order. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (isLoadingCourses) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto py-4 sm:py-6 px-3 sm:px-4">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">
          {isEditMode ? 'Edit Lesson' : 'Create Lesson'}
        </h1>

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
              }}
              className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
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
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className={cn(
                "w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base",
                !selectedCourseId && "opacity-50 cursor-not-allowed"
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
      </div>

      <div className="mb-6 flex justify-end">
        <Button 
          onClick={addNewLesson}
          variant="outline"
          className={cn(
            "flex items-center gap-2 text-sm sm:text-base",
            (!selectedCourseId || !selectedCategoryId) && "opacity-50 cursor-not-allowed"
          )}
          disabled={!selectedCourseId || !selectedCategoryId || isLoading}
        >
          <Plus size={16} /> Add Lesson
        </Button>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading lessons...</p>
          </div>
        ) : lessons.length === 0 ? (
          <div className={cn(
            "text-center p-6 sm:p-12 border-2 border-dashed border-gray-200 rounded-md",
            (!selectedCourseId || !selectedCategoryId) && "opacity-50"
          )}>
            <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2 sm:mb-3">
              <Video className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900">
              {!selectedCourseId 
                ? "Select a course to begin"
                : !selectedCategoryId 
                ? "Select a category to continue"
                : "No lessons added yet"}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {!selectedCourseId || !selectedCategoryId 
                ? "Complete the selection above to manage lessons"
                : "Add your first lesson to get started"}
            </p>
            <Button 
              onClick={addNewLesson} 
              variant="outline"
              className={cn(
                "mt-3 sm:mt-4 text-sm sm:text-base",
                (!selectedCourseId || !selectedCategoryId) && "opacity-50 cursor-not-allowed"
              )}
              disabled={!selectedCourseId || !selectedCategoryId}
            >
              <Plus size={16} className="mr-1" /> Add First Lesson
            </Button>
          </div>
        ) : (
          lessons.map((lesson, index) => (
            <div 
              key={lesson.id} 
              className={cn(
                "border border-gray-200 rounded-md bg-white overflow-hidden",
                draggedLessonId === lesson.id ? "opacity-50" : "",
                (!selectedCourseId || !selectedCategoryId) && "opacity-50"
              )}
              draggable={!!(selectedCourseId && selectedCategoryId)}
              onDragStart={() => handleDragStart(lesson.id)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(lesson.id)}
            >
              <div className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                <div className={cn(
                  "text-gray-400 p-1",
                  selectedCourseId && selectedCategoryId ? "cursor-move" : "cursor-not-allowed"
                )}>
                  <GripVertical size={18} />
                </div>
                
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-medium shrink-0 text-sm sm:text-base">
                  {index + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm sm:text-base line-clamp-1">{lesson.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 line-clamp-1 mt-0.5">{lesson.description}</p>
                </div>
                
                <div className="flex gap-1 sm:gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "text-gray-600 hover:text-primary text-xs sm:text-sm px-2 sm:px-3",
                      (!selectedCourseId || !selectedCategoryId) && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => editLesson(lesson)}
                    disabled={!selectedCourseId || !selectedCategoryId}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "text-gray-600 hover:text-red-500 p-1 sm:p-2",
                      (!selectedCourseId || !selectedCategoryId) && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => deleteLesson(lesson.id)}
                    disabled={!selectedCourseId || !selectedCategoryId}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Video Lesson Dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={(open) => {
        if (!isSubmitting) {
          setVideoDialogOpen(open);
        }
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {activeLesson && lessons.find(l => l.id === activeLesson.id) ? 'Edit Lesson' : 'Add New Lesson'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-2">
            <div>
              <label htmlFor="lesson-title" className="block text-sm font-medium text-gray-700 mb-1">
                Lesson Title
              </label>
              <Input 
                id="lesson-title"
                placeholder="Enter lesson title" 
                value={activeLesson?.title || ''}
                onChange={(e) => setActiveLesson(prev => prev ? {...prev, title: e.target.value} : null)}
                className="text-sm sm:text-base"
              />
            </div>
            
            <div>
              <label htmlFor="lesson-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Textarea
                id="lesson-description"
                placeholder="Enter lesson description"
                value={activeLesson?.description || ''}
                onChange={(e) => setActiveLesson(prev => prev ? {...prev, description: e.target.value} : null)}
                rows={3}
                className="text-sm sm:text-base"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Video Content
              </label>
              
              {/* Toggle between upload and embedded URL */}
              <div className="flex gap-2 mb-3">
                <Button
                  type="button"
                  variant={videoInputType === 'upload' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setVideoInputType('upload');
                    // Clear embedded URL when switching to upload
                    setActiveLesson(prev => prev ? {...prev, embeddedUrl: undefined} : null);
                  }}
                  className="flex items-center gap-2"
                >
                  <Video size={16} />
                  Upload Video
                </Button>
                <Button
                  type="button"
                  variant={videoInputType === 'embedded' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setVideoInputType('embedded');
                    // Clear uploaded video when switching to embedded
                    setActiveLesson(prev => prev ? {...prev, videoUrl: undefined, videoFile: null} : null);
                  }}
                  className="flex items-center gap-2"
                >
                  <Link size={16} />
                  Add Embedded URL
                </Button>
              </div>

              {videoInputType === 'upload' ? (
                // Video Upload Section
                <>
                  {isUploadingVideo ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-md p-4 sm:p-6 flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <p className="mt-2 text-sm text-gray-600">Uploading video...</p>
                      <p className="text-xs text-gray-500 mt-1">Please wait, this may take a few minutes</p>
                    </div>
                  ) : activeLesson?.videoUrl ? (
                    <div className="space-y-3 sm:space-y-4">
                      <div className="relative group">
                        <div className="relative">
                          <video 
                            src={activeLesson.videoUrl}
                            controls
                            className="w-full rounded-md max-h-[200px] sm:max-h-[300px] object-contain bg-black"
                          />
                          <div className="absolute top-2 right-2 flex gap-1 sm:gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-white hover:text-white hover:bg-black/50 bg-black/50 text-xs sm:text-sm"
                              onClick={() => videoInputRef.current?.click()}
                            >
                              Change Video
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-white hover:text-white hover:bg-black/50 bg-black/50 p-1 sm:p-2"
                              onClick={() => setActiveLesson(prev => prev ? {...prev, videoFile: null, videoUrl: undefined} : null)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                        <input 
                          type="file" 
                          ref={videoInputRef}
                          onChange={handleVideoInputChange}
                          accept="video/*"
                          className="hidden"
                        />
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-md p-4 sm:p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary"
                      onClick={() => videoInputRef.current?.click()}
                    >
                      <div className="p-2 sm:p-3 rounded-full bg-gray-100">
                        <Video className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                      </div>
                      <p className="mt-2 text-xs sm:text-sm text-gray-500">Click to upload video</p>
                      <p className="text-xs text-gray-400 mt-1">Supported formats: MP4, WebM, MOV</p>
                      <input 
                        type="file" 
                        ref={videoInputRef}
                        onChange={handleVideoInputChange}
                        accept="video/*"
                        className="hidden"
                      />
                    </div>
                  )}
                </>
                             ) : (
                 // Embedded URL Section
                 <>
                   {activeLesson?.embeddedUrl ? (
                     <div className="space-y-3 sm:space-y-4">
                       <div className="border-2 border-dashed border-gray-300 rounded-md p-4 sm:p-6">
                         <div className="flex items-center justify-between mb-3">
                           <div className="flex items-center gap-2">
                             <Link className="h-5 w-5 text-gray-400" />
                             <span className="text-sm font-medium text-gray-700">Embedded URL Added</span>
                           </div>
                           <div className="flex gap-1 sm:gap-2">
                             <Button 
                               variant="ghost" 
                               size="sm"
                               className="text-gray-600 hover:text-primary text-xs sm:text-sm"
                               onClick={() => document.getElementById('embedded-url-input')?.focus()}
                             >
                               Change URL
                             </Button>
                             <Button 
                               variant="ghost" 
                               size="sm"
                               className="text-gray-600 hover:text-red-500 p-1 sm:p-2"
                               onClick={() => setActiveLesson(prev => prev ? {...prev, embeddedUrl: undefined} : null)}
                             >
                               <Trash2 size={14} />
                             </Button>
                           </div>
                         </div>
                         <div className="rounded-md overflow-hidden">
                           <AspectRatio ratio={16/9}>
                             {(() => {
                               const info = getEmbedInfo(activeLesson!.embeddedUrl!);
                               return info.type === 'video' ? (
                                 <video 
                                   src={info.src} 
                                   controls 
                                   className="w-full h-full object-contain bg-black" 
                                 />
                               ) : (
                                 <iframe 
                                   src={info.src}
                                   className="w-full h-full"
                                   allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                   allowFullScreen
                                 />
                               );
                             })()}
                           </AspectRatio>
                         </div>
                       </div>
                     </div>
                   ) : (
                     <div className="space-y-2">
                       <Input
                         id="embedded-url-input"
                         placeholder="Enter embedded video URL (YouTube, Vimeo, etc.)"
                         value={activeLesson?.embeddedUrl || ''}
                         onChange={(e) => setActiveLesson(prev => prev ? {
                           ...prev, 
                           embeddedUrl: e.target.value,
                           videoUrl: undefined, // Clear uploaded video when entering embedded URL
                           videoFile: null
                         } : null)}
                         className="text-sm sm:text-base"
                       />
                       <p className="text-xs text-gray-500">
                         Paste the embed URL from YouTube, Vimeo, or other video platforms
                       </p>
                     </div>
                   )}
                 </>
               )}
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setVideoDialogOpen(false)}
                className="text-sm sm:text-base"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveLesson}
                disabled={isUploadingVideo || (!activeLesson?.videoUrl && !activeLesson?.embeddedUrl) || isSubmitting}
                className="text-sm sm:text-base"
              >
                {isSubmitting ? "Saving..." : isUploadingVideo ? "Uploading Video..." : (activeLesson?.videoUrl || activeLesson?.embeddedUrl) ? "Save Lesson" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateLesson; 