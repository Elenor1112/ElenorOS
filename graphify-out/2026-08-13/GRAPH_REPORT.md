# Graph Report - .  (2026-08-13)

## Corpus Check
- 261 files · ~155,680 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1375 nodes · 4974 edges · 70 communities (53 shown, 17 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 43 edges (avg confidence: 0.87)
- Token cost: 177,509 input · 0 output

## Community Hubs (Navigation)
- Core Admin API Routes
- Dashboard & Profile Views
- Employee & Seed Provisioning
- Sales Pipeline API
- Approvals & Clients UI
- Permissions & Projects UI
- App Route Pages
- App Shell & Session Providers
- Lead Detail Tabs
- Sales List Views
- Leave & Permission Requests API
- Runtime Dependencies
- Sales Dashboards & Reports
- Employee & Department Dialogs
- Sales Zod Schemas
- Tasks & Search API
- Sales Analytics API
- TypeScript Config
- Auth Token Lifecycle
- Task Checklist & Comments API
- NPM Scripts
- Dev Dependencies
- Extraction Spec Rules
- Timezone Handling
- Identity & RBAC Docs
- Avatar Upload Pipeline
- Job Description UI
- Task API Documentation
- SQL Migration Runners
- Graphify Export Flags
- Semantic Extraction Policy
- Session Entry Points
- EOTM Scoring Engine
- Query & Repo Merge Docs
- Job Description Access Docs
- Edge Middleware Auth
- Incremental Update Docs
- Approval & Permission Docs
- CSV Export Utilities
- Architecture Overview Docs
- Deployment & Role Hierarchy
- Sales Client Scoping
- Build & Cluster Guards
- Package Manifest
- Timezone Backfill Script
- Deadline Normalization Script
- Attachment Download API
- Opportunity Scoring
- Query Helper Commands
- Analytics & Performance Pages
- AST Extraction Steps
- Task Worker Backfill
- CEO Reset Script
- PWA Notification Icons
- EOTM Documentation
- Working Hours Script
- Tasks Workspace
- Notification Polling Roadmap
- ESLint
- ESLint Next Config
- Next Config
- PostCSS Dependency
- Prisma CLI
- Tailwind CSS
- Tailwind Animate
- Bcrypt Types
- PostCSS Config
- Tailwind Config

## God Nodes (most connected - your core abstractions)
1. `toErrorResponse()` - 188 edges
2. `requireUser()` - 160 edges
3. `audit()` - 101 edges
4. `db` - 85 edges
5. `apiGet()` - 82 edges
6. `apiSend()` - 82 edges
7. `cn()` - 60 edges
8. `can()` - 58 edges
9. `useCan()` - 53 edges
10. `ApiError` - 51 edges

## Surprising Connections (you probably didn't know these)
- `AuditLog model` --semantically_similar_to--> `Graphify Knowledge Graph Workflow`  [AMBIGUOUS] [semantically similar]
  docs/DATA-MODEL.md → CLAUDE.md
- `Elenor OS — Internal Operations Platform` --references--> `Data Model (ERD)`  [EXTRACTED]
  README.md → docs/DATA-MODEL.md
- `Elenor OS — Internal Operations Platform` --references--> `API Reference (/api)`  [EXTRACTED]
  README.md → docs/API.md
- `Elenor OS — Internal Operations Platform` --references--> `Deployment, Security, Testing & Roadmap`  [EXTRACTED]
  README.md → docs/DEPLOYMENT.md
- `Elenor OS — Internal Operations Platform` --references--> `RBAC & Authorization Model`  [EXTRACTED]
  README.md → docs/RBAC.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Authentication & Session Flow** — docs_api_auth_endpoints, docs_architecture_edge_middleware, docs_architecture_getsessionuser, docs_data_model_refreshtoken, docs_architecture_authentication_flow [EXTRACTED 1.00]
- **Authorization Enforcement Layer** — docs_rbac_effective_permissions, docs_rbac_requirepermission, docs_rbac_usecan, docs_rbac_role_permission_matrix, docs_data_model_userpermission, docs_rbac_super_admin_roles [EXTRACTED 1.00]
- **Job Description Lifecycle** — docs_api_job_descriptions_api, docs_api_jobdescriptionscope, docs_data_model_job_description_models, docs_data_model_jobdescriptionfile_split, docs_rbac_job_description_visibility [EXTRACTED 1.00]
- **Detect to Extract to Build Pipeline Flow** — _claude_skills_graphify_skill_detect_step, _claude_skills_graphify_skill_ast_structural_extraction, _claude_skills_graphify_skill_semantic_extraction, _claude_skills_graphify_skill_ast_semantic_merge, _claude_skills_graphify_skill_build_cluster_analyze, _claude_skills_graphify_skill_community_labeling [EXTRACTED 1.00]
- **Graph Integrity and Data-Loss Guards** — _claude_skills_graphify_skill_empty_graph_guard, _claude_skills_graphify_skill_shrink_guard, _claude_skills_graphify_skill_graph_health_check, _claude_skills_graphify_skill_manifest_stamping, _claude_skills_graphify_references_update_prune_sources, _claude_skills_graphify_references_extraction_spec_source_file_rule [INFERRED 0.85]
- **Incremental Rebuild Trigger Mechanisms** — _claude_skills_graphify_references_update_incremental_update, _claude_skills_graphify_references_add_watch_watch_mode, _claude_skills_graphify_references_hooks_post_commit_hook, _claude_skills_graphify_references_update_code_only_shortcut, _claude_skills_graphify_references_add_watch_graphify_add [INFERRED 0.85]

## Communities (70 total, 17 thin omitted)

### Community 0 - "Core Admin API Routes"
Cohesion: 0.07
Nodes (66): GET(), GET(), schema, DELETE(), GET(), PATCH(), updateSchema, GET() (+58 more)

### Community 1 - "Dashboard & Profile Views"
Cohesion: 0.06
Nodes (63): DashboardClient(), AchievementsTab(), OverviewTab(), WarningsTab(), MyJobDescription(), TeamRoster(), PROJECT_STATUS, ProjectDetail() (+55 more)

### Community 2 - "Employee & Seed Provisioning"
Cohesion: 0.05
Nodes (72): db, main(), seedPolicies(), db, GET(), loadEmployee(), POST(), createSchema (+64 more)

### Community 3 - "Sales Pipeline API"
Cohesion: 0.08
Nodes (66): GET(), userPick, ParentKey, PARENTS, POST(), resolveLeadId(), GET(), userPick (+58 more)

### Community 4 - "Approvals & Clients UI"
Cohesion: 0.10
Nodes (38): ApprovalsClient(), ApprovalsData, ACTION_COLOR, CLIENT_CONTACT_FIELDS, CLIENT_FIELDS, ClientsClient(), EditClientDialog(), STATUS (+30 more)

### Community 5 - "Permissions & Projects UI"
Cohesion: 0.12
Nodes (42): LeaveForm(), Perm, PermissionsClient(), TYPE_LABELS, EditProjectButton(), STATUSES, Project, PROJECT_STATUS (+34 more)

### Community 7 - "App Shell & Session Providers"
Cohesion: 0.06
Nodes (38): AuditClient(), colorFor(), AppLayout(), SettingsClient(), inter, metadata, Providers(), SessionProvider() (+30 more)

### Community 8 - "Lead Detail Tabs"
Cohesion: 0.09
Nodes (42): ActivitiesClient(), DiscoveryClient(), FeedbackClient(), IdeasClient(), LeadDetailClient(), Tab, TAB_SLUG, tabCount() (+34 more)

### Community 9 - "Sales List Views"
Cohesion: 0.09
Nodes (39): ActivityRow, ClientRow, BriefRow, FeedbackRow, LeadRef, MyDashboard, Milestone(), ProposalRow (+31 more)

### Community 10 - "Leave & Permission Requests API"
Cohesion: 0.08
Nodes (39): GET(), PATCH(), schema, GET(), POST(), schema, PATCH(), schema (+31 more)

### Community 11 - "Runtime Dependencies"
Cohesion: 0.04
Nodes (49): @auth/prisma-adapter, bcryptjs, class-variance-authority, clsx, cmdk, date-fns, framer-motion, @hookform/resolvers (+41 more)

### Community 12 - "Sales Dashboards & Reports"
Cohesion: 0.09
Nodes (37): EotmClient(), SalesClientsClient(), MyDashboardClient(), PipelineClient(), EXPORTS, PipelineReports(), ReportData, ReportsClient() (+29 more)

### Community 13 - "Employee & Department Dialogs"
Cohesion: 0.08
Nodes (31): DepartmentsClient(), EditDepartmentDialog(), CreateEmployeeDialog(), FormValues, schema, AvatarPickerButton(), DeactivateDialog(), EditEmployeeDialog() (+23 more)

### Community 14 - "Sales Zod Schemas"
Cohesion: 0.05
Nodes (39): briefSchema, commentSchema, COMPANY_SIZES, convertSchema, DECISION_TIMELINES, factor5, feedbackPatchSchema, feedbackSchema (+31 more)

### Community 15 - "Tasks & Search API"
Cohesion: 0.12
Nodes (32): DELETE(), loadIdea(), PATCH(), POST(), userPick, GET(), SearchHit, PATCH() (+24 more)

### Community 16 - "Sales Analytics API"
Cohesion: 0.18
Nodes (24): GET(), userPick, GET(), userPick, buildTable(), GET(), humanize(), buildRosterTable() (+16 more)

### Community 17 - "TypeScript Config"
Cohesion: 0.07
Nodes (26): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+18 more)

### Community 18 - "Auth Token Lifecycle"
Cohesion: 0.21
Nodes (17): POST(), POST(), schema, POST(), POST(), GET(), ACCESS_MAX_AGE, ACCESS_SECRET (+9 more)

### Community 19 - "Task Checklist & Comments API"
Cohesion: 0.16
Nodes (19): GET(), GET(), POST(), GET(), createSchema, DELETE(), PATCH(), patchSchema (+11 more)

### Community 20 - "NPM Scripts"
Cohesion: 0.12
Nodes (17): scripts, build, db:backfill-workers, db:migrate, db:normalize-deadlines, db:push, db:reset-ceo, db:seed (+9 more)

### Community 21 - "Dev Dependencies"
Cohesion: 0.13
Nodes (15): autoprefixer, devDependencies, autoprefixer, tsx, @types/node, @types/react, @types/react-dom, @types/web-push (+7 more)

### Community 22 - "Extraction Spec Rules"
Cohesion: 0.18
Nodes (14): Discrete Confidence Score Rubric, DEEP_MODE Aggressive Inference, Extraction Subagent Prompt, Hyperedge Extraction Rule, Node ID Format Rule, semantically_similar_to Edge Rule, Verbatim source_file Rule, build_merge Replace-on-Re-extract (+6 more)

### Community 23 - "Timezone Handling"
Cohesion: 0.29
Nodes (11): GET(), APP_TIMEZONE, companyToday(), InvalidDateError, isDateOnly(), isPastDate(), offsetMinutesAt(), parseUserDateTime() (+3 more)

### Community 24 - "Identity & RBAC Docs"
Cohesion: 0.20
Nodes (12): Auth Endpoints (login, logout, refresh, me), Authentication Flow (JWT + Rotating Refresh), getSessionUser(), State Management (TanStack Query + Session Context), Identity, Org & RBAC Domain, RefreshToken model, UserPermission override (ALLOW/DENY), Soft Deletes (deactivate, revoke tokens) (+4 more)

### Community 25 - "Avatar Upload Pipeline"
Cohesion: 0.30
Nodes (10): DELETE(), POST(), requireAvatarAccess(), ACCEPTED_AVATAR_TYPES, readAvatarField(), removeAvatar(), saveAvatar(), sha256() (+2 more)

### Community 26 - "Job Description UI"
Cohesion: 0.24
Nodes (8): JobDescriptionClient(), PdfViewer(), STATUS_META, Tab, formatBytes(), JobDescriptionUpload(), MAX_FILE_BYTES, validatePdf()

### Community 27 - "Task API Documentation"
Cohesion: 0.22
Nodes (11): Graphify Knowledge Graph Workflow, API Reference (/api), API Error Contract (400/401/403/404/409/422), Auto Task Code (ELN-###), Tasks API Endpoints, Zod Body Validation, Edge Auth Middleware, Write Request Lifecycle (+3 more)

### Community 28 - "SQL Migration Runners"
Cohesion: 0.27
Nodes (8): applySqlFile(), splitSqlStatements(), APPLY, db, main(), db, main(), SQL_FILES

### Community 29 - "Graphify Export Flags"
Cohesion: 0.24
Nodes (10): graphify Slash Command Trigger, Optional Export Flags, FalkorDB Cypher Export, Graphify MCP Stdio Server, Neo4j Cypher Export, Agent-Crawlable Wiki Export, Native CLAUDE.md Integration, Find-GraphifyPython (+2 more)

### Community 30 - "Semantic Extraction Policy"
Cohesion: 0.24
Nodes (10): Step B3 Chunk Collection and Merge, Corpus Size Gate, Gemini Semantic Backend, General-Purpose Subagent Requirement, Manifest Stamping, No API Key Required Policy, Parallel Subagent Dispatch, Prompt-Attributed Cache Keying (+2 more)

### Community 31 - "Session Entry Points"
Cohesion: 0.29
Nodes (6): GET(), DashboardPage(), SalesDashboardPage(), Home(), getSessionUser(), verifyAccessToken()

### Community 32 - "EOTM Scoring Engine"
Cohesion: 0.40
Nodes (7): GET(), computeScores(), currentPeriod(), getConfig(), recomputeAndStore(), ScoreBreakdown, deadlineDueBy()

### Community 33 - "Query & Repo Merge Docs"
Cohesion: 0.25
Nodes (9): Cross-Repo Graph Merge, GitHub Repo Clone, Monorepo Output Clobber Avoidance, BFS and DFS Traversal Modes, Constrained Query Expansion, Inline NetworkX Traversal Fallback, Graphify Query Traversal Flow, Token Budget Truncation (+1 more)

### Community 34 - "Job Description Access Docs"
Cohesion: 0.25
Nodes (9): Job Descriptions API, jobDescriptionScope(), JobDescription Model Family, JobDescriptionFile Blob Split, ASSIGNABLE_DEPARTMENTS carve-out, ASSIGNMENT_MATRIX, canAssignTo(), Job Description Visibility Scopes (+1 more)

### Community 35 - "Edge Middleware Auth"
Cohesion: 0.33
Nodes (7): ACCESS_COOKIE, ACCESS_SECRET, REFRESH_COOKIE, verifyAccessToken(), config, middleware(), PUBLIC_PATHS

### Community 36 - "Incremental Update Docs"
Cohesion: 0.32
Nodes (8): Watcher Debounce, graphify add URL Ingest, Watch Mode Auto-Rebuild, God-Node Derived Whisper Domain Hint, Whisper Video/Audio Transcription, Code-Only Change Shortcut, Graph Diff After Update, Incremental Update Flow

### Community 37 - "Approval & Permission Docs"
Cohesion: 0.25
Nodes (8): Leave / Permission / Resignation / Approvals Endpoints, ApprovalStep (generic approval engine table), Data Model (ERD), Prisma Enum Catalog, Testing Strategy (Vitest, Playwright, tsc), Approval Routing Chain, Permission Catalog (groups), Role → Permission Matrix

### Community 38 - "CSV Export Utilities"
Cohesion: 0.38
Nodes (6): RFC-4180, csvCell(), ExportFormat, formatTable(), Table, tableResponse()

### Community 39 - "Architecture Overview Docs"
Cohesion: 0.38
Nodes (7): Next.js App Router (RSC + Route Handlers), Elenor OS Architecture Overview, Source Folder Structure (src/app, src/components, src/lib), Deployment, Security, Testing & Roadmap, Cyan Design System, Elenor OS — Internal Operations Platform, Tech Stack (Next.js 15, TypeScript, Prisma, PostgreSQL)

### Community 40 - "Deployment & Role Hierarchy"
Cohesion: 0.29
Nodes (7): Production Hardening Checklist, Serverless DB Retry-with-Backoff, Vercel + Neon Deployment, RBAC & Authorization Model, Role Hierarchy (levels 0-4), NPM Scripts (db:push, db:seed, db:migrate), Seeded Local Development Accounts

### Community 41 - "Sales Client Scoping"
Cohesion: 0.43
Nodes (5): GET(), userPick, GET(), canViewClientContact(), salesScope

### Community 42 - "Build & Cluster Guards"
Cohesion: 0.47
Nodes (6): cluster-only Re-clustering, Step 4 Build Cluster Analyze, Step 5 Community Labeling, Empty Graph Guard, PowerShell Scrolling / graspologic ANSI Issue, Graph Shrink Guard

### Community 43 - "Package Manifest"
Cohesion: 0.33
Nodes (5): name, prisma, seed, private, version

### Community 44 - "Timezone Backfill Script"
Cohesion: 0.40
Nodes (5): APPLY, corrected(), db, main(), TARGETS

### Community 45 - "Deadline Normalization Script"
Cohesion: 0.47
Nodes (5): APPLY, db, isUtcMidnight(), main(), toLocalMidnight()

### Community 46 - "Attachment Download API"
Cohesion: 0.60
Nodes (5): DELETE(), GET(), loadAttachment(), requireVisibleParent(), RFC-5987

### Community 47 - "Opportunity Scoring"
Cohesion: 0.40
Nodes (5): SCORE_FACTOR_LABELS, SCORE_WEIGHTS, ScoreFactors, scoreOpportunity(), temperatureFor()

### Community 48 - "Query Helper Commands"
Cohesion: 0.50
Nodes (5): Post-Commit Auto-Rebuild Hook, graphify explain Node Explanation, graphify path Shortest Path, save-result Feedback Loop, Work Memory and LESSONS.md Reflections

### Community 50 - "AST Extraction Steps"
Cohesion: 0.50
Nodes (4): Token Reduction Benchmark, Calls Edge Direction and Same-Language Rule, Part A AST Structural Extraction, Step 2 Detect Files

### Community 53 - "PWA Notification Icons"
Cohesion: 0.67
Nodes (4): Notification Badge Icon (72px), Monochrome Silhouette Badge Mark, Notification Icon (192px), PWA Push Notification Asset Set

### Community 54 - "EOTM Documentation"
Cohesion: 0.67
Nodes (3): EOTM & Analytics Endpoints, EOTM Models (EotmConfig, EotmScore, EotmWinner), Bounded Concurrency for EOTM Aggregation

## Ambiguous Edges - Review These
- `Graphify Knowledge Graph Workflow` → `AuditLog model`  [AMBIGUOUS]
  CLAUDE.md · relation: semantically_similar_to

## Knowledge Gaps
- **319 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+314 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Graphify Knowledge Graph Workflow` and `AuditLog model`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `toErrorResponse()` connect `Core Admin API Routes` to `EOTM Scoring Engine`, `Employee & Seed Provisioning`, `Sales Pipeline API`, `Sales Client Scoping`, `Leave & Permission Requests API`, `Attachment Download API`, `Tasks & Search API`, `Sales Analytics API`, `Auth Token Lifecycle`, `Task Checklist & Comments API`, `Timezone Handling`, `Avatar Upload Pipeline`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `requireUser()` connect `Task Checklist & Comments API` to `Core Admin API Routes`, `EOTM Scoring Engine`, `Employee & Seed Provisioning`, `Sales Pipeline API`, `Sales Client Scoping`, `Leave & Permission Requests API`, `Attachment Download API`, `Tasks & Search API`, `Sales Analytics API`, `Auth Token Lifecycle`, `Timezone Handling`, `Avatar Upload Pipeline`, `Session Entry Points`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `can()` connect `Tasks & Search API` to `Core Admin API Routes`, `Dashboard & Profile Views`, `Employee & Seed Provisioning`, `Sales Pipeline API`, `Approvals & Clients UI`, `App Shell & Session Providers`, `Sales Client Scoping`, `Employee & Department Dialogs`, `Sales Analytics API`, `Task Checklist & Comments API`, `Avatar Upload Pipeline`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _319 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Core Admin API Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.0681766186227408 - nodes in this community are weakly interconnected._
- **Should `Dashboard & Profile Views` be split into smaller, more focused modules?**
  _Cohesion score 0.05590386624869383 - nodes in this community are weakly interconnected._