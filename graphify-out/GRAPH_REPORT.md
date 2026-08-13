# Graph Report - Tasks System la finalizma  (2026-08-13)

## Corpus Check
- 259 files · ~158,974 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1383 nodes · 5006 edges · 77 communities (57 shown, 20 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 43 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ada9f76e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- toErrorResponse
- task-detail.tsx
- job-description/route.ts
- requireUser
- cn
- apiSend
- page-header.tsx
- command-palette.tsx
- apiGet
- sales-constants.ts
- db
- dependencies
- sales-bits.tsx
- fetcher.ts
- sales-schemas.ts
- can
- reports/route.ts
- compilerOptions
- auth.ts
- ApiError
- scripts
- devDependencies
- Extraction Subagent Prompt
- timezone.ts
- Effective Permissions Formula
- avatar/route.ts
- rbac.ts
- Tasks API Endpoints
- applySqlFile
- graphify Pipeline
- Part B Semantic Extraction
- getSessionUser
- eotm.ts
- Graphify Query Traversal Flow
- ASSIGNMENT_MATRIX
- middleware.ts
- Incremental Update Flow
- Approval Routing Chain
- task-lifecycle.ts
- Elenor OS — Internal Operations Platform
- RBAC & Authorization Model
- sales/clients/route.ts
- Step 4 Build Cluster Analyze
- package.json
- backfill-timezone.ts
- normalize-deadlines.ts
- attachments/[id]/route.ts
- task-approval.tsx
- save-result Feedback Loop
- analytics/page.tsx
- Step 2 Detect Files
- backfill-task-workers.ts
- reset-to-ceo.ts
- Notification Badge Icon (72px)
- EOTM & Analytics Endpoints
- update-working-hours.ts
- deadline-picker.tsx
- Notification Polling (WebSocket-ready)
- useSession
- notifications.tsx
- next.config.mjs
- audit/page.tsx
- employees/[id]/page.tsx
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

## Communities (77 total, 20 thin omitted)

### Community 0 - "toErrorResponse"
Cohesion: 0.06
Nodes (67): GET(), GET(), POST(), schema, DELETE(), GET(), PATCH(), updateSchema (+59 more)

### Community 1 - "task-detail.tsx"
Cohesion: 0.11
Nodes (32): DashboardClient(), PROJECT_STATUS, axisStyle, DeptBar(), StatusDonut(), TrendArea(), CalendarView(), KanbanView() (+24 more)

### Community 2 - "job-description/route.ts"
Cohesion: 0.13
Nodes (24): DELETE(), GET(), loadEmployee(), POST(), createSchema, GET(), POST(), GET() (+16 more)

### Community 3 - "requireUser"
Cohesion: 0.08
Nodes (70): GET(), userPick, ParentKey, PARENTS, POST(), resolveLeadId(), GET(), userPick (+62 more)

### Community 4 - "cn"
Cohesion: 0.10
Nodes (43): CLIENT_CONTACT_FIELDS, CLIENT_FIELDS, ClientsClient(), EditClientDialog(), STATUS, COLORS, DepartmentsClient(), Dept (+35 more)

### Community 5 - "apiSend"
Cohesion: 0.11
Nodes (42): OverrideDialog(), WeightsDialog(), LeaveForm(), PermissionsClient(), EditProjectButton(), ProjectsClient(), ConvertIdeaDialog(), IdeaDialog() (+34 more)

### Community 6 - "page-header.tsx"
Cohesion: 0.07
Nodes (3): ProjectDetail(), PageContainer(), PageHeader()

### Community 7 - "command-palette.tsx"
Cohesion: 0.15
Nodes (15): AppLayout(), SessionProvider(), useCanSeeSalesModule(), AppShell(), ACTIONS, CommandPalette(), HIT_META, HIT_ORDER (+7 more)

### Community 8 - "apiGet"
Cohesion: 0.11
Nodes (46): EotmClient(), ActivitiesClient(), DiscoveryClient(), FeedbackClient(), IdeasClient(), LeadDetailClient(), Tab, TAB_SLUG (+38 more)

### Community 9 - "sales-constants.ts"
Cohesion: 0.18
Nodes (12): AttachmentParent, AttachmentsPanel(), formatBytes(), SalesAttachment, Brief, BRIEF_STATUS_META, COMPANY_SIZE_META, MARKETING_CHANNELS (+4 more)

### Community 10 - "db"
Cohesion: 0.09
Nodes (38): GET(), PATCH(), schema, POST(), schema, PATCH(), schema, POST() (+30 more)

### Community 11 - "dependencies"
Cohesion: 0.07
Nodes (29): @auth/prisma-adapter, class-variance-authority, clsx, framer-motion, @hookform/resolvers, jose, lucide-react, dependencies (+21 more)

### Community 12 - "sales-bits.tsx"
Cohesion: 0.06
Nodes (63): ACTION_COLOR, ActivityRow, ClientRow, SalesClientsClient(), FeedbackRow, LeadDetailCard(), LeadTable(), View (+55 more)

### Community 13 - "fetcher.ts"
Cohesion: 0.05
Nodes (43): ApprovalsClient(), ApprovalsData, CreateEmployeeDialog(), FormValues, schema, Dept, Employee, EmployeesClient() (+35 more)

### Community 14 - "sales-schemas.ts"
Cohesion: 0.05
Nodes (39): briefSchema, commentSchema, COMPANY_SIZES, convertSchema, DECISION_TIMELINES, factor5, feedbackPatchSchema, feedbackSchema (+31 more)

### Community 15 - "can"
Cohesion: 0.14
Nodes (34): DELETE(), loadIdea(), PATCH(), POST(), userPick, GET(), SearchHit, POST() (+26 more)

### Community 16 - "reports/route.ts"
Cohesion: 0.15
Nodes (29): RFC-4180, GET(), userPick, GET(), userPick, buildTable(), GET(), humanize() (+21 more)

### Community 17 - "compilerOptions"
Cohesion: 0.07
Nodes (26): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+18 more)

### Community 18 - "auth.ts"
Cohesion: 0.21
Nodes (16): POST(), schema, POST(), POST(), GET(), ACCESS_MAX_AGE, ACCESS_SECRET, clearAuthCookies() (+8 more)

### Community 19 - "ApiError"
Cohesion: 0.14
Nodes (18): decisionSchema, POST(), createSchema, DELETE(), PATCH(), patchSchema, POST(), GET() (+10 more)

### Community 20 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, db:backfill-workers, db:migrate, db:normalize-deadlines, db:push, db:reset-ceo, db:seed (+9 more)

### Community 21 - "devDependencies"
Cohesion: 0.07
Nodes (29): autoprefixer, eslint, eslint-config-next, devDependencies, autoprefixer, eslint, eslint-config-next, postcss (+21 more)

### Community 22 - "Extraction Subagent Prompt"
Cohesion: 0.18
Nodes (14): Discrete Confidence Score Rubric, DEEP_MODE Aggressive Inference, Extraction Subagent Prompt, Hyperedge Extraction Rule, Node ID Format Rule, semantically_similar_to Edge Rule, Verbatim source_file Rule, build_merge Replace-on-Re-extract (+6 more)

### Community 23 - "timezone.ts"
Cohesion: 0.27
Nodes (13): GET(), APP_TIMEZONE, companyToday(), InvalidDateError, isDateOnly(), isPastDate(), offsetMinutesAt(), parseUserDateTime() (+5 more)

### Community 24 - "Effective Permissions Formula"
Cohesion: 0.20
Nodes (12): Auth Endpoints (login, logout, refresh, me), Authentication Flow (JWT + Rotating Refresh), getSessionUser(), State Management (TanStack Query + Session Context), Identity, Org & RBAC Domain, RefreshToken model, UserPermission override (ALLOW/DENY), Soft Deletes (deactivate, revoke tokens) (+4 more)

### Community 25 - "avatar/route.ts"
Cohesion: 0.30
Nodes (10): DELETE(), POST(), requireAvatarAccess(), ACCEPTED_AVATAR_TYPES, readAvatarField(), removeAvatar(), saveAvatar(), sha256() (+2 more)

### Community 26 - "rbac.ts"
Cohesion: 0.11
Nodes (20): db, main(), seedPolicies(), db, SalesLayout(), ALL, ASSIGNABLE_DEPARTMENTS, ASSIGNMENT_MATRIX (+12 more)

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

### Community 31 - "getSessionUser"
Cohesion: 0.29
Nodes (6): GET(), DashboardPage(), SalesDashboardPage(), Home(), getSessionUser(), verifyAccessToken()

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

### Community 38 - "task-lifecycle.ts"
Cohesion: 0.14
Nodes (20): ApprovableTask, canChangeTaskStatus(), canSubmitForApproval(), SessionUser, taskFollowUpIds(), taskWorkerIds(), approverIdsFor(), EvidenceInput (+12 more)

### Community 39 - "Elenor OS — Internal Operations Platform"
Cohesion: 0.38
Nodes (7): Next.js App Router (RSC + Route Handlers), Elenor OS Architecture Overview, Source Folder Structure (src/app, src/components, src/lib), Deployment, Security, Testing & Roadmap, Cyan Design System, Elenor OS — Internal Operations Platform, Tech Stack (Next.js 15, TypeScript, Prisma, PostgreSQL)

### Community 40 - "RBAC & Authorization Model"
Cohesion: 0.29
Nodes (7): Production Hardening Checklist, Serverless DB Retry-with-Backoff, Vercel + Neon Deployment, RBAC & Authorization Model, Role Hierarchy (levels 0-4), NPM Scripts (db:push, db:seed, db:migrate), Seeded Local Development Accounts

### Community 41 - "sales/clients/route.ts"
Cohesion: 0.43
Nodes (5): GET(), userPick, GET(), canViewClientContact(), salesScope

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

### Community 47 - "task-approval.tsx"
Cohesion: 0.22
Nodes (19): ChainProgress(), DecisionControls(), EvidenceFile, formatBytes(), stageLabelFor(), SubmissionCard(), TaskApproval(), approvalChain() (+11 more)

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

### Community 56 - "deadline-picker.tsx"
Cohesion: 0.16
Nodes (18): CalendarGrid(), compose(), DeadlinePicker(), decompose(), formatTimeLabel(), HOURS12, joinValue(), MINUTES (+10 more)

### Community 58 - "useSession"
Cohesion: 0.19
Nodes (10): SettingsClient(), inter, metadata, Providers(), useSession(), Topbar(), Theme, ThemeContext (+2 more)

### Community 59 - "notifications.tsx"
Cohesion: 0.29
Nodes (8): FEED_KEY, Notif, NotifFeed, NotificationBell(), isSupported(), PushState, urlBase64ToUint8Array(), usePush()

## Ambiguous Edges - Review These
- `AuditLog model` → `Graphify Knowledge Graph Workflow`  [AMBIGUOUS]
  CLAUDE.md · relation: semantically_similar_to

## Knowledge Gaps
- **319 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+314 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `AuditLog model` and `Graphify Knowledge Graph Workflow`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `toErrorResponse()` connect `toErrorResponse` to `eotm.ts`, `job-description/route.ts`, `requireUser`, `sales/clients/route.ts`, `db`, `attachments/[id]/route.ts`, `can`, `reports/route.ts`, `ApiError`, `timezone.ts`, `avatar/route.ts`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `requireUser()` connect `requireUser` to `toErrorResponse`, `eotm.ts`, `job-description/route.ts`, `sales/clients/route.ts`, `db`, `attachments/[id]/route.ts`, `can`, `reports/route.ts`, `ApiError`, `timezone.ts`, `avatar/route.ts`, `getSessionUser`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `db` connect `db` to `toErrorResponse`, `eotm.ts`, `job-description/route.ts`, `requireUser`, `page-header.tsx`, `task-lifecycle.ts`, `sales/clients/route.ts`, `attachments/[id]/route.ts`, `can`, `reports/route.ts`, `auth.ts`, `ApiError`, `timezone.ts`, `avatar/route.ts`, `employees/[id]/page.tsx`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _319 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `toErrorResponse` be split into smaller, more focused modules?**
  _Cohesion score 0.0584385226741468 - nodes in this community are weakly interconnected._
- **Should `task-detail.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11058823529411765 - nodes in this community are weakly interconnected._