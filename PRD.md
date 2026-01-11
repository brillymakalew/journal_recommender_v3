# PRD — Journal Recommender (Abstract → Outlet + SDG Insights)

**Document owner:** (TBD)  
**Last updated:** 2026-01-11  
**Status:** Draft  
**Target release:** MVP (Demo) → v1 (Org rollout)

---

## 1. Overview

### 1.1 Product name
**Journal Recommender (Abstract → Outlet + SDG Insights)**

### 1.2 Problem statement
Researchers often struggle to quickly identify a best-fit journal outlet and align their abstract with a targeted SDG focus. Manual matching is slow, inconsistent, and hard to justify.

### 1.3 Proposed solution
A web application where users:
1. Paste an abstract  
2. Get **top-3 recommended journals** (based on similarity to journal scope/aims)  
3. See **which SDG keywords** appear in the abstract  
4. Get **best-fit SDG(s)** inferred from abstract content  
5. Receive a **rewritten abstract** that emphasizes the target SDG(s), without fabricating results

### 1.4 Target users
- **Demo (MVP):** Any Microsoft/Outlook account can sign in
- **Production (v1):** Restricted to organization email/tenant (Microsoft Entra ID / Azure AD)

### 1.5 Goals (north-star)
- Abstract → recommended journals + SDG-aligned abstract within **< 60 seconds**
- User usefulness rating ≥ **4/5** average (in-app feedback)
- Noticeable reduction in time spent selecting journals (self-reported)

---

## 2. Scope

### 2.1 In-scope (MVP)
- Microsoft SSO login (Outlook / Entra ID) for demo
- Abstract input and analysis
- Top-3 journal recommendations from provided journal Excel dataset
- SDG keyword detection from provided SDG keyword Excel dataset
- SDG best-fit detection (top-1 + runner-ups)
- SDG-focused abstract rewrite (using OpenAI API)
- User history of analyses
- Admin upload/import of Excel datasets
- Tech stack: **Next.js + Tailwind + Postgres**

### 2.2 Out of scope (MVP)
- Full manuscript analysis (abstract only)
- Journal submission workflow
- Live scraping of journal sites
- Acceptance prediction
- Plagiarism checks

---

## 3. User journeys

### 3.1 Journey A — Analyze abstract
1. User clicks **Sign in with Microsoft**
2. System authenticates via SSO (demo: allow any Microsoft account)
3. User lands on **Dashboard**
4. User pastes abstract and clicks **Analyze**
5. System returns:
   - Top 3 journal recommendations + scores + rationale
   - SDG keywords found (grouped by SDG)
   - Best-fit SDG + runner-ups
   - Suggested rewritten abstract aligned to SDG(s)
6. User copies/exports content and/or saves to history automatically

### 3.2 Journey B — Regenerate based on user-selected SDG
1. User reviews suggested SDG(s)
2. User selects a different SDG (optional)
3. Click **Regenerate abstract**
4. System generates a revised abstract emphasizing selected SDG(s)

### 3.3 Journey C — Admin imports data (journals + SDGs)
1. Admin opens **Admin → Data Management**
2. Upload journals Excel and/or SDG keyword Excel
3. System validates schema and shows preview (row counts, missing fields)
4. Import executes (replace or upsert)
5. System rebuilds embeddings / indexes (background job)
6. Admin sees status and logs

---

## 4. Personas & roles

### 4.1 Roles
- **User**
  - Submit abstracts
  - View history
  - Copy/export results
- **Admin**
  - Upload/import datasets
  - View import logs
  - Manage configuration (limits, model selection, etc.)

### 4.2 Authentication requirements
- **SSO:** Microsoft Entra ID (Outlook)
- **Demo mode:** allow all Microsoft accounts
- **Production mode:** restrict by **domain allowlist** and/or **tenant allowlist**

**Recommended:** NextAuth.js with Entra ID provider. Use sign-in callbacks to enforce allowlist in production.

---

## 5. Functional requirements

## 5.1 Abstract submission

**User story:** As a user, I want to paste an abstract and get journal + SDG recommendations.

**Inputs**
- `abstract_text` (required)
- `target_sdgs` (optional; can be selected after initial analysis)
- Future options (not MVP): field/category, constraints (Scopus/Q1/OA)

**Validations**
- Minimum length: 100 characters (configurable)
- Maximum length: 5,000 characters (configurable)
- Show guidance not to include confidential content (if needed by org policy)

---

## 5.2 Journal recommendation (Top 3)

**User story:** As a user, I want to see the top-3 journal outlets that match my abstract.

### 5.2.1 Journal dataset (Excel)
**Source:** `resources/List Scopus Outlet.xlsx`

**Minimum recommended columns**
**Minimum recommended columns**
- `journal_name` (required)
- `aims_scope` (required) — main text used for matching
- `keywords` (optional)
- `subject_areas` (optional)
- `indexing` (optional; Scopus/WoS/etc.)
- `quartile` (optional)
- `url` (optional)

System will generate:
- `journal_id` (UUID)
- `embedding` (vector)

### 5.2.2 Matching logic (MVP)
- Compute **embedding** of user abstract
- Compare against stored **journal scope embeddings**
- Rank by cosine similarity
- Return top 3 results

### 5.2.3 Output
For each of top 3 journals:
- `journal_name`
- `score` (0–1 similarity)
- `why_recommended` (short explanation)
- metadata (if available): indexing, quartile, subject_areas
- `url` (if available)

**Acceptance criteria**
- Same abstract returns stable rankings (unless dataset changes)
- Recommendations include a concise “why” explanation

---

## 5.3 SDG keyword detection

**User story:** As a user, I want to know which SDG keywords appear in my abstract.

### 5.3.1 SDG keyword dataset (Excel)
**Source:** `resources/SDGs Keyword.xlsx`

**Minimum columns**
**Minimum columns**
- `sdg_id` (1–17)
- `sdg_name`
- `keyword`

Optional:
- `weight`
- `synonyms`
- `match_type` (exact/contains/regex)

### 5.3.2 Matching behavior (MVP)
- Case-insensitive matching
- Phrase matching for multi-word keywords
- Results grouped by SDG

### 5.3.3 Output
- `sdg_keyword_hits`: list of `{ sdg_id, sdg_name, keywords_found[] }`
- Summary counts per SDG
- Optional UI highlight in text (nice-to-have)

**Acceptance criteria**
- Matches are deterministic and explainable (show matched keywords)

---

## 5.4 SDG best-fit detection (classification)

**User story:** As a user, I want the system to infer the best SDG(s) aligned with my abstract.

### 5.4.1 Approach options
1. Weighted keyword scoring (deterministic)
2. Embedding similarity vs SDG “profile texts”
3. LLM classifier (bounded JSON)

### 5.4.2 Recommended MVP (hybrid)
- Primary: embedding similarity (abstract vs SDG profiles)
- Secondary: keyword-hit weights
- Output: top-1 best SDG + top-3 ranking

### 5.4.3 Output
- `best_sdg`: `{ sdg_id, sdg_name, score, explanation }`
- `sdg_ranking`: top 3 list with scores and short rationale

**Acceptance criteria**
- Always returns at least one SDG (fallback to embedding similarity even if no keywords)

---

## 5.5 SDG-focused abstract rewrite

**User story:** As a user, I want a rewritten abstract that emphasizes the target SDG(s) without fabricating results.

### 5.5.1 Inputs
- Original abstract
- Selected `target_sdgs` (default: system best_sdg)

### 5.5.2 Output constraints
- Preserve factual claims from the original
- Do **not** invent new results, datasets, or outcomes
- Enhance SDG framing: motivation, problem alignment, societal impact, policy implications
- Keep academic tone; similar length (configurable)

### 5.5.3 Output
- `rewritten_abstract` (text)
- Optional: `notes` describing what was emphasized (short)

**Acceptance criteria**
- Includes explicit SDG framing for selected SDG(s)
- No fabricated claims (guardrails + prompt constraints)

---

## 5.6 History & export

**User story:** As a user, I want to revisit my previous analyses and export results.

### 5.6.1 Stored per analysis
- abstract text (policy-dependent: plaintext vs encrypted)
- journal top-3 + scores
- SDG keyword hits
- SDG ranking
- rewritten abstract
- timestamps

### 5.6.2 Export (MVP)
- Copy to clipboard (abstract + results)
- JSON export for admin/debug (optional)

Future:
- PDF/DOCX export

**Acceptance criteria**
- User can open analysis history and see full prior results

---

## 5.7 Admin: Excel import

**User story:** As an admin, I want to upload Excel datasets and update the recommendation engine.

### 5.7.1 Requirements
- Upload XLSX
- Validate schema + show preview
- Import modes:
  - Replace all
  - Upsert (by unique key such as journal_name; better if ISSN exists)
- Recompute embeddings for new/changed records (background job)
- Import job log: who/when/status/errors

**Acceptance criteria**
- Clear error messages for missing columns or invalid formats
- Completed imports are auditable

---

## 6. Non-functional requirements

### 6.1 Performance
- Typical analysis response: **< 15 seconds**
- Support initial concurrency: **~50 concurrent users** (scalable)

### 6.2 Reliability
- 99% successful analysis requests (excluding external outages)
- Retry logic for background embedding jobs

### 6.3 Security
- OAuth/OIDC SSO with Microsoft
- Secure session handling (NextAuth)
- Rate limiting per user to control OpenAI cost
- Secrets in environment variables + vault in production

### 6.4 Observability
- Structured logs (requests, errors, import jobs)
- OpenAI token/cost tracking per request
- Basic usage analytics

---

## 7. Technical requirements

## 7.1 Tech stack (required)
- **Next.js** (App Router recommended)
- **TailwindCSS**
- **PostgreSQL**
- **OpenAI API** (optional but recommended for embeddings + rewrite)
- Recommended: **Prisma** ORM
- Recommended: **pgvector** for vector storage + similarity search

---

## 7.2 Recommendation architecture (MVP)

### 7.2.1 Journal embeddings
- Create a `journal_profile_text`:
  - `journal_name + aims_scope + keywords + subject_areas`
- Compute embedding and store in Postgres vector column
- Query top-K by cosine similarity to abstract embedding
- Return top-3 to UI

### 7.2.2 SDG embeddings
- Create `sdg_profile_text`:
  - `sdg_name + SDG description (static) + keyword list`
- Compute embeddings and store (17 rows)
- Rank SDGs by similarity

### 7.2.3 Rewrite pipeline
- Determine target SDG(s)
- Call OpenAI to rewrite with strict constraints (no new claims)
- Return revised abstract

---

## 7.3 API endpoints (suggested)

### `POST /api/analyze`
**Request**
```json
{
  "abstract_text": "string",
  "target_sdgs": [3, 9]
}
```

**Response**
```json
{
  "journals_top3": [
    { "journal_id": "uuid", "journal_name": "string", "score": 0.82, "why_recommended": "string", "metadata": {} }
  ],
  "sdg_keyword_hits": [
    { "sdg_id": 9, "sdg_name": "Industry, Innovation and Infrastructure", "keywords_found": ["..."] }
  ],
  "best_sdg": { "sdg_id": 9, "sdg_name": "string", "score": 0.74, "explanation": "string" },
  "sdg_ranking": [
    { "sdg_id": 9, "sdg_name": "string", "score": 0.74 },
    { "sdg_id": 3, "sdg_name": "string", "score": 0.68 }
  ],
  "rewritten_abstract": "string"
}
```

### `POST /api/rewrite`
- Input: original abstract + target SDG(s)
- Output: rewritten abstract

### `GET /api/history`
- Returns list of analyses for current user

### `GET /api/history/:id`
- Returns one analysis result

### Admin
- `POST /api/admin/import/journals`
- `POST /api/admin/import/sdgs`
- `GET /api/admin/import/jobs`

---

## 8. Data model (high-level)

### 8.1 Tables

#### `users`
- `id` (uuid)
- `email`
- `name`
- `role` (`user` | `admin`)
- `created_at`

#### `journals`
- `id` (uuid)
- `name`
- `aims_scope` (text)
- `metadata` (jsonb)
- `embedding` (vector)
- `updated_at`

#### `sdg_keywords`
- `id` (uuid)
- `sdg_id` (int 1–17)
- `sdg_name` (text)
- `keyword` (text)
- `weight` (optional)
- `updated_at`

#### `sdg_profiles`
- `sdg_id` (int, pk)
- `profile_text` (text)
- `embedding` (vector)
- `updated_at`

#### `analyses`
- `id` (uuid)
- `user_id` (uuid)
- `abstract_text` (text or encrypted)
- `result` (jsonb)
- `created_at`

#### `import_jobs`
- `id` (uuid)
- `type` (`journals` | `sdgs`)
- `status` (`queued` | `running` | `succeeded` | `failed`)
- `error_message` (nullable)
- `created_by` (uuid)
- `created_at`

---

## 9. UX / UI requirements

### 9.1 Pages
1. **Login**
   - “Sign in with Microsoft”
   - Demo note: “Any Microsoft account allowed (MVP demo)”

2. **Dashboard**
   - Abstract input text area
   - “Analyze” button
   - Loading/progress state

3. **Results**
   - Top-3 Journals (cards with scores + rationale)
   - SDG Keywords Found (grouped by SDG)
   - Best-fit SDG + runner-ups
   - Rewritten abstract with copy + regenerate

4. **History**
   - List and detail view of prior analyses

5. **Admin → Data Management**
   - Upload journals dataset
   - Upload SDG keywords dataset
   - Import job status and logs

### 9.2 UX quality requirements
- Clear “why” explanations and transparent scoring
- Copy-to-clipboard buttons
- Friendly errors (e.g., “Your abstract is too short”)
- Responsive layout

---

## 10. Edge cases & fallback behavior

- **No SDG keywords detected**
  - Still return best SDG based on embedding similarity
  - UI message: “No explicit SDG keywords detected; SDG inferred by themes.”

- **OpenAI API unavailable / quota exceeded**
  - If embeddings already computed:
    - return journal + SDG results
    - skip rewrite with clear message
  - If embeddings not computed:
    - return informative error and suggest retry

- **Missing journal scope**
  - Exclude journal from ranking (or fallback to keywords/metadata if present)

---

## 11. Metrics & analytics

### 11.1 Product metrics
- Analyses per day/week
- Copy rate of rewritten abstract
- Click-through rate on journal links
- Regenerate rate (how often user changes SDG)
- User feedback rating on recommendations

### 11.2 Operational metrics
- Average latency per analysis
- Error rate per endpoint
- OpenAI tokens/cost per analysis (and per user)

---

## 12. Release plan

### MVP (Demo)
- Microsoft SSO (any Microsoft account)
- Excel import (journals + SDG keywords)
- Abstract analysis (top-3 journals + SDG detection + rewrite)
- History view

### v1 (Organization rollout)
- Restrict login to organization domain/tenant
- Improved admin/audit logs
- Filters (indexing/quartile/subject areas)
- Export PDF/DOCX

### v2
- Multilingual support
- Advanced journal constraints & policy rules
- Enhanced explainability + evaluation dashboard

---

## 13. Risks & mitigations

- **Hallucinations in rewrite**
  - Mitigation: strict prompt + “no-new-claims” rule + optional second-pass check

- **Data quality in journal scopes**
  - Mitigation: schema validation + missing-data warnings + admin preview

- **OpenAI cost spikes**
  - Mitigation: caching embeddings, rate limiting, token limits, cost dashboards

- **SSO configuration complexity**
  - Mitigation: start with demo tenant config, then enforce tenant/domain allowlists in v1

---

## 14. MVP acceptance criteria

1. User can sign in via Microsoft and access dashboard  
2. Admin can upload journal and SDG keyword XLSX; import succeeds and is logged  
3. On Analyze, system returns:
   - Exactly 3 journals ranked with scores + rationale
   - SDG keyword hits grouped by SDG
   - Best SDG + runner-ups with scores
   - Rewritten abstract aligned to best/selected SDG(s)
4. Result is saved and viewable in history  
5. System handles “no SDG keywords found” gracefully and still infers SDG(s)
