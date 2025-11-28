import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cleanDisplayText, formatName } from "@/utils/textFormatting";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface TutorDisplayInfoProps {
  tutorId?: string;
  name: string;
  avatarUrl?: string | null;
  bio?: string | null;
  className?: string;
  enablePhotoEnhancement?: boolean;
}

export const TutorDisplayInfo = ({
  tutorId,
  name,
  avatarUrl,
  bio,
  className,
  enablePhotoEnhancement = true,
}: TutorDisplayInfoProps) => {
  const [enhancedPhotoUrl, setEnhancedPhotoUrl] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);

  useEffect(() => {
    if (enablePhotoEnhancement && avatarUrl && tutorId) {
      enhancePhoto();
    }
  }, [avatarUrl, tutorId, enablePhotoEnhancement]);

  const enhancePhoto = async () => {
    if (!avatarUrl || isEnhancing) return;

    try {
      setIsEnhancing(true);

      // Check if we already have an enhanced version cached
      const cacheKey = `enhanced_photo_${tutorId}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        setEnhancedPhotoUrl(cached);
        return;
      }

      // Call edge function to enhance photo
      const { data, error } = await supabase.functions.invoke("enhance-tutor-photo", {
        body: { imageUrl: avatarUrl },
      });

      if (!error && data?.enhancedUrl) {
        setEnhancedPhotoUrl(data.enhancedUrl);
        // Cache the enhanced URL
        localStorage.setItem(cacheKey, data.enhancedUrl);
      }
    } catch (error) {
      console.error("Photo enhancement failed:", error);
      // Silently fail - use original photo
    } finally {
      setIsEnhancing(false);
    }
  };

  const displayName = formatName(name);
  const displayBio = bio ? cleanDisplayText(bio) : null;
  const photoUrl = enhancedPhotoUrl || avatarUrl;

  return {
    displayName,
    displayBio,
    photoUrl,
    isEnhancing,
  };
};

interface TutorAvatarProps {
  name: string;
  avatarUrl?: string | null;
  tutorId?: string;
  size?: "sm" | "md" | "lg" | "xl";
  enableEnhancement?: boolean;
  className?: string;
}

export const TutorAvatar = ({
  name,
  avatarUrl,
  tutorId,
  size = "md",
  enableEnhancement = true,
  className,
}: TutorAvatarProps) => {
  const { photoUrl, isEnhancing } = TutorDisplayInfo({
    tutorId,
    name,
    avatarUrl,
    enablePhotoEnhancement: enableEnhancement,
  });

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16",
    xl: "h-24 w-24",
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {isEnhancing && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
        </div>
      )}
      <AvatarImage src={photoUrl || undefined} alt={formatName(name)} />
      <AvatarFallback>
        {formatName(name)
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)}
      </AvatarFallback>
    </Avatar>
  );
};

interface TutorBioDisplayProps {
  bio: string | null | undefined;
  className?: string;
}

export const TutorBioDisplay = ({ bio, className }: TutorBioDisplayProps) => {
  const cleanedBio = bio ? cleanDisplayText(bio) : null;

  if (!cleanedBio) return null;

  return <p className={className}>{cleanedBio}</p>;
};
