/**
 * Clean and format text for display - capitalize sentences, fix spacing, basic grammar
 */
export const cleanDisplayText = (text: string | null | undefined): string => {
  if (!text) return "";

  let cleaned = text.trim();

  // Fix multiple spaces
  cleaned = cleaned.replace(/\s+/g, " ");

  // Capitalize first letter of sentences (after . ! ?)
  cleaned = cleaned.replace(/(^|[.!?]\s+)([a-z])/g, (match, separator, letter) => {
    return separator + letter.toUpperCase();
  });

  // Ensure first character is capitalized
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  // Fix common spacing issues around punctuation
  cleaned = cleaned.replace(/\s+([.,!?;:])/g, "$1"); // Remove space before punctuation
  cleaned = cleaned.replace(/([.,!?;:])([a-zA-Z])/g, "$1 $2"); // Add space after punctuation

  // Fix i to I when standalone
  cleaned = cleaned.replace(/\bi\b/g, "I");

  // Fix common contractions
  cleaned = cleaned.replace(/\bim\b/gi, "I'm");
  cleaned = cleaned.replace(/\bive\b/gi, "I've");
  cleaned = cleaned.replace(/\bdont\b/gi, "don't");
  cleaned = cleaned.replace(/\bcant\b/gi, "can't");
  cleaned = cleaned.replace(/\bwont\b/gi, "won't");
  cleaned = cleaned.replace(/\bisnt\b/gi, "isn't");
  cleaned = cleaned.replace(/\barent\b/gi, "aren't");
  cleaned = cleaned.replace(/\bwasnt\b/gi, "wasn't");
  cleaned = cleaned.replace(/\bwerent\b/gi, "weren't");
  cleaned = cleaned.replace(/\bhasnt\b/gi, "hasn't");
  cleaned = cleaned.replace(/\bhavent\b/gi, "haven't");
  cleaned = cleaned.replace(/\bdidnt\b/gi, "didn't");

  return cleaned;
};

/**
 * Format a name properly - capitalize each word
 */
export const formatName = (name: string | null | undefined): string => {
  if (!name) return "";

  return name
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

/**
 * Capitalize the first letter of a string
 */
export const capitalizeFirst = (text: string | null | undefined): string => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};
