import type { Metadata } from "next";
import { buildProjectMetadata } from "@/lib/project-metadata";
import BulletinPage, {
  BulletinSection,
  BulletinProse,
  BulletinCodeBlock,
  BulletinCard,
  BulletinGrid,
} from "../components/BulletinPage";

export const metadata: Metadata = buildProjectMetadata("metuclass");

export default function MetuclassBulletinPage() {
  return (
    <BulletinPage
      title="metuclass"
      subtitle="Sync ODTUClass course files to your local machine. PDFs, slides, homeworks: everything, organized, incremental."
      status="STABLE"
      platform={["CLI", "macOS", "Linux", "Windows"]}
      tech={["Python 3.11+", "SQLite", "PyPI"]}
      links={[
        { label: "Source", url: "https://github.com/rusenbb/metuclass" },
        { label: "PyPI", url: "https://pypi.org/project/metuclass/" },
      ]}
    >
      <BulletinSection number="01" title="WHAT IT IS">
        <BulletinProse>
          <p>
            metuclass is a small command-line tool for METU students. Log in once, run{" "}
            <code>metuclass sync</code>, and every file from every course you&apos;re enrolled in lands on your disk,
            organized by course and section, in folders that match the way ODTUClass already groups them.
          </p>
          <p>
            Subsequent runs are incremental. metuclass keeps a local manifest (a tiny SQLite file) and only downloads
            what&apos;s new or updated. Files you&apos;ve modified locally are protected as conflicts unless you pass{" "}
            <code>--force</code>.
          </p>
        </BulletinProse>
      </BulletinSection>

      <BulletinSection number="02" title="WHY I BUILT IT">
        <BulletinProse>
          <p>
            The native ODTUClass interface is fine for one course. By week six of a semester it stops being fine:
            you&apos;re clicking through six course pages, ten weeks of slides, and three handouts each just to keep
            up with what was uploaded. I wanted one command that gets me from <code>git pull</code>-style mental model
            to actually having all the files.
          </p>
          <p>
            The design priority was <strong>not surprising you</strong>. Idempotent runs, dry-run support, conflict
            detection on locally modified files, and predictable destination paths so you can build downstream tooling
            on top: Obsidian indexing, full-text search, whatever.
          </p>
        </BulletinProse>
      </BulletinSection>

      <BulletinSection number="03" title="HOW IT WORKS">
        <BulletinGrid>
          <BulletinCard title="Login once">
            <code>metuclass login</code> stores a session token locally. You only re-auth when your password changes.
            Username and password can also come from environment variables for automation.
          </BulletinCard>
          <BulletinCard title="Incremental sync">
            On each run, metuclass fetches the file list from ODTUClass, diffs it against the local SQLite manifest,
            and downloads only what&apos;s new or updated. Concurrent downloads, atomic temp-file writes.
          </BulletinCard>
          <BulletinCard title="Predictable layout">
            Files land at <code>~/metuclass/&lt;Course&gt;/&lt;Section&gt;/&lt;file&gt;</code> by default. Override per
            run with <code>--sync-dir</code>, per shell with <code>METUCLASS_SYNC_DIR</code>, or persistently via{" "}
            <code>metuclass config</code>.
          </BulletinCard>
          <BulletinCard title="Conflict-aware">
            If you&apos;ve edited a file locally, metuclass skips it on the next sync and reports the conflict. Pass{" "}
            <code>--force</code> to overwrite, or <code>--dry-run</code> to preview without touching disk.
          </BulletinCard>
        </BulletinGrid>
      </BulletinSection>

      <BulletinSection number="04" title="QUICK START">
        <BulletinCodeBlock>{`# Install
pip install metuclass

# Log in with your METU credentials
metuclass login

# See what's enrolled
metuclass courses

# Pull everything
metuclass sync

# Or just one course, to a custom directory
metuclass sync "CENG 334 Section 1" --sync-dir ~/Documents/courses`}</BulletinCodeBlock>
      </BulletinSection>
    </BulletinPage>
  );
}
