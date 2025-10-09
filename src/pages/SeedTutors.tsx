import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SeedTutors = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSeed = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-test-tutors', {
        method: 'POST',
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Success!",
          description: data.message,
        });
      } else {
        throw new Error(data?.error || 'Failed to seed tutors');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to seed test tutors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Seed Test Tutors</CardTitle>
          <CardDescription>
            This will create 50 test tutor accounts with verified profiles across various schools and subjects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleSeed} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Tutors...
              </>
            ) : (
              'Seed 50 Test Tutors'
            )}
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            All test accounts will have the password: <code className="bg-muted px-1 py-0.5 rounded">TestPass123!</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SeedTutors;
