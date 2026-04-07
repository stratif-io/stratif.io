# Changelog

## [0.19.1](https://github.com/stratif-io/stratif.io/compare/v0.19.0...v0.19.1) (2026-04-07)


### Bug Fixes

* prevent infinite loop when navigating away from funnel page ([d043d84](https://github.com/stratif-io/stratif.io/commit/d043d84263a897d1ca892ceb3a2869ef14f6d25f))

## [0.19.0](https://github.com/stratif-io/stratif.io/compare/v0.18.5...v0.19.0) (2026-04-04)


### Features

* add Funnel nav item to sidebar ([882b69c](https://github.com/stratif-io/stratif.io/commit/882b69c51293f48ca3a991eb23f6b68617917863))
* apply semantic color variety to FunnelDetailPage summary cards ([50bef55](https://github.com/stratif-io/stratif.io/commit/50bef55b32266722d56038a66641f72ee6b8c463))
* expand event color palette to 10 distinct colors (add chart-6..10) ([a8291df](https://github.com/stratif-io/stratif.io/commit/a8291df0790d4427f62cebc7b10162a05af6ab27))
* move trend controls to toolbar above card, add TrendFilters compact mode ([0f59d60](https://github.com/stratif-io/stratif.io/commit/0f59d6097e2aa182c691445e3f0a8aa5f1562382))
* redesign FunnelSteps — color-coded circles, rounded bars, new connectors ([a022174](https://github.com/stratif-io/stratif.io/commit/a022174091a09d934485390b735f036fc7835625))
* redesign PathFunnelDialog — remove device filter, path chips, colored cards ([6d899ce](https://github.com/stratif-io/stratif.io/commit/6d899ce93e871fa5dcd887c6ccd0261a135c8896))
* remove DevCard component and all usages ([c83fe34](https://github.com/stratif-io/stratif.io/commit/c83fe3472b8175b005125342f116555e8d313e63))
* remove devMode state from app-store ([984b4ef](https://github.com/stratif-io/stratif.io/commit/984b4efc2388a6f0e96852fb57c2a2138aab91f8))
* use per-event colors in PathFunnelDialog chips — matches path list color coding ([c8c2654](https://github.com/stratif-io/stratif.io/commit/c8c2654c0417fb04af9e04971b38fbd80db97834))


### Bug Fixes

* address code review feedback — dead alias, stale comment, positioning, type fix ([ad21d0c](https://github.com/stratif-io/stratif.io/commit/ad21d0c278ee3b7d81e69472142e96d740f68e5f))
* disable pointer events on DevCard back face when not flipped ([bedde3a](https://github.com/stratif-io/stratif.io/commit/bedde3a591e440eff32b9b410bcb35ee2778008a))
* mock useSearchParams in FunnelDetailPage test to prevent infinite re-render loop ([bdec652](https://github.com/stratif-io/stratif.io/commit/bdec6527c0c624ff68dd82e36fc4f19cc6110e1d))
* remove redundant date sync effects from FunnelDetailPage — useUrlSync handles this ([1693428](https://github.com/stratif-io/stratif.io/commit/1693428226b28e2772aff4d99d3922636858ea8f))
* restore DevCard component and re-add to all call sites ([2dc74a9](https://github.com/stratif-io/stratif.io/commit/2dc74a95b6c3cd86c8e0294ae2facff401f9a966))

## [0.18.5](https://github.com/stratif-io/stratif.io/compare/v0.18.4...v0.18.5) (2026-04-03)


### Bug Fixes

* **install:** detect sh and print clear error directing user to use bash ([78d68bf](https://github.com/stratif-io/stratif.io/commit/78d68bfc5dc45f4bc3ca2b97f6dee367b19c84aa))
* **install:** rewrite as POSIX sh — works with both sh and bash ([ab1669f](https://github.com/stratif-io/stratif.io/commit/ab1669fe40f86482183d44736d113b6b658364d8))

## [0.18.4](https://github.com/stratif-io/stratif.io/compare/v0.18.3...v0.18.4) (2026-04-03)


### Bug Fixes

* **ci:** auto-regenerate uv.lock at pre-commit time instead of just checking ([e3ff024](https://github.com/stratif-io/stratif.io/commit/e3ff024cadd54d69b526f81178bafa2d009ddf4f))
* **ci:** push Docker image to ghcr.io/stratif-io instead of cabichahine ([fa4265e](https://github.com/stratif-io/stratif.io/commit/fa4265e23e3582a9fec2a7557a8ffeba4b9b7114))
* **install:** replace bash array GH_AUTH_ARGS with gh_curl helper ([1a0bcd0](https://github.com/stratif-io/stratif.io/commit/1a0bcd0d3c9f7187c47308cd5ec3989dc2dfaefa))

## [0.18.3](https://github.com/stratif-io/stratif.io/compare/v0.18.2...v0.18.3) (2026-04-03)


### Bug Fixes

* exclude .venv from copy, use GITHUB_TOKEN for private repo testing ([2fae36c](https://github.com/stratif-io/stratif.io/commit/2fae36c4dac1d50077c51c37a2155d69aa30a257))
* **install:** use GitHub API to fetch release asset, support private repo with GITHUB_TOKEN ([434d156](https://github.com/stratif-io/stratif.io/commit/434d15663c403572f530e7483d70d2d5be2cbb70))

## [0.18.2](https://github.com/stratif-io/stratif.io/compare/v0.18.1...v0.18.2) (2026-04-03)


### Bug Fixes

* exclude .venv from copy, use venv binaries directly, fix mktemp suffix ([e7302e4](https://github.com/stratif-io/stratif.io/commit/e7302e4dfdeb6d5870f0545969fc278b730eb8c4))
* remove .tar.gz suffix from mktemp template (breaks on macOS) ([b09fc13](https://github.com/stratif-io/stratif.io/commit/b09fc1343d4b5b788eb525bbbfd225ed3f07438d))

## [0.18.1](https://github.com/stratif-io/stratif.io/compare/v0.18.0...v0.18.1) (2026-04-03)


### Bug Fixes

* correct REPO to stratif-io/stratif.io in install.sh ([b473aa2](https://github.com/stratif-io/stratif.io/commit/b473aa2844a0cc2a96ecabcfa22731d1b063bc2d))
* improve install.sh UX — step labels, spinner, fix cp excluding .git ([26852a3](https://github.com/stratif-io/stratif.io/commit/26852a3efc1370c62a4ba721ff88a25cbae7619d))

## [0.18.0](https://github.com/cabichahine/stratif.io/compare/v0.17.1...v0.18.0) (2026-04-02)


### Features

* add SQLAlchemy ORM models for product DB ([6b764fb](https://github.com/cabichahine/stratif.io/commit/6b764fbafe22c8b519472239e3798f3fe6634354))
* add sqlalchemy[asyncio], aiosqlite, asyncpg, pytest-asyncio deps ([0b248d6](https://github.com/cabichahine/stratif.io/commit/0b248d606c35ab169e9d00e548bdf86250d77881))
* async get_db() dependency + create_all schema init ([8f49447](https://github.com/cabichahine/stratif.io/commit/8f49447a6fb62f770b6f89c23bb6e73fdddce498))
* async SQLAlchemy engine + updated product_db_url default ([c43601b](https://github.com/cabichahine/stratif.io/commit/c43601bea5206dbb2a0a85c04d43fccc9e1249b6))
* complete SQLAlchemy async ORM migration — all tests passing ([5cea98f](https://github.com/cabichahine/stratif.io/commit/5cea98fb7403cbb15f6fb1679b25ffa5e87d29b1))
* make open_analytics_db async, use AsyncSession ([6d3a514](https://github.com/cabichahine/stratif.io/commit/6d3a514e1302815f9771cc27df49699e8e3293bb))
* rewrite connections crud.py with SQLAlchemy async ORM ([3f14e87](https://github.com/cabichahine/stratif.io/commit/3f14e87b327e961d6a147d748cbe6f63978c7745))
* update browse, schema_detect, auth to use DBSession ([df55056](https://github.com/cabichahine/stratif.io/commit/df550560f6610fd8ac96e96e99ef856c640535c7))
* update e2e conftest to use async SQLAlchemy product DB setup ([b1176df](https://github.com/cabichahine/stratif.io/commit/b1176df55af8ac3e84b5dab0e69efe4016bc3a51))


### Bug Fixes

* resolve ruff linting errors ([aa7e841](https://github.com/cabichahine/stratif.io/commit/aa7e841552a3862e94a5be7ebe78fbc23240c185))
* rewrite bootstrap_connection seeder and tests for async ORM ([cbd936a](https://github.com/cabichahine/stratif.io/commit/cbd936a7802468f21f8caef2372de51672e03184))

## [0.17.1](https://github.com/cabichahine/stratif.io/compare/v0.17.0...v0.17.1) (2026-04-02)


### Bug Fixes

* trigger release-please ([fb9d6ab](https://github.com/cabichahine/stratif.io/commit/fb9d6ab77bf8572d8bca1ab76c986a544d88ce46))

## [0.17.0](https://github.com/cabichahine/stratif.io/compare/v0.16.0...v0.17.0) (2026-04-01)


### Features

* replace Docker installer with curl | sh using uv + GitHub release assets ([6ffa8a2](https://github.com/cabichahine/stratif.io/commit/6ffa8a25a8528f985d43ff69a6031db2900521d1))


### Bug Fixes

* **a11y:** hide decorative icon container from screen reader tree in EmptyState ([81ef1f5](https://github.com/cabichahine/stratif.io/commit/81ef1f56e4ece41252815ba68fe50cd86593f244))
* **a11y:** increase DateRangePicker inline trigger to 44px touch target ([3c59f79](https://github.com/cabichahine/stratif.io/commit/3c59f794307564c1c7302a1874209a6443fc9b0d))
* **a11y:** increase touch targets to minimum 44px in filters and sidebar nav ([93162c5](https://github.com/cabichahine/stratif.io/commit/93162c5b453522fe4d6d4d45427ffe0caff86aef))
* **a11y:** make sidebar mobile overlay discoverable to screen readers ([2684bba](https://github.com/cabichahine/stratif.io/commit/2684bba68f293ea645670d4f0819ecbb177d0f5d))
* **a11y:** move clear button outside PopoverTrigger — nested buttons invalid HTML ([efa8bd3](https://github.com/cabichahine/stratif.io/commit/efa8bd326d930fc5c58bd227a9455e05e21b7c1c))
* **ci:** skip git clone in test — use checked-out repo via STRATIFIO_REPO_DIR ([f0b6885](https://github.com/cabichahine/stratif.io/commit/f0b6885b65d347644fd7343f8b927b3cd61e49d7))
* **css:** remove hover-scale — creates stacking context that clips popovers ([4fb645d](https://github.com/cabichahine/stratif.io/commit/4fb645d1413c2ce42d95aef2383be70a287a16fc))
* disable git credential prompt when running via curl | bash ([62afa86](https://github.com/cabichahine/stratif.io/commit/62afa86744e1bfe6e0488cd915707523767ebc3e))
* **install:** extract frontend dist to INSTALL_DIR root ([319ccbd](https://github.com/cabichahine/stratif.io/commit/319ccbd41ae7875002bb7a5165155ccde6d83be6))
* **install:** generate connections.yaml and fix seeder invocation ([20e6f3e](https://github.com/cabichahine/stratif.io/commit/20e6f3ed38b6f1f4dab5ae4362f4a0881fe2c5f6))
* **mobile:** guard global hover transitions with hover:hover media query ([82771a6](https://github.com/cabichahine/stratif.io/commit/82771a69536054cde97626a5fe66544e3451b0fb))
* **mobile:** keep filter bar horizontal on all screens — scroll instead of stack ([ea13e30](https://github.com/cabichahine/stratif.io/commit/ea13e303feedda3f640d97fd1af261215e302a2e))
* **polish:** align MetricCardSkeleton radius with actual cards (rounded-xl) ([42a0689](https://github.com/cabichahine/stratif.io/commit/42a068938da08ea999b2926f8b8a3fa128850486))
* **polish:** normalize page title style across feature pages ([f5f02ba](https://github.com/cabichahine/stratif.io/commit/f5f02baad4b37779c7a4616d9a535b6516994816))
* **theme:** differentiate card surface from page background in dark mode ([abca4d3](https://github.com/cabichahine/stratif.io/commit/abca4d3cd6d46bcc9f3322571752862278f9ae80))
* **theme:** use CSS variable-based heatmap colors that work in dark mode ([5addf5e](https://github.com/cabichahine/stratif.io/commit/5addf5ed864891e6ce6074fe4dace559ac0f6e88))
* **ux:** make sparklines legible in mini cards — dedicated bottom strip with gradient fill ([01c584b](https://github.com/cabichahine/stratif.io/commit/01c584bf50894399d536941561646db11a58f13a))
* **ux:** show Monitor icon in theme toggle when system mode is active ([2d9126b](https://github.com/cabichahine/stratif.io/commit/2d9126b63eb610e536a1a165a2ecf931ca3d4be7))

## [0.16.0](https://github.com/cabichahine/stratif.io/compare/v0.15.0...v0.16.0) (2026-04-01)


### Features

* breakdown goes to pivot columns, date stays as row group ([01b2ff4](https://github.com/cabichahine/stratif.io/commit/01b2ff42c1af39c0143e8ef9dea60e768f46553d))


### Bug Fixes

* add ([5bddeea](https://github.com/cabichahine/stratif.io/commit/5bddeea1be9324f53ca86bf592cd6cf6eedaeff3))
* run pre-commit from Husky and resolve all ty type errors ([758b144](https://github.com/cabichahine/stratif.io/commit/758b14429a1b70c9c9e498ca1327a0b19ffe71ca))
* seed time dimension into rows even when initialValueCols is provided ([19a218a](https://github.com/cabichahine/stratif.io/commit/19a218a2b304ec987573cf33edf93cbf48b6e96b))

## [0.15.0](https://github.com/cabichahine/stratif.io/compare/v0.14.0...v0.15.0) (2026-04-01)


### Features

* **dev:** add run button to DevCard back face ([#168](https://github.com/cabichahine/stratif.io/issues/168)) ([24506fa](https://github.com/cabichahine/stratif.io/commit/24506fa94365a4a30bd5b487ab55d0981b86ec2c))

## [0.14.0](https://github.com/cabichahine/stratif.io/compare/v0.13.0...v0.14.0) (2026-04-01)


### Features

* add Metrics category to dimension-categories config ([889e2aa](https://github.com/cabichahine/stratif.io/commit/889e2aa46cebaf537f77e8b82f16e48c7bbe9402))
* add shared AggBadge component with popover agg picker ([434eba2](https://github.com/cabichahine/stratif.io/commit/434eba22c0d9804e704fe0bb23c3be6f5bc92eb9))
* extend LeafMeta and ValuePickerPopover with trigger, fixedAgg, category ([99816b6](https://github.com/cabichahine/stratif.io/commit/99816b6c6485f8caa69b134a8704a2c9f36d85ec))
* move ValuePickerPopover to shared components; add all dimensions to Trends picker ([2de5e73](https://github.com/cabichahine/stratif.io/commit/2de5e73280d3904ee49ed741fa52795d02678171))
* replace cycle button with AggBadge in pivot ValueChip ([c0e9ca3](https://github.com/cabichahine/stratif.io/commit/c0e9ca3817ab3d5002d0239150238beee121ad81))
* rewrite TrendMetricPicker as thin adapter over ValuePickerPopover ([bfc60cd](https://github.com/cabichahine/stratif.io/commit/bfc60cd3152d1e9d78515023f011088a87a17cad))
* **trends:** integrate AggBadge into TrendMetricPicker chip ([758fa25](https://github.com/cabichahine/stratif.io/commit/758fa25e5cb7b09ebac8a75bddcc40a8136d8dcb))
* unify trends toolbar controls to h-7 chip/inner-pill style ([f38afef](https://github.com/cabichahine/stratif.io/commit/f38afef8a12269a9fa2799454f94c38d74d9b7e0))


### Bug Fixes

* allow count/count_distinct on standard dimensions (user_id, country, etc.) ([5c0c56f](https://github.com/cabichahine/stratif.io/commit/5c0c56fdb688921027daf2d226dfed5316652157))
* build_filter_clauses must check filter_exprs not only custom_prop_exprs ([09fbaf1](https://github.com/cabichahine/stratif.io/commit/09fbaf1787a49fa178cc06210ae7ace2283f5ff5))
* dotted path filter fields resolve to JSON extraction not quoted identifier ([8f8bcc5](https://github.com/cabichahine/stratif.io/commit/8f8bcc5e9d58729424d1808f0e1e5587d60ca354))
* identity field expressions use _resolve_path_to_sql to support dotted paths ([a084e46](https://github.com/cabichahine/stratif.io/commit/a084e4675f7bb65a9a70855be0d0355202c8021f))
* include identity fields in filter_exprs so global filters work ([88b795b](https://github.com/cabichahine/stratif.io/commit/88b795b721de803cfd6e508dba074dc38a1e23d2))
* plain column filter fields work without identity field mapping ([17bf6fc](https://github.com/cabichahine/stratif.io/commit/17bf6fccc7f9cd3e93fd909912f8f984fc821e3e))
* remove special Metrics category from TrendMetricPicker — use natural categories like Pivot ([14e0407](https://github.com/cabichahine/stratif.io/commit/14e0407d90329fab1f141a81ab6f55a8ce13a184))
* resolve all ruff violations (B904, B905, E702, F401, C408, SIM108, SIM117, E402, B008, F811, B017) ([01bd536](https://github.com/cabichahine/stratif.io/commit/01bd536bb908ffe27ab22117725d52b38098c2bf))
* run ruff format + add pull-requests:write for pr-title job ([066a4fd](https://github.com/cabichahine/stratif.io/commit/066a4fdea62ebdf8c37b1616971e10aa3649dda8))
* sort imports in test file (ruff I001) ([ec1ba07](https://github.com/cabichahine/stratif.io/commit/ec1ba07cbefae08566415d63432f1b412f9b4a53))
* update uv.lock (stratifio-core 0.12.0 → 0.13.0) ([#158](https://github.com/cabichahine/stratif.io/issues/158)) ([ed7ae4f](https://github.com/cabichahine/stratif.io/commit/ed7ae4f4ed691d6f61683c11bcef25fe843482c3))
* wire onAggChange in design system demo; test countDistinct badge passthrough ([105b607](https://github.com/cabichahine/stratif.io/commit/105b6072de5d1c12a38debc55bc7966f20063a9a))

## [0.13.0](https://github.com/cabichahine/stratif.io/compare/v0.12.0...v0.13.0) (2026-04-01)

### Features

- Develop ([#152](https://github.com/cabichahine/stratif.io/issues/152)) ([4bc1e42](https://github.com/cabichahine/stratif.io/commit/4bc1e427087f13af573dbda4bba75c6b48f8131e))

## [0.12.0](https://github.com/cabichahine/stratif.io/compare/v0.11.0...v0.12.0) (2026-04-01)

### Features

- **pivot:** default state, unified zone bar, two-panel value picker, SQL badge toggle ([#144](https://github.com/cabichahine/stratif.io/issues/144)) ([3001538](https://github.com/cabichahine/stratif.io/commit/30015380ddd5ca43e9610d7e5a6b087bf3e969f8))
- precise period labels in SQL viewer and metric cards ([#148](https://github.com/cabichahine/stratif.io/issues/148)) ([0e52a28](https://github.com/cabichahine/stratif.io/commit/0e52a28eb5a57550f69337eac24a9794156a20e8))

## [0.11.0](https://github.com/cabichahine/stratif.io/compare/v0.10.0...v0.11.0) (2026-03-31)

### Features

- Develop ([#142](https://github.com/cabichahine/stratif.io/issues/142)) ([382f32c](https://github.com/cabichahine/stratif.io/commit/382f32ca8cb9df2ca6008c2f558a2c09bd102cfc))

## [0.10.0](https://github.com/cabichahine/stratif.io/compare/v0.9.0...v0.10.0) (2026-03-31)

### Features

- add missing components to design system ([#139](https://github.com/cabichahine/stratif.io/issues/139)) ([3014497](https://github.com/cabichahine/stratif.io/commit/301449784d8acf5586cafa1b1f448094b5ce4065))

## [0.9.0](https://github.com/cabichahine/stratif.io/compare/v0.8.0...v0.9.0) (2026-03-31)

### Features

- global granularity control (hour/day/week/month/quarter/year) ([#137](https://github.com/cabichahine/stratif.io/issues/137)) ([c159187](https://github.com/cabichahine/stratif.io/commit/c15918733c18401d5bf4a61f4c6900153c00e871))

## [0.8.0](https://github.com/cabichahine/stratif.io/compare/v0.7.0...v0.8.0) (2026-03-30)

### Features

- **dashboard:** Mission Control v2 — metrics grid, SQL viewer, theme support ([#129](https://github.com/cabichahine/stratif.io/issues/129)) ([b689b65](https://github.com/cabichahine/stratif.io/commit/b689b6576b2e044289380ff8ace49f9f45e743bb))

## [0.7.0](https://github.com/cabichahine/stratif.io/compare/v0.6.0...v0.7.0) (2026-03-30)

### Features

- People page — user list + event timeline with property inspector ([#125](https://github.com/cabichahine/stratif.io/issues/125)) ([bff2199](https://github.com/cabichahine/stratif.io/commit/bff2199b74bf60b2082a1f5a64882ac6237605dd))

## [0.6.0](https://github.com/cabichahine/stratif.io/compare/v0.5.1...v0.6.0) (2026-03-29)

### Features

- per-query SQL Studio buttons in DevCard SQL viewer ([#113](https://github.com/cabichahine/stratif.io/issues/113)) ([4c82b0e](https://github.com/cabichahine/stratif.io/commit/4c82b0e9c1f0bfbf41d269b4638da3afa0a1fcd6))

## [0.5.1](https://github.com/cabichahine/stratif.io/compare/v0.5.0...v0.5.1) (2026-03-29)

### Bug Fixes

- impeccable audit — UX polish, a11y, performance, and theming fixes ([#108](https://github.com/cabichahine/stratif.io/issues/108)) ([1af11d5](https://github.com/cabichahine/stratif.io/commit/1af11d5283456056b00830800aefc9b6570f51be))

## [0.5.0](https://github.com/cabichahine/stratif.io/compare/v0.4.1...v0.5.0) (2026-03-29)

### Features

- replace accordion tree with two-panel column picker ([#104](https://github.com/cabichahine/stratif.io/issues/104)) ([fec1993](https://github.com/cabichahine/stratif.io/commit/fec1993a7d8058377e2be936f5fe308f26cdb626))

## [0.4.1](https://github.com/cabichahine/stratif.io/compare/v0.4.0...v0.4.1) (2026-03-28)

### Bug Fixes

- bug bash 2 — error states, retry, and export feedback ([#102](https://github.com/cabichahine/stratif.io/issues/102)) ([205157a](https://github.com/cabichahine/stratif.io/commit/205157a836789223a4020083300e571057a519de))

## [0.4.0](https://github.com/cabichahine/stratif.io/compare/v0.3.2...v0.4.0) (2026-03-28)

### Features

- merge schema and filters into one wizard step ([#96](https://github.com/cabichahine/stratif.io/issues/96)) ([f443e9a](https://github.com/cabichahine/stratif.io/commit/f443e9a5027ae0c8d9c0c39b007d35b07e428d97))

## [0.3.2](https://github.com/cabichahine/stratif.io/compare/v0.3.1...v0.3.2) (2026-03-28)

### Bug Fixes

- **dashboard:** restore sparklines and TopEvents bars ([#99](https://github.com/cabichahine/stratif.io/issues/99)) ([2f4c33d](https://github.com/cabichahine/stratif.io/commit/2f4c33df3aa9a24cafc745e9d55c611676687a54))

## [0.3.1](https://github.com/cabichahine/stratif.io/compare/v0.3.0...v0.3.1) (2026-03-28)

### Bug Fixes

- **layout:** make Explore pages full-height like SQL Studio ([#97](https://github.com/cabichahine/stratif.io/issues/97)) ([ef9594e](https://github.com/cabichahine/stratif.io/commit/ef9594e2ff4b8d1830555b762ced1b56afcd799d))

## [0.3.0](https://github.com/cabichahine/stratif.io/compare/v0.2.0...v0.3.0) (2026-03-28)

### Features

- **design-system:** add missing components to design system page ([#94](https://github.com/cabichahine/stratif.io/issues/94)) ([e568e87](https://github.com/cabichahine/stratif.io/commit/e568e8779f34b6b979748ec5e1ba0b41832f9579))

## [0.2.0](https://github.com/cabichahine/stratif.io/compare/v0.1.8...v0.2.0) (2026-03-28)

### Features

- bug bash — UX polish (5 fixes) ([#92](https://github.com/cabichahine/stratif.io/issues/92)) ([7e7c2a5](https://github.com/cabichahine/stratif.io/commit/7e7c2a5ae818d42726c11ba6896e8fa3f2cabae2))

## [0.1.8](https://github.com/cabichahine/stratif.io/compare/v0.1.7...v0.1.8) (2026-03-28)

### Bug Fixes

- add apps/web/package.json to release-please extra-files and sync to v0.1.7 ([#90](https://github.com/cabichahine/stratif.io/issues/90)) ([cc0d168](https://github.com/cabichahine/stratif.io/commit/cc0d16899cbe0e2891463844cd7c32fc9edde698))

## [0.1.7](https://github.com/cabichahine/stratif.io/compare/v0.1.6...v0.1.7) (2026-03-28)

### Bug Fixes

- add ghcr.io badge to README ([#77](https://github.com/cabichahine/stratif.io/issues/77)) ([dff3dcd](https://github.com/cabichahine/stratif.io/commit/dff3dcd2990e2a78a8da083ce07a24e183d8fe72))
- configure release-please bootstrap-sha and packages ([#76](https://github.com/cabichahine/stratif.io/issues/76)) ([b46b4f6](https://github.com/cabichahine/stratif.io/commit/b46b4f6a3059d7a68354b18bd87c9f2ea8c4d6c5))
- move Docker build into release-please workflow ([#81](https://github.com/cabichahine/stratif.io/issues/81)) ([c860078](https://github.com/cabichahine/stratif.io/commit/c86007891928948c91447e1200c2a78993fdddac))
- trigger Docker build on tag push instead of release published ([#79](https://github.com/cabichahine/stratif.io/issues/79)) ([81e8a76](https://github.com/cabichahine/stratif.io/commit/81e8a7611eda00335c7b233c5cd59142201b4791))
- update feature table to reflect renamed nav labels (Journey, Pivot, SQL Studio) ([#87](https://github.com/cabichahine/stratif.io/issues/87)) ([4b1c9ed](https://github.com/cabichahine/stratif.io/commit/4b1c9edef749a66e9bcfcba62095bb4e753dc452))

## [0.1.6](https://github.com/cabichahine/stratif.io/compare/v0.1.5...v0.1.6) (2026-03-28)

### Bug Fixes

- update feature table to reflect renamed nav labels (Journey, Pivot, SQL Studio) ([#87](https://github.com/cabichahine/stratif.io/issues/87)) ([4b1c9ed](https://github.com/cabichahine/stratif.io/commit/4b1c9edef749a66e9bcfcba62095bb4e753dc452))

## [0.1.5](https://github.com/cabichahine/stratif.io/compare/v0.1.4...v0.1.5) (2026-03-27)

### Bug Fixes

- move Docker build into release-please workflow ([#81](https://github.com/cabichahine/stratif.io/issues/81)) ([c860078](https://github.com/cabichahine/stratif.io/commit/c86007891928948c91447e1200c2a78993fdddac))

## [0.1.4](https://github.com/cabichahine/stratif.io/compare/v0.1.3...v0.1.4) (2026-03-27)

### Bug Fixes

- trigger Docker build on tag push instead of release published ([#79](https://github.com/cabichahine/stratif.io/issues/79)) ([81e8a76](https://github.com/cabichahine/stratif.io/commit/81e8a7611eda00335c7b233c5cd59142201b4791))

## [0.1.3](https://github.com/cabichahine/stratif.io/compare/v0.1.2...v0.1.3) (2026-03-27)

### Bug Fixes

- add ghcr.io badge to README ([#77](https://github.com/cabichahine/stratif.io/issues/77)) ([dff3dcd](https://github.com/cabichahine/stratif.io/commit/dff3dcd2990e2a78a8da083ce07a24e183d8fe72))
- configure release-please bootstrap-sha and packages ([#76](https://github.com/cabichahine/stratif.io/issues/76)) ([b46b4f6](https://github.com/cabichahine/stratif.io/commit/b46b4f6a3059d7a68354b18bd87c9f2ea8c4d6c5))
