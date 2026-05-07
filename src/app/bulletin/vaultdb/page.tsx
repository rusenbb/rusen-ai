import type { Metadata } from "next";
import { buildProjectMetadata } from "@/lib/project-metadata";
import BulletinPage, {
  BulletinSection,
  BulletinProse,
  BulletinCodeBlock,
  BulletinCard,
  BulletinGrid,
} from "../components/BulletinPage";

export const metadata: Metadata = buildProjectMetadata("vaultdb");

export default function VaultdbBulletinPage() {
  return (
    <BulletinPage
      title="vaultdb"
      subtitle="A database engine for your Markdown files. Query, mutate, and traverse Obsidian vaults from the command line."
      status="STABLE"
      platform={["CLI", "macOS", "Linux", "Windows"]}
      tech={["Rust 1.75+", "Cargo", "YAML", "Wiki-links"]}
      links={[
        { label: "Source", url: "https://github.com/rusenbb/vaultdb" },
        { label: "Crates.io", url: "https://crates.io/crates/vaultdb" },
      ]}
    >
      <BulletinSection number="01" title="WHAT IT IS">
        <BulletinProse>
          <p>
            vaultdb treats a folder of <code>.md</code> files as a relational database. Each folder is a table, each
            note is a row, every YAML frontmatter field becomes a queryable column, and <code>[[wiki-links]]</code> form
            a citation graph you can traverse and join across.
          </p>
          <p>
            It&apos;s a CLI — no daemon, no cache, no state files. Every command reads the current files directly.
            That means you can edit notes in Obsidian and query them with vaultdb in the same second; they don&apos;t
            fight each other.
          </p>
        </BulletinProse>
      </BulletinSection>

      <BulletinSection number="02" title="WHY I BUILT IT">
        <BulletinProse>
          <p>
            Obsidian&apos;s graph view is pretty, but it doesn&apos;t answer questions. I wanted to ask things like
            &quot;which of my AI notes are orphans,&quot; &quot;what tags do I actually use,&quot; &quot;which notes
            link to anything tagged <code>topic/concept</code>,&quot; or &quot;walk the graph from BERT two hops out
            and show me what&apos;s within reach.&quot; Once I had a few hundred notes, the graph view stopped scaling
            and I started writing one-off shell scripts. vaultdb is the unified version of those scripts.
          </p>
          <p>
            The design constraint was <strong>peaceful coexistence with Obsidian</strong>. No proprietary database, no
            schema migrations, no &quot;import your vault.&quot; Every operation is a pure read or a careful in-place edit
            — with <code>--dry-run</code> on every mutation so you can see exactly what would change.
          </p>
        </BulletinProse>
      </BulletinSection>

      <BulletinSection number="03" title="HOW IT WORKS">
        <BulletinGrid>
          <BulletinCard title="Filesystem is the schema">
            <code>Folder</code> = table. <code>.md</code> = row. <code>frontmatter</code> = columns.{" "}
            <code>[[wiki-links]]</code> = relations. Virtual fields like <code>_backlink_count</code> and{" "}
            <code>_path</code> come for free.
          </BulletinCard>
          <BulletinCard title="Expressive where syntax">
            <code>tags contains topic/ai</code>, <code>year &gt; 2020</code>, <code>status exists</code>,{" "}
            <code>director matches ^Den</code>. Multiple <code>--where</code> AND, <code>||</code> for OR within one.
          </BulletinCard>
          <BulletinCard title="Graph traversal">
            BFS from any note with depth and direction filters, plus relational joins like{" "}
            <code>--links-to-where &quot;tags contains topic/ai&quot;</code> for cross-table queries on the link graph.
          </BulletinCard>
          <BulletinCard title="Safe mutations">
            Bulk set fields, add/remove tags, rename notes with automatic <code>[[wiki-link]]</code> updates across the
            vault. <code>--dry-run</code> on everything before commit.
          </BulletinCard>
        </BulletinGrid>
      </BulletinSection>

      <BulletinSection number="04" title="QUICK START">
        <BulletinCodeBlock>{`# Install from crates.io
cargo install vaultdb

# Use it inside any Obsidian vault
cd ~/Documents/my-vault

# What do my AI notes look like?
vaultdb query 3-Notes \\
  --where "tags contains topic/ai" \\
  --select "_name,_backlink_count" \\
  --sort _backlink_count --desc --limit 5

# Find orphans
vaultdb query 3-Notes \\
  --where "_backlink_count = 0" \\
  --where "_link_count = 0"`}</BulletinCodeBlock>
      </BulletinSection>
    </BulletinPage>
  );
}
