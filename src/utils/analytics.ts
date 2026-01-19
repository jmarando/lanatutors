// Google Analytics 4 event tracking utility

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
    console.log(`[Analytics] Event tracked: ${eventName}`, params);
  }
};

// Predefined events for consistency
export const analytics = {
  // WhatsApp chat button click
  whatsappChatClick: () => {
    trackEvent('whatsapp_chat_click', {
      event_category: 'engagement',
      event_label: 'WhatsApp Chat Button'
    });
  },

  // Book Assessment button click (on homepage/navigation)
  bookAssessmentClick: (location: string) => {
    trackEvent('book_assessment_click', {
      event_category: 'cta',
      event_label: location
    });
  },

  // Book a Class button click
  bookClassClick: (location: string) => {
    trackEvent('book_class_click', {
      event_category: 'cta',
      event_label: location
    });
  },

  // Assessment call form completed
  assessmentFormCompleted: (data: { curriculum?: string; gradeLevel?: string }) => {
    trackEvent('assessment_form_completed', {
      event_category: 'conversion',
      event_label: 'Book Assessment Call Form',
      curriculum: data.curriculum,
      grade_level: data.gradeLevel
    });
  },

  // Class booked successfully
  classBooked: (data: { subject?: string; tutorId?: string; amount?: number }) => {
    trackEvent('class_booked', {
      event_category: 'conversion',
      event_label: 'Class Booking Completed',
      subject: data.subject,
      tutor_id: data.tutorId,
      value: data.amount
    });
  }
};
