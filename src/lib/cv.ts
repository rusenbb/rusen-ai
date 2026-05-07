import rawCvData from "@/content/cv.json";

export type CVLink = {
  label: string;
  url: string;
};

export type CVExperienceItem = {
  role: string;
  company: string;
  period: string;
  location: string;
  description: string;
  link?: string;
};

export type CVProjectItem = {
  title: string;
  subtitle: string;
  period: string;
  description: string;
  tags: string[];
  links: CVLink[];
};

export type CVEducationItem = {
  degree: string;
  school: string;
  period: string;
  gpa?: string;
  note?: string;
};

export type CVInterestItem = {
  title: string;
  desc: string;
  icon: string;
};

export type CVCourseItem = {
  title: string;
  issuer: string;
  url?: string;
  summary: string;
};

export type CVAwardItem = {
  title: string;
  issuer: string;
  period?: string;
  summary: string;
};

export type CVLanguageItem = {
  name: string;
  level: string;
};

export type CVSkills = Record<string, string[]>;

export type CVData = {
  basics: {
    name: string;
    role: string;
    location: string;
    locationLong: string;
    status: string;
    email: string;
    phone: string;
    birthday: string;
    drivingLicense: string;
    website: string;
    websiteUrl: string;
    linkedin: string;
    linkedinUrl: string;
    github: string;
    githubUrl: string;
    summary: string;
    printSummary: string;
    footerNote: string;
  };
  heroLinks: CVLink[];
  experience: CVExperienceItem[];
  projects: CVProjectItem[];
  education: CVEducationItem[];
  interests: CVInterestItem[];
  courses: CVCourseItem[];
  awards: CVAwardItem[];
  languages: CVLanguageItem[];
  skills: CVSkills;
};

export const cvData = rawCvData as CVData;

export function getCvData(): CVData {
  return cvData;
}
