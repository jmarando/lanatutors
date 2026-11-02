// The business's WhatsApp number (the one Lana answers on) and a link that opens a chat with a message ready to send.
// The website's chat button (src/components/WhatsAppChatButton.tsx) holds the same number; a test checks the two match.
export const WHATSAPP_NUMBER = "254117512316";

export const whatsappLink = (message: string): string =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
