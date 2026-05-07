import { getCvData } from "@/lib/cv";
import styles from "./cv.module.css";

const cv = getCvData();

export default function CVPage() {
  return (
    <div className={styles.container}>
      <div className={styles.gridBg} />

      <header className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.heroNameSection}>
            <span className={styles.heroLabel}>IDENTITY</span>
            <h1 className={styles.heroName}>{cv.basics.name}</h1>
            <div className={styles.heroRole}>
              <span className={styles.roleIndicator}>►</span>
              {cv.basics.role.toUpperCase()}
            </div>
          </div>
          <div className={styles.heroMeta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>LOC</span>
              <span className={styles.metaValue}>{cv.basics.location}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>STATUS</span>
              <span className={styles.metaValue}>{cv.basics.status}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>PHONE</span>
              <span className={styles.metaValue}>{cv.basics.phone}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>DOB</span>
              <span className={styles.metaValue}>{cv.basics.birthday}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>LIC</span>
              <span className={styles.metaValue}>{cv.basics.drivingLicense}</span>
            </div>
          </div>
        </div>

        <div className={styles.heroBio}>
          <p>{cv.basics.summary}</p>
        </div>

        <div className={styles.heroLinks}>
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
          <a href="/cv.pdf" download className={styles.printBtn}>
            <span className={styles.linkArrow}>↓</span>
            PDF
          </a>
          <a href="/cv.tex" download className={styles.printBtn}>
            <span className={styles.linkArrow}>↓</span>
            TEX
          </a>
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNumber}>01</span>
          <h2 className={styles.sectionTitle}>EXPERIENCE</h2>
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
          <h2 className={styles.sectionTitle}>PROJECTS</h2>
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
          <h2 className={styles.sectionTitle}>EDUCATION</h2>
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
                  {item.gpa && <span className={styles.eduGpa}>GPA: {item.gpa}</span>}
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
          <h2 className={styles.sectionTitle}>AWARDS</h2>
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
          <h2 className={styles.sectionTitle}>COURSES</h2>
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
          <h2 className={styles.sectionTitle}>LANGUAGES</h2>
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
          <h2 className={styles.sectionTitle}>INTERESTS</h2>
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
          <span className={styles.footerText}>RUSEN.AI / CV / 2026</span>
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
