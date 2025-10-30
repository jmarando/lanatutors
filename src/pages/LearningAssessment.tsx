import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Loader2, GraduationCap, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const LearningAssessment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Student details state
  const [studentName, setStudentName] = useState(searchParams.get("studentName") || "");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [showDetailsForm, setShowDetailsForm] = useState(false);

  useEffect(() => {
    // Check if we have the required details
    if (!studentName || !email) {
      setShowDetailsForm(true);
      return;
    }

    // Start the conversation if we have details
    startAssessment();
  }, [studentName, email]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const startAssessment = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-learning-assessment", {
        body: {
          studentName,
          email,
          messages: [],
        },
      });

      if (error) throw error;

      setMessages([{ role: "assistant", content: data.message }]);
      setAssessmentId(data.assessmentId);
    } catch (error) {
      console.error("Error starting assessment:", error);
      toast({
        title: "Error",
        description: "Failed to start assessment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-learning-assessment", {
        body: {
          assessmentId,
          studentName,
          email,
          messages: updatedMessages,
        },
      });

      if (error) throw error;

      setMessages([...updatedMessages, { role: "assistant", content: data.message }]);
      setAssessmentId(data.assessmentId);

      if (data.assessmentComplete) {
        setIsComplete(true);
        // Navigate to results page after a short delay
        setTimeout(() => {
          navigate(`/assessment-results?assessmentId=${data.assessmentId}`);
        }, 2000);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleStartAssessment = () => {
    if (!studentName.trim() || !email.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both student name and email",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please provide a valid email address",
        variant: "destructive",
      });
      return;
    }

    setShowDetailsForm(false);
    startAssessment();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
            <GraduationCap className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Smart Tutor Match</h1>
          <p className="text-muted-foreground text-lg">
            {showDetailsForm 
              ? "Let's get started with your AI learning assessment" 
              : `Discovering the perfect tutor for ${studentName}`
            }
          </p>
        </div>

        {showDetailsForm ? (
          <Card className="p-6 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Welcome to Smart Tutor Match</CardTitle>
              <CardDescription className="text-base">
                Our AI will analyze your learning needs and match you with the perfect tutor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="studentName">Student Name</Label>
                <Input
                  id="studentName"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter student's full name"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="h-12"
                />
                <p className="text-sm text-muted-foreground">
                  We'll send your personalized tutor recommendations here
                </p>
              </div>

              <Button 
                onClick={handleStartAssessment}
                className="w-full h-12 text-lg"
                size="lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Start AI Assessment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="p-6 shadow-lg">
            <div className="space-y-4 mb-6 h-[500px] overflow-y-auto">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {!isComplete && (
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your answer here..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            )}

            {isComplete && (
              <div className="text-center py-4">
                <p className="text-lg font-semibold text-primary mb-2">Assessment Complete!</p>
                <p className="text-muted-foreground">Generating your personalized tutor recommendations...</p>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default LearningAssessment;
