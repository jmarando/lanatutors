// The tutor cards on /tutors, built from rows of the get_public_tutor_profiles database function (plus pricing tiers
// when they are loaded). The page and the build-time prerender (src/entry-prerender.tsx) both use this, so the HTML
// crawlers read and the browser's first render show the same cards.

export interface PublicTutorRow {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  profile_slug?: string | null;
  subjects?: string[] | null;
  curriculum?: string[] | null;
  teaching_levels?: string[] | null;
  teaching_location?: string | null;
  teaching_mode?: string[] | null;
  current_institution?: string | null;
  display_institution?: boolean | null;
  experience_years?: number | null;
  rating?: number | string | null;
  total_reviews?: number | null;
  hourly_rate?: number | string | null;
  gender?: string | null;
}

export interface PricingTierRow {
  tutor_id: string;
  online_hourly_rate?: number | string | null;
}

export interface PublicTutor {
  id: string;
  name: string;
  photo: string;
  photoUrl: string | null;
  profileSlug: string | null;
  subjects: string[];
  curriculum: string[];
  teachingLevels: string[];
  teachingLocation: string;
  teachingMode: string[];
  /** Empty unless the tutor chose to display their school. */
  school: string;
  displayInstitution: boolean;
  experienceYears: number;
  rating: number;
  reviews: number;
  hourlyRate: number;
  hourlyRateMax: number;
  hasTiers: boolean;
  gender: string | null;
}

export function toPublicTutors(rows: PublicTutorRow[], tiers: PricingTierRow[] = []): PublicTutor[] {
  const tiersByTutor = new Map<string, PricingTierRow[]>();
  for (const tier of tiers) {
    const list = tiersByTutor.get(tier.tutor_id) ?? [];
    list.push(tier);
    tiersByTutor.set(tier.tutor_id, list);
  }

  return rows.map((tp) => {
    const name = tp.full_name || "Tutor";
    const tutorTiers = tiersByTutor.get(tp.id) ?? [];
    const tierRates = tutorTiers.map((tier) => Number(tier.online_hourly_rate) || 0).filter((rate) => rate > 0);
    const hourlyRate = tierRates.length ? Math.min(...tierRates) : Number(tp.hourly_rate) || 2500;
    const hourlyRateMax = tierRates.length ? Math.max(...tierRates) : hourlyRate;

    return {
      id: tp.id,
      name,
      photo: name.split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2),
      // Only real uploaded photos, never stock pictures.
      photoUrl: tp.avatar_url || null,
      profileSlug: tp.profile_slug || null,
      subjects: tp.subjects || [],
      curriculum: tp.curriculum || [],
      teachingLevels: tp.teaching_levels || [],
      teachingLocation: tp.teaching_location || "",
      teachingMode: tp.teaching_mode || [],
      school: tp.display_institution ? tp.current_institution || "" : "",
      displayInstitution: tp.display_institution || false,
      experienceYears: tp.experience_years || 0,
      rating: Number(tp.rating) || 0,
      reviews: tp.total_reviews || 0,
      hourlyRate,
      hourlyRateMax,
      hasTiers: tutorTiers.length > 0,
      gender: tp.gender || null,
    };
  });
}
