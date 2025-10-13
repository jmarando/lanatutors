/**
 * Validates Kenyan phone numbers in multiple formats
 * Accepts: +254XXXXXXXXX, 254XXXXXXXXX, or 0XXXXXXXXX
 * Returns normalized format: 254XXXXXXXXX
 */
export const validateAndNormalizePhone = (phone: string): { isValid: boolean; normalized: string; error?: string } => {
  // Remove all spaces and dashes
  const cleaned = phone.replace(/[\s-]/g, '');
  
  // Check for +254 format
  if (cleaned.match(/^\+254[0-9]{9}$/)) {
    return {
      isValid: true,
      normalized: cleaned.substring(1) // Remove the +
    };
  }
  
  // Check for 254 format
  if (cleaned.match(/^254[0-9]{9}$/)) {
    return {
      isValid: true,
      normalized: cleaned
    };
  }
  
  // Check for 0 format (Kenyan local)
  if (cleaned.match(/^0[0-9]{9}$/)) {
    return {
      isValid: true,
      normalized: '254' + cleaned.substring(1) // Replace 0 with 254
    };
  }
  
  return {
    isValid: false,
    normalized: cleaned,
    error: "Phone number must be in format: +254XXXXXXXXX, 254XXXXXXXXX, or 0XXXXXXXXX"
  };
};
