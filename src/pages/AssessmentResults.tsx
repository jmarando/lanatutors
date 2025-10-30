import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  GraduationCap, 
  Brain, 
  Target, 
  TrendingUp, 
  Star,
  BookOpen,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";

interface AssessmentData {
  id: string;
  student_name: string;
  current_level: string;
  learning_style: string;
  learning_gaps: string[];
  strengths: string[];
  goals: string;
  preferred_subjects: string[];
  ai_analysis: string;
}

interface TutorRecommendation {
  tutor_id: string;
  match_score: number;
  match_reasons: string[];
  ranking: number;
  tutor: {
    id: string;
    full_name: string;
    avatar_url: string;
    subjects: string[];
    hourly_rate: number;
    rating: number;
    total_reviews: number;
    bio: string;
  };
}

const AssessmentResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [recommendations, setRecommendations] = useState<TutorRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const assessmentId = searchParams.get("assessmentId");

  useEffect(() => {
    if (!assessmentId) {
      toast({
        title: "No Assessment Found",
        description: "Please complete an assessment first",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    fetchResults();
  }, [assessmentId]);

  const fetchResults = async () => {
    try {
      // Fetch assessment - using type assertion
      const { data: rawData, error: assessmentError } = await (supabase as any)
        .from("learning_assessments")
        .select("*")
        .eq("id", assessmentId)
        .single();

      if (assessmentError) throw assessmentError;

      // Type cast to any to safely access properties
      const data: any = rawData;
      
      // Map the database fields to our component state
      const mappedAssessment: AssessmentData = {
        id: data.id,
        student_name: data.student_name,
        current_level: data.grade_level,
        learning_style: data.learning_style || "mixed",
        learning_gaps: data.identified_gaps || [],
        strengths: data.strengths || [],
        goals: data.recommended_approach || "",
        preferred_subjects: data.subjects || [],
        ai_analysis: data.suggested_learning_path || "",
      };
      
      setAssessment(mappedAssessment);

      // Parse recommended tutors from the JSONB field
      const recommendedTutors = data.recommended_tutors || [];
      setRecommendations(recommendedTutors);
    } catch (error) {
      console.error("Error fetching results:", error);
      toast({
        title: "Error",
        description: "Failed to load assessment results",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Navigation />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <p className="text-lg">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return null;
  }

  const getLearningStyleIcon = (style: string) => {
    switch (style.toLowerCase()) {
      case "visual": return "👁️";
      case "auditory": return "👂";
      case "kinesthetic": return "✋";
      case "reading_writing": return "📚";
      default: return "🧠";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
            <GraduationCap className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Your Learning Profile</h1>
          <p className="text-muted-foreground text-lg">
            Here's what we discovered about {assessment.student_name}'s learning journey
          </p>
        </div>

        {/* Learning Profile Overview */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">Learning Style</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{getLearningStyleIcon(assessment.learning_style)}</span>
              <div>
                <p className="font-semibold text-lg capitalize">{assessment.learning_style.replace("_", " / ")}</p>
                <p className="text-sm text-muted-foreground">Primary learning preference</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">Current Level</h2>
            </div>
            <p className="text-2xl font-bold">{assessment.current_level}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {assessment.preferred_subjects.map((subject, idx) => (
                <Badge key={idx} variant="secondary">{subject}</Badge>
              ))}
            </div>
          </Card>
        </div>

        {/* AI Analysis */}
        <Card className="p-6 mb-8 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">AI Analysis</h2>
          </div>
          <p className="text-lg leading-relaxed">{assessment.ai_analysis}</p>
        </Card>

        {/* Strengths and Goals */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">Strengths</h2>
            </div>
            <ul className="space-y-2">
              {assessment.strengths.map((strength, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <ChevronRight className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">Areas to Improve</h2>
            </div>
            <ul className="space-y-2">
              {assessment.learning_gaps.map((gap, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <ChevronRight className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Goals */}
        {assessment.goals && (
          <Card className="p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">Learning Goals</h2>
            </div>
            <p className="text-lg">{assessment.goals}</p>
          </Card>
        )}

        {/* Recommended Tutors */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-6 text-center">Your Recommended Tutors</h2>
          <p className="text-center text-muted-foreground mb-8">
            Based on your learning profile, here are the tutors that best match your needs
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {recommendations.map((rec) => (
              <Card key={rec.tutor_id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={rec.tutor.avatar_url} alt={rec.tutor.full_name} />
                    <AvatarFallback>{rec.tutor.full_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">{rec.tutor.full_name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-rating-star text-rating-star" />
                        <span className="font-semibold">{rec.tutor.rating}</span>
                        <span>({rec.tutor.total_reviews} reviews)</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="mb-2">
                      {Math.round(rec.match_score * 100)}% Match
                    </Badge>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">{rec.tutor.bio}</p>
                  <div className="flex flex-wrap gap-2">
                    {rec.tutor.subjects.slice(0, 3).map((subject: string, idx: number) => (
                      <Badge key={idx} variant="outline">{subject}</Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-sm font-semibold">Why this tutor:</p>
                  {rec.match_reasons.map((reason: string, idx: number) => (
                    <p key={idx} className="text-sm flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{reason}</span>
                    </p>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold">KES {rec.tutor.hourly_rate}/hr</p>
                  <Button onClick={() => navigate(`/tutors/${rec.tutor_id}`)}>
                    View Profile
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="text-center">
          <Button size="lg" onClick={() => navigate("/tutors")}>
            Browse All Tutors
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentResults;
