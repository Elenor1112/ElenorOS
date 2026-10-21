# Graph Report - Tasks System la finalizma  (2026-10-21)

## Corpus Check
- 279 files · ~176,083 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1515 nodes · 5560 edges · 70 communities (52 shown, 18 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 43 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5f89a191`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- toErrorResponse
- cn
- job-description/route.ts
- sales.ts
- auth.ts
- avatar/route.ts
- page-header.tsx
- command-palette.tsx
- sales-bits.tsx
- employees-client.tsx
- db
- dependencies
- card.tsx
- fetcher.ts
- sales-schemas.ts
- rbac.ts
- timezone.ts
- compilerOptions
- change-password/route.ts
- requireUser
- scripts
- devDependencies
- Extraction Subagent Prompt
- utils.ts
- Effective Permissions Formula
- team-performance.tsx
- activity-report.tsx
- Tasks API Endpoints
- applySqlFile
- graphify Pipeline
- Part B Semantic Extraction
- eotm.ts
- analytics/page.tsx
- Graphify Query Traversal Flow
- ASSIGNMENT_MATRIX
- middleware.ts
- Incremental Update Flow
- Approval Routing Chain
- cmdk
- Elenor OS — Internal Operations Platform
- RBAC & Authorization Model
- Step 4 Build Cluster Analyze
- package.json
- backfill-timezone.ts
- normalize-deadlines.ts
- deadline-picker.tsx
- save-result Feedback Loop
- Step 2 Detect Files
- backfill-task-workers.ts
- reset-to-ceo.ts
- Notification Badge Icon (72px)
- EOTM & Analytics Endpoints
- update-working-hours.ts
- Notification Polling (WebSocket-ready)
- unbump-request-values.ts
- next.config.mjs
- framer-motion
- meetings/[id]/route.ts
- react-dom
- sonner
- date-fns
- postcss.config.mjs
- tailwind.config.ts
- next
- zustand
- recharts
- apiSend
- @tanstack/react-table

## God Nodes (most connected - your core abstractions)
1. `toErrorResponse()` - 209 edges
2. `requireUser()` - 183 edges
3. `audit()` - 115 edges
4. `db` - 94 edges
5. `apiSend()` - 89 edges
6. `apiGet()` - 88 edges
7. `can()` - 69 edges
8. `requireSalesModule()` - 62 edges
9. `cn()` - 62 edges
10. `ApiError` - 61 edges

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

## Communities (70 total, 18 thin omitted)

### Community 0 - "toErrorResponse"
Cohesion: 0.08
Nodes (49): GET(), DELETE(), GET(), PATCH(), updateSchema, GET(), POST(), schema (+41 more)

### Community 1 - "cn"
Cohesion: 0.12
Nodes (31): PROJECT_STATUS, CalendarView(), KanbanView(), ListView(), TableView(), DeadlinePill(), isCodeRef(), PriorityFlag() (+23 more)

### Community 2 - "job-description/route.ts"
Cohesion: 0.13
Nodes (24): DELETE(), GET(), loadEmployee(), POST(), createSchema, GET(), POST(), GET() (+16 more)

### Community 3 - "sales.ts"
Cohesion: 0.08
Nodes (68): GET(), userPick, ParentKey, PARENTS, POST(), resolveLeadId(), GET(), userPick (+60 more)

### Community 4 - "auth.ts"
Cohesion: 0.18
Nodes (10): GET(), DashboardPage(), SalesLayout(), SalesDashboardPage(), Home(), ACCESS_MAX_AGE, ACCESS_SECRET, getSessionUser() (+2 more)

### Community 5 - "avatar/route.ts"
Cohesion: 0.30
Nodes (10): DELETE(), POST(), requireAvatarAccess(), ACCEPTED_AVATAR_TYPES, readAvatarField(), removeAvatar(), saveAvatar(), sha256() (+2 more)

### Community 7 - "command-palette.tsx"
Cohesion: 0.05
Nodes (43): db, main(), seedPolicies(), db, AuditClient(), colorFor(), AppLayout(), SettingsClient() (+35 more)

### Community 8 - "sales-bits.tsx"
Cohesion: 0.08
Nodes (54): ACTION_COLOR, ActivityRow, ClientRow, BriefRow, FeedbackRow, View, LeadRef, MyDashboard (+46 more)

### Community 9 - "employees-client.tsx"
Cohesion: 0.17
Nodes (11): CreateEmployeeDialog(), Dept, Employee, EmployeesClient(), AvatarPickerButton(), CreateTaskDialog(), formatBytes(), AvatarUpload() (+3 more)

### Community 10 - "db"
Cohesion: 0.09
Nodes (38): GET(), PATCH(), schema, POST(), schema, PATCH(), schema, POST() (+30 more)

### Community 11 - "dependencies"
Cohesion: 0.06
Nodes (31): @auth/prisma-adapter, bcryptjs, class-variance-authority, clsx, @hookform/resolvers, jose, lucide-react, dependencies (+23 more)

### Community 12 - "card.tsx"
Cohesion: 0.10
Nodes (20): ApprovalsClient(), ApprovalsData, PermissionEditor(), Row, PoliciesClient(), ChangePasswordCard(), PASSWORD_RULES, axisStyle (+12 more)

### Community 13 - "fetcher.ts"
Cohesion: 0.10
Nodes (53): CLIENT_CONTACT_FIELDS, CLIENT_FIELDS, STATUS, COLORS, Dept, FormValues, schema, COMPONENTS (+45 more)

### Community 14 - "sales-schemas.ts"
Cohesion: 0.05
Nodes (40): briefSchema, commentSchema, COMPANY_SIZES, convertSchema, DECISION_TIMELINES, factor5, feedbackPatchSchema, feedbackSchema (+32 more)

### Community 15 - "rbac.ts"
Cohesion: 0.06
Nodes (89): GET(), DELETE(), loadIdea(), PATCH(), POST(), userPick, GET(), SearchHit (+81 more)

### Community 16 - "timezone.ts"
Cohesion: 0.07
Nodes (62): RFC-4180, GET(), deliveredAt(), effectiveDeadline(), GET(), OPEN, rate(), Row (+54 more)

### Community 17 - "compilerOptions"
Cohesion: 0.07
Nodes (26): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+18 more)

### Community 18 - "change-password/route.ts"
Cohesion: 0.23
Nodes (16): POST(), schema, POST(), schema, POST(), POST(), GET(), clearAuthCookies() (+8 more)

### Community 19 - "requireUser"
Cohesion: 0.07
Nodes (50): GET(), GET(), DELETE(), PATCH(), schema, POST(), GET(), GET() (+42 more)

### Community 20 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, build, db:backfill-workers, db:migrate, db:normalize-deadlines, db:push, db:reset-ceo, db:seed (+10 more)

### Community 21 - "devDependencies"
Cohesion: 0.07
Nodes (29): autoprefixer, eslint, eslint-config-next, devDependencies, autoprefixer, eslint, eslint-config-next, postcss (+21 more)

### Community 22 - "Extraction Subagent Prompt"
Cohesion: 0.18
Nodes (14): Discrete Confidence Score Rubric, DEEP_MODE Aggressive Inference, Extraction Subagent Prompt, Hyperedge Extraction Rule, Node ID Format Rule, semantically_similar_to Edge Rule, Verbatim source_file Rule, build_merge Replace-on-Re-extract (+6 more)

### Community 23 - "utils.ts"
Cohesion: 0.07
Nodes (36): DashboardClient(), AchievementsTab(), DeactivateDialog(), EditEmployeeDialog(), Employee, OverviewTab(), ResetPasswordDialog(), TABS (+28 more)

### Community 24 - "Effective Permissions Formula"
Cohesion: 0.20
Nodes (12): Auth Endpoints (login, logout, refresh, me), Authentication Flow (JWT + Rotating Refresh), getSessionUser(), State Management (TanStack Query + Session Context), Identity, Org & RBAC Domain, RefreshToken model, UserPermission override (ALLOW/DENY), Soft Deletes (deactivate, revoke tokens) (+4 more)

### Community 25 - "team-performance.tsx"
Cohesion: 0.12
Nodes (12): MemberFeedbackDialog(), RATING_WORDS, MEDALS, MemberFeedback, MiniTable(), Money(), ProfileData, RosterData (+4 more)

### Community 26 - "activity-report.tsx"
Cohesion: 0.06
Nodes (51): COLUMNS, PersonRow, Report(), ReportData, ReportsClient(), ActivityData, ActivityReport(), COLUMNS (+43 more)

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

### Community 31 - "eotm.ts"
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

### Community 39 - "Elenor OS — Internal Operations Platform"
Cohesion: 0.38
Nodes (7): Next.js App Router (RSC + Route Handlers), Elenor OS Architecture Overview, Source Folder Structure (src/app, src/components, src/lib), Deployment, Security, Testing & Roadmap, Cyan Design System, Elenor OS — Internal Operations Platform, Tech Stack (Next.js 15, TypeScript, Prisma, PostgreSQL)

### Community 40 - "RBAC & Authorization Model"
Cohesion: 0.29
Nodes (7): Production Hardening Checklist, Serverless DB Retry-with-Backoff, Vercel + Neon Deployment, RBAC & Authorization Model, Role Hierarchy (levels 0-4), NPM Scripts (db:push, db:seed, db:migrate), Seeded Local Development Accounts

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

### Community 47 - "deadline-picker.tsx"
Cohesion: 0.16
Nodes (18): CalendarGrid(), compose(), DeadlinePicker(), decompose(), formatTimeLabel(), HOURS12, joinValue(), MINUTES (+10 more)

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

### Community 59 - "unbump-request-values.ts"
Cohesion: 0.40
Nodes (3): APPLY, beforeArg, db

### Community 62 - "meetings/[id]/route.ts"
Cohesion: 0.15
Nodes (17): DELETE(), GET(), loadAttachment(), requireVisibleParent(), RFC-5987, DELETE(), GET(), loadMeeting() (+9 more)

### Community 73 - "apiSend"
Cohesion: 0.08
Nodes (71): ClientsClient(), EditClientDialog(), DepartmentsClient(), EditDepartmentDialog(), EmployeeProfile(), EotmClient(), OverrideDialog(), PickAnyDialog() (+63 more)

## Ambiguous Edges - Review These
- `AuditLog model` → `Graphify Knowledge Graph Workflow`  [AMBIGUOUS]
  CLAUDE.md · relation: semantically_similar_to

## Knowledge Gaps
- **356 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+351 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `AuditLog model` and `Graphify Knowledge Graph Workflow`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `toErrorResponse()` connect `toErrorResponse` to `job-description/route.ts`, `sales.ts`, `avatar/route.ts`, `db`, `rbac.ts`, `timezone.ts`, `change-password/route.ts`, `requireUser`, `meetings/[id]/route.ts`, `eotm.ts`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `requireUser()` connect `requireUser` to `toErrorResponse`, `job-description/route.ts`, `sales.ts`, `auth.ts`, `avatar/route.ts`, `db`, `rbac.ts`, `timezone.ts`, `change-password/route.ts`, `meetings/[id]/route.ts`, `eotm.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `can()` connect `rbac.ts` to `toErrorResponse`, `cn`, `job-description/route.ts`, `sales.ts`, `avatar/route.ts`, `command-palette.tsx`, `employees-client.tsx`, `apiSend`, `fetcher.ts`, `timezone.ts`, `requireUser`, `meetings/[id]/route.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _356 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `toErrorResponse` be split into smaller, more focused modules?**
  _Cohesion score 0.0798611111111111 - nodes in this community are weakly interconnected._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.1246376811594203 - nodes in this community are weakly interconnected._