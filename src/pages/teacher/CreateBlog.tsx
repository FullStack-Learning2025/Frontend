import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Heading, Text, Image, Link, File, Plus, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";

type BlockType = "paragraph" | "heading1" | "heading2" | "image" | "file";

interface Block {
  id: string;
  type: BlockType;
  content: string;
}

interface Course {
  id: string;
  title: string;
}

interface CourseTitle {
  id: string;
  title: string;
}

const CreateBlog = () => {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get('type') === 'edit';
  const blogId = searchParams.get('id');
  
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([{ id: "1", type: "paragraph", content: "" }]);
  const [showAddBlockMenu, setShowAddBlockMenu] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>("1");
  const [imageUploadOpen, setImageUploadOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [blogStatus, setBlogStatus] = useState("draft");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAddBlockMenuFor, setShowAddBlockMenuFor] = useState<string | null>(null);
  
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
        
        if (response.data && response.data.data) {
          const uniqueTitles = response.data.data.reduce((acc: CourseTitle[], current: CourseTitle) => {
            const isDuplicate = acc.find(item => 
              item.title.toLowerCase() === current.title.toLowerCase()
            );
            if (!isDuplicate) {
              acc.push(current);
            }
            return acc;
          }, []);
  
          setCourses(uniqueTitles);
  
        } else {
          toast({
            title: "Error",
            description: "Invalid response format from server.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
        toast({
          title: "Error",
          description: "Failed to fetch courses. Please try again.",
          variant: "destructive"
        });
      }
    };

    const fetchBlog = async () => {
      if (isEditMode && blogId) {
        setIsLoading(true);
        try {
          const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/blogs/${blogId}`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          const blogData = response.data;
          console.log(blogData);
          setTitle(blogData.title);
          setSelectedCourseId(blogData.course_id);
          setBlogStatus(blogData.status || "draft");
          
          // Transform content to blocks
          const transformedBlocks = blogData.content.map((item: any, index: number) => {
            let type: BlockType = "paragraph";
            let content = "";
            
            if (item.heading1) {
              type = "heading1";
              content = item.heading1;
            } else if (item.heading2) {
              type = "heading2";
              content = item.heading2;
            } else if (item.text) {
              type = "paragraph";
              content = item.text;
            } else if (item.image) {
              type = "image";
              content = item.image;
            } else if (item.file) {
              type = "file";
              content = item.file;
            }
            
            return {
              id: (index + 1).toString(),
              type,
              content
            };
          });
          
          setBlocks(transformedBlocks);
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to fetch blog data. Please try again.",
            variant: "destructive"
          });
          navigate("/teacher/blogs");
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (token) {
      fetchCourses();
      fetchBlog();
    }
  }, [token]);

  const handleBlockChange = (id: string, content: string) => {
    setBlocks(blocks.map(block => (block.id === id ? { ...block, content } : block)));
  };

  const addNewBlock = (type: BlockType) => {
    const newBlock = {
      id: Date.now().toString(),
      type,
      content: ""
    };
    setBlocks([...blocks, newBlock]);
    setShowAddBlockMenu(false);
    setActiveBlockId(newBlock.id);
    
    if (type === "image") {
      setImageUploadOpen(true);
    }
    
    // Scroll to the bottom after adding a new block
    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
  };

  const handleImageUpload = (imageUrl: string) => {
    if (activeBlockId) {
      setBlocks(
        blocks.map(block =>
          block.id === activeBlockId ? { ...block, content: imageUrl } : block
        )
      );
      
      // Add to uploaded images for history
      if (!uploadedImages.includes(imageUrl)) {
        setUploadedImages([...uploadedImages, imageUrl]);
      }
      
      setImageUploadOpen(false);
      setImageUrlInput("");
    }
  };

  const uploadToBackend = async (file: File, type: 'image' | 'file') => {
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
      throw new Error("Failed to upload file");
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const fileUrl = await uploadToBackend(file, type);
        if (activeBlockId) {
          setBlocks(
            blocks.map(block =>
              block.id === activeBlockId ? { ...block, content: fileUrl } : block
            )
          );
          
          if (type === 'image' && !uploadedImages.includes(fileUrl)) {
            setUploadedImages([...uploadedImages, fileUrl]);
          }
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to upload file. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const formatBlogContent = () => {
    return blocks.map(block => {
      switch (block.type) {
        case "paragraph":
          return { text: block.content };
        case "heading1":
          return { heading1: block.content };
        case "heading2":
          return { heading2: block.content };
        case "image":
          return { image: block.content };
        case "file":
          return { file: block.content };
        default:
          return {};
      }
    });
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please add a title for your blog post.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedCourseId) {
      toast({
        title: "Error",
        description: "Please select a course for this blog post.",
        variant: "destructive"
      });
      return;
    }

    try {
      const blogData = {
        title,
        content: formatBlogContent(),
        course_id: selectedCourseId,
        status: "published"
      };

      if (isEditMode && blogId) {
        await axios.put(
          `${import.meta.env.VITE_BACKEND_URL}/api/blogs/${blogId}`,
          blogData,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
      } else {
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/blogs/courses/${selectedCourseId}`,
          blogData,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
      }

      toast({
        title: "Success",
        description: `Blog ${isEditMode ? 'updated' : 'published'} successfully!`,
      });
      navigate("/teacher/blogs");
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? 'update' : 'publish'} blog. Please try again.`,
        variant: "destructive"
      });
    }
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please add a title for your blog post.",
        variant: "destructive"
      });
      return;
    }

    try {
      const blogData = {
        title,
        content: formatBlogContent(),
        course_id: selectedCourseId,
        status: "draft"
      };

      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/blogs/courses/${selectedCourseId}`,
        blogData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      toast({
        title: "Saved",
        description: "Your blog draft has been saved.",
      });
      navigate("/teacher/blogs");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save draft. Please try again.",
        variant: "destructive"
      });
    }
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(block => block.id !== id));
  };

  const addBlockAfter = (afterId: string, type: BlockType) => {
    const newBlock = {
      id: Date.now().toString(),
      type,
      content: ""
    };

    const afterIndex = blocks.findIndex(block => block.id === afterId);
    const newBlocks = [
      ...blocks.slice(0, afterIndex + 1),
      newBlock,
      ...blocks.slice(afterIndex + 1)
    ];

    setBlocks(newBlocks);
    setShowAddBlockMenuFor(null);
    setActiveBlockId(newBlock.id);
    
    if (type === "image") {
      setImageUploadOpen(true);
    }
  };

  const renderBlockActions = (blockId: string) => (
    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex gap-1">
      <button
        onClick={() => setShowAddBlockMenuFor(blockId)}
        className="p-1 rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100"
      >
        <Plus size={16} />
      </button>
      <button
        onClick={() => deleteBlock(blockId)}
        className="p-1 rounded-full bg-red-50 text-red-500 hover:bg-red-100"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18"></path>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </button>
    </div>
  );

  const renderBlock = (block: Block) => {
    switch (block.type) {
      case "paragraph":
        return (
          <div className="py-2 relative group">
            <Textarea
              className="w-full min-h-[60px] p-2 text-lg border-none focus:outline-none focus:ring-0 bg-background resize-none"
              placeholder="Start typing..."
              value={block.content}
              onChange={(e) => handleBlockChange(block.id, e.target.value)}
              onFocus={() => setActiveBlockId(block.id)}
            />
            {renderBlockActions(block.id)}
            {showAddBlockMenuFor === block.id && (
              <div className="absolute bg-white shadow-lg rounded-md p-2 z-10 mt-2 border border-gray-200 flex flex-col gap-1 w-48 top-full left-1/2 transform -translate-x-1/2">
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "paragraph")}
                >
                  <Text size={14} /> <span>Text</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "heading1")}
                >
                  <Heading size={14} /> <span>Heading 1</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "heading2")}
                >
                  <Heading size={14} /> <span>Heading 2</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "image")}
                >
                  <Image size={14} /> <span>Image</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "file")}
                >
                  <File size={14} /> <span>File</span>
                </Button>
              </div>
            )}
          </div>
        );
      case "heading1":
        return (
          <div className="py-1 relative group">
            <Textarea
              className="w-full text-3xl font-bold border-none focus:outline-none focus:ring-0 bg-background resize-none py-1"
              placeholder="Heading 1"
              value={block.content}
              onChange={(e) => handleBlockChange(block.id, e.target.value)}
              onFocus={() => setActiveBlockId(block.id)}
            />
            {renderBlockActions(block.id)}
            {showAddBlockMenuFor === block.id && (
              <div className="absolute bg-white shadow-lg rounded-md p-2 z-10 mt-2 border border-gray-200 flex flex-col gap-1 w-48 top-full left-1/2 transform -translate-x-1/2">
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "paragraph")}
                >
                  <Text size={14} /> <span>Text</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "heading1")}
                >
                  <Heading size={14} /> <span>Heading 1</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "heading2")}
                >
                  <Heading size={14} /> <span>Heading 2</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "image")}
                >
                  <Image size={14} /> <span>Image</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "file")}
                >
                  <File size={14} /> <span>File</span>
                </Button>
              </div>
            )}
          </div>
        );
      case "heading2":
        return (
          <div className="py-1 relative group">
            <Textarea
              className="w-full text-2xl font-semibold border-none focus:outline-none focus:ring-0 bg-background resize-none py-1"
              placeholder="Heading 2"
              value={block.content}
              onChange={(e) => handleBlockChange(block.id, e.target.value)}
              onFocus={() => setActiveBlockId(block.id)}
            />
            {renderBlockActions(block.id)}
            {showAddBlockMenuFor === block.id && (
              <div className="absolute bg-white shadow-lg rounded-md p-2 z-10 mt-2 border border-gray-200 flex flex-col gap-1 w-48 top-full left-1/2 transform -translate-x-1/2">
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "paragraph")}
                >
                  <Text size={14} /> <span>Text</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "heading1")}
                >
                  <Heading size={14} /> <span>Heading 1</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "heading2")}
                >
                  <Heading size={14} /> <span>Heading 2</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "image")}
                >
                  <Image size={14} /> <span>Image</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "file")}
                >
                  <File size={14} /> <span>File</span>
                </Button>
              </div>
            )}
          </div>
        );
      case "image":
        return (
          <div className="py-2 relative group">
            {block.content ? (
              <div className="flex justify-center">
                <div className="relative max-w-2xl">
                  <img
                    src={block.content}
                    alt="Blog image"
                    className="rounded-md object-cover max-h-[400px] w-full"
                    onClick={() => {
                      setActiveBlockId(block.id);
                      setImageUploadOpen(true);
                    }}
                  />
                  {renderBlockActions(block.id)}
                </div>
              </div>
            ) : (
              <div
                className="flex justify-center items-center h-32 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 transition-colors border-2 border-dashed border-gray-300"
                onClick={() => {
                  setActiveBlockId(block.id);
                  setImageUploadOpen(true);
                }}
              >
                <div className="text-center">
                  <Image className="h-8 w-8 mx-auto text-gray-400" />
                  <span className="text-gray-500 mt-2 block">Click to add an image</span>
                </div>
                {renderBlockActions(block.id)}
              </div>
            )}
            {showAddBlockMenuFor === block.id && (
              <div className="absolute bg-white shadow-lg rounded-md p-2 z-10 mt-2 border border-gray-200 flex flex-col gap-1 w-48 top-full left-1/2 transform -translate-x-1/2">
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "paragraph")}
                >
                  <Text size={14} /> <span>Text</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "heading1")}
                >
                  <Heading size={14} /> <span>Heading 1</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "heading2")}
                >
                  <Heading size={14} /> <span>Heading 2</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "image")}
                >
                  <Image size={14} /> <span>Image</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "file")}
                >
                  <File size={14} /> <span>File</span>
                </Button>
              </div>
            )}
          </div>
        );
      case "file":
        return (
          <div className="py-2 relative group">
            <div 
              className="border border-gray-200 rounded-md p-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer relative"
              onClick={() => {
                if (!block.content) {
                  setActiveBlockId(block.id);
                  setImageUploadOpen(true);
                }
              }}
            >
              <File className="text-gray-500" />
              {block.content ? (
                <div className="flex-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">{block.content.split('/').pop()}</span>
                    <a 
                      href={block.content} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:text-primary-dark text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Download
                    </a>
                  </div>
                </div>
              ) : (
                <span className="text-gray-500">Click to upload a file</span>
              )}
              {renderBlockActions(block.id)}
            </div>
            {showAddBlockMenuFor === block.id && (
              <div className="absolute bg-white shadow-lg rounded-md p-2 z-10 mt-2 border border-gray-200 flex flex-col gap-1 w-48 top-full left-1/2 transform -translate-x-1/2">
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "paragraph")}
                >
                  <Text size={14} /> <span>Text</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "heading1")}
                >
                  <Heading size={14} /> <span>Heading 1</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "heading2")}
                >
                  <Heading size={14} /> <span>Heading 2</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "image")}
                >
                  <Image size={14} /> <span>Image</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex items-center justify-start gap-2 text-sm"
                  onClick={() => addBlockAfter(block.id, "file")}
                >
                  <File size={14} /> <span>File</span>
                </Button>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const toggleBlogStatus = async () => {
    const newStatus = blogStatus === "published" ? "draft" : "published";
    
    try {
      if (isEditMode && blogId) {
        const blogData = {
          title,
          content: formatBlogContent(),
          course_id: selectedCourseId,
          status: newStatus
        };

        await axios.put(
          `${import.meta.env.VITE_BACKEND_URL}/api/blogs/${blogId}`,
          blogData,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
      }
      
      setBlogStatus(newStatus);
      toast({
        title: "Success",
        description: `Blog ${newStatus === "published" ? "published" : "unpublished"} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${newStatus === "published" ? "publish" : "unpublish"} blog. Please try again.`,
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto py-6 px-4 pb-20">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          {isEditMode ? 'Edit Blog Post' : 'Create New Blog Post'}
        </h1>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {isEditMode && (
            <Button
              variant="outline"
              onClick={toggleBlogStatus}
              className="bg-white hover:opacity-80 text-black text-sm sm:text-base"
            >
              {blogStatus === "published" ? "Unpublish" : "Publish"}
            </Button>
          )}
          <Button variant="outline" onClick={handleSaveDraft} className="flex items-center gap-2 text-sm sm:text-base">
            Save Draft
          </Button>
          <Button onClick={handlePublish} className="flex items-center gap-2 bg-primary hover:bg-primary-600 text-sm sm:text-base">
            {isEditMode ? 'Update Blog' : 'Publish'}
          </Button>
        </div>
      </div>
      
      <div className="mb-6">
        <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-1">
          Associated Course
        </label>
        <select
          id="course"
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
        >
          <option value="">Select a course</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      <Card className="p-3 sm:p-4 shadow-md border border-gray-100">
        <Input
          type="text"
          placeholder="Blog Title"
          className="border-none text-2xl sm:text-4xl font-bold mb-4 focus-visible:ring-0 px-0"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="space-y-1">
          {blocks.map((block) => (
            <div key={block.id} className="relative">
              {renderBlock(block)}
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center relative">
          <Button
            variant="outline"
            className="flex items-center gap-2 border-dashed text-sm sm:text-base"
            onClick={() => setShowAddBlockMenu(!showAddBlockMenu)}
          >
            <Plus size={18} /> Add Block
          </Button>

          {showAddBlockMenu && (
            <div className="absolute bg-white shadow-lg rounded-md p-2 z-10 mt-2 border border-gray-200 flex flex-col gap-1 w-48 sm:w-64 top-full left-1/2 transform -translate-x-1/2 max-h-[60vh] overflow-y-auto">
              <Button 
                variant="ghost" 
                className="flex items-center justify-start gap-2 text-sm"
                onClick={() => addNewBlock("paragraph")}
              >
                <Text size={16} /> <span>Text</span>
              </Button>
              <Button 
                variant="ghost" 
                className="flex items-center justify-start gap-2 text-sm"
                onClick={() => addNewBlock("heading1")}
              >
                <Heading size={16} /> <span>Heading 1</span>
              </Button>
              <Button 
                variant="ghost" 
                className="flex items-center justify-start gap-2 text-sm"
                onClick={() => addNewBlock("heading2")}
              >
                <Heading size={16} /> <span>Heading 2</span>
              </Button>
              <Button 
                variant="ghost" 
                className="flex items-center justify-start gap-2 text-sm"
                onClick={() => addNewBlock("image")}
              >
                <Image size={16} /> <span>Image</span>
              </Button>
              <Button 
                variant="ghost" 
                className="flex items-center justify-start gap-2 text-sm"
                onClick={() => addNewBlock("file")}
              >
                <File size={16} /> <span>File</span>
              </Button>
            </div>
          )}
        </div>
      </Card>

      <Dialog open={imageUploadOpen} onOpenChange={setImageUploadOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Upload {activeBlockId && blocks.find(b => b.id === activeBlockId)?.type === 'file' ? 'File' : 'Image'}</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Upload a file or select one from the gallery
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 sm:space-y-6">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-8 text-center hover:border-primary transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
              <div className="mt-2 sm:mt-4 flex text-sm text-gray-600 justify-center">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
                >
                  <span>Upload a file</span>
                  <input 
                    id="file-upload" 
                    name="file-upload" 
                    type="file" 
                    className="sr-only"
                    ref={fileInputRef}
                    onChange={(e) => handleFileInputChange(e, activeBlockId && blocks.find(b => b.id === activeBlockId)?.type === 'file' ? 'file' : 'image')}
                    accept={activeBlockId && blocks.find(b => b.id === activeBlockId)?.type === 'file' ? '*/*' : 'image/*'}
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1 sm:mt-2">
                {activeBlockId && blocks.find(b => b.id === activeBlockId)?.type === 'file' 
                  ? 'Any file type up to 10MB' 
                  : 'PNG, JPG, GIF up to 10MB'}
              </p>
            </div>
            
            <div className="space-y-2 sm:space-y-4">
              <h3 className="font-medium text-sm text-gray-700">Enter image URL</h3>
              <div className="flex gap-2">
                <Input 
                  type="text" 
                  placeholder="https://example.com/image.jpg" 
                  className="flex-1 text-sm sm:text-base"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                />
                <Button onClick={() => {
                  if (imageUrlInput.trim()) {
                    handleImageUpload(imageUrlInput.trim());
                  }
                }} className="text-sm sm:text-base">
                  Add
                </Button>
              </div>
            </div>

            {uploadedImages.length > 0 && (
              <div className="space-y-2 sm:space-y-4">
                <h3 className="font-medium text-sm text-gray-700">Your uploads</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {uploadedImages.map((img, index) => (
                    <div 
                      key={`upload-${index}`} 
                      className="relative group cursor-pointer"
                      onClick={() => handleImageUpload(img)}
                    >
                      <img
                        src={img}
                        alt={`Upload ${index + 1}`}
                        className={cn(
                          "h-20 sm:h-24 w-full object-cover rounded-md",
                          activeBlockId && blocks.find(b => b.id === activeBlockId)?.content === img 
                            ? "ring-2 ring-primary" : ""
                        )}
                      />
                      {activeBlockId && blocks.find(b => b.id === activeBlockId)?.content === img && (
                        <div className="absolute top-1 right-1 bg-primary text-white p-0.5 rounded-full">
                          <Check size={14} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <h3 className="font-medium text-sm text-gray-700">Stock images</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                "photo-1649972904349-6e44c42644a7", 
                "photo-1488590528505-98d2b5aba04b", 
                "photo-1518770660439-4636190af475", 
                "photo-1461749280684-dccba630e2f6", 
                "photo-1486312338219-ce68d2c6f44d",
                "photo-1581091226825-a6a2a5aee158"
              ].map((photoId, idx) => (
                <div 
                  key={photoId} 
                  className="relative group cursor-pointer"
                  onClick={() => handleImageUpload(`https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=1200&q=80`)}
                >
                  <img
                    src={`https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=200&h=150&q=80`}
                    alt={`Stock photo ${idx + 1}`}
                    className={cn(
                      "h-20 sm:h-24 w-full rounded-md object-cover",
                      activeBlockId && blocks.find(b => b.id === activeBlockId)?.content === `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=1200&q=80`
                        ? "ring-2 ring-primary" : ""
                    )}
                  />
                  {activeBlockId && blocks.find(b => b.id === activeBlockId)?.content === `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=1200&q=80` && (
                    <div className="absolute top-1 right-1 bg-primary text-white p-0.5 rounded-full">
                      <Check size={14} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateBlog;
