import type { ReactNode } from "react";
import styles from "./bulletin.module.css";

export type BulletinLink = {
  label: string;
  url: string;
};

type BulletinPageProps = {
  title: string;
  subtitle: string;
  status?: string;
  platform?: string[];
  tech: string[];
  links: BulletinLink[];
  children: ReactNode;
};

export default function BulletinPage({
  title,
  subtitle,
  status,
  platform,
  tech,
  links,
  children,
}: BulletinPageProps) {
  return (
    <div className={styles.container}>
      <header className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.heroTitleSection}>
            <span className={styles.heroLabel}>PROJECT</span>
            <h1 className={styles.heroTitle}>{title}</h1>
            <div className={styles.heroSubtitle}>
              <span className={styles.subtitleIndicator} aria-hidden="true" />
              {subtitle}
            </div>
          </div>
          <div className={styles.heroMeta}>
            {status && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>STATUS</span>
                <span className={styles.metaValue}>{status}</span>
              </div>
            )}
            {platform && platform.length > 0 && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>PLATFORM</span>
                <span className={styles.metaValue}>{platform.join(" · ")}</span>
              </div>
            )}
          </div>
        </div>

        {tech.length > 0 && (
          <div className={styles.heroTech}>
            {tech.map((t) => (
              <span key={t} className={styles.techChip}>
                {t}
              </span>
            ))}
          </div>
        )}

        {links.length > 0 && (
          <div className={styles.heroLinks}>
            {links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.linkBtn}
              >
                <span className={styles.linkArrow}>↗</span>
                {link.label.toUpperCase()}
              </a>
            ))}
          </div>
        )}
      </header>

      {children}

      <footer className={styles.footer}>
        <div className={styles.footerLine} />
        <div className={styles.footerContent}>
          <span className={styles.footerText}>RUSEN.AI / BULLETIN / {title.toUpperCase()}</span>
          <div className={styles.footerLinks}>
            <a href="/bulletin" className={styles.footerLink}>
              ← all projects
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function BulletinSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionNumber}>{number}</span>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <div className={styles.sectionLine} />
      </div>
      {children}
    </section>
  );
}

export function BulletinProse({ children }: { children: ReactNode }) {
  return <div className={styles.prose}>{children}</div>;
}

export function BulletinCodeBlock({ children }: { children: string }) {
  return <pre className={styles.codeBlock}>{children}</pre>;
}

export function BulletinCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>{title}</h3>
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
}

export function BulletinGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid2}>{children}</div>;
}
