import type { Metadata } from "next";
import { buildProjectMetadata } from "@/lib/project-metadata";
import BulletinPage, {
  BulletinSection,
  BulletinProse,
  BulletinCodeBlock,
  BulletinCard,
  BulletinGrid,
} from "../components/BulletinPage";

export const metadata: Metadata = buildProjectMetadata("eduport");

export default function EduportBulletinPage() {
  return (
    <BulletinPage
      title="Eduport"
      subtitle="Track university applications, programs, labs, and the documents and emails between them — all stored as plain Markdown on your disk."
      status="V1 — ACTIVE"
      platform={["macOS", "Windows", "Linux"]}
      tech={["Tauri 2", "SvelteKit", "Svelte 5", "Tailwind v4", "FastAPI", "Pydantic v2", "SQLite FTS5", "Rust", "Python 3.12+"]}
      links={[
        { label: "Source", url: "https://github.com/rusenbb/eduport" },
        { label: "Latest release", url: "https://github.com/rusenbb/eduport/releases/latest" },
      ]}
    >
      <BulletinSection number="01" title="WHAT IT IS">
        <BulletinProse>
          <p>
            Eduport is a desktop app for the messy middle of grad school applications — the part where you&apos;re juggling
            twenty programs, a dozen labs, half a hundred professors, and a paper trail of recommendation requests, transcripts,
            and emails. It gives that mess a structure without locking you out of it.
          </p>
          <p>
            Every entity — university, lab, person, program, application, document, email, note — is one Markdown file on
            your disk with YAML frontmatter. The app indexes those files and gives you a fast UI on top: list views, a
            kanban board for applications, a three-pane layout, ⌘K full-text search. The data stays yours and stays
            portable. Sync the folder with Dropbox, iCloud, or Syncthing. Open it in Obsidian alongside the app. Edit a
            file by hand if you want — Eduport notices and re-indexes.
          </p>
        </BulletinProse>
      </BulletinSection>

      <BulletinSection number="02" title="WHY I BUILT IT">
        <BulletinProse>
          <p>
            Spreadsheets felt brittle, Notion felt like a vendor cage, and a folder of disorganized PDFs lost the relationships
            between things. I wanted the relationships to be first-class — &quot;this lab is at this university,&quot; &quot;this
            email is about this application,&quot; &quot;this professor wrote this letter&quot; — without inventing a database
            I&apos;d have to migrate later.
          </p>
          <p>
            The compromise that made it work: <strong>your files are the database.</strong> SQLite lives outside the data folder
            (in the OS cache dir) and rebuilds itself if missing or stale. So the app can disappear and your data is still
            just a folder of Markdown files. That trade — slower indexing for total durability — is the whole point.
          </p>
        </BulletinProse>
      </BulletinSection>

      <BulletinSection number="03" title="HOW IT WORKS">
        <BulletinGrid>
          <BulletinCard title="Markdown is the database">
            Eight entity types, each as <code>&lt;slug&gt;-&lt;id&gt;.md</code> with YAML frontmatter. Renames in Obsidian
            don&apos;t break links because <code>[[wikilinks]]</code> resolve by id-suffix.
          </BulletinCard>
          <BulletinCard title="Tauri shell + Python sidecar">
            A Rust shell hosts a WebView pointed at a local FastAPI process. The Python side parses Markdown, watches the
            file system, and indexes into SQLite with FTS5.
          </BulletinCard>
          <BulletinCard title="Three-pane UI">
            Sidebar nav with counts and tag chips, list/kanban toggle, detail panel with structured fields and rendered
            body. Drag application cards across status columns.
          </BulletinCard>
          <BulletinCard title="Soft delete, never lose data">
            Items move to <code>.eduport-trash/</code> inside the data folder, restorable from the in-app trash view. The
            source of truth is always your filesystem.
          </BulletinCard>
        </BulletinGrid>
      </BulletinSection>

      <BulletinSection number="04" title="GET IT">
        <BulletinProse>
          <p>
            Installers for macOS, Windows, and Linux are on the GitHub releases page. They&apos;re unsigned for now —
            the release notes walk through the dismissable warnings on each OS.
          </p>
        </BulletinProse>
        <div style={{ height: "1rem" }} />
        <BulletinCodeBlock>{`# Or build from source
git clone https://github.com/rusenbb/eduport.git
cd eduport
python3 scripts/build_desktop.py`}</BulletinCodeBlock>
      </BulletinSection>
    </BulletinPage>
  );
}
