# Graph Report - Tasks System la finalizma  (2026-08-17)

## Corpus Check
- 259 files · ~160,897 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1389 nodes · 5037 edges · 75 communities (54 shown, 21 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 43 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9807c26e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- toErrorResponse
- task-detail.tsx
- job-description/route.ts
- sales.ts
- apiSend
- can
- page-header.tsx
- command-palette.tsx
- apiGet
- fetcher.ts
- db
- dependencies
- sales-bits.tsx
- button.tsx
- sales-schemas.ts
- rbac.ts
- reports/route.ts
- compilerOptions
- login/route.ts
- requireUser
- scripts
- devDependencies
- Extraction Subagent Prompt
- utils.ts
- Effective Permissions Formula
- avatar/route.ts
- dashboard-client.tsx
- Tasks API Endpoints
- applySqlFile
- graphify Pipeline
- Part B Semantic Extraction
- auth.ts
- eotm.ts
- Graphify Query Traversal Flow
- ASSIGNMENT_MATRIX
- middleware.ts
- Incremental Update Flow
- Approval Routing Chain
- job-description-client.tsx
- Elenor OS — Internal Operations Platform
- RBAC & Authorization Model
- leads/route.ts
- Step 4 Build Cluster Analyze
- package.json
- backfill-timezone.ts
- normalize-deadlines.ts
- attachments/[id]/route.ts
- formatDate
- save-result Feedback Loop
- analytics/page.tsx
- Step 2 Detect Files
- backfill-task-workers.ts
- reset-to-ceo.ts
- Notification Badge Icon (72px)
- EOTM & Analytics Endpoints
- update-working-hours.ts
- cn
- Notification Polling (WebSocket-ready)
- next.config.mjs
- audit/page.tsx
- tasks/page.tsx
- bcryptjs
- cmdk
- date-fns
- postcss.config.mjs
- tailwind.config.ts
- next
- @prisma/client
- recharts
- server-only
- tailwind-merge
- @tanstack/react-table
- zod

## God Nodes (most connected - your core abstractions)
1. `toErrorResponse()` - 188 edges
2. `requireUser()` - 160 edges
3. `audit()` - 101 edges
4. `db` - 85 edges
5. `apiGet()` - 82 edges
6. `apiSend()` - 82 edges
7. `cn()` - 60 edges
8. `can()` - 59 edges
9. `useCan()` - 53 edges
10. `ApiError` - 51 edges

## Surprising Connections (you probably didn't know these)
- `AuditLog model` --semantically_similar_to--> `Graphify Knowledge Graph Workflow`  [AMBIGUOUS] [semantically similar]
  docs/DATA-MODEL.md → CLAUDE.md
- `Elenor OS — Internal Operations Platform` --references--> `Data Model (ERD)`  [EXTRACTED]
  README.md → docs/DATA-MODEL.md
- `Cross-Repo Graph Merge` --semantically_similar_to--> `build_merge Replace-on-Re-extract`  [INFERRED] [semantically similar]
  .claude/skills/graphify/references/github-and-merge.md → .claude/skills/graphify/references/update.md
- `Elenor OS — Internal Operations Platform` --references--> `API Reference (/api)`  [EXTRACTED]
  README.md → docs/API.md
- `API Error Contract (400/401/403/404/409/422)` --semantically_similar_to--> `Security Model (bcrypt, JWT, RBAC, audit)`  [INFERRED] [semantically similar]
  docs/API.md → docs/DEPLOYMENT.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Authentication & Session Flow** — docs_api_auth_endpoints, docs_architecture_edge_middleware, docs_architecture_getsessionuser, docs_data_model_refreshtoken, docs_architecture_authentication_flow [EXTRACTED 1.00]
- **Authorization Enforcement Layer** — docs_rbac_effective_permissions, docs_rbac_requirepermission, docs_rbac_usecan, docs_rbac_role_permission_matrix, docs_data_model_userpermission, docs_rbac_super_admin_roles [EXTRACTED 1.00]
- **Detect to Extract to Build Pipeline Flow** — _claude_skills_graphify_skill_detect_step, _claude_skills_graphify_skill_ast_structural_extraction, _claude_skills_graphify_skill_semantic_extraction, _claude_skills_graphify_skill_ast_semantic_merge, _claude_skills_graphify_skill_build_cluster_analyze, _claude_skills_graphify_skill_community_labeling [EXTRACTED 1.00]
- **Job Description Lifecycle** — docs_api_job_descriptions_api, docs_api_jobdescriptionscope, docs_data_model_job_description_models, docs_data_model_jobdescriptionfile_split, docs_rbac_job_description_visibility [EXTRACTED 1.00]
- **Graph Integrity and Data-Loss Guards** — _claude_skills_graphify_skill_empty_graph_guard, _claude_skills_graphify_skill_shrink_guard, _claude_skills_graphify_skill_graph_health_check, _claude_skills_graphify_skill_manifest_stamping, _claude_skills_graphify_references_update_prune_sources, _claude_skills_graphify_references_extraction_spec_source_file_rule [INFERRED 0.85]
- **Incremental Rebuild Trigger Mechanisms** — _claude_skills_graphify_references_update_incremental_update, _claude_skills_graphify_references_add_watch_watch_mode, _claude_skills_graphify_references_hooks_post_commit_hook, _claude_skills_graphify_references_update_code_only_shortcut, _claude_skills_graphify_references_add_watch_graphify_add [INFERRED 0.85]

## Communities (75 total, 21 thin omitted)

### Community 0 - "toErrorResponse"
Cohesion: 0.10
Nodes (41): GET(), POST(), schema, DELETE(), GET(), PATCH(), updateSchema, GET() (+33 more)

### Community 1 - "task-detail.tsx"
Cohesion: 0.16
Nodes (24): CalendarView(), KanbanView(), ListView(), TableView(), DeadlinePill(), isCodeRef(), PriorityFlag(), StatusBadge() (+16 more)

### Community 2 - "job-description/route.ts"
Cohesion: 0.13
Nodes (24): DELETE(), GET(), loadEmployee(), POST(), createSchema, GET(), POST(), GET() (+16 more)

### Community 3 - "sales.ts"
Cohesion: 0.08
Nodes (63): ParentKey, PARENTS, POST(), resolveLeadId(), GET(), userPick, GET(), POST() (+55 more)

### Community 4 - "apiSend"
Cohesion: 0.12
Nodes (43): EditProjectButton(), ProjectsClient(), FeedbackRow, ConvertIdeaDialog(), IdeaDialog(), IdeaRow, MeetingRow, ResignDialog() (+35 more)

### Community 5 - "can"
Cohesion: 0.17
Nodes (18): GET(), userPick, GET(), userPick, DELETE(), loadIdea(), PATCH(), POST() (+10 more)

### Community 7 - "command-palette.tsx"
Cohesion: 0.07
Nodes (32): SettingsClient(), inter, metadata, Providers(), useCanSeeSalesModule(), AppShell(), ACTIONS, CommandPalette() (+24 more)

### Community 8 - "apiGet"
Cohesion: 0.11
Nodes (45): ClientsClient(), DepartmentsClient(), EmployeesClient(), JobDescriptionPanel(), EotmClient(), ActivitiesClient(), BriefRow, DiscoveryClient() (+37 more)

### Community 9 - "fetcher.ts"
Cohesion: 0.13
Nodes (17): AvatarPickerButton(), AttachmentParent, AttachmentsPanel(), formatBytes(), SalesAttachment, Brief, DiscoveryForm(), Section() (+9 more)

### Community 10 - "db"
Cohesion: 0.08
Nodes (40): GET(), PATCH(), schema, GET(), POST(), schema, PATCH(), schema (+32 more)

### Community 11 - "dependencies"
Cohesion: 0.07
Nodes (29): @auth/prisma-adapter, class-variance-authority, clsx, framer-motion, @hookform/resolvers, jose, lucide-react, dependencies (+21 more)

### Community 12 - "sales-bits.tsx"
Cohesion: 0.06
Nodes (60): ActivityRow, ClientRow, SalesClientsClient(), OverviewTab(), LeadDetailCard(), LeadTable(), View, LeadRef (+52 more)

### Community 13 - "button.tsx"
Cohesion: 0.06
Nodes (56): ApprovalsClient(), ApprovalsData, ACTION_COLOR, CLIENT_CONTACT_FIELDS, CLIENT_FIELDS, EditClientDialog(), STATUS, COLORS (+48 more)

### Community 14 - "sales-schemas.ts"
Cohesion: 0.05
Nodes (39): briefSchema, commentSchema, COMPANY_SIZES, convertSchema, DECISION_TIMELINES, factor5, feedbackPatchSchema, feedbackSchema (+31 more)

### Community 15 - "rbac.ts"
Cohesion: 0.06
Nodes (80): db, main(), seedPolicies(), db, GET(), PATCH(), taskInclude, updateSchema (+72 more)

### Community 16 - "reports/route.ts"
Cohesion: 0.15
Nodes (29): RFC-4180, GET(), userPick, GET(), userPick, buildTable(), GET(), humanize() (+21 more)

### Community 17 - "compilerOptions"
Cohesion: 0.07
Nodes (26): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+18 more)

### Community 18 - "login/route.ts"
Cohesion: 0.26
Nodes (13): POST(), schema, POST(), POST(), GET(), clearAuthCookies(), issueRefreshToken(), loadSessionUser() (+5 more)

### Community 19 - "requireUser"
Cohesion: 0.09
Nodes (37): POST(), DELETE(), PATCH(), schema, POST(), GET(), POST(), GET() (+29 more)

### Community 20 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, db:backfill-workers, db:migrate, db:normalize-deadlines, db:push, db:reset-ceo, db:seed (+9 more)

### Community 21 - "devDependencies"
Cohesion: 0.07
Nodes (29): autoprefixer, eslint, eslint-config-next, devDependencies, autoprefixer, eslint, eslint-config-next, postcss (+21 more)

### Community 22 - "Extraction Subagent Prompt"
Cohesion: 0.18
Nodes (14): Discrete Confidence Score Rubric, DEEP_MODE Aggressive Inference, Extraction Subagent Prompt, Hyperedge Extraction Rule, Node ID Format Rule, semantically_similar_to Edge Rule, Verbatim source_file Rule, build_merge Replace-on-Re-extract (+6 more)

### Community 23 - "utils.ts"
Cohesion: 0.20
Nodes (18): APP_TIMEZONE, BACKDATE_WINDOW_DAYS, backdateFloor(), companyToday(), InvalidDateError, isPastDate(), offsetMinutesAt(), parseUserDateTime() (+10 more)

### Community 24 - "Effective Permissions Formula"
Cohesion: 0.20
Nodes (12): Auth Endpoints (login, logout, refresh, me), Authentication Flow (JWT + Rotating Refresh), getSessionUser(), State Management (TanStack Query + Session Context), Identity, Org & RBAC Domain, RefreshToken model, UserPermission override (ALLOW/DENY), Soft Deletes (deactivate, revoke tokens) (+4 more)

### Community 25 - "avatar/route.ts"
Cohesion: 0.27
Nodes (11): DELETE(), GET(), POST(), requireAvatarAccess(), ACCEPTED_AVATAR_TYPES, readAvatarField(), removeAvatar(), saveAvatar() (+3 more)

### Community 26 - "dashboard-client.tsx"
Cohesion: 0.22
Nodes (9): axisStyle, DeptBar(), StatusDonut(), TrendArea(), CardContent, CardHeader, CardTitle, SEQUENTIAL_CYAN (+1 more)

### Community 27 - "Tasks API Endpoints"
Cohesion: 0.22
Nodes (11): Graphify Knowledge Graph Workflow, API Reference (/api), API Error Contract (400/401/403/404/409/422), Auto Task Code (ELN-###), Tasks API Endpoints, Zod Body Validation, Edge Auth Middleware, Write Request Lifecycle (+3 more)

### Community 28 - "applySqlFile"
Cohesion: 0.27
Nodes (8): applySqlFile(), splitSqlStatements(), APPLY, db, main(), db, main(), SQL_FILES

### Community 29 - "graphify Pipeline"
Cohesion: 0.24
Nodes (10): graphify Slash Command Trigger, Optional Export Flags, FalkorDB Cypher Export, Graphify MCP Stdio Server, Neo4j Cypher Export, Agent-Crawlable Wiki Export, Native CLAUDE.md Integration, Find-GraphifyPython (+2 more)

### Community 30 - "Part B Semantic Extraction"
Cohesion: 0.24
Nodes (10): Step B3 Chunk Collection and Merge, Corpus Size Gate, Gemini Semantic Backend, General-Purpose Subagent Requirement, Manifest Stamping, No API Key Required Policy, Parallel Subagent Dispatch, Prompt-Attributed Cache Keying (+2 more)

### Community 31 - "auth.ts"
Cohesion: 0.16
Nodes (12): GET(), DashboardPage(), AppLayout(), SalesLayout(), SalesDashboardPage(), Home(), SessionProvider(), ACCESS_MAX_AGE (+4 more)

### Community 32 - "eotm.ts"
Cohesion: 0.40
Nodes (7): GET(), computeScores(), currentPeriod(), getConfig(), recomputeAndStore(), ScoreBreakdown, deadlineDueBy()

### Community 33 - "Graphify Query Traversal Flow"
Cohesion: 0.25
Nodes (9): Cross-Repo Graph Merge, GitHub Repo Clone, Monorepo Output Clobber Avoidance, BFS and DFS Traversal Modes, Constrained Query Expansion, Inline NetworkX Traversal Fallback, Graphify Query Traversal Flow, Token Budget Truncation (+1 more)

### Community 34 - "ASSIGNMENT_MATRIX"
Cohesion: 0.25
Nodes (9): Job Descriptions API, jobDescriptionScope(), JobDescription Model Family, JobDescriptionFile Blob Split, ASSIGNABLE_DEPARTMENTS carve-out, ASSIGNMENT_MATRIX, canAssignTo(), Job Description Visibility Scopes (+1 more)

### Community 35 - "middleware.ts"
Cohesion: 0.33
Nodes (7): ACCESS_COOKIE, ACCESS_SECRET, REFRESH_COOKIE, verifyAccessToken(), config, middleware(), PUBLIC_PATHS

### Community 36 - "Incremental Update Flow"
Cohesion: 0.32
Nodes (8): Watcher Debounce, graphify add URL Ingest, Watch Mode Auto-Rebuild, God-Node Derived Whisper Domain Hint, Whisper Video/Audio Transcription, Code-Only Change Shortcut, Graph Diff After Update, Incremental Update Flow

### Community 37 - "Approval Routing Chain"
Cohesion: 0.25
Nodes (8): Leave / Permission / Resignation / Approvals Endpoints, ApprovalStep (generic approval engine table), Data Model (ERD), Prisma Enum Catalog, Testing Strategy (Vitest, Playwright, tsc), Approval Routing Chain, Permission Catalog (groups), Role → Permission Matrix

### Community 38 - "job-description-client.tsx"
Cohesion: 0.20
Nodes (12): JobDescriptionClient(), MyJobDescription(), PdfViewer(), STATUS_META, Tab, TeamRoster(), formatBytes(), JobDescriptionUpload() (+4 more)

### Community 39 - "Elenor OS — Internal Operations Platform"
Cohesion: 0.38
Nodes (7): Next.js App Router (RSC + Route Handlers), Elenor OS Architecture Overview, Source Folder Structure (src/app, src/components, src/lib), Deployment, Security, Testing & Roadmap, Cyan Design System, Elenor OS — Internal Operations Platform, Tech Stack (Next.js 15, TypeScript, Prisma, PostgreSQL)

### Community 40 - "RBAC & Authorization Model"
Cohesion: 0.29
Nodes (7): Production Hardening Checklist, Serverless DB Retry-with-Backoff, Vercel + Neon Deployment, RBAC & Authorization Model, Role Hierarchy (levels 0-4), NPM Scripts (db:push, db:seed, db:migrate), Seeded Local Development Accounts

### Community 41 - "leads/route.ts"
Cohesion: 0.19
Nodes (11): GET(), GET(), POST(), schema, GET(), listSelect, POST(), GET() (+3 more)

### Community 42 - "Step 4 Build Cluster Analyze"
Cohesion: 0.47
Nodes (6): cluster-only Re-clustering, Step 4 Build Cluster Analyze, Step 5 Community Labeling, Empty Graph Guard, PowerShell Scrolling / graspologic ANSI Issue, Graph Shrink Guard

### Community 43 - "package.json"
Cohesion: 0.33
Nodes (5): name, prisma, seed, private, version

### Community 44 - "backfill-timezone.ts"
Cohesion: 0.40
Nodes (5): APPLY, corrected(), db, main(), TARGETS

### Community 45 - "normalize-deadlines.ts"
Cohesion: 0.47
Nodes (5): APPLY, db, isUtcMidnight(), main(), toLocalMidnight()

### Community 46 - "attachments/[id]/route.ts"
Cohesion: 0.60
Nodes (5): DELETE(), GET(), loadAttachment(), requireVisibleParent(), RFC-5987

### Community 47 - "formatDate"
Cohesion: 0.15
Nodes (11): DashboardClient(), AchievementsTab(), OverviewTab(), WarningsTab(), PROJECT_STATUS, ProjectDetail(), TaskBoard(), TaskDetail() (+3 more)

### Community 48 - "save-result Feedback Loop"
Cohesion: 0.50
Nodes (5): Post-Commit Auto-Rebuild Hook, graphify explain Node Explanation, graphify path Shortest Path, save-result Feedback Loop, Work Memory and LESSONS.md Reflections

### Community 50 - "Step 2 Detect Files"
Cohesion: 0.50
Nodes (4): Token Reduction Benchmark, Calls Edge Direction and Same-Language Rule, Part A AST Structural Extraction, Step 2 Detect Files

### Community 53 - "Notification Badge Icon (72px)"
Cohesion: 0.67
Nodes (4): Notification Badge Icon (72px), Monochrome Silhouette Badge Mark, Notification Icon (192px), PWA Push Notification Asset Set

### Community 54 - "EOTM & Analytics Endpoints"
Cohesion: 0.67
Nodes (3): EOTM & Analytics Endpoints, EOTM Models (EotmConfig, EotmScore, EotmWinner), Bounded Concurrency for EOTM Aggregation

### Community 56 - "cn"
Cohesion: 0.14
Nodes (22): MiniTable(), CardDescription, CardFooter, CalendarGrid(), compose(), DeadlinePicker(), decompose(), formatTimeLabel() (+14 more)

## Ambiguous Edges - Review These
- `AuditLog model` → `Graphify Knowledge Graph Workflow`  [AMBIGUOUS]
  CLAUDE.md · relation: semantically_similar_to

## Knowledge Gaps
- **319 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+314 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `AuditLog model` and `Graphify Knowledge Graph Workflow`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `toErrorResponse()` connect `toErrorResponse` to `eotm.ts`, `job-description/route.ts`, `sales.ts`, `can`, `leads/route.ts`, `db`, `attachments/[id]/route.ts`, `rbac.ts`, `reports/route.ts`, `requireUser`, `avatar/route.ts`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `requireUser()` connect `requireUser` to `toErrorResponse`, `eotm.ts`, `job-description/route.ts`, `sales.ts`, `can`, `leads/route.ts`, `db`, `attachments/[id]/route.ts`, `rbac.ts`, `reports/route.ts`, `avatar/route.ts`, `auth.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `can()` connect `can` to `toErrorResponse`, `task-detail.tsx`, `job-description/route.ts`, `sales.ts`, `command-palette.tsx`, `apiGet`, `leads/route.ts`, `button.tsx`, `rbac.ts`, `reports/route.ts`, `requireUser`, `avatar/route.ts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _319 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `toErrorResponse` be split into smaller, more focused modules?**
  _Cohesion score 0.10180995475113122 - nodes in this community are weakly interconnected._
- **Should `job-description/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12807881773399016 - nodes in this community are weakly interconnected._