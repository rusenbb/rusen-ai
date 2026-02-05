"use client";

import styles from "./cv.module.css";

const experience = [
  {
    role: "Founder",
    company: "Fiction Studios",
    period: "10/2025 — Present",
    location: "Ankara, TR",
    description:
      "Founded an AI lab working on natural language, speech and LLM technologies to democratize AI systems for humanity.",
    link: "https://fictionstudios.ai",
  },
  {
    role: "Junior AI Engineer",
    company: "CyberQuote",
    period: "03/2025 — 07/2025",
    location: "Istanbul, TR",
    description:
      "Built AI automations and agentic LLM implementations for Phillip Capital subsidiary. Intelligent systems for operations and customer-facing platforms.",
    link: "https://cyberquote.com/tk/",
  },
  {
    role: "NLP Research Intern",
    company: "ITU NLP Lab",
    period: "07/2024 — 08/2024",
    location: "Istanbul, TR",
    description:
      "Researched LLMs for financial applications: forecasting, sentiment analysis, tool usage, reasoning, and RAG implementations.",
    link: "https://nlp.itu.edu.tr/",
  },
  {
    role: "AIOps Research Intern",
    company: "Havelsan",
    period: "08/2024 — 09/2024",
    location: "Istanbul, TR",
    description:
      "AIOps research using software log data for predictive maintenance. Generated demos on HDFS logs.",
    link: "https://havelsan.com/tr",
  },
];

const projects = [
  {
    title: "Tobor",
    subtitle: "Amazon Warehouse Robot",
    period: "2024 — 2025",
    description:
      "Autonomous warehouse robot simulating Amazon logistics. Pathfinding, obstacle avoidance, task scheduling. Human/cargo detection with custom YOLO.",
    tags: ["Python", "ROS2", "YOLO", "Robotics"],
    links: [
      { label: "GH", url: "https://github.com/rusenbb/Amazon-Warehouse-Robot" },
      { label: "▶", url: "https://youtu.be/h-Jxs_y9kNA" },
    ],
  },
  {
    title: "Biting The Bytes",
    subtitle: "Turkish Diacritic Restoration",
    period: "2024",
    description:
      "T5-based transformer for restoring Turkish diacritics. Automatically adds accent marks and special characters for enhanced readability.",
    tags: ["NLP", "T5", "Transformers", "Turkish"],
    links: [
      { label: "GH", url: "https://github.com/rusenbb/Biting-The-Bytes" },
      { label: "HF", url: "https://huggingface.co/spaces/rusen/diacritizeTR" },
    ],
  },
  {
    title: "AIZheimer",
    subtitle: "Machine Unlearning on SD",
    period: "2024",
    description:
      "Selectively removed concepts from Stable Diffusion 2.1 while preserving other capabilities. Content moderation and AI output customization.",
    tags: ["Stable Diffusion", "Unlearning", "CV"],
    links: [{ label: "GH", url: "https://github.com/rusenbb/AIzheimer" }],
  },
  {
    title: "To-AI-or-Not-to-AI",
    subtitle: "GPT Detector",
    period: "2023",
    description:
      "Ensemble method to detect AI-generated text using three fine-tuned models. Addresses academic integrity and misinformation concerns.",
    tags: ["NLP", "Ensemble", "Classification"],
    links: [
      { label: "GH", url: "https://github.com/rusenbb/To-AI-or-Not-to-AI" },
      { label: "HF", url: "https://huggingface.co/spaces/rusen/gpt_detector" },
    ],
  },
  {
    title: "Anime Recommender",
    subtitle: "Collaborative Filtering",
    period: "2022 — 2023",
    description:
      "Personalized anime recommendations combining collaborative filtering and content-based approaches. RMSE: 0.289, MAE: 0.213.",
    tags: ["RecSys", "Matrix Factorization"],
    links: [{ label: "GH", url: "https://github.com/rusenbb/Anime-Recommender" }],
  },
];

const education = [
  {
    degree: "M.Sc. Computer Engineering (Thesis)",
    school: "Middle East Technical University",
    period: "2025 — Present",
  },
  {
    degree: "B.Sc. AI and Data Engineering",
    school: "Istanbul Technical University",
    period: "2022 — 2025",
    gpa: "3.61 / 4.00",
  },
  {
    degree: "B.Sc. Electronics & Communication",
    school: "Istanbul Technical University",
    period: "2020 — 2022",
    note: "Transferred to AI & Data Engineering",
  },
];

const interests = [
  { title: "Coffee", desc: "V60 • Aeropress • Moka Pot" },
  { title: "Books", desc: "Philosophy • AI/CS • Finance" },
  { title: "Anime & Manga", desc: "Watcher • Reader • Collector" },
  { title: "Fitness", desc: "Lifting • Running • Calisthenics" },
];

export default function CVPage() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.container}>
      {/* Grid Background */}
      <div className={styles.gridBg} />

      {/* Header / Identity Card */}
      <header className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.heroNameSection}>
            <span className={styles.heroLabel}>IDENTITY</span>
            <h1 className={styles.heroName}>RUSEN BIRBEN</h1>
            <div className={styles.heroRole}>
              <span className={styles.roleIndicator}>►</span>
              AI & DATA ENGINEER
            </div>
          </div>
          <div className={styles.heroMeta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>LOC</span>
              <span className={styles.metaValue}>ANKARA, TR</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>STATUS</span>
              <span className={styles.metaValue}>AVAILABLE</span>
            </div>
          </div>
        </div>
        
        <div className={styles.heroBio}>
          <p>
            AI & Data Engineering graduate from Istanbul Technical University. 
            Building intelligent systems with NLP, LLMs, and agentic AI applications.
          </p>
        </div>

        <div className={styles.heroLinks}>
          <a href="https://github.com/rusenbb" target="_blank" rel="noopener noreferrer" className={styles.linkBtn}>
            <span className={styles.linkArrow}>→</span> GITHUB
          </a>
          <a href="https://linkedin.com/in/rusenbirben" target="_blank" rel="noopener noreferrer" className={styles.linkBtn}>
            <span className={styles.linkArrow}>→</span> LINKEDIN
          </a>
          <a href="mailto:contact@rusen.ai" className={styles.linkBtn}>
            <span className={styles.linkArrow}>→</span> EMAIL
          </a>
          <button onClick={handlePrint} className={styles.printBtn}>
            <span className={styles.linkArrow}>↓</span> PDF
          </button>
        </div>
      </header>

      {/* Section 01: Experience */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNumber}>01</span>
          <h2 className={styles.sectionTitle}>EXPERIENCE</h2>
          <div className={styles.sectionLine} />
        </div>
        
        <div className={styles.timeline}>
          {experience.map((item, index) => (
            <div key={index} className={styles.timelineItem}>
              <div className={styles.timelineMarker}>
                <div className={styles.markerDot} />
                {index !== experience.length - 1 && <div className={styles.markerLine} />}
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

      {/* Section 02: Projects */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNumber}>02</span>
          <h2 className={styles.sectionTitle}>PROJECTS</h2>
          <div className={styles.sectionLine} />
        </div>
        
        <div className={styles.projectsGrid}>
          {projects.map((project, index) => (
            <div key={index} className={styles.projectCard}>
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
                    key={link.label}
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

      {/* Section 03: Education */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNumber}>03</span>
          <h2 className={styles.sectionTitle}>EDUCATION</h2>
          <div className={styles.sectionLine} />
        </div>
        
        <div className={styles.educationList}>
          {education.map((item, index) => (
            <div key={index} className={styles.educationCard}>
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

      {/* Section 04: Interests */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNumber}>04</span>
          <h2 className={styles.sectionTitle}>INTERESTS</h2>
          <div className={styles.sectionLine} />
        </div>
        
        <div className={styles.interestsGrid}>
          {interests.map((item, index) => (
            <div key={index} className={styles.interestCard}>
              <div className={styles.interestIcon}>{["☕", "📚", "📺", "💪"][index]}</div>
              <div className={styles.interestContent}>
                <h4 className={styles.interestTitle}>{item.title}</h4>
                <p className={styles.interestDesc}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer / Contact Bar */}
      <footer className={styles.footer}>
        <div className={styles.footerLine} />
        <div className={styles.footerContent}>
          <span className={styles.footerText}>RUSEN.AI / CV / 2025</span>
          <div className={styles.footerLinks}>
            <a href="https://rusen.ai" className={styles.footerLink}>rusen.ai</a>
            <span className={styles.footerDivider}>│</span>
            <a href="mailto:contact@rusen.ai" className={styles.footerLink}>contact@rusen.ai</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
