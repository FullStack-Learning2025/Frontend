import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Video, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";

interface Category {
  name: string;
}

const CreateCourse = () => {
  const { token } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isEditMode = searchParams.get('type') === 'edit';
  const [courseId, setCourseId] = useState(searchParams.get('id'));
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [coverImage, setCoverImage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [courseStatus, setCourseStatus] = useState("draft");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isEditMode && courseId) {
      fetchCourseData();
    }
  }, [courseId, isEditMode]);

  const fetchCourseData = async () => {
    if (courseId) {
      setIsLoading(true);
      try {
        const courseResponse = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/courses/${courseId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const courseData = courseResponse.data.data;
        setTitle(courseData.title);
        setDescription(courseData.description);
        setCoverImage(courseData.cover_image);
        setCourseStatus(courseData.status || "draft");
        
        // Transform categories into the required format
        if (courseData.category && Array.isArray(courseData.category)) {
          const formattedCategories = courseData.category.map(cat => ({
            name: cat
          }));
          setCategories(formattedCategories);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load course data. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    
    // Check for duplicates
    if (categories.some(cat => cat.name.toLowerCase() === newCategory.toLowerCase())) {
      toast({
        title: "Error",
        description: "This category already exists.",
        variant: "destructive"
      });
      return;
    }
    
    setCategories([...categories, { name: newCategory.trim() }]);
    setNewCategory("");
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
    setCategories(categories.filter(cat => cat.name !== categoryToRemove));
  };

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
      throw new Error("Failed to upload image");
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingImage(true);
      try {
        const imageUrl = await uploadToBackend(file);
        setCoverImage(imageUrl);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to upload image. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const handleSaveCourse = async () => {
    if (isSubmitting) return;
    
    if (!title.trim()) {
      toast({ title: "Error", description: "Please add a title for your course.", variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: "Error", description: "Please add a description for your course.", variant: "destructive" });
      return;
    }
    if (categories.length === 0) {
      toast({ title: "Error", description: "Please add at least one category.", variant: "destructive" });
      return;
    }
    if (!coverImage) {
      toast({ title: "Error", description: "Please add a cover image for your course.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const courseData = {
        title,
        description,
        cover_image: coverImage,
        status: courseStatus,
        category: categories.map(cat => cat.name)
      };

      if (courseId) {
        await axios.put(
          `${import.meta.env.VITE_BACKEND_URL}/api/courses/${courseId}`,
          courseData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast({ title: "Success", description: "Course has been updated successfully!" });
      } else {
        const response = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/courses`,
          courseData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCourseId(response.data.data.id);
        // Update URL without navigation
        const newUrl = `${window.location.pathname}?type=edit&id=${response.data.data.id}`;
        window.history.pushState({}, '', newUrl);
        toast({ title: "Success", description: "Course has been created successfully! You can now continue editing." });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save course. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCourseStatus = async () => {
    if (!courseId) return;
    try {
      await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/courses/${courseId}`,
        { status: courseStatus === "published" ? "draft" : "published" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCourseStatus(prev => prev === "published" ? "draft" : "published");
      toast({ title: "Success", description: `Course ${courseStatus === "published" ? "unpublished" : "published"} successfully` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update course status. Please try again.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading course data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto py-4 sm:py-6 px-3 sm:px-4">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          {courseId ? 'Edit Course' : 'Create New Course'}
        </h1>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {courseId && (
            <Button
              variant="outline"
              onClick={toggleCourseStatus}
              className="bg-white hover:opacity-80 text-black text-sm sm:text-base"
              disabled={isSubmitting}
            >
              {courseStatus === "published" ? "Unpublish" : "Publish"}
            </Button>
          )}
          <Button 
            onClick={handleSaveCourse} 
            className="bg-primary hover:bg-primary-600 text-sm sm:text-base" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : courseId ? "Update Course" : "Create Course"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="md:col-span-2">
          <Card className="border border-gray-100">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label htmlFor="course-title" className="block text-sm font-medium text-gray-700 mb-1">
                    Course Title
                  </label>
                  <Input 
                    id="course-title"
                    placeholder="Enter course title" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    className="text-lg sm:text-xl"
                  />
                </div>
                
                <div>
                  <label htmlFor="course-description" className="block text-sm font-medium text-gray-700 mb-1">
                    Course Description
                  </label>
                  <Textarea
                    id="course-description"
                    placeholder="Enter course description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categories
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {categories.map((category) => (
                      <div 
                        key={category.name}
                        className="bg-gray-100 rounded-full px-3 py-1 flex items-center gap-1"
                      >
                        <span className="text-sm">{category.name}</span>
                        <button
                          onClick={() => handleRemoveCategory(category.name)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a category"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCategory();
                        }
                      }}
                      className="text-sm"
                    />
                    <Button
                      onClick={handleAddCategory}
                      variant="outline"
                      className="shrink-0"
                    >
                      <Plus size={16} className="mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border border-gray-100">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Cover Image
                  </label>
                  {coverImage ? (
                    <div className="relative group cursor-pointer" onClick={() => !isUploadingImage && fileInputRef.current?.click()}>
                      <img 
                        src={coverImage}
                        alt="Course cover" 
                        className="w-full h-32 sm:h-40 object-cover rounded-md"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                        <Button 
                          variant="secondary" 
                          className="bg-white hover:bg-gray-100 text-sm sm:text-base"
                          onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          disabled={isUploadingImage}
                        >
                          Change Image
                        </Button>
                      </div>
                      {isUploadingImage && (
                        <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center rounded-md z-20">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                          <span className="text-white font-medium">Uploading image...</span>
                        </div>
                      )}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileInputChange}
                        accept="image/*"
                        className="hidden"
                        disabled={isUploadingImage}
                      />
                    </div>
                  ) : (
                    <div 
                      className="relative border-2 border-dashed border-gray-300 rounded-md p-4 sm:p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary"
                      onClick={() => !isUploadingImage && fileInputRef.current?.click()}
                    >
                      <div className="p-2 sm:p-3 rounded-full bg-gray-100">
                        <Video className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                      </div>
                      <p className="mt-2 text-xs sm:text-sm text-gray-500">Click to add a course cover image</p>
                      {isUploadingImage && (
                        <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center rounded-md z-20">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                          <span className="text-white font-medium">Uploading image...</span>
                        </div>
                      )}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileInputChange}
                        accept="image/*"
                        className="hidden"
                        disabled={isUploadingImage}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateCourse;