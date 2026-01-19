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
  // ============ DISCOVERY & ENGAGEMENT ============
  
  // WhatsApp chat button click
  whatsappChatClick: () => {
    trackEvent('whatsapp_chat_click', {
      event_category: 'engagement',
      event_label: 'WhatsApp Chat Button'
    });
  },

  // Tutor search/filter
  tutorSearch: (filters: { curriculum?: string; subject?: string; gradeLevel?: string }) => {
    trackEvent('tutor_search', {
      event_category: 'discovery',
      ...filters
    });
  },

  // Tutor profile viewed
  tutorProfileView: (tutorId: string, tutorName: string) => {
    trackEvent('tutor_profile_view', {
      event_category: 'discovery',
      tutor_id: tutorId,
      tutor_name: tutorName
    });
  },

  // Key page views
  pageView: (pageName: string) => {
    trackEvent('page_view_key', {
      event_category: 'engagement',
      page_name: pageName
    });
  },

  // ============ CTA CLICKS ============

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

  // ============ BOOKING FUNNEL ============

  // User opens booking calendar
  bookingStarted: (tutorId: string, tutorName: string) => {
    trackEvent('booking_started', {
      event_category: 'booking_funnel',
      tutor_id: tutorId,
      tutor_name: tutorName
    });
  },

  // User selects a time slot
  slotSelected: (tutorId: string, slotTime: string) => {
    trackEvent('slot_selected', {
      event_category: 'booking_funnel',
      tutor_id: tutorId,
      slot_time: slotTime
    });
  },

  // User initiates payment (before Pesapal redirect)
  paymentInitiated: (paymentType: string, amount: number) => {
    trackEvent('payment_initiated', {
      event_category: 'booking_funnel',
      payment_type: paymentType,
      value: amount
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
  },

  // ============ LEARNING PLANS ============

  // Learning plan requested
  learningPlanRequested: (data: { curriculum?: string; subjects?: string[] }) => {
    trackEvent('learning_plan_requested', {
      event_category: 'conversion',
      curriculum: data.curriculum,
      subjects: data.subjects?.join(', ')
    });
  },

  // Learning plan viewed (parent views their plan link)
  learningPlanViewed: (planId: string) => {
    trackEvent('learning_plan_viewed', {
      event_category: 'engagement',
      plan_id: planId
    });
  },

  // ============ PACKAGE PURCHASES ============

  // Package purchased
  packagePurchased: (data: { packageId?: string; sessions?: number; amount?: number }) => {
    trackEvent('package_purchased', {
      event_category: 'conversion',
      package_id: data.packageId,
      sessions: data.sessions,
      value: data.amount
    });
  },

  // ============ DECEMBER INTENSIVE ============

  // Class added to cart
  intensiveClassAddedToCart: (data: { classId: string; subject: string; curriculum: string }) => {
    trackEvent('intensive_class_added_to_cart', {
      event_category: 'intensive_funnel',
      class_id: data.classId,
      subject: data.subject,
      curriculum: data.curriculum
    });
  },

  // Checkout started
  intensiveCheckoutStarted: (data: { totalClasses: number; totalAmount: number }) => {
    trackEvent('intensive_checkout_started', {
      event_category: 'intensive_funnel',
      total_classes: data.totalClasses,
      value: data.totalAmount
    });
  },

  // Enrollment completed
  intensiveEnrollmentCompleted: (data: { enrollmentId: string; totalClasses: number; amount: number }) => {
    trackEvent('intensive_enrollment_completed', {
      event_category: 'conversion',
      enrollment_id: data.enrollmentId,
      total_classes: data.totalClasses,
      value: data.amount
    });
  },

  // ============ GROUP CLASSES ============

  // Group class enrollment
  groupClassEnrolled: (data: { classId: string; subject: string; amount: number }) => {
    trackEvent('group_class_enrolled', {
      event_category: 'conversion',
      class_id: data.classId,
      subject: data.subject,
      value: data.amount
    });
  },

  // ============ AUTHENTICATION ============

  // Signup started
  signupStarted: (method: string) => {
    trackEvent('signup_started', {
      event_category: 'authentication',
      method
    });
  },

  // Signup completed
  signupCompleted: (method: string) => {
    trackEvent('signup_completed', {
      event_category: 'authentication',
      method
    });
  },

  // Login completed
  loginCompleted: (method: string) => {
    trackEvent('login_completed', {
      event_category: 'authentication',
      method
    });
  },

  // ============ TUTOR APPLICATION ============

  // Tutor application started
  tutorApplicationStarted: () => {
    trackEvent('tutor_application_started', {
      event_category: 'tutor_funnel'
    });
  },

  // Tutor application submitted
  tutorApplicationSubmitted: () => {
    trackEvent('tutor_application_submitted', {
      event_category: 'conversion'
    });
  }
};
