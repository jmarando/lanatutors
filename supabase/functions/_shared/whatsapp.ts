// Shared WhatsApp utility for Meta Cloud API
// Used by all WhatsApp-related edge functions

export interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string
): Promise<WhatsAppResult> {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

  if (!accessToken || !phoneNumberId) {
    console.error("WhatsApp credentials not configured");
    return { 
      success: false, 
      error: "WhatsApp credentials not configured" 
    };
  }

  // Format phone: remove spaces, plus, parentheses, dashes
  // Ensure it starts with country code (no leading +)
  let formattedPhone = phoneNumber.replace(/[\s+()-]/g, '');
  
  // If number starts with 0, assume Kenya and add 254
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '254' + formattedPhone.slice(1);
  }
  
  // If number doesn't start with a country code, assume Kenya
  if (formattedPhone.length === 9) {
    formattedPhone = '254' + formattedPhone;
  }

  console.log(`Sending WhatsApp to ${formattedPhone}`);

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "text",
          text: { 
            preview_url: true,
            body: message 
          }
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", data);
      return { 
        success: false, 
        error: data.error?.message || "Failed to send message" 
      };
    }

    console.log("WhatsApp message sent successfully:", data.messages?.[0]?.id);
    return { 
      success: true, 
      messageId: data.messages?.[0]?.id 
    };
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

// Send WhatsApp using a pre-approved template
export async function sendWhatsAppTemplate(
  phoneNumber: string,
  templateName: string,
  languageCode: string = "en",
  components?: Array<{
    type: string;
    parameters: Array<{ type: string; text?: string }>;
  }>
): Promise<WhatsAppResult> {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

  if (!accessToken || !phoneNumberId) {
    return { 
      success: false, 
      error: "WhatsApp credentials not configured" 
    };
  }

  let formattedPhone = phoneNumber.replace(/[\s+()-]/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '254' + formattedPhone.slice(1);
  }
  if (formattedPhone.length === 9) {
    formattedPhone = '254' + formattedPhone;
  }

  try {
    const body: Record<string, unknown> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
      }
    };

    if (components) {
      (body.template as Record<string, unknown>).components = components;
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp template error:", data);
      return { 
        success: false, 
        error: data.error?.message || "Failed to send template" 
      };
    }

    return { 
      success: true, 
      messageId: data.messages?.[0]?.id 
    };
  } catch (error) {
    console.error("WhatsApp template send error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}
