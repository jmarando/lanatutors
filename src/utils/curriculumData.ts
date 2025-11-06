export interface CurriculumLevel {
  level: string;
  years: string;
  subjects: string[];
}

export interface CurriculumData {
  [curriculum: string]: CurriculumLevel[];
}

export const CURRICULUM_DATA: CurriculumData = {
  "8-4-4": [
    {
      level: "Form 3",
      years: "Form 3",
      subjects: [
        "Mathematics",
        "English",
        "Kiswahili",
        "Biology",
        "Chemistry",
        "Physics",
        "History & Government",
        "Geography",
        "CRE",
        "IRE",
        "HRE",
        "Business Studies",
        "Agriculture",
        "Home Science",
        "Computer Studies",
        "French",
        "German",
        "Arabic",
        "Music",
        "Art & Design"
      ]
    },
    {
      level: "Form 4",
      years: "Form 4",
      subjects: [
        "Mathematics",
        "English",
        "Kiswahili",
        "Biology",
        "Chemistry",
        "Physics",
        "History & Government",
        "Geography",
        "CRE",
        "IRE",
        "HRE",
        "Business Studies",
        "Agriculture",
        "Home Science",
        "Computer Studies",
        "French",
        "German",
        "Arabic",
        "Music",
        "Art & Design"
      ]
    }
  ],
  "CBC": [
    {
      level: "Early Years / Pre-Primary",
      years: "PP1 and PP2",
      subjects: [
        "Language Activities",
        "Mathematical Activities",
        "Environmental Activities",
        "Psychomotor & Creative Activities",
        "Religious Education Activities",
        "Social & Emotional Learning"
      ]
    },
    {
      level: "Lower Primary",
      years: "Grade 1-3",
      subjects: [
        "English Language Activities",
        "Kiswahili",
        "Kenya Sign Language",
        "Indigenous Language",
        "Literacy",
        "Numeracy & Mathematics",
        "Environmental Activities",
        "Religious Education",
        "Movement & Creative Activities",
        "Hygiene & Nutrition Activities",
        "Foundational ICT"
      ]
    },
    {
      level: "Upper Primary",
      years: "Grade 4-6",
      subjects: [
        "English",
        "Kiswahili",
        "Sign Language",
        "Indigenous Languages",
        "Mathematics",
        "Science & Technology",
        "Home Science",
        "Agriculture",
        "Religious Education",
        "Creative Arts",
        "Physical & Health Education",
        "Social Studies",
        "Foundational ICT",
        "Arabic",
        "French",
        "German",
        "Mandarin"
      ]
    },
    {
      level: "Junior Secondary",
      years: "Grade 7-9",
      subjects: [
        "English",
        "Kiswahili",
        "Kenya Sign Language",
        "Mathematics",
        "Integrated Science",
        "Social Studies",
        "Religious & Moral Education",
        "Creative Arts & Sports",
        "Pre-Technical Studies",
        "Pre-Vocational Studies",
        "ICT",
        "Digital Literacy",
        "Agriculture",
        "Home Science",
        "Career Guidance",
        "Life Skills"
      ]
    },
    {
      level: "Senior Secondary",
      years: "Grade 10-12",
      subjects: [
        "English",
        "Kiswahili",
        "Kenya Sign Language",
        "Core Mathematics",
        "Essential Mathematics",
        "Community Service Learning",
        "Physical Education",
        "Biology",
        "Chemistry",
        "Physics",
        "Computer Studies",
        "Agriculture",
        "Aviation",
        "Construction",
        "Electrical Technology",
        "Manufacturing",
        "History",
        "Geography",
        "Business Studies",
        "Religious Education",
        "Sociology",
        "Psychology",
        "Law",
        "Media Studies",
        "Music",
        "Visual Arts",
        "Dance",
        "Theatre & Film",
        "Fashion & Design"
      ]
    }
  ],
  "British Curriculum": [
    {
      level: "Key Stage 1",
      years: "Years 1-2",
      subjects: [
        "English",
        "Mathematics",
        "Science",
        "History",
        "Geography",
        "Art & Design",
        "Music",
        "Physical Education",
        "Computing"
      ]
    },
    {
      level: "Key Stage 2",
      years: "Years 3-6",
      subjects: [
        "English",
        "Mathematics",
        "Science",
        "History",
        "Geography",
        "Art & Design",
        "Music",
        "Physical Education",
        "Computing",
        "Foreign Languages"
      ]
    },
    {
      level: "Key Stage 3",
      years: "Years 7-9",
      subjects: [
        "English",
        "Mathematics",
        "Science",
        "History",
        "Geography",
        "Art & Design",
        "Music",
        "Physical Education",
        "Computing",
        "Foreign Languages"
      ]
    },
    {
      level: "IGCSE",
      years: "Years 10-11",
      subjects: [
        "English Language",
        "English Literature",
        "Mathematics",
        "Biology",
        "Chemistry",
        "Physics",
        "History",
        "Geography",
        "Business Studies",
        "Economics",
        "ICT",
        "Art & Design",
        "Physical Education",
        "Foreign Languages",
        "Religious Studies"
      ]
    },
    {
      level: "A-Levels",
      years: "Years 12-13",
      subjects: [
        "Mathematics",
        "Biology",
        "Chemistry",
        "Physics",
        "English Literature",
        "History",
        "Geography",
        "Economics",
        "Business Studies",
        "Computer Science",
        "Psychology",
        "Art & Design",
        "Sociology",
        "Law",
        "Media Studies",
        "Foreign Languages",
        "Philosophy",
        "Politics"
      ]
    }
  ],
  "IB": [
    {
      level: "Primary Years Programme (PYP)",
      years: "PYP Early Years - Primary",
      subjects: [
        "Language & Literature",
        "Mathematics",
        "Science",
        "Social Studies",
        "Arts",
        "Personal, Social & Physical Education",
        "French",
        "Spanish",
        "German",
        "Mandarin",
        "Japanese",
        "Italian",
        "Arabic"
      ]
    },
    {
      level: "Middle Years Programme (MYP)",
      years: "MYP Years 1-5",
      subjects: [
        "Language & Literature",
        "Language Acquisition",
        "Individuals & Societies",
        "Sciences",
        "Mathematics",
        "Arts",
        "Design",
        "Physical & Health Education"
      ]
    },
    {
      level: "Diploma Programme (DP)",
      years: "DP1 and DP2",
      subjects: [
        "Studies in Language & Literature",
        "French",
        "Spanish",
        "Swahili",
        "History",
        "Economics",
        "Business Management",
        "Psychology",
        "Biology",
        "Chemistry",
        "Physics",
        "Environmental Systems",
        "Mathematics AA",
        "Mathematics AI",
        "Visual Arts",
        "Music",
        "Theatre"
      ]
    }
  ],
  "American": [
    {
      level: "Elementary",
      years: "Grades 1-5",
      subjects: [
        "English Language Arts",
        "Mathematics",
        "Science",
        "Social Studies",
        "Art",
        "Music",
        "PE",
        "Computing"
      ]
    },
    {
      level: "Middle School",
      years: "Grades 6-8",
      subjects: [
        "English",
        "Math",
        "Science",
        "Social Studies",
        "Foreign Languages",
        "PE",
        "Technology"
      ]
    },
    {
      level: "High School",
      years: "Grades 9-12",
      subjects: [
        "English",
        "Algebra",
        "Geometry",
        "Pre-Calculus",
        "Biology",
        "Chemistry",
        "Physics",
        "US History",
        "World History",
        "Government",
        "Economics",
        "Foreign Languages",
        "Computer Science",
        "SAT Prep",
        "AP Prep"
      ]
    }
  ],
  "AP": [
    {
      level: "Advanced Placement",
      years: "Grades 11-12",
      subjects: [
        "AP Biology",
        "AP Chemistry",
        "AP Physics",
        "AP Calculus AB",
        "AP Calculus BC",
        "AP Statistics",
        "AP English Literature",
        "AP US History",
        "AP World History",
        "AP Human Geography",
        "AP Environmental Science",
        "AP Computer Science",
        "AP Psychology",
        "AP Foreign Languages"
      ]
    }
  ]
};

export const getCurriculums = () => Object.keys(CURRICULUM_DATA);

export const getLevelsForCurriculum = (curriculum: string) => {
  return CURRICULUM_DATA[curriculum]?.map(level => ({
    value: level.level,
    label: `${level.level} (${level.years})`
  })) || [];
};

export const getSubjectsForCurriculumLevel = (curriculum: string, level: string) => {
  const curriculumData = CURRICULUM_DATA[curriculum];
  if (!curriculumData) return [];
  
  const levelData = curriculumData.find(l => l.level === level);
  return levelData?.subjects || [];
};

export const getAllSubjects = () => {
  const allSubjects = new Set<string>();
  
  Object.values(CURRICULUM_DATA).forEach(levels => {
    levels.forEach(level => {
      level.subjects.forEach(subject => {
        allSubjects.add(subject);
      });
    });
  });
  
  return Array.from(allSubjects).sort();
};
