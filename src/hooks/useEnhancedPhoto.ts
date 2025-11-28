import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useEnhancedPhoto = () => {
  const [isEnhancing, setIsEnhancing] = useState(false);

  const enhancePhoto = async (originalUrl: string): Promise<string> => {
    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke("enhance-tutor-photo", {
        body: { imageUrl: originalUrl },
      });

      if (error) {
        console.error("Failed to enhance photo:", error);
        // Return original if enhancement fails
        return originalUrl;
      }

      return data?.enhancedUrl || originalUrl;
    } catch (error) {
      console.error("Error enhancing photo:", error);
      return originalUrl;
    } finally {
      setIsEnhancing(false);
    }
  };

  return { enhancePhoto, isEnhancing };
};
