import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import calvinPhoto from "@/assets/calvin-onuko.png";

const CreateCalvinProfile = () => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState(false);

  const createCalvinProfile = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-tutor-profile", {
        body: {
          email: "calvin.onuko@poloetuition.com",
          fullName: "Calvins Onuko",
          phoneNumber: "+254700000000",
          subjects: ["Mathematics", "Physics"],
          curriculum: ["Cambridge IGCSE", "Cambridge AS/A Level", "Kenya CBC"],
          bio: "I hold a degree in Education Science (Physics and Mathematics) with extra qualifications in integration of technology into teaching and learning accredited by Go-labs ecosystems (UK). I am a trained Kenya National Examiner for physics paper with wealth of experience in Student assessment and learning experience.\n\nI am skilled in designing challenging, enriching and innovative activities that address the diverse interests and needs of students. I possess outstanding communication skills, present information in a variety of ways, emphasizing relevance of the class material to the world beyond the classroom. I am an active team member who effectively collaborates with all levels of staff members and establishes quality relationships with students.\n\nSpecializing in Cambridge International curricula across IGCSE Mathematics and AS/A Level Science, I focus on student-centered learning experiences that promote critical thinking, problem-solving, and global competencies.",
          hourlyRate: 2500,
          experienceYears: 16,
          currentInstitution: "Polo e-Tuition Services",
          qualifications: [
            "Bachelor's degree in Mathematics and Physics - University of Eldoret",
            "Education Science (Physics and Mathematics)",
            "Technology Integration in Teaching - Go-labs ecosystems (UK)",
            "Kenya National Examiner for Physics",
            "Cambridge Curriculum Expert - IGCSE & AS/A Level"
          ],
          verified: true,
        },
      });

      if (error) throw error;

      toast.success("Calvin's tutor profile created successfully!");
      setCreated(true);
      
      // Navigate to tutor search after 2 seconds
      setTimeout(() => {
        navigate("/tutors");
      }, 2000);
    } catch (error: any) {
      console.error("Error creating profile:", error);
      toast.error(error.message || "Failed to create tutor profile");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)] py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create Calvin's Tutor Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <img 
                src={calvinPhoto} 
                alt="Calvins Onuko" 
                className="w-48 h-48 rounded-full object-cover border-4 border-primary/20"
              />
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-xl font-bold">Calvins Onuko</h3>
                  <p className="text-muted-foreground">Cambridge Curriculum Expert | Mathematics & Physics Educator</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold">Subjects:</p>
                    <p className="text-muted-foreground">Mathematics, Physics</p>
                  </div>
                  <div>
                    <p className="font-semibold">Experience:</p>
                    <p className="text-muted-foreground">16 years</p>
                  </div>
                  <div>
                    <p className="font-semibold">Institution:</p>
                    <p className="text-muted-foreground">Polo e-Tuition Services</p>
                  </div>
                  <div>
                    <p className="font-semibold">Hourly Rate:</p>
                    <p className="text-muted-foreground">KES 2,500</p>
                  </div>
                </div>

                <div>
                  <p className="font-semibold mb-2">Qualifications:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Bachelor's degree - Mathematics and Physics</li>
                    <li>Cambridge Curriculum Expert (IGCSE & AS/A Level)</li>
                    <li>Kenya National Examiner for Physics</li>
                    <li>Technology Integration in Teaching (Go-labs UK)</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-2">Specialization:</p>
                  <p className="text-sm text-muted-foreground">
                    Cambridge International curricula specialist focusing on student-centered learning, 
                    critical thinking, and problem-solving across IGCSE Mathematics and AS/A Level Science.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={createCalvinProfile}
              disabled={isCreating || created}
              className="w-full"
              size="lg"
            >
              {isCreating ? "Creating Profile..." : created ? "Profile Created ✓" : "Create Tutor Profile"}
            </Button>

            {created && (
              <p className="text-center text-sm text-muted-foreground">
                Redirecting to tutor search...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateCalvinProfile;
