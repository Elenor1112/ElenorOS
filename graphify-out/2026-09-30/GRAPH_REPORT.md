# Graph Report - Tasks System la finalizma  (2026-08-23)

## Corpus Check
- 262 files · ~163,532 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1403 nodes · 5112 edges · 74 communities (55 shown, 19 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 43 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d2eb31cd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- toErrorResponse
- task-bits.tsx
- can
- sales.ts
- apiGet
- requireUser
- page-header.tsx
- command-palette.tsx
- lead-tabs.tsx
- sales-constants.ts
- db
- dependencies
- sales-bits.tsx
- button.tsx
- sales-schemas.ts
- rbac.ts
- reports/route.ts
- compilerOptions
- change-password/route.ts
- db.ts
- scripts
- devDependencies
- Extraction Subagent Prompt
- api.ts
- Effective Permissions Formula
- fetcher.ts
- task-board.tsx
- Tasks API Endpoints
- applySqlFile
- graphify Pipeline
- Part B Semantic Extraction
- auth.ts
- deadline-picker.tsx
- Graphify Query Traversal Flow
- ASSIGNMENT_MATRIX
- middleware.ts
- Incremental Update Flow
- Approval Routing Chain
- cn
- Elenor OS — Internal Operations Platform
- RBAC & Authorization Model
- dashboard-client.tsx
- Step 4 Build Cluster Analyze
- package.json
- backfill-timezone.ts
- normalize-deadlines.ts
- utils.ts
- task-detail.tsx
- save-result Feedback Loop
- analytics/page.tsx
- Step 2 Detect Files
- backfill-task-workers.ts
- reset-to-ceo.ts
- Notification Badge Icon (72px)
- EOTM & Analytics Endpoints
- update-working-hours.ts
- formatDate
- Notification Polling (WebSocket-ready)
- next.config.mjs
- audit/page.tsx
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
1. `toErrorResponse()` - 196 edges
2. `requireUser()` - 168 edges
3. `audit()` - 107 edges
4. `db` - 88 edges
5. `apiGet()` - 82 edges
6. `apiSend()` - 82 edges
7. `can()` - 61 edges
8. `cn()` - 60 edges
9. `ApiError` - 54 edges
10. `useCan()` - 53 edges

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

## Communities (74 total, 19 thin omitted)

### Community 0 - "toErrorResponse"
Cohesion: 0.08
Nodes (48): GET(), DELETE(), GET(), PATCH(), updateSchema, GET(), POST(), schema (+40 more)

### Community 1 - "task-bits.tsx"
Cohesion: 0.27
Nodes (15): DashboardClient(), ListView(), TableView(), DeadlinePill(), isCodeRef(), PriorityFlag(), StatusBadge(), StatusDot() (+7 more)

### Community 2 - "can"
Cohesion: 0.10
Nodes (31): DELETE(), GET(), loadEmployee(), POST(), createSchema, GET(), POST(), GET() (+23 more)

### Community 3 - "sales.ts"
Cohesion: 0.07
Nodes (79): GET(), userPick, ParentKey, PARENTS, POST(), resolveLeadId(), GET(), userPick (+71 more)

### Community 4 - "apiGet"
Cohesion: 0.08
Nodes (39): ApprovalsClient(), ClientsClient(), EditClientDialog(), DepartmentsClient(), EditDepartmentDialog(), AvatarPickerButton(), DeactivateDialog(), EditEmployeeDialog() (+31 more)

### Community 5 - "requireUser"
Cohesion: 0.10
Nodes (27): GET(), POST(), schema, DELETE(), PATCH(), schema, POST(), GET() (+19 more)

### Community 6 - "page-header.tsx"
Cohesion: 0.07
Nodes (3): PageContainer(), PageHeader(), TasksWorkspace()

### Community 7 - "command-palette.tsx"
Cohesion: 0.06
Nodes (34): AppLayout(), SettingsClient(), inter, metadata, Providers(), SessionProvider(), useCanSeeSalesModule(), AppShell() (+26 more)

### Community 8 - "lead-tabs.tsx"
Cohesion: 0.10
Nodes (44): EmployeeProfile(), ActivitiesClient(), BriefRow, DiscoveryClient(), FeedbackClient(), FeedbackRow, LeadDetailClient(), Tab (+36 more)

### Community 9 - "sales-constants.ts"
Cohesion: 0.15
Nodes (18): MeetingRow, Brief, defaultSlot(), MeetingDialog(), MeetingInput, toLocalInputValue(), BRIEF_STATUS_META, COMPANY_SIZE_META (+10 more)

### Community 10 - "db"
Cohesion: 0.12
Nodes (27): GET(), PATCH(), schema, PATCH(), schema, GET(), POST(), GET() (+19 more)

### Community 11 - "dependencies"
Cohesion: 0.07
Nodes (29): @auth/prisma-adapter, class-variance-authority, clsx, framer-motion, @hookform/resolvers, jose, lucide-react, dependencies (+21 more)

### Community 12 - "sales-bits.tsx"
Cohesion: 0.06
Nodes (62): ActivityRow, ClientRow, SalesClientsClient(), LeadDetailCard(), LeadTable(), View, LeadRef, MyDashboard (+54 more)

### Community 13 - "button.tsx"
Cohesion: 0.16
Nodes (28): CLIENT_CONTACT_FIELDS, CLIENT_FIELDS, STATUS, COLORS, Dept, Leave, Perm, TYPE_LABELS (+20 more)

### Community 14 - "sales-schemas.ts"
Cohesion: 0.05
Nodes (39): briefSchema, commentSchema, COMPANY_SIZES, convertSchema, DECISION_TIMELINES, factor5, feedbackPatchSchema, feedbackSchema (+31 more)

### Community 15 - "rbac.ts"
Cohesion: 0.05
Nodes (84): db, main(), seedPolicies(), db, GET(), GET(), PATCH(), taskInclude (+76 more)

### Community 16 - "reports/route.ts"
Cohesion: 0.14
Nodes (30): RFC-4180, GET(), userPick, GET(), userPick, buildTable(), GET(), humanize() (+22 more)

### Community 17 - "compilerOptions"
Cohesion: 0.07
Nodes (26): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+18 more)

### Community 18 - "change-password/route.ts"
Cohesion: 0.30
Nodes (13): POST(), schema, POST(), schema, POST(), GET(), clearAuthCookies(), hashPassword() (+5 more)

### Community 19 - "db.ts"
Cohesion: 0.07
Nodes (41): DELETE(), GET(), POST(), requireAvatarAccess(), DELETE(), GET(), loadAttachment(), decisionSchema (+33 more)

### Community 20 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, db:backfill-workers, db:migrate, db:normalize-deadlines, db:push, db:reset-ceo, db:seed (+9 more)

### Community 21 - "devDependencies"
Cohesion: 0.07
Nodes (29): autoprefixer, eslint, eslint-config-next, devDependencies, autoprefixer, eslint, eslint-config-next, postcss (+21 more)

### Community 22 - "Extraction Subagent Prompt"
Cohesion: 0.18
Nodes (14): Discrete Confidence Score Rubric, DEEP_MODE Aggressive Inference, Extraction Subagent Prompt, Hyperedge Extraction Rule, Node ID Format Rule, semantically_similar_to Edge Rule, Verbatim source_file Rule, build_merge Replace-on-Re-extract (+6 more)

### Community 23 - "api.ts"
Cohesion: 0.20
Nodes (12): GET(), DELETE(), GET(), loadAttachment(), requireVisibleParent(), RFC-5987, handler(), SessionUser (+4 more)

### Community 24 - "Effective Permissions Formula"
Cohesion: 0.20
Nodes (12): Auth Endpoints (login, logout, refresh, me), Authentication Flow (JWT + Rotating Refresh), getSessionUser(), State Management (TanStack Query + Session Context), Identity, Org & RBAC Domain, RefreshToken model, UserPermission override (ALLOW/DENY), Soft Deletes (deactivate, revoke tokens) (+4 more)

### Community 25 - "fetcher.ts"
Cohesion: 0.13
Nodes (16): CreateEmployeeDialog(), FormValues, schema, Dept, Employee, EmployeesClient(), AttachmentParent, AttachmentsPanel() (+8 more)

### Community 26 - "task-board.tsx"
Cohesion: 0.18
Nodes (11): CalendarView(), KanbanView(), TimestampValue(), TaskBoard(), View, VIEWS, TaskDetail(), TASK_STATUS_META (+3 more)

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
Cohesion: 0.15
Nodes (13): POST(), GET(), DashboardPage(), SalesLayout(), SalesDashboardPage(), Home(), ACCESS_MAX_AGE, ACCESS_SECRET (+5 more)

### Community 32 - "deadline-picker.tsx"
Cohesion: 0.18
Nodes (16): CalendarGrid(), compose(), DeadlinePicker(), decompose(), formatTimeLabel(), HOURS12, joinValue(), MINUTES (+8 more)

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

### Community 38 - "cn"
Cohesion: 0.10
Nodes (27): ApprovalsData, ACTION_COLOR, JobDescriptionPanel(), COMPONENTS, EotmClient(), OverrideDialog(), WeightsDialog(), JobDescriptionClient() (+19 more)

### Community 39 - "Elenor OS — Internal Operations Platform"
Cohesion: 0.38
Nodes (7): Next.js App Router (RSC + Route Handlers), Elenor OS Architecture Overview, Source Folder Structure (src/app, src/components, src/lib), Deployment, Security, Testing & Roadmap, Cyan Design System, Elenor OS — Internal Operations Platform, Tech Stack (Next.js 15, TypeScript, Prisma, PostgreSQL)

### Community 40 - "RBAC & Authorization Model"
Cohesion: 0.29
Nodes (7): Production Hardening Checklist, Serverless DB Retry-with-Backoff, Vercel + Neon Deployment, RBAC & Authorization Model, Role Hierarchy (levels 0-4), NPM Scripts (db:push, db:seed, db:migrate), Seeded Local Development Accounts

### Community 41 - "dashboard-client.tsx"
Cohesion: 0.23
Nodes (8): axisStyle, DeptBar(), StatusDonut(), TrendArea(), categorical, SEQUENTIAL_CYAN, STATUS, PRIORITY_META

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

### Community 46 - "utils.ts"
Cohesion: 0.23
Nodes (13): BACKDATE_WINDOW_DAYS, backdateFloor(), companyToday(), isPastDate(), toZonedInputValue(), zonedParts(), dtf, dtfExact (+5 more)

### Community 47 - "task-detail.tsx"
Cohesion: 0.27
Nodes (8): MyJobDescription(), TeamRoster(), formatBytes(), Panel(), toDeadlineInput(), canChangeTaskStatus(), formatExactDateTime(), fullName()

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

### Community 56 - "formatDate"
Cohesion: 0.29
Nodes (7): AchievementsTab(), OverviewTab(), WarningsTab(), PROJECT_STATUS, ProjectDetail(), formatDate(), relativeTime()

## Ambiguous Edges - Review These
- `AuditLog model` → `Graphify Knowledge Graph Workflow`  [AMBIGUOUS]
  CLAUDE.md · relation: semantically_similar_to

## Knowledge Gaps
- **320 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+315 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `AuditLog model` and `Graphify Knowledge Graph Workflow`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `toErrorResponse()` connect `toErrorResponse` to `can`, `sales.ts`, `requireUser`, `db`, `rbac.ts`, `reports/route.ts`, `change-password/route.ts`, `db.ts`, `api.ts`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `requireUser()` connect `requireUser` to `toErrorResponse`, `can`, `sales.ts`, `db`, `rbac.ts`, `reports/route.ts`, `change-password/route.ts`, `db.ts`, `api.ts`, `auth.ts`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `apiGet()` connect `apiGet` to `task-bits.tsx`, `cn`, `command-palette.tsx`, `lead-tabs.tsx`, `dashboard-client.tsx`, `sales-constants.ts`, `sales-bits.tsx`, `button.tsx`, `rbac.ts`, `task-detail.tsx`, `analytics/page.tsx`, `fetcher.ts`, `task-board.tsx`, `audit/page.tsx`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _320 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `toErrorResponse` be split into smaller, more focused modules?**
  _Cohesion score 0.08355367530407191 - nodes in this community are weakly interconnected._
- **Should `can` be split into smaller, more focused modules?**
  _Cohesion score 0.10384068278805121 - nodes in this community are weakly interconnected._