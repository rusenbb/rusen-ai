import rawCvDataEn from "@/content/cv.json";
import rawCvDataTr from "@/content/cv.tr.json";
import rawCvDataJa from "@/content/cv.ja.json";

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
    /** Optional. Removed from the public JSON; can be supplied at render
     *  time via the --phone CLI flag for specific PDF builds. */
    phone?: string;
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

export type CVLocale = "en" | "tr" | "ja";

export type CVLabels = {
  identity: string;
  loc: string;
  status: string;
  dob: string;
  lic: string;
  pdf: string;
  tex: string;
  experience: string;
  projects: string;
  education: string;
  awards: string;
  courses: string;
  languages: string;
  interests: string;
  gpa: string;
  /** Footer year string, fully customisable per locale. */
  footerLine: string;
  /** Trigger labels for the language and download dropdowns. */
  language: string;
  download: string;
};

const LABELS_EN: CVLabels = {
  identity: "IDENTITY",
  loc: "LOC",
  status: "STATUS",
  dob: "DOB",
  lic: "LIC",
  pdf: "PDF",
  tex: "TEX",
  experience: "EXPERIENCE",
  projects: "PROJECTS",
  education: "EDUCATION",
  awards: "AWARDS",
  courses: "COURSES",
  languages: "LANGUAGES",
  interests: "INTERESTS",
  gpa: "GPA",
  footerLine: "RUSEN.AI / CV / 2026",
  language: "LANGUAGE",
  download: "DOWNLOAD",
};

const LABELS_TR: CVLabels = {
  identity: "KİMLİK",
  loc: "YER",
  status: "DURUM",
  dob: "DOĞ",
  lic: "EHL",
  pdf: "PDF",
  tex: "TEX",
  experience: "DENEYİM",
  projects: "PROJELER",
  education: "EĞİTİM",
  awards: "ÖDÜLLER",
  courses: "KURSLAR",
  languages: "DİLLER",
  interests: "İLGİ ALANLARI",
  gpa: "ORT",
  footerLine: "RUSEN.AI / ÖZGEÇMİŞ / 2026",
  language: "DİL",
  download: "İNDİR",
};

const LABELS_JA: CVLabels = {
  identity: "プロフィール",
  loc: "所在地",
  status: "状況",
  dob: "生年月日",
  lic: "免許",
  pdf: "PDF",
  tex: "TeX",
  experience: "職務経歴",
  projects: "プロジェクト",
  education: "学歴",
  awards: "受賞・表彰",
  courses: "修了コース",
  languages: "言語",
  interests: "趣味",
  gpa: "GPA",
  footerLine: "RUSEN.AI / 履歴書 / 2026",
  language: "言語",
  download: "ダウンロード",
};

const DATA_BY_LOCALE: Record<CVLocale, CVData> = {
  en: rawCvDataEn as CVData,
  tr: rawCvDataTr as CVData,
  ja: rawCvDataJa as CVData,
};

const LABELS_BY_LOCALE: Record<CVLocale, CVLabels> = {
  en: LABELS_EN,
  tr: LABELS_TR,
  ja: LABELS_JA,
};

export const cvData = DATA_BY_LOCALE.en;

export function getCvData(locale: CVLocale = "en"): CVData {
  return DATA_BY_LOCALE[locale];
}

export function getCvLabels(locale: CVLocale = "en"): CVLabels {
  return LABELS_BY_LOCALE[locale];
}

/** A locale entry. `hasPdf` gates the download dropdown. */
export const SUPPORTED_CV_LOCALES: ReadonlyArray<{
  locale: CVLocale;
  label: string;
  href: string;
  hasPdf: boolean;
}> = [
  { locale: "en", label: "EN", href: "/cv", hasPdf: true },
  { locale: "tr", label: "TR", href: "/cv/tr", hasPdf: true },
  { locale: "ja", label: "JP", href: "/cv/ja", hasPdf: true },
];
