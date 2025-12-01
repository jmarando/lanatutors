import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      throw new Error("Image URL is required");
    }

    // Download original image
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    const imageArrayBuffer = await imageBlob.arrayBuffer();
    
    // Convert to base64 in chunks to avoid stack overflow
    const bytes = new Uint8Array(imageArrayBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64Image = btoa(binary);

    // Call Lovable AI to enhance the photo
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Transform this photo into a professional headshot suitable for an educational tutoring platform. Keep the person's likeness and facial features exactly as they are - do not change their appearance. Focus on: professional lighting, clean neutral background (solid color or subtle gradient), proper framing (head and shoulders), professional attire if possible. The result should look like a professional LinkedIn or corporate headshot while preserving the person's natural appearance completely."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI enhancement failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI Response structure:", JSON.stringify(aiData, null, 2));
    
    // Try multiple possible response structures
    let enhancedImageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
                           aiData.choices?.[0]?.message?.content ||
                           aiData.data?.[0]?.url;

    if (!enhancedImageUrl) {
      console.error("Unexpected AI response structure:", aiData);
      throw new Error("No enhanced image returned from AI");
    }
    
    // If the response is text content instead of image URL, it might be a base64 image
    if (typeof enhancedImageUrl === 'string' && enhancedImageUrl.startsWith('data:image')) {
      // Already in data URL format
      console.log("Received image as data URL");
    } else if (!enhancedImageUrl.startsWith('http') && !enhancedImageUrl.startsWith('data:')) {
      console.error("Invalid image URL format:", enhancedImageUrl);
      throw new Error("Invalid image format returned from AI");
    }

    // Upload enhanced image to Supabase storage
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Convert base64 to blob
    const enhancedBase64 = enhancedImageUrl.split(',')[1];
    const enhancedImageBlob = Uint8Array.from(atob(enhancedBase64), c => c.charCodeAt(0));

    const fileName = `enhanced-${Date.now()}.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, enhancedImageBlob, {
        contentType: "image/jpeg",
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({
        success: true,
        originalUrl: imageUrl,
        enhancedUrl: publicUrl
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error enhancing photo:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        success: false
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
