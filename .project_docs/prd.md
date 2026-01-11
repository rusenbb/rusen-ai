# Product Requirements Document (PRD)

## Product Overview

**Product Name**: rusen.ai
**Owner**: Rusen Birben
**Last Updated**: 2025-01-11

### Vision

A portfolio website that demonstrates AI capabilities running entirely in the browser. Unlike typical portfolio sites that showcase static projects, rusen.ai provides interactive demos where visitors can experience AI firsthand—without API costs, server infrastructure, or privacy concerns.

### Target Audience

1. **Recruiters & Hiring Managers**: Evaluating technical depth and project quality
2. **Fellow Engineers**: Exploring browser-based AI implementation patterns
3. **Researchers & Students**: Using tools like Paper Pilot for academic work
4. **General Public**: Curious about AI capabilities running locally

### Core Value Proposition

- **100% Client-Side**: All AI processing happens in the browser via WebGPU
- **Zero API Costs**: No pay-per-use charges for users
- **Privacy-First**: User data never leaves their device
- **Interactive Learning**: Hands-on demos beat static documentation

---

## Feature Requirements

### F1: Paper Pilot

**Purpose**: Help users understand academic papers by fetching metadata and generating AI summaries.

**User Stories**:
- As a student, I want to enter a DOI and get a plain-English explanation of a paper
- As a researcher, I want to quickly extract key findings from multiple papers
- As an engineer, I want technical summaries that focus on methodology

**Functional Requirements**:

| ID | Requirement | Priority |
|----|-------------|----------|
| F1.1 | Accept DOI (10.xxxx/xxxxx) or arXiv ID (2301.12345) as input | Must Have |
| F1.2 | Fetch metadata from CrossRef, Semantic Scholar, OpenAlex, Unpaywall | Must Have |
| F1.3 | Extract full text from open-access PDFs | Must Have |
| F1.4 | Generate TL;DR summary (2-3 sentences) | Must Have |
| F1.5 | Generate technical summary (methodology focus) | Must Have |
| F1.6 | Generate ELI5 summary (simple language) | Must Have |
| F1.7 | Generate key findings (bullet points) | Must Have |
| F1.8 | Answer follow-up questions about the paper | Must Have |
| F1.9 | Show streaming output during generation | Must Have |
| F1.10 | Allow model selection (0.6B, 1.7B, 4B) | Should Have |
| F1.11 | Display data sources used for each paper | Should Have |
| F1.12 | Support PDF upload for papers without DOI | Could Have |

**Non-Functional Requirements**:
- Model load time: < 60s on broadband connection
- Summary generation: < 30s for TL;DR on 0.6B model
- Support Chrome 113+, Edge 113+ (WebGPU required)

---

### F2: Data Forge

**Purpose**: Generate realistic test data for database schemas using AI.

**User Stories**:
- As a developer, I want to generate test data that respects my foreign key constraints
- As a QA engineer, I want realistic-looking data for integration tests
- As a data scientist, I want sample datasets matching a specific schema

**Functional Requirements**:

| ID | Requirement | Priority |
|----|-------------|----------|
| F2.1 | Visual schema builder (add/edit/delete tables) | Must Have |
| F2.2 | Support column types: string, integer, float, boolean, date, email, uuid, text | Must Have |
| F2.3 | Define foreign key relationships between tables | Must Have |
| F2.4 | Set row count per table (1-100) | Must Have |
| F2.5 | Generate contextually realistic data (not random strings) | Must Have |
| F2.6 | Respect foreign key constraints in generated data | Must Have |
| F2.7 | Export to SQL (INSERT statements) | Must Have |
| F2.8 | Export to JSON | Must Have |
| F2.9 | Export to CSV (one file per table) | Must Have |
| F2.10 | Preset schemas (E-commerce, Blog) | Should Have |
| F2.11 | Allow model selection | Should Have |
| F2.12 | Show quality warnings when generation is suboptimal | Should Have |
| F2.13 | Table definition field for context (e.g., "Electronics store customers") | Should Have |

**Non-Functional Requirements**:
- Generate 10 rows in < 15s (0.6B model)
- JSON output must be valid and parseable
- Foreign key values must reference existing parent records

---

### F3: Rusenizer (Nerdy Stuff)

**Purpose**: Demonstrate Turkish-optimized tokenization vs GPT-4's tokenizer.

**User Stories**:
- As a Turkish NLP researcher, I want to see token efficiency on Turkish text
- As an ML enthusiast, I want to understand how BPE tokenization works

**Functional Requirements**:

| ID | Requirement | Priority |
|----|-------------|----------|
| F3.1 | Input text field with example buttons | Must Have |
| F3.2 | Tokenize with custom Rusenizer (WASM) | Must Have |
| F3.3 | Tokenize with GPT-4 (cl100k_base via tiktoken) | Must Have |
| F3.4 | Side-by-side token visualization with colors | Must Have |
| F3.5 | Show token count comparison and savings percentage | Must Have |
| F3.6 | Display token details (ID, bytes) on hover/table | Must Have |
| F3.7 | Show statistics: characters, bytes, tokens | Should Have |

**Non-Functional Requirements**:
- Tokenization must be real-time (< 100ms for typical input)
- WASM module must load in < 2s

---

### F4: Query Craft (Planned)

**Purpose**: Convert natural language questions to SQL queries.

**Status**: Planned, not yet implemented.

**User Stories**:
- As a business analyst, I want to query databases without learning SQL
- As a developer, I want quick SQL snippets from natural language

---

### F5: Embedding Explorer (Planned)

**Purpose**: Visualize how text embeddings cluster in vector space.

**Status**: Planned, not yet implemented.

---

### F6: Temperature Playground (Planned)

**Purpose**: Compare LLM outputs at different temperature settings.

**Status**: Planned, not yet implemented.

---

## Site-Wide Requirements

### Navigation

| ID | Requirement | Priority |
|----|-------------|----------|
| S1 | Header with logo (rusen.ai) and nav links | Must Have |
| S2 | Links: Demos, Nerdy Stuff, About | Must Have |
| S3 | Dark mode support (system preference) | Must Have |
| S4 | Responsive design (mobile-friendly) | Should Have |

### Homepage

| ID | Requirement | Priority |
|----|-------------|----------|
| H1 | Hero section with tagline and CTAs | Must Have |
| H2 | Featured demos grid with descriptions | Must Have |
| H3 | Nerdy stuff preview section | Must Have |
| H4 | Statistics section (tokens trained, client-side, API costs) | Should Have |

### About Page

| ID | Requirement | Priority |
|----|-------------|----------|
| A1 | Personal introduction | Must Have |
| A2 | Tech stack list | Must Have |
| A3 | Social links (GitHub, LinkedIn) | Must Have |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Page Load (LCP) | < 2.5s |
| Model Load (first time) | < 60s on 50Mbps |
| Model Load (cached) | < 5s |
| Demo Completion Rate | > 70% of users complete at least one demo action |
| Error Rate | < 5% of demo attempts fail |

---

## Out of Scope

- User accounts / authentication
- Server-side AI inference
- Paid features or subscriptions
- Mobile app versions
- Multi-language UI (English only)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| WebGPU not widely supported | Clear error messaging, browser recommendations |
| Large model downloads deter users | Default to smallest model (0.6B), show progress |
| API rate limits (Semantic Scholar) | Caching, graceful degradation to other sources |
| PDF extraction fails | Fall back to abstract-only summarization |
| Model generates low-quality output | Quality warnings, suggest larger model |
