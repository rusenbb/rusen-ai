"use client";

import styles from "./cv.module.css";

const experience = [
  {
    role: "Founder",
    company: "Fiction Studios",
    period: "10/2025 - Present",
    location: "Ankara, Turkiye",
    description:
      "Founded an AI labs working on natural language, speech and LLM technologies to democratize the use of AI systems for all humanity.",
    link: "https://fictionstudios.ai",
  },
  {
    role: "Junior AI Engineer",
    company: "CyberQuote",
    period: "03/2025 - 07/2025",
    location: "Istanbul, Turkiye",
    description:
      "Worked on AI automations and agentic LLM implementations for Phillip Capital subsidiary. Built intelligent systems for internal operations and customer-facing websites.",
  },
  {
    role: "NLP Research Intern",
    company: "ITU NLP Lab",
    period: "07/2024 - 08/2024",
    location: "Istanbul, Turkiye",
    description:
      "Researched LLMs for financial applications including forecasting, sentiment analysis, tool usage, financial reasoning, and RAG implementations.",
  },
  {
    role: "AIOps Research Intern",
    company: "Havelsan",
    period: "08/2024 - 09/2024",
    location: "Istanbul, Turkiye",
    description:
      "Conducted research for AIOps project using software log data for predictive maintenance. Generated demos on HDFS logs.",
  },
];

const projects = [
  {
    title: "Tobor - Amazon Warehouse Robot",
    period: "09/2024 - 01/2025",
    description:
      "Developed an autonomous warehouse robot system simulating Amazon's logistics operations. Designed pathfinding, obstacle avoidance, and task scheduling algorithms. The robot detects humans and cargo boxes with a custom-trained YOLO model.",
    tags: ["Python", "ROS2", "YOLO", "Robotics"],
    links: [
      { label: "GitHub", url: "https://github.com/rusenbb/Amazon-Warehouse-Robot" },
      { label: "Video", url: "https://youtu.be/h-Jxs_y9kNA" },
    ],
  },
  {
    title: "Biting The Bytes - Turkish Diacritic Restoration",
    period: "03/2024 - 06/2024",
    description:
      "Improved Turkish text by automatically adding missing accent marks and special characters using T5, a transformer model by Google. The system restores proper diacritics for enhanced readability.",
    tags: ["NLP", "T5", "Transformers", "Turkish"],
    links: [
      { label: "GitHub", url: "https://github.com/rusenbb/Biting-The-Bytes" },
      { label: "Demo", url: "https://huggingface.co/spaces/rusen/diacritizeTR" },
    ],
  },
  {
    title: "AIZheimer - Machine Unlearning on Stable Diffusion",
    period: "03/2024 - 06/2024",
    description:
      "Selectively removed specific concepts from Stable Diffusion 2.1 while keeping other capabilities intact. Useful for content moderation and customizing AI output.",
    tags: ["Stable Diffusion", "Machine Unlearning", "Computer Vision"],
    links: [{ label: "GitHub", url: "https://github.com/rusenbb/AIzheimer" }],
  },
  {
    title: "To-AI-or-Not-to-AI - GPT Detector",
    period: "03/2023 - 06/2023",
    description:
      "Developed an ensemble method to detect AI-generated text using three fine-tuned models. Addresses concerns about academic integrity and misinformation.",
    tags: ["NLP", "Ensemble Learning", "Classification"],
    links: [
      { label: "GitHub", url: "https://github.com/rusenbb/To-AI-or-Not-to-AI" },
      { label: "Demo", url: "https://huggingface.co/spaces/rusen/gpt_detector" },
    ],
  },
  {
    title: "Anime Recommender",
    period: "09/2022 - 02/2023",
    description:
      "Created a personalized anime recommendation system combining collaborative filtering and content-based approaches. Achieved RMSE of 0.289, MAE of 0.213 on the test set.",
    tags: ["Recommender Systems", "Matrix Factorization", "Python"],
    links: [{ label: "GitHub", url: "https://github.com/rusenbb/Anime-Recommender" }],
  },
];

const education = [
  {
    degree: "B.Sc. in AI and Data Engineering",
    school: "Istanbul Technical University",
    period: "09/2022 - 07/2025",
    gpa: "3.61",
  },
  {
    degree: "B.Sc. in Electronics and Communication Engineering",
    school: "Istanbul Technical University",
    period: "09/2020 - 09/2022",
    note: "Transferred to AI and Data Engineering",
  },
];

const interests = [
  {
    title: "Coffee",
    description: "Specialty coffee enthusiast with V60, Aeropress, and Moka Pot setup",
  },
  {
    title: "Books",
    description: "Philosophy, AI/CS, and finance",
  },
  {
    title: "Anime & Manga",
    description: "Avid watcher and reader",
  },
];

export default function CVPage() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 className={styles.name}>Rusen Birben</h1>
            <p className={styles.title}>AI & Data Engineer</p>
            <p className={styles.location}>Ankara, Turkiye</p>
          </div>
          <button onClick={handlePrint} className={styles.printButton} aria-label="Download as PDF">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PDF
          </button>
        </div>
        <p className={styles.bio}>
          AI & Data Engineering graduate from Istanbul Technical University, passionate about NLP,
          LLMs, and building intelligent systems. Currently working on agentic AI applications.
        </p>
        <div className={styles.links}>
          <a
            href="https://github.com/rusenbb"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            GitHub
          </a>
          <a
            href="https://linkedin.com/in/rusenbirben"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            LinkedIn
          </a>
          <a href="mailto:contact@rusen.ai" className={styles.link}>
            contact@rusen.ai
          </a>
        </div>
      </header>

      {/* Experience */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Experience</h2>
        {experience.map((item, index) => (
          <div key={index} className={styles.experienceItem}>
            <div className={styles.experienceHeader}>
              <span className={styles.role}>{item.role}</span>
              <span className={styles.period}>{item.period}</span>
            </div>
            <p className={styles.company}>
              {item.link ? (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  {item.company}
                </a>
              ) : (
                item.company
              )}{" "}
              · {item.location}
            </p>
            <p className={styles.description}>{item.description}</p>
          </div>
        ))}
      </section>

      {/* Projects */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Projects</h2>
        {projects.map((project, index) => (
          <div key={index} className={styles.projectItem}>
            <div className={styles.projectHeader}>
              <span className={styles.projectTitle}>{project.title}</span>
              <span className={styles.period}>{project.period}</span>
            </div>
            <p className={styles.description}>{project.description}</p>
            <div className={styles.tags}>
              {project.tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                </span>
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
      </section>

      {/* Education */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Education</h2>
        {education.map((item, index) => (
          <div key={index} className={styles.educationItem}>
            <div className={styles.experienceHeader}>
              <span className={styles.degree}>{item.degree}</span>
              <span className={styles.period}>{item.period}</span>
            </div>
            <p className={styles.school}>{item.school}</p>
            {item.gpa && <p className={styles.gpa}>GPA: {item.gpa}</p>}
            {item.note && <p className={styles.note}>{item.note}</p>}
          </div>
        ))}
      </section>

      {/* Interests */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Interests</h2>
        <div className={styles.interestsGrid}>
          {interests.map((interest, index) => (
            <div key={index} className={styles.interestItem}>
              <p className={styles.interestTitle}>{interest.title}</p>
              <p className={styles.interestDescription}>{interest.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
