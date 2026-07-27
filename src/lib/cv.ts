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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireStringFields(
  value: unknown,
  fields: readonly string[],
  context: string,
): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${context} must be an object`);
  for (const field of fields) {
    if (typeof value[field] !== "string" || !(value[field] as string).trim()) {
      throw new Error(`${context}.${field} must be a non-empty string`);
    }
  }
  return value;
}

function requireObjectArray(
  value: unknown,
  fields: readonly string[],
  context: string,
): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error(`${context} must be an array`);
  return value.map((entry, index) =>
    requireStringFields(entry, fields, `${context}[${index}]`),
  );
}

function parseCvData(value: unknown, locale: CVLocale): CVData {
  if (!isRecord(value)) throw new Error(`CV ${locale} must contain an object`);
  const context = `CV ${locale}`;
  requireStringFields(
    value.basics,
    [
      "name", "role", "location", "locationLong", "status", "email",
      "birthday", "drivingLicense", "website", "websiteUrl", "linkedin",
      "linkedinUrl", "github", "githubUrl", "summary", "printSummary",
      "footerNote",
    ],
    `${context}.basics`,
  );
  requireObjectArray(value.heroLinks, ["label", "url"], `${context}.heroLinks`);
  requireObjectArray(
    value.experience,
    ["role", "company", "period", "location", "description"],
    `${context}.experience`,
  );
  const projects = requireObjectArray(
    value.projects,
    ["title", "subtitle", "period", "description"],
    `${context}.projects`,
  );
  for (const [index, project] of projects.entries()) {
    if (!Array.isArray(project.tags) || project.tags.some((tag) => typeof tag !== "string")) {
      throw new Error(`${context}.projects[${index}].tags must be a string array`);
    }
    requireObjectArray(project.links, ["label", "url"], `${context}.projects[${index}].links`);
  }
  requireObjectArray(value.education, ["degree", "school", "period"], `${context}.education`);
  requireObjectArray(value.interests, ["title", "desc", "icon"], `${context}.interests`);
  requireObjectArray(value.courses, ["title", "issuer", "summary"], `${context}.courses`);
  requireObjectArray(value.awards, ["title", "issuer", "summary"], `${context}.awards`);
  requireObjectArray(value.languages, ["name", "level"], `${context}.languages`);
  if (!isRecord(value.skills) || Object.keys(value.skills).length === 0) {
    throw new Error(`${context}.skills must be a non-empty object`);
  }
  for (const [group, entries] of Object.entries(value.skills)) {
    if (!Array.isArray(entries) || entries.some((entry) => typeof entry !== "string")) {
      throw new Error(`${context}.skills.${group} must be a string array`);
    }
  }
  return value as CVData;
}

function assertLocaleParity(data: Record<CVLocale, CVData>): void {
  const reference = data.en;
  const arrayFields = [
    "heroLinks", "experience", "projects", "education", "interests",
    "courses", "awards", "languages",
  ] as const;
  for (const locale of ["tr", "ja"] as const) {
    for (const field of arrayFields) {
      if (data[locale][field].length !== reference[field].length) {
        throw new Error(`CV ${locale}.${field} must match the English item count`);
      }
    }
    const expectedSkillSizes = Object.values(reference.skills).map((items) => items.length);
    const actualSkillSizes = Object.values(data[locale].skills).map((items) => items.length);
    if (JSON.stringify(actualSkillSizes) !== JSON.stringify(expectedSkillSizes)) {
      throw new Error(`CV ${locale}.skills must match the English group structure`);
    }
  }
}

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
  en: parseCvData(rawCvDataEn, "en"),
  tr: parseCvData(rawCvDataTr, "tr"),
  ja: parseCvData(rawCvDataJa, "ja"),
};

assertLocaleParity(DATA_BY_LOCALE);

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
