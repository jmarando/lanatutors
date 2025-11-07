import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { TutorAvailabilityManager } from "@/components/TutorAvailabilityManager";

const TutorAvailability = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <div className="border-b bg-background">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tutor/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-semibold">Manage Availability</h2>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <TutorAvailabilityManager />
      </div>
    </div>
  );
};

export default TutorAvailability;
