import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, User } from "lucide-react";
import { format } from "date-fns";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  author_name: string | null;
  featured_image_url: string | null;
  published_at: string | null;
}

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, author_name, featured_image_url, published_at")
        .eq("published", true)
        .order("published_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Blog - Education Insights & Tips"
        description="Read expert articles about CBC curriculum, tutoring tips, and educational guidance for Kenyan students and parents."
        keywords="CBC curriculum guide, Kenya education blog, tutoring tips, parent education resources"
      />
      
      <div className="min-h-screen bg-gradient-to-b from-secondary/30 to-background">
        <div className="section-container">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Education Blog</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Expert insights, tips, and guides to help you navigate your educational journey
            </p>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-48 bg-muted rounded-md mb-4" />
                    <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No blog posts available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`}>
                  <Card className="h-full card-hover cursor-pointer">
                    {post.featured_image_url && (
                      <div className="aspect-video overflow-hidden rounded-t-lg">
                        <img
                          src={post.featured_image_url}
                          alt={post.title}
                          className="w-full h-full object-cover hover-scale"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="line-clamp-2">{post.title}</CardTitle>
                      <CardDescription className="line-clamp-3">
                        {post.excerpt}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {post.author_name && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{post.author_name}</span>
                          </div>
                        )}
                        {post.published_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(post.published_at), "MMM d, yyyy")}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
