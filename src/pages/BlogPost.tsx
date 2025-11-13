import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Calendar, User, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  author_name: string | null;
  featured_image_url: string | null;
  published_at: string | null;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchPost();
    }
  }, [slug]);

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .single();

      if (error) throw error;
      setPost(data);
    } catch (error) {
      console.error("Error fetching blog post:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="section-container">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-3/4 mb-4" />
              <div className="h-4 bg-muted rounded w-1/2 mb-8" />
              <div className="h-64 bg-muted rounded mb-8" />
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-5/6" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <div className="section-container">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Post Not Found</h1>
            <Link to="/blog">
              <Button>Back to Blog</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={post.title}
        description={post.excerpt || post.title}
        ogImage={post.featured_image_url || undefined}
      />
      
      <div className="min-h-screen bg-background">
        <div className="section-container">
          <div className="max-w-4xl mx-auto">
            <Link to="/blog">
              <Button variant="ghost" className="mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Blog
              </Button>
            </Link>

            {post.featured_image_url && (
              <div className="aspect-video overflow-hidden rounded-lg mb-8">
                <img
                  src={post.featured_image_url}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <h1 className="text-4xl md:text-5xl font-bold mb-4">{post.title}</h1>
            
            <div className="flex items-center gap-6 text-muted-foreground mb-8 pb-8 border-b">
              {post.author_name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{post.author_name}</span>
                </div>
              )}
              {post.published_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(post.published_at), "MMMM d, yyyy")}</span>
                </div>
              )}
            </div>

            <div 
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
