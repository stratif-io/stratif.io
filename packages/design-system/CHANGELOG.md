# Changelog

## [0.2.0](https://github.com/stratif-io/stratif.io/compare/design-system-v0.1.0...design-system-v0.2.0) (2026-04-30)


### Features

* **design-system:** add AppHeader component ([4187adf](https://github.com/stratif-io/stratif.io/commit/4187adf0def78f1e017ce8267ddd0e52f0cde44c))
* **design-system:** add AppSidebar component ([4977783](https://github.com/stratif-io/stratif.io/commit/497778335b934bba0d4590fbc126b1bf4dd64202))
* **design-system:** add AxisPopover component with sparkline rows ([5eb6573](https://github.com/stratif-io/stratif.io/commit/5eb657352b95eb38844c36b2ca046ac97fbb194d))
* **design-system:** add footerSections prop to AppSidebar ([88a343f](https://github.com/stratif-io/stratif.io/commit/88a343f23c0e3d973c1c55a95829228121274b7d))
* **design-system:** add footerSections prop to AppSidebar ([4777933](https://github.com/stratif-io/stratif.io/commit/4777933a37c9662c3e651239192d926bda9df627))
* **design-system:** add ResizablePanel; simulator axis config opens as collapsible right panel ([18bb9b3](https://github.com/stratif-io/stratif.io/commit/18bb9b3bcc54f659cd291ab9704809f5311effcf))
* **design-system:** export AppSidebar and AppHeader ([69f1714](https://github.com/stratif-io/stratif.io/commit/69f171407c7acbe6afa2a5c7c213a0eba18d429e))
* **design-system:** extend SidebarItem with badge, children, expanded, itemWrapper ([2943327](https://github.com/stratif-io/stratif.io/commit/2943327d5be66ffc3bb9fa1333f483a31be5bf0f))
* dev TUI + design-docs overhaul ([1c59e2f](https://github.com/stratif-io/stratif.io/commit/1c59e2fd995b56c5d2f0d1b63930f74f8cf490b0))
* monorepo full reset — design system, renamed apps and services ([398d91f](https://github.com/stratif-io/stratif.io/commit/398d91f804577fcf2e1ad8b478c67cf048f07aae))
* populate packages/design-system with UI components and utilities ([da7aedd](https://github.com/stratif-io/stratif.io/commit/da7aedd4e9d5aa0ba38168ff2d3a848038917d41))
* publish @stratif-io/design-system to GitHub Packages ([d5af30a](https://github.com/stratif-io/stratif.io/commit/d5af30a11b77142b63e239ddb38c28610824c485))
* publish @stratif-io/design-system to GitHub Packages ([5e574b6](https://github.com/stratif-io/stratif.io/commit/5e574b67e363a46d7bcfa2eca09f12376bbd13d1))
* scaffold packages/design-system ([53dcb25](https://github.com/stratif-io/stratif.io/commit/53dcb253d6d31545530e426254c5f6e34cc54cf4))
* simulator design system ([a0c1c04](https://github.com/stratif-io/stratif.io/commit/a0c1c04d46a1c72b60327aacf0f3e2799f9b3739))
* **simulator:** show sparkline alongside selected value in sidebar axis items ([0f0d009](https://github.com/stratif-io/stratif.io/commit/0f0d009e73e06bad63f180b516d3e78bea25d032))
* **zoom-brush:** replace Recharts Brush with custom RangeBrush using pointer capture ([7db0e4f](https://github.com/stratif-io/stratif.io/commit/7db0e4fed4428f3e897b2e7963ee35e8b91fadb6))
* **zoom-brush:** show preview lines while dragging, zoom on release ([39e40c9](https://github.com/stratif-io/stratif.io/commit/39e40c9c209947a3aa46fd4c56c62ee5c7aa5409))


### Bug Fixes

* add seasonal growth option and align axis popover columns ([d81a9fb](https://github.com/stratif-io/stratif.io/commit/d81a9fb0379f3bdbcd2def0e1b25c14f1e31fdab))
* add Tailwind plugin to design-system lib build — CSS was missing all utility classes ([192a81d](https://github.com/stratif-io/stratif.io/commit/192a81d1a60505212c1427612770e6709d0bcb33))
* **analytics:** fix header layout and harmonise sidebar logo with demo ([3fe734f](https://github.com/stratif-io/stratif.io/commit/3fe734fe87beda9af83a839c47df3acc33dcc656))
* **analytics:** flush header to left edge, add vertical breathing room to sidebar logo ([02eda39](https://github.com/stratif-io/stratif.io/commit/02eda39407e8941b95bb41b0c6ec4c806006021b))
* build order, cmdk dep, design-system test script, update CLAUDE.md ([79573d4](https://github.com/stratif-io/stratif.io/commit/79573d48571b1f705c49897dc762379655b84741))
* correct design-system package.json (peerDeps, sideEffects, files) ([4a8c844](https://github.com/stratif-io/stratif.io/commit/4a8c844fa74f1d16983aaf0ca4037ec97f25bce3))
* **design-system:** axis-aware listbox label, sparkline safety fallback ([59591d1](https://github.com/stratif-io/stratif.io/commit/59591d15a958caea7655f534f30315a13f821ff2))
* **design-system:** center sidebar brand/collapse button when collapsed; smooth brand transition ([a91943a](https://github.com/stratif-io/stratif.io/commit/a91943a0365bf30ace23c2c60556f0a9ef56104c))
* **design-system:** export ChartSkeleton from package index ([6d4f2d9](https://github.com/stratif-io/stratif.io/commit/6d4f2d9ba28021596fb78cc055c165ed4879a0b2))
* **design-system:** replace @/ imports with relative paths ([8a2e61e](https://github.com/stratif-io/stratif.io/commit/8a2e61ee1c8ace79acd2019e3c2a27f97de697a0))
* **design-system:** replace @/ imports with relative paths ([8f23f6e](https://github.com/stratif-io/stratif.io/commit/8f23f6e91f59465ebacb2442d41669f875d1d087))
* **design-system:** tighten AppHeader gap and padding to match demo ([b513ffa](https://github.com/stratif-io/stratif.io/commit/b513ffa8a508e5bb467b756b7c5989b666889eb6))
* **design-system:** use optional chaining on onToggleExpand, add collapsed+expanded test ([513ef0c](https://github.com/stratif-io/stratif.io/commit/513ef0c30a1fb57da35dd6b00819b5e04dc8ebb8))
* duplicate React key in AppSidebar sections, tighten activeSection type ([bff25bb](https://github.com/stratif-io/stratif.io/commit/bff25bbccb01a676f995b5c4faebad191700e441))
* **simulator:** move sidebar sparkline to right, vertically centered ([53aa3c6](https://github.com/stratif-io/stratif.io/commit/53aa3c69136127bdccf301913e13bdb46f5f6af8))
* **simulator:** sidebar shows selected value below axis title; strip includes seasonality axes ([4a7312f](https://github.com/stratif-io/stratif.io/commit/4a7312f639921befc6c3e36a422284fdd737bf50))
* update Calendar component classNames for react-day-picker v9 API ([5ed9ae0](https://github.com/stratif-io/stratif.io/commit/5ed9ae0b9049ba69e0c5eae111ea8aa221de7685))
* **vite:** add index.css sub-path alias for design-system ([3b01d45](https://github.com/stratif-io/stratif.io/commit/3b01d45cb07e715133cd76ffb1aac3462f4c10d9))
* **zoom-brush:** align brush handles precisely with chart plot area ([5b68767](https://github.com/stratif-io/stratif.io/commit/5b68767e0d9d1d51ea7ee262f0666d58a6150aa7))
* **zoom-brush:** fix handle positions and live chart zooming ([418e63f](https://github.com/stratif-io/stratif.io/commit/418e63fbe6f0b6cc249811b2597bf9da58fc7a95))


### Reverts

* remove @tailwindcss/vite from design-system lib build ([bd059ff](https://github.com/stratif-io/stratif.io/commit/bd059ff4847a933e8607615ec04c0a72a43e1f19))
