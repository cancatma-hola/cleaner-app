# Graph Report - CLEANER  (2026-05-24)

## Corpus Check
- 42 files · ~9,754 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 175 nodes · 285 edges · 17 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d8da3b31`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]

## God Nodes (most connected - your core abstractions)
1. `useAppStore` - 17 edges
2. `ScannedFile` - 9 edges
3. `formatBytes()` - 8 edges
4. `useTrash()` - 8 edges
5. `WorkerPool` - 7 edges
6. `AppSettings` - 5 edges
7. `ActionBar()` - 5 edges
8. `DuplicateGroup` - 4 edges
9. `ScanConfig` - 4 edges
10. `ScanResult` - 4 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `useAppStore`  [EXTRACTED]
  src/renderer/src/App.tsx → src/renderer/src/store/app.store.ts
- `Sidebar()` --calls--> `useAppStore`  [EXTRACTED]
  src/renderer/src/components/Sidebar.tsx → src/renderer/src/store/app.store.ts
- `useScan()` --calls--> `useAppStore`  [EXTRACTED]
  src/renderer/src/hooks/useScan.ts → src/renderer/src/store/app.store.ts
- `ActionBar()` --calls--> `useAppStore`  [EXTRACTED]
  src/renderer/src/components/ActionBar.tsx → src/renderer/src/store/app.store.ts
- `ActionBar()` --calls--> `useTrash()`  [EXTRACTED]
  src/renderer/src/components/ActionBar.tsx → src/renderer/src/hooks/useTrash.ts

## Communities (17 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (23): ActionBar(), ActionBarProps, daysSince, ext, IMAGE_EXTS, isImage, PreviewPanelProps, useTrash() (+15 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (14): api, CleanerAPI, Window, getCategoryBreakdown(), getDiskInfo(), SKIP_DIRS, sum, mockResult (+6 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (12): NAV_ITEMS, Sidebar(), useScan(), CATEGORY_COLORS, [diskInfo, setDiskInfo], { scanResult, isScanning, scanProgress, setActiveView }, { startScan }, App() (+4 more)

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (12): CATEGORIES, categoryCounts, [categoryFilter, setCategoryFilter], DAYS_FILTERS, [daysFilter, setDaysFilter], daysSince, files, isSelected (+4 more)

### Community 4 - "Community 4"
Cohesion: 0.21
Nodes (8): registerScannerIpc(), registerStoreIpc(), registerTrashIpc(), setupScheduler(), updateSchedule(), store, AppSettings, DEFAULT_SETTINGS

### Community 5 - "Community 5"
Cohesion: 0.21
Nodes (10): dir, files, groups, DuplicateGroup, ScannedFile, { files }, groupDuplicates(), groups (+2 more)

### Community 6 - "Community 6"
Cohesion: 0.24
Nodes (8): entries, { files }, groups, groupSimilar(), hammingDistance(), IMAGE_EXTS, imageFiles, similarity()

### Community 7 - "Community 7"
Cohesion: 0.24
Nodes (8): addPath(), [local, setLocal], [newPath, setNewPath], [saved, setSaved], [saveError, setSaveError], { settings, setSettings }, update(), updateScanConfig()

### Community 8 - "Community 8"
Cohesion: 0.2
Nodes (9): Build, cleaner, code:bash ($ npm install), code:bash ($ npm run dev), code:bash (# For windows), Development, Install, Project Setup (+1 more)

### Community 9 - "Community 9"
Cohesion: 0.28
Nodes (3): WorkerPool, pool, terminate

### Community 10 - "Community 10"
Cohesion: 0.36
Nodes (6): dir, categorize(), files, scanDirectory(), shouldSkip(), SYSTEM_DIRS

## Knowledge Gaps
- **71 isolated node(s):** `mockResult`, `pool`, `terminate`, `dir`, `sum` (+66 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ScannedFile` connect `Community 5` to `Community 0`, `Community 1`, `Community 3`, `Community 6`, `Community 10`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `WorkerPool` connect `Community 9` to `Community 1`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `useAppStore` connect `Community 0` to `Community 2`, `Community 3`, `Community 7`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `mockResult`, `pool`, `terminate` to the rest of the system?**
  _71 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._