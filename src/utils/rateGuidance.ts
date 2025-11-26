/**
 * Rate guidance utility for tutors based on curriculum, level, and teaching mode
 */

export interface RateRange {
  min: number;
  max: number;
  curriculum: string;
  level: string;
  mode: 'Online' | 'In-person';
}

// Simplified rate guidance: Two broad categories
// Category 1: CBC, 8-4-4, British Curriculum (Year 1-10) → KES 1,000 - 2,000
// Category 2: IGCSE (Year 11) and A-Levels → KES 1,500 - 3,000
const RATE_GUIDANCE: RateRange[] = [
  // CBC - All levels (Year 1-10 equivalent)
  { curriculum: 'CBC', level: 'Early Years / Pre-Primary', mode: 'Online', min: 1000, max: 2000 },
  { curriculum: 'CBC', level: 'Early Years / Pre-Primary', mode: 'In-person', min: 1000, max: 2000 },
  { curriculum: 'CBC', level: 'Lower Primary', mode: 'Online', min: 1000, max: 2000 },
  { curriculum: 'CBC', level: 'Lower Primary', mode: 'In-person', min: 1000, max: 2000 },
  { curriculum: 'CBC', level: 'Upper Primary', mode: 'Online', min: 1000, max: 2000 },
  { curriculum: 'CBC', level: 'Upper Primary', mode: 'In-person', min: 1000, max: 2000 },
  { curriculum: 'CBC', level: 'Junior Secondary', mode: 'Online', min: 1000, max: 2000 },
  { curriculum: 'CBC', level: 'Junior Secondary', mode: 'In-person', min: 1000, max: 2000 },
  { curriculum: 'CBC', level: 'Senior Secondary', mode: 'Online', min: 1000, max: 2000 },
  { curriculum: 'CBC', level: 'Senior Secondary', mode: 'In-person', min: 1000, max: 2000 },
  
  // 8-4-4 - All levels
  { curriculum: '8-4-4', level: 'Form 3', mode: 'Online', min: 1000, max: 2000 },
  { curriculum: '8-4-4', level: 'Form 3', mode: 'In-person', min: 1000, max: 2000 },
  { curriculum: '8-4-4', level: 'Form 4', mode: 'Online', min: 1000, max: 2000 },
  { curriculum: '8-4-4', level: 'Form 4', mode: 'In-person', min: 1000, max: 2000 },
  
  // British Curriculum - Year 1-10 (Key Stage 1-4)
  { curriculum: 'British Curriculum', level: 'Key Stage 1', mode: 'Online', min: 1000, max: 2000 },
  { curriculum: 'British Curriculum', level: 'Key Stage 1', mode: 'In-person', min: 1000, max: 2000 },
  { curriculum: 'British Curriculum', level: 'Key Stage 2', mode: 'Online', min: 1000, max: 2000 },
  { curriculum: 'British Curriculum', level: 'Key Stage 2', mode: 'In-person', min: 1000, max: 2000 },
  { curriculum: 'British Curriculum', level: 'Key Stage 3', mode: 'Online', min: 1000, max: 2000 },
  { curriculum: 'British Curriculum', level: 'Key Stage 3', mode: 'In-person', min: 1000, max: 2000 },
  { curriculum: 'British Curriculum', level: 'Key Stage 4', mode: 'Online', min: 1000, max: 2000 },
  { curriculum: 'British Curriculum', level: 'Key Stage 4', mode: 'In-person', min: 1000, max: 2000 },
  
  // IGCSE (Year 11) and A-Levels (Year 12-13)
  { curriculum: 'British Curriculum', level: 'IGCSE', mode: 'Online', min: 1500, max: 3000 },
  { curriculum: 'British Curriculum', level: 'IGCSE', mode: 'In-person', min: 1500, max: 3000 },
  { curriculum: 'British Curriculum', level: 'A-Levels', mode: 'Online', min: 1500, max: 3000 },
  { curriculum: 'British Curriculum', level: 'A-Levels', mode: 'In-person', min: 1500, max: 3000 },
  { curriculum: 'British Curriculum', level: 'Key Stage 5', mode: 'Online', min: 1500, max: 3000 },
  { curriculum: 'British Curriculum', level: 'Key Stage 5', mode: 'In-person', min: 1500, max: 3000 },
];

/**
 * Get rate guidance for a specific curriculum, level, and teaching mode
 */
export function getRateGuidance(
  curriculum: string,
  level: string,
  mode: 'Online' | 'In-person'
): RateRange | null {
  // Try exact match first
  let guidance = RATE_GUIDANCE.find(
    g => g.curriculum === curriculum && g.level === level && g.mode === mode
  );
  
  if (guidance) return guidance;
  
  // Try case-insensitive match
  guidance = RATE_GUIDANCE.find(
    g => g.curriculum.toLowerCase() === curriculum.toLowerCase() && 
         g.level.toLowerCase() === level.toLowerCase() && 
         g.mode === mode
  );
  
  if (guidance) return guidance;
  
  // Try partial level match (for cases like "Key Stage 1-6" matching "Key Stage 1")
  guidance = RATE_GUIDANCE.find(
    g => g.curriculum.toLowerCase() === curriculum.toLowerCase() && 
         level.toLowerCase().includes(g.level.toLowerCase()) && 
         g.mode === mode
  );
  
  return guidance || null;
}

/**
 * Get rate guidance for all selected curriculum-level combinations
 */
export function getRateGuidanceForSelections(
  curriculumLevels: { [curriculum: string]: string[] },
  teachingModes: string[]
): Map<string, { online: RateRange | null; inPerson: RateRange | null }> {
  const guidanceMap = new Map<string, { online: RateRange | null; inPerson: RateRange | null }>();
  
  const hasOnline = teachingModes.includes('Online');
  const hasInPerson = teachingModes.includes('In-person');
  
  Object.entries(curriculumLevels).forEach(([curriculum, levels]) => {
    levels.forEach(level => {
      const key = `${curriculum}-${level}`;
      guidanceMap.set(key, {
        online: hasOnline ? getRateGuidance(curriculum, level, 'Online') : null,
        inPerson: hasInPerson ? getRateGuidance(curriculum, level, 'In-person') : null,
      });
    });
  });
  
  return guidanceMap;
}

/**
 * Get suggested rate range based on curriculum-level combinations and teaching mode
 */
export function getSuggestedRateRange(
  curriculumLevels: { [curriculum: string]: string[] },
  teachingModes: string[],
  tier: 'standard' | 'advanced'
): { min: number; max: number } | null {
  const guidanceMap = getRateGuidanceForSelections(curriculumLevels, teachingModes);
  
  if (guidanceMap.size === 0) return null;
  
  let minRate = Infinity;
  let maxRate = -Infinity;
  
  guidanceMap.forEach(({ online, inPerson }) => {
    if (online) {
      minRate = Math.min(minRate, online.min);
      maxRate = Math.max(maxRate, online.max);
    }
    if (inPerson) {
      minRate = Math.min(minRate, inPerson.min);
      maxRate = Math.max(maxRate, inPerson.max);
    }
  });
  
  if (minRate === Infinity || maxRate === -Infinity) return null;
  
  // For advanced tier, use the upper range
  if (tier === 'advanced') {
    const midpoint = (minRate + maxRate) / 2;
    return { min: Math.round(midpoint), max: maxRate };
  }
  
  return { min: minRate, max: maxRate };
}

/**
 * Check if a rate is within the recommended range
 */
export function isRateInRange(
  rate: number,
  curriculum: string,
  level: string,
  mode: 'Online' | 'In-person'
): { inRange: boolean; suggestion: RateRange | null } {
  const suggestion = getRateGuidance(curriculum, level, mode);
  
  if (!suggestion) {
    return { inRange: true, suggestion: null };
  }
  
  const inRange = rate >= suggestion.min && rate <= suggestion.max;
  return { inRange, suggestion };
}

/**
 * Format rate range for display
 */
export function formatRateRange(range: RateRange | null): string {
  if (!range) return 'No guidance available';
  return `KES ${range.min.toLocaleString()} – ${range.max.toLocaleString()}`;
}
