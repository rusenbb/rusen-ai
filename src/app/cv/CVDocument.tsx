"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  type CVData,
  type CVLabels,
  type CVLocale,
  SUPPORTED_CV_LOCALES,
} from "@/lib/cv";
import styles from "./cv.module.css";

type CVDocumentProps = {
  cv: CVData;
  labels: CVLabels;
  locale: CVLocale;
  /** PDF/TEX file basenames (no extension). EN -> "cv", TR -> "cv.tr", JA -> "cv.ja". */
  outputBase: string;
};

type OpenMenu = "language" | "download" | null;

export default function CVDocument({ cv, labels, locale, outputBase }: CVDocumentProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const menusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const onPointer = (e: MouseEvent) => {
      if (!menusRef.current) return;
      if (!menusRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  const currentLocale = SUPPORTED_CV_LOCALES.find((l) => l.locale === locale);
  const showDownload = currentLocale?.hasPdf ?? true;

  return (
    <div className={styles.container}>
      <div className={styles.gridBg} />

      <header className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.heroNameSection}>
            <span className={styles.heroLabel}>{labels.identity}</span>
            <h1 className={styles.heroName}>{cv.basics.name}</h1>
            <div className={styles.heroRole}>
              <span className={styles.roleIndicator}>►</span>
              {cv.basics.role.toUpperCase()}
            </div>
          </div>
          <div className={styles.heroMeta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>{labels.loc}</span>
              <span className={styles.metaValue}>{cv.basics.location}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>{labels.status}</span>
              <span className={styles.metaValue}>{cv.basics.status}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>{labels.dob}</span>
              <span className={styles.metaValue}>{cv.basics.birthday}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>{labels.lic}</span>
              <span className={styles.metaValue}>{cv.basics.drivingLicense}</span>
            </div>
          </div>
        </div>

        <div className={styles.heroBio}>
          <p>{cv.basics.summary}</p>
        </div>

        <div className={styles.heroLinks} ref={menusRef}>
          {cv.heroLinks.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target={link.url.startsWith("mailto:") ? undefined : "_blank"}
              rel={link.url.startsWith("mailto:") ? undefined : "noopener noreferrer"}
              className={styles.linkBtn}
            >
              <span className={styles.linkArrow}>→</span> {link.label.toUpperCase()}
            </a>
          ))}

          {/* Download dropdown (PDF / TeX) — hidden for locales without artifacts. */}
          {showDownload && (
            <div className={styles.dropdown}>
              <button
                type="button"
                className={`${styles.printBtn} ${styles.dropdownTrigger}`}
                aria-haspopup="menu"
                aria-expanded={openMenu === "download"}
                onClick={() =>
                  setOpenMenu((cur) => (cur === "download" ? null : "download"))
                }
              >
                <span className={styles.linkArrow}>↓</span>
                {labels.download}
                <span className={styles.dropdownCaret}>{openMenu === "download" ? "▴" : "▾"}</span>
              </button>
              {openMenu === "download" && (
                <div className={styles.dropdownPanel} role="menu">
                  <a
                    href={`/${outputBase}.pdf`}
                    download
                    className={styles.dropdownItem}
                    role="menuitem"
                    onClick={() => setOpenMenu(null)}
                  >
                    <span>{labels.pdf}</span>
                  </a>
                  <a
                    href={`/${outputBase}.tex`}
                    download
                    className={styles.dropdownItem}
                    role="menuitem"
                    onClick={() => setOpenMenu(null)}
                  >
                    <span>{labels.tex}</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Language dropdown */}
          <div className={`${styles.dropdown} ${styles.langDropdown}`}>
            <button
              type="button"
              className={`${styles.localeBtn} ${styles.dropdownTrigger}`}
              aria-haspopup="menu"
              aria-expanded={openMenu === "language"}
              onClick={() =>
                setOpenMenu((cur) => (cur === "language" ? null : "language"))
              }
              aria-label={labels.language}
            >
              {currentLocale?.label ?? labels.language}
              <span className={styles.dropdownCaret}>{openMenu === "language" ? "▴" : "▾"}</span>
            </button>
            {openMenu === "language" && (
              <div className={styles.dropdownPanel} role="menu">
                {SUPPORTED_CV_LOCALES.map((opt) => (
                  <Link
                    key={opt.locale}
                    href={opt.href}
                    className={`${styles.dropdownItem} ${
                      opt.locale === locale ? styles.dropdownItemActive : ""
                    }`}
                    role="menuitem"
                    aria-current={opt.locale === locale ? "page" : undefined}
                    onClick={() => setOpenMenu(null)}
                  >
                    {opt.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNumber}>01</span>
          <h2 className={styles.sectionTitle}>{labels.experience}</h2>
          <div className={styles.sectionLine} />
        </div>

        <div className={styles.timeline}>
          {cv.experience.map((item, index) => (
            <div key={`${item.company}-${item.period}`} className={styles.timelineItem}>
              <div className={styles.timelineMarker}>
                <div className={styles.markerDot} />
                {index !== cv.experience.length - 1 && <div className={styles.markerLine} />}
              </div>
              <div className={styles.timelineCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleGroup}>
                    <span className={styles.cardRole}>{item.role}</span>
                    <span className={styles.cardDivider}>@</span>
                    {item.link ? (
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className={styles.cardCompanyLink}>
                        {item.company} ↗
                      </a>
                    ) : (
                      <span className={styles.cardCompany}>{item.company}</span>
                    )}
                  </div>
                  <span className={styles.cardPeriod}>{item.period}</span>
                </div>
                <div className={styles.cardLocation}>{item.location}</div>
                <p className={styles.cardDesc}>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNumber}>02</span>
          <h2 className={styles.sectionTitle}>{labels.projects}</h2>
          <div className={styles.sectionLine} />
        </div>

        <div className={styles.projectsGrid}>
          {cv.projects.map((project) => (
            <div key={`${project.title}-${project.period}`} className={styles.projectCard}>
              <div className={styles.projectCardHeader}>
                <div className={styles.projectTitleGroup}>
                  <h3 className={styles.projectTitle}>{project.title}</h3>
                  <span className={styles.projectSubtitle}>{project.subtitle}</span>
                </div>
                <span className={styles.projectPeriod}>{project.period}</span>
              </div>

              <p className={styles.projectDesc}>{project.description}</p>

              <div className={styles.projectTags}>
                {project.tags.map((tag) => (
                  <span key={tag} className={styles.projectTag}>{tag}</span>
                ))}
              </div>

              <div className={styles.projectLinks}>
                {project.links.map((link) => (
                  <a
                    key={`${project.title}-${link.label}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.projectLink}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNumber}>03</span>
          <h2 className={styles.sectionTitle}>{labels.education}</h2>
          <div className={styles.sectionLine} />
        </div>

        <div className={styles.educationList}>
          {cv.education.map((item) => (
            <div key={`${item.degree}-${item.period}`} className={styles.educationCard}>
              <div className={styles.eduHeader}>
                <div className={styles.eduMain}>
                  <h3 className={styles.eduDegree}>{item.degree}</h3>
                  <span className={styles.eduSchool}>{item.school}</span>
                </div>
                <div className={styles.eduMeta}>
                  <span className={styles.eduPeriod}>{item.period}</span>
                  {item.gpa && <span className={styles.eduGpa}>{labels.gpa}: {item.gpa}</span>}
                </div>
              </div>
              {item.note && <p className={styles.eduNote}>{item.note}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNumber}>04</span>
          <h2 className={styles.sectionTitle}>{labels.awards}</h2>
          <div className={styles.sectionLine} />
        </div>

        <div className={styles.educationList}>
          {cv.awards.map((award) => (
            <div key={award.title} className={styles.educationCard}>
              <div className={styles.eduHeader}>
                <div className={styles.eduMain}>
                  <h3 className={styles.eduDegree}>{award.title}</h3>
                  <span className={styles.eduSchool}>{award.issuer}</span>
                </div>
                {award.period && (
                  <div className={styles.eduMeta}>
                    <span className={styles.eduPeriod}>{award.period}</span>
                  </div>
                )}
              </div>
              <p className={styles.eduNote}>{award.summary}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNumber}>05</span>
          <h2 className={styles.sectionTitle}>{labels.courses}</h2>
          <div className={styles.sectionLine} />
        </div>

        <div className={styles.educationList}>
          {cv.courses.map((course) => (
            <div key={course.title} className={styles.educationCard}>
              <div className={styles.eduHeader}>
                <div className={styles.eduMain}>
                  {course.url ? (
                    <a
                      href={course.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.cardCompanyLink}
                    >
                      <h3 className={styles.eduDegree}>{course.title} ↗</h3>
                    </a>
                  ) : (
                    <h3 className={styles.eduDegree}>{course.title}</h3>
                  )}
                  <span className={styles.eduSchool}>{course.issuer}</span>
                </div>
              </div>
              <p className={styles.eduNote}>{course.summary}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNumber}>06</span>
          <h2 className={styles.sectionTitle}>{labels.languages}</h2>
          <div className={styles.sectionLine} />
        </div>

        <div className={styles.interestsGrid}>
          {cv.languages.map((lang) => (
            <div key={lang.name} className={styles.interestCard}>
              <div className={styles.interestContent}>
                <h4 className={styles.interestTitle}>{lang.name}</h4>
                <p className={styles.interestDesc}>{lang.level}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNumber}>07</span>
          <h2 className={styles.sectionTitle}>{labels.interests}</h2>
          <div className={styles.sectionLine} />
        </div>

        <div className={styles.interestsGrid}>
          {cv.interests.map((item) => (
            <div key={item.title} className={styles.interestCard}>
              <div className={styles.interestIcon}>{item.icon}</div>
              <div className={styles.interestContent}>
                <h4 className={styles.interestTitle}>{item.title}</h4>
                <p className={styles.interestDesc}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerLine} />
        <div className={styles.footerContent}>
          <span className={styles.footerText}>{labels.footerLine}</span>
          <div className={styles.footerLinks}>
            <a href={cv.basics.websiteUrl} className={styles.footerLink}>{cv.basics.website}</a>
            <span className={styles.footerDivider}>│</span>
            <a href={`mailto:${cv.basics.email}`} className={styles.footerLink}>{cv.basics.email}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
