# Changelog

## [0.41.0](https://github.com/stratif-io/stratif.io/compare/v0.40.3...v0.41.0) (2026-04-30)


### Features

* **design-system:** add footerSections prop to AppSidebar ([88a343f](https://github.com/stratif-io/stratif.io/commit/88a343f23c0e3d973c1c55a95829228121274b7d))
* **design-system:** add footerSections prop to AppSidebar ([4777933](https://github.com/stratif-io/stratif.io/commit/4777933a37c9662c3e651239192d926bda9df627))
* publish @stratif-io/design-system to GitHub Packages ([d5af30a](https://github.com/stratif-io/stratif.io/commit/d5af30a11b77142b63e239ddb38c28610824c485))
* publish @stratif-io/design-system to GitHub Packages ([5e574b6](https://github.com/stratif-io/stratif.io/commit/5e574b67e363a46d7bcfa2eca09f12376bbd13d1))

## [0.40.3](https://github.com/stratif-io/stratif.io/compare/v0.40.2...v0.40.3) (2026-04-29)


### Bug Fixes

* move @stratif-io/design-system to devDependencies in analytics package ([2be1ffe](https://github.com/stratif-io/stratif.io/commit/2be1ffe3b269ed5a6930a81576fc4daab0f96fac))
* move @stratif-io/design-system to devDependencies so it's not in published package ([9421513](https://github.com/stratif-io/stratif.io/commit/94215135aef14cd706b01212c89b4471a392bdd7))

## [0.40.2](https://github.com/stratif-io/stratif.io/compare/v0.40.1...v0.40.2) (2026-04-29)


### Bug Fixes

* exec start.sh so server survives curl | sh pipe ([2353c12](https://github.com/stratif-io/stratif.io/commit/2353c12807d7eb489917543851044b2c0cf7bff7))
* exec start.sh so server survives curl | sh pipe ([7c67538](https://github.com/stratif-io/stratif.io/commit/7c67538fd6869981af5cb60a8c9ef7af9664ee12))
* use export instead of inline env for exec in start.sh ([86288c8](https://github.com/stratif-io/stratif.io/commit/86288c8f8d0773868022a738b177f181c8ed7f80))

## [0.40.1](https://github.com/stratif-io/stratif.io/compare/v0.40.0...v0.40.1) (2026-04-29)


### Bug Fixes

* build design system before frontend in release workflow ([8891f7a](https://github.com/stratif-io/stratif.io/commit/8891f7adccd507a93df44746b9a169a98184fc45))
* build design system before frontend in release workflow ([a092f99](https://github.com/stratif-io/stratif.io/commit/a092f992179d570b27d4a294fbd24d2006ecfdc8))

## [0.40.0](https://github.com/stratif-io/stratif.io/compare/v0.39.0...v0.40.0) (2026-04-29)


### Features

* add apps/design-docs — design system component browser ([af02936](https://github.com/stratif-io/stratif.io/commit/af0293622c17e04e19fee97421a2fec393f358f3))
* add Events tab with preset picker, node graph, and transition matrix ([586824a](https://github.com/stratif-io/stratif.io/commit/586824aebf12aaccb72063ddebf48cbe498b8d9c))
* add feature_regression anomaly type to ANOMALY_SPEC ([77c274f](https://github.com/stratif-io/stratif.io/commit/77c274f867bf6f54f6d794128f0a2ded420bf25e))
* add LogPane component to dev TUI ([a3f9086](https://github.com/stratif-io/stratif.io/commit/a3f90864e88dc9a4a520aa07e65b3758ca6628dc))
* add MarkovConfig + MarkovRunner ([b025ec6](https://github.com/stratif-io/stratif.io/commit/b025ec663875af9373e13219a9abbce296be5447))
* add MarkovConfig types and Zod schema ([553fe27](https://github.com/stratif-io/stratif.io/commit/553fe27d3d819bd2d0b24632e0cd2fdb2dba283f))
* add MarkovGraph React Flow node graph ([485a287](https://github.com/stratif-io/stratif.io/commit/485a287c0a7b1f586a3199fb880a5a660b48e1cf))
* add MarkovMatrix editable transition table ([a5c6f80](https://github.com/stratif-io/stratif.io/commit/a5c6f80e4b0dd2849936f04cd3b889a9de8f31c6))
* add markovValidation + 10 built-in Markov presets ([bc4e5aa](https://github.com/stratif-io/stratif.io/commit/bc4e5aa12b544193b99a6c14d89cfb570fc56589))
* add ProcessManager to dev TUI ([cb0d322](https://github.com/stratif-io/stratif.io/commit/cb0d322eb1054cea0fa7e1afa2258ba8ad8c469c))
* add setMarkovConfig to seederStore, markov in roundTrip key order ([9dbc0fc](https://github.com/stratif-io/stratif.io/commit/9dbc0fcca72c726fe6e64ebc0ad6edacbd1a0762))
* add Sidebar component to dev TUI ([3f59ff0](https://github.com/stratif-io/stratif.io/commit/3f59ff0b53558619bb93890f75dcb425efad780b))
* add StatusBar and keyboard input to dev TUI ([9ca5a90](https://github.com/stratif-io/stratif.io/commit/9ca5a90be53c1239c963c14962763677c7b41c4a))
* add types and service registry to dev TUI ([aff9fd0](https://github.com/stratif-io/stratif.io/commit/aff9fd02ca82ef3d07fcd840feeeceb3f2c13e41))
* **app:** wire StudioLayout — replace AxisSidebar + PreviewGrid + SavePanel ([2d608c0](https://github.com/stratif-io/stratif.io/commit/2d608c0c38af1d90548d277e57bd637b63e935f6))
* **backend:** remove simulator presets endpoint — moved to seeder server ([0aeb425](https://github.com/stratif-io/stratif.io/commit/0aeb425ab0d0ad57c8a2ca89ad409bf029035b90))
* **config:** add starting_rate to ScaleConfig and ScaleOverride ([fe7f56b](https://github.com/stratif-io/stratif.io/commit/fe7f56ba6ba654b730d895d71246579b9444389b))
* delete domain pack files, remove DomainPack protocol ([2631cda](https://github.com/stratif-io/stratif.io/commit/2631cdaebdd84a67bf22995f8416f4bdd35d0e7c))
* **design-system:** add AppHeader component ([4187adf](https://github.com/stratif-io/stratif.io/commit/4187adf0def78f1e017ce8267ddd0e52f0cde44c))
* **design-system:** add AppSidebar component ([4977783](https://github.com/stratif-io/stratif.io/commit/497778335b934bba0d4590fbc126b1bf4dd64202))
* **design-system:** add AxisPopover component with sparkline rows ([5eb6573](https://github.com/stratif-io/stratif.io/commit/5eb657352b95eb38844c36b2ca046ac97fbb194d))
* **design-system:** add missing components to design system page ([a9899ea](https://github.com/stratif-io/stratif.io/commit/a9899ea22a814e2b0dce5d55e4018da156d0635f))
* **design-system:** add missing components to design system page ([b0fa066](https://github.com/stratif-io/stratif.io/commit/b0fa066fe43856c04ca241cfe4c6667de8b1d38f))
* **design-system:** add ResizablePanel; simulator axis config opens as collapsible right panel ([18bb9b3](https://github.com/stratif-io/stratif.io/commit/18bb9b3bcc54f659cd291ab9704809f5311effcf))
* **design-system:** export AppSidebar and AppHeader ([69f1714](https://github.com/stratif-io/stratif.io/commit/69f171407c7acbe6afa2a5c7c213a0eba18d429e))
* **design-system:** extend SidebarItem with badge, children, expanded, itemWrapper ([2943327](https://github.com/stratif-io/stratif.io/commit/2943327d5be66ffc3bb9fa1333f483a31be5bf0f))
* dev TUI + design-docs overhaul ([1c59e2f](https://github.com/stratif-io/stratif.io/commit/1c59e2fd995b56c5d2f0d1b63930f74f8cf490b0))
* **engine:** growth curves → shape multipliers anchored at s(0)=1 ([748e1ed](https://github.com/stratif-io/stratif.io/commit/748e1edf32ce379f79fefc254180319a5b74f26a))
* **engine:** rate-driven simulation + goal-driven binary-search wrapper ([d9990ee](https://github.com/stratif-io/stratif.io/commit/d9990eeb9ac3dd09185d73f8a6843e0775e98eaa))
* **event-editor:** dagre LR layout for workflow-style Markov graph ([decc107](https://github.com/stratif-io/stratif.io/commit/decc1072d2a11e5fa2d8fa85e60876a1dc46cb16))
* **event-editor:** redesign with three-panel layout and graph-first UX ([b25ddf5](https://github.com/stratif-io/stratif.io/commit/b25ddf5c95e9ca122faec63dbf11e2072d939a2b))
* **event-editor:** render self-loop transitions as visible arc above node ([1bf2740](https://github.com/stratif-io/stratif.io/commit/1bf27401a75d7deabba896826d79379f5672f5c7))
* **event-editor:** scale edge thickness by transition probability ([fe183ca](https://github.com/stratif-io/stratif.io/commit/fe183ca57ec525252e244b9cb044eb144064c622))
* **event-simulator:** add ⚡ SVG favicon ([bd29c84](https://github.com/stratif-io/stratif.io/commit/bd29c84dd1c137a69dbcf38c22f867e2bced55f9))
* **event-simulator:** add realistic total_users to all presets; sync dates on load ([14c8338](https://github.com/stratif-io/stratif.io/commit/14c83380ecc20b2fb4125b5591534da8508427a9))
* **event-simulator:** default date inputs to today-window → today ([be3178a](https://github.com/stratif-io/stratif.io/commit/be3178ab8e6ece55155ad1d8eb81c1f92a6a2008))
* **event-simulator:** live derived summary in header; Scale first in sidebar ([5d77d57](https://github.com/stratif-io/stratif.io/commit/5d77d5798c8fe5019fbcd491e8d2521b2222e535))
* **event-simulator:** match analytics sidebar brand style ([2517e63](https://github.com/stratif-io/stratif.io/commit/2517e63b1c29b7f422b68c74cde3f3e0f5a6dde1))
* **event-simulator:** rename brand to 'stratif.io Event Simulator' ([9bf8c37](https://github.com/stratif-io/stratif.io/commit/9bf8c37d58f69e3383c291973a3b66f58486a7fb))
* **event-simulator:** show "custom" scale badge when users/window diverge from preset ([3b410e6](https://github.com/stratif-io/stratif.io/commit/3b410e6abce374e1af971780dc32b469dbc09e85))
* **event-simulator:** sync flow template selector with header preset ([8a2b98e](https://github.com/stratif-io/stratif.io/commit/8a2b98e3793c3e7a3be0d12aac6b817af38c413e))
* **event-simulator:** use stratif.io logo in sidebar brand ([6993770](https://github.com/stratif-io/stratif.io/commit/69937704ef552e4fbf5e8ddc029872c23207adcf))
* **events:** highlight start nodes and fix crossing bidirectional arrows ([486920e](https://github.com/stratif-io/stratif.io/commit/486920eb821c6999798a16c3c5768b1e1c96ec5c))
* **events:** migrate SimEvent to start_date/end_date ISO format and add MAU field ([e1d74f9](https://github.com/stratif-io/stratif.io/commit/e1d74f9809f42ce149517be483f36f5a71be35e1))
* **events:** tune dagre layout for fewer edge crossings ([c3eaf9b](https://github.com/stratif-io/stratif.io/commit/c3eaf9bc33a817b08b04cd96b32b6c9746191822))
* expose all pipeline stages (A, J, V) from preview server; render ghost lines on top of new_users ([1ddfad5](https://github.com/stratif-io/stratif.io/commit/1ddfad5c286f238f88e7eb1bd918db96ecc9e1c9))
* introduce axis contract as single source of truth for valid YAML values ([8ffd8ae](https://github.com/stratif-io/stratif.io/commit/8ffd8aee87669b61e93975b8f0d8d5fd912fd050))
* Markov chain event generation — replace domain packs ([dc3d7e7](https://github.com/stratif-io/stratif.io/commit/dc3d7e7374dcb0a3b56509ae810587904db9e307))
* Markov chain event generation — replace domain packs ([dc3d7e7](https://github.com/stratif-io/stratif.io/commit/dc3d7e7374dcb0a3b56509ae810587904db9e307))
* **math:** install KaTeX, add MathFormula component ([2f73aa5](https://github.com/stratif-io/stratif.io/commit/2f73aa5a6cb31468e4435e2be946229392c10ad3))
* migrate all preset YAMLs to real Markov transition matrices ([1c5de4e](https://github.com/stratif-io/stratif.io/commit/1c5de4eee081b4e414e8ce48f22ca01d81b1abfd))
* monorepo full reset — design system, renamed apps and services ([398d91f](https://github.com/stratif-io/stratif.io/commit/398d91f804577fcf2e1ad8b478c67cf048f07aae))
* move backend/ → services/analytics, seeders/ → services/event_simulator ([e94f601](https://github.com/stratif-io/stratif.io/commit/e94f60101444f988be76b37fbcb2c87003de4846))
* move design system showcase to design-docs, remove from analytics ([38a6fdb](https://github.com/stratif-io/stratif.io/commit/38a6fdbccbbade4b40106d758d9449f90b214bf0))
* populate packages/design-system with UI components and utilities ([da7aedd](https://github.com/stratif-io/stratif.io/commit/da7aedd4e9d5aa0ba38168ff2d3a848038917d41))
* **presets:** rewrite all 10 presets with real company history and anomalies ([63c95e0](https://github.com/stratif-io/stratif.io/commit/63c95e0267019db6d26dca51ab03a4d8e2245fc7))
* **presets:** switch all 10 presets to rate-driven with product references ([b10166f](https://github.com/stratif-io/stratif.io/commit/b10166f77eb28abccc73f6b25ffe7a975506d292))
* **preview:** add day-by-day computation breakdown to SimMathPanel ([f2c9d11](https://github.com/stratif-io/stratif.io/commit/f2c9d110f4a9f51e8630ab48cdf930c99780f63e))
* **preview:** add formulaRegistry with LaTeX, explanations, and variable descriptions ([77d8b24](https://github.com/stratif-io/stratif.io/commit/77d8b24b2144e22ef14b17bfb971395075fe7dd1))
* **preview:** add labeled formula column to daily breakdown table ([7dce5d8](https://github.com/stratif-io/stratif.io/commit/7dce5d84f24e58647a592ee5fabdf8df241eea27))
* **preview:** add optional formula caption to KpiChart ([f4435da](https://github.com/stratif-io/stratif.io/commit/f4435dae77768d8d9177516774535991694acb77))
* **preview:** add parameter value table and output to SimMathPanel entries ([68fe5ef](https://github.com/stratif-io/stratif.io/commit/68fe5effaa27d1844435f06bd773c2ea9d41389b))
* **preview:** add SimMathPanel global collapsible formula reference ([1afd417](https://github.com/stratif-io/stratif.io/commit/1afd41760fee34824c940967f93cbb78d9f3aa38))
* **preview:** full Poisson pipeline formula for new users ([e545951](https://github.com/stratif-io/stratif.io/commit/e54595102ba73f22650cf4b2ebaf6f3f8bec6ca4))
* **preview:** group KPI charts by Acquisition / Engagement / Retention themes ([63ef54f](https://github.com/stratif-io/stratif.io/commit/63ef54f85b73de7362f7ed5c141feeae8508cdcf))
* **preview:** implement full G→A→J→V→Poisson formula with normalization and viral feedback ([655ea61](https://github.com/stratif-io/stratif.io/commit/655ea612b08755af95d411af99924911e62b50ba))
* **preview:** pass formula captions to KpiChart components ([0e7a969](https://github.com/stratif-io/stratif.io/commit/0e7a969d9aaf068c5f40659e1cd5d61ad88af1c2))
* **preview:** replace formula prop with KaTeX + where line + info popover on KpiChart ([c6d02ba](https://github.com/stratif-io/stratif.io/commit/c6d02ba9842f254b891a3233a6f9e6b5f36f8334))
* **preview:** show full Poisson PMF in new users formula ([2c3a5d4](https://github.com/stratif-io/stratif.io/commit/2c3a5d477905bb8dd1bd73a68e04bba886de76df))
* **preview:** show resolved axis values in KPI chart formula captions ([5e38d5c](https://github.com/stratif-io/stratif.io/commit/5e38d5c44305812feb92d15724b5e57d8ef383a0))
* **preview:** wire KaTeX formulas, where lines, and SimMathPanel into PreviewGrid ([cd6aa2b](https://github.com/stratif-io/stratif.io/commit/cd6aa2b5f1bbfc6619b74b705e1abfb129e724b9))
* Python simulation preview server + seeder/studio integration ([0b0333f](https://github.com/stratif-io/stratif.io/commit/0b0333fbfedf89fcd9d64c482037a670c317aa48))
* rename apps/seeder-studio to apps/event-simulator ([42e37fb](https://github.com/stratif-io/stratif.io/commit/42e37fb759bd2244c934be1d1293b15f7ac7aa0c))
* rename apps/web to apps/analytics ([2450d70](https://github.com/stratif-io/stratif.io/commit/2450d705b3bcec8a930ee1c25773a231d768bb7d))
* replace domain: str with markov: MarkovConfig; update SimulationState ([e1f548b](https://github.com/stratif-io/stratif.io/commit/e1f548b1966f7c3faa2eaa37bcae996e1840246e))
* replace Ink with double-buffer cell renderer — eliminates flicker ([95eb807](https://github.com/stratif-io/stratif.io/commit/95eb807a03c7e27eb09dfa6ef60f10c29c8ba7df))
* replace window_days with explicit start/end dates in presets and KPI charts ([4af1351](https://github.com/stratif-io/stratif.io/commit/4af135196d0dbafe4f8a092c2f3bf5167a0299f1))
* restore Charts and DataDisplay sections in design-docs from analytics app source ([180d508](https://github.com/stratif-io/stratif.io/commit/180d508eb6b5cd8c2ab19443650577e4600bef98))
* return growth_curve from preview server and wire to pipeline.growth ([2ed5545](https://github.com/stratif-io/stratif.io/commit/2ed554587baa800346abdd47c74f864759d61820))
* scaffold dev TUI entry point with Ink ([57810f3](https://github.com/stratif-io/stratif.io/commit/57810f34504642f6a6e2e8dfefde01e10c712ee5))
* scaffold packages/design-system ([53dcb25](https://github.com/stratif-io/stratif.io/commit/53dcb253d6d31545530e426254c5f6e34cc54cf4))
* **seeder-studio:** 2x2 chart grid layout ([0945c5e](https://github.com/stratif-io/stratif.io/commit/0945c5e2804a734b4bb897ce9f926b86954d4334))
* **seeder-studio:** add daily churned users to twin output and preview ([c36eff3](https://github.com/stratif-io/stratif.io/commit/c36eff327d983fb9a20bf44739ad1ffe36d5079a))
* **seeder-studio:** add first-days data table below preview charts ([a766c6a](https://github.com/stratif-io/stratif.io/commit/a766c6a5e92481a12b6ec7e545c683c0c48bd6b1))
* **seeder-studio:** add font packages and full CSS token set from main product ([e9a764a](https://github.com/stratif-io/stratif.io/commit/e9a764ab74239af4efa600d2e665d2ff569063e5))
* **seeder-studio:** add formatNum utility for K/M number formatting ([b4e4806](https://github.com/stratif-io/stratif.io/commit/b4e4806a350a17eee4672b706a6a98ce25f8c735))
* **seeder-studio:** add metricsFromUsers with sliding-window MAU ([9b58bf3](https://github.com/stratif-io/stratif.io/commit/9b58bf33610b63f2b582db5b4d6efba49b2a766c))
* **seeder-studio:** add No virality option (K = 0) to virality axis ([c7e5a2a](https://github.com/stratif-io/stratif.io/commit/c7e5a2aa35b7ed21c9775d91e2a29adb9fd6d46d))
* **seeder-studio:** add no-noise option (σ=0) to anomalies axis ([58ec366](https://github.com/stratif-io/stratif.io/commit/58ec36694da7649f5d3efa773971567825c5ded7))
* **seeder-studio:** add per-user state-machine simulation (Task 2) ([c10e5e2](https://github.com/stratif-io/stratif.io/commit/c10e5e259bbc450dd54c98c6a7b254553ef9c010))
* **seeder-studio:** add PresetPicker compact dropdown ([f9db0ba](https://github.com/stratif-io/stratif.io/commit/f9db0ba33e98e55bbf651f9a2f4dceef3bf1b43b))
* **seeder-studio:** add SaveModal with read-only YAML and copy button ([dd7f1ac](https://github.com/stratif-io/stratif.io/commit/dd7f1ac6fcb93a368f911a8eb47aa3b291b379dd))
* **seeder-studio:** add TopBar preset select and SavePanel, remove PresetSidebar and SaveModal ([c92216d](https://github.com/stratif-io/stratif.io/commit/c92216d2752902b7c277efd7f12038a491c6cc4d))
* **seeder-studio:** add TopBar with preset picker, date range, user count ([5a0c684](https://github.com/stratif-io/stratif.io/commit/5a0c684e4c10937e63dfafdb3d2d60787c4c063b))
* **seeder-studio:** add total users cumulative chart ([c425b7e](https://github.com/stratif-io/stratif.io/commit/c425b7ea2026025dee680374617bf9dd740c903a))
* **seeder-studio:** anomaly overlay with vertical lines on every sparkline chart ([30e3281](https://github.com/stratif-io/stratif.io/commit/30e3281fe737b1a85209e83e4b46ca3e805e4bf0))
* **seeder-studio:** apply formatNum to chart headlines and tooltips ([f437621](https://github.com/stratif-io/stratif.io/commit/f4376216e1903ef98b2b7b9b5bd63e7c23e4e879))
* **seeder-studio:** axes left sidebar + preset right sidebar layout ([66d7799](https://github.com/stratif-io/stratif.io/commit/66d77995690bcc483acfeec9bcacdb97c39723c0))
* **seeder-studio:** axis selectors in formula tooltip, variable legend, softer add-column ([2d6c110](https://github.com/stratif-io/stratif.io/commit/2d6c110e6ae652e6d033ba77ca008247f8e18af7))
* **seeder-studio:** click anomaly band to open floating name editor ([af77935](https://github.com/stratif-io/stratif.io/commit/af7793578aa3a712f7e8513f08a9a6e8f4b65d11))
* **seeder-studio:** click-on-band anomaly editor, product_launch default ([e691240](https://github.com/stratif-io/stratif.io/commit/e6912401e1c0cd467b94fa24f8b2a0a721d517ee))
* **seeder-studio:** click-to-pin formula tooltip for reliable axis interaction ([f87e3ff](https://github.com/stratif-io/stratif.io/commit/f87e3ff64a59166003475b712739216a0604eda1))
* **seeder-studio:** clickable legend to focus/dim ghost lines ([f29a603](https://github.com/stratif-io/stratif.io/commit/f29a603e654b9a829e96c31145cde49d3150e933))
* **seeder-studio:** close pinned formula tooltip on outside click ([c9c9d0b](https://github.com/stratif-io/stratif.io/commit/c9c9d0bdd9e7b7d42ad2637e5200100a46e3eb0a))
* **seeder-studio:** collapsible anomaly config inline in sidebar ([0812415](https://github.com/stratif-io/stratif.io/commit/0812415849e59b1d0dc2f662d489ec328b65cb4b))
* **seeder-studio:** display stickiness as percentage with % suffix ([59297f3](https://github.com/stratif-io/stratif.io/commit/59297f3dd9d28be7413783ed940b9c2bf2bdbbf7))
* **seeder-studio:** drag anomaly pills directly on preview charts ([330d61a](https://github.com/stratif-io/stratif.io/commit/330d61af4f39061fac36458f91cfd53cf9df2bd2))
* **seeder-studio:** expand metric panel as full-screen modal overlay ([ffc9c34](https://github.com/stratif-io/stratif.io/commit/ffc9c34659974538e4dcd6703f253d648071c258))
* **seeder-studio:** explain N(t)/DAU(t) apparent circular dependency ([ba5fd8a](https://github.com/stratif-io/stratif.io/commit/ba5fd8a0781b49353fe65062a3143d97f7a8869a))
* **seeder-studio:** expose pipeline stages G/A/J/V as ghost lines in new users chart ([5c57fbe](https://github.com/stratif-io/stratif.io/commit/5c57fbe21e5600fc981d11b2e1fba5c598665a36))
* **seeder-studio:** extend PipelineFormula to all metric keys ([cd8823c](https://github.com/stratif-io/stratif.io/commit/cd8823c579608a620fbdaf668eccf60dc8370791))
* **seeder-studio:** flat growth axis, keep accordion open on select, anomalies in sidebar ([0d73ec7](https://github.com/stratif-io/stratif.io/commit/0d73ec73c298691c104cacf1788645d530cb5db3))
* **seeder-studio:** floating draggable Anomalies panel ([494819b](https://github.com/stratif-io/stratif.io/commit/494819b5ab60fc746e8ddb0e02c5d5e678201f86))
* **seeder-studio:** full event config in floating editor (type, name, start, duration, effects) ([fdada5c](https://github.com/stratif-io/stratif.io/commit/fdada5c6c9fa5011ce25d5e31d2256878a340994))
* **seeder-studio:** full-height interactive anomaly bands on charts ([a5742fe](https://github.com/stratif-io/stratif.io/commit/a5742fe3199e2c2a06e6e26532520e886b2d3fc8))
* **seeder-studio:** ghost component lines in expanded metric chart ([122305f](https://github.com/stratif-io/stratif.io/commit/122305fce05d40bfafaac4936c5bbf6b187cceeb))
* **seeder-studio:** inline axis selector per pipeline step in metric modal ([e9ff8e4](https://github.com/stratif-io/stratif.io/commit/e9ff8e4bece6b4dcca06cdbda4cc5546405a4fd2))
* **seeder-studio:** interactive axis selector in formula tooltip; remove DAU callout ([7fc636e](https://github.com/stratif-io/stratif.io/commit/7fc636e50906d34fc4a3fd0bd25e9c8b2c0e281d))
* **seeder-studio:** interactive pipeline formula — hover highlights, click locks line ([30fc153](https://github.com/stratif-io/stratif.io/commit/30fc1531b842e20a1fb839e4455c4410301c1b9d))
* **seeder-studio:** legend and real-value tooltips for ghost component lines ([de9b38f](https://github.com/stratif-io/stratif.io/commit/de9b38f4cf97cb919ff572f6e155a1a4c5a9288f))
* **seeder-studio:** per-step variable tooltips; remove standalone params table ([7a1b6dc](https://github.com/stratif-io/stratif.io/commit/7a1b6dcbfecf9399da67d6a6eafaea831c5449c3))
* **seeder-studio:** pipeline step checkboxes show intermediate values in scrollable table ([9e53b29](https://github.com/stratif-io/stratif.io/commit/9e53b297ea8a69004e3c47c6517d94c14b794b1b))
* **seeder-studio:** Plans 01 + 02 + 03 — full delivery ([b1609b6](https://github.com/stratif-io/stratif.io/commit/b1609b6d836d76619987e9a1fdd2547f2ab9c2ab))
* **seeder-studio:** Plans 01 + 02 + 03 — full delivery ([b1609b6](https://github.com/stratif-io/stratif.io/commit/b1609b6d836d76619987e9a1fdd2547f2ab9c2ab))
* **seeder-studio:** redesign metric modal — 3-step pedagogical layout ([1f4f970](https://github.com/stratif-io/stratif.io/commit/1f4f970cba0f031794944365c72278c98b9e3db4))
* **seeder-studio:** remove anomaly track bar from layout ([be1e3e2](https://github.com/stratif-io/stratif.io/commit/be1e3e218b2c91fb940a8a263765b3025affe06e))
* **seeder-studio:** remove bottom footer from left sidebar when expanded ([40c2329](https://github.com/stratif-io/stratif.io/commit/40c2329eafb812e30d67b64cb3e54d0bf7cb0560))
* **seeder-studio:** remove editor popup from timeline, remove approximate badge ([5aa8b92](https://github.com/stratif-io/stratif.io/commit/5aa8b928d1b7026ecbbea9d37b11287b7ceb2f7f))
* **seeder-studio:** reorder KPI sections by dependency chain ([11ed841](https://github.com/stratif-io/stratif.io/commit/11ed8412dcb67bb4abf58dc885cf4ef153030a3f))
* **seeder-studio:** replace checkbox with labeled column toggle on right ([ccf8781](https://github.com/stratif-io/stratif.io/commit/ccf8781d000124e20b107630ec5f0c89ddbc39e9))
* **seeder-studio:** restore Anomalies section with track and config forms ([e0890d3](https://github.com/stratif-io/stratif.io/commit/e0890d3e80048ba7fb238a4d496fb99e212212e1))
* **seeder-studio:** restore anomaly interactivity and show bands on all charts ([26b22a0](https://github.com/stratif-io/stratif.io/commit/26b22a0b9fe0dabef96005b3482f98e6c25cced6))
* **seeder-studio:** restyle AxisSidebar with CSS width vars, bg-background, chevron toggle ([3166866](https://github.com/stratif-io/stratif.io/commit/316686634044e231badbb70a46895ef09a4b4764))
* **seeder-studio:** restyle PresetSidebar with CSS width vars, bg-background, chevron toggle ([1a57994](https://github.com/stratif-io/stratif.io/commit/1a57994663d791e4f6c3b5e2b9ef53fff9c336fd))
* **seeder-studio:** restyle TopBar to h-14, remove emoji, add lucide icons ([c178f74](https://github.com/stratif-io/stratif.io/commit/c178f741a8ef787865d8ab17d6e81d90908cc3d3))
* **seeder-studio:** rewrite App.tsx — charts-first layout ([358e887](https://github.com/stratif-io/stratif.io/commit/358e8877b353af4cd260b93c053b3ce434a9a6d1))
* **seeder-studio:** show actual growth curve formula based on selected axis ([05a5d5a](https://github.com/stratif-io/stratif.io/commit/05a5d5a10f768692f7e22dbe62049a2eb453a51c))
* **seeder-studio:** show all simulation days in daily trace table ([e433fb6](https://github.com/stratif-io/stratif.io/commit/e433fb6d2346748749bf38bcef437f43caf59f63))
* **seeder-studio:** show axis category + current value clearly in pipeline chips ([ae88b8b](https://github.com/stratif-io/stratif.io/commit/ae88b8ba590c66a27800894a839785d9a09b5365))
* **seeder-studio:** show formula + jitter equation inline in expanded chart ([644cf4b](https://github.com/stratif-io/stratif.io/commit/644cf4b97f04e838c7e5ddac2d5117181bc4b7d2))
* **seeder-studio:** show formula symbols with live values in parameter table ([6a34e57](https://github.com/stratif-io/stratif.io/commit/6a34e57c8ad27831dd07f8ba7a40d133cb266ac2))
* **seeder-studio:** show variable legend on hover over formula section ([29bdb91](https://github.com/stratif-io/stratif.io/commit/29bdb91ed65cc4e855e5caed52a8e7fbb8223f28))
* **seeder-studio:** table left with all days and all intermediate cols ([0b96747](https://github.com/stratif-io/stratif.io/commit/0b967478459d79a6b65720cf792db74d5d479bcf))
* **seeder-studio:** toggle [end] node visibility in Markov graph ([db8d2f3](https://github.com/stratif-io/stratif.io/commit/db8d2f324c2d29453c3e4ffcb65e34590c160190))
* **seeder-studio:** vertical tooltip on sparklines + hover tooltip on anomaly bands ([a151ba8](https://github.com/stratif-io/stratif.io/commit/a151ba814c93f94f1b24befeed5a1cb92b8c471b))
* **seeder-studio:** wire SavePanel into App — copy YAML to use with CLI seeder ([8801879](https://github.com/stratif-io/stratif.io/commit/8801879a51ad2d844cb009ddef8d1bd9586611cd))
* **seeder-studio:** wire simulation into runTwin, delete retention module ([5869551](https://github.com/stratif-io/stratif.io/commit/5869551cab58550840bacc8171a7f5f5c00c7369))
* **seeder-studio:** Y axis showing principal series scale, remaps when ghost focused ([f5b0ea1](https://github.com/stratif-io/stratif.io/commit/f5b0ea1858621359fb932abe9f6185fb1780e45f))
* **seeder:** add preview engine — run_preview returns daily timeseries ([546cad1](https://github.com/stratif-io/stratif.io/commit/546cad12bea84508ed9970466c75e29cac7da734))
* **seeder:** add seed-serve FastAPI preview server on port 8001 ([bec2217](https://github.com/stratif-io/stratif.io/commit/bec2217b16172713e14057438958add9a1fed6f1))
* **seeder:** port TypeScript twin's cohort retention model to Python ([4241bd1](https://github.com/stratif-io/stratif.io/commit/4241bd1ec8a2f399b6ddc4e330f0c274f12050af))
* show all anomalies as chart overlays regardless of edit mode ([fd1000d](https://github.com/stratif-io/stratif.io/commit/fd1000d44fc8038391dac59620a43acfa8418365))
* **sidebar:** add Axes title that collapses the sidebar on click ([79eb91a](https://github.com/stratif-io/stratif.io/commit/79eb91af8c835ca591f10e6a1838c2665ae85a60))
* **sidebar:** Axes title collapses sidebar; SavePanel collapsed by default ([19b0e9e](https://github.com/stratif-io/stratif.io/commit/19b0e9eaf987565c6792021e5b53b5abd322a960))
* **sidebar:** replace dropdowns with inline accordion pickers ([659936f](https://github.com/stratif-io/stratif.io/commit/659936f0b517a83bb5173976a97391061471613f))
* **sim:** add Churned and Reactivated columns to DayTable ([c8d73a3](https://github.com/stratif-io/stratif.io/commit/c8d73a3c3d48b0b1ab5610bdcada98dc3c7c5ca6))
* **sim:** add cohort+Poisson simulation engine (simulateCohorts) ([2297cfb](https://github.com/stratif-io/stratif.io/commit/2297cfb519597c1858d1efde28ee8bec020d3f00))
* **sim:** add mulberry32 seeded PRNG ([5f848a6](https://github.com/stratif-io/stratif.io/commit/5f848a67b1a758e1c7ac332b5b66215189b42e6e))
* **sim:** add poissonDraw to rng; move RetentionParams to types ([2311b80](https://github.com/stratif-io/stratif.io/commit/2311b8003ccfa123265e48dcde06932ff155e771))
* **sim:** add Reactivated/day KPI chart to preview grid ([d66fb03](https://github.com/stratif-io/stratif.io/commit/d66fb03d1d5dac43ac2cb6da046a97e521aec553))
* simulator design system ([a0c1c04](https://github.com/stratif-io/stratif.io/commit/a0c1c04d46a1c72b60327aacf0f3e2799f9b3739))
* **simulator:** add AppSidebar + AppHeader app shell ([1696187](https://github.com/stratif-io/stratif.io/commit/1696187dbd56e70c4d5686e5fa2c06604c1b6ed6))
* **simulator:** add CardLoadingBar to KpiChart expanded view ([2439b06](https://github.com/stratif-io/stratif.io/commit/2439b06f557c340ddabf48166eaf39e21e6cc681))
* **simulator:** add dark/light mode toggle with system preference detection ([5088a48](https://github.com/stratif-io/stratif.io/commit/5088a486fe6cd2de80be8fcffd8e7d0c73a7562d))
* **simulator:** add seasonality axes, exact preset dates, PortableNorthPole preset ([014a35d](https://github.com/stratif-io/stratif.io/commit/014a35dcadd741484192182a3ae81eb6742872c4))
* **simulator:** add seasonality pipeline step with TDD ([ecf5ba9](https://github.com/stratif-io/stratif.io/commit/ecf5ba985489ba2cf45255d3fa25f10d70ea300a))
* **simulator:** add sidebarCollapsed and activeSection to seederStore ([f955969](https://github.com/stratif-io/stratif.io/commit/f9559694b9fac727aa641587cfdafcc5ec624e6f))
* **simulator:** drive StudioLayout content from activeSection ([1cd374f](https://github.com/stratif-io/stratif.io/commit/1cd374f63c11b2315cdbbacb58664244496782c6))
* **simulator:** emoji labels + dating default for header preset selector ([d0e9228](https://github.com/stratif-io/stratif.io/commit/d0e92283b4bde306ceb29f398e19e3bdf719cb40))
* **simulator:** plausible real-world growth curves + acceptance tests ([6e99bd4](https://github.com/stratif-io/stratif.io/commit/6e99bd443a463ec0e449bf250e0cea03c3509347))
* **simulator:** rebuild sidebar with Studio collapsible group and AxisPopover ([c107671](https://github.com/stratif-io/stratif.io/commit/c1076712ddee089683ef2a003961c186feb66a53))
* **simulator:** remove calendar multiplier; fix my-config preset ([c57ce4c](https://github.com/stratif-io/stratif.io/commit/c57ce4c722732c27857efdaecb790e76aea8775a))
* **simulator:** seasonality in arrivals formula, ISO date anomaly positioning, remove seasonal growth ([423aa5f](https://github.com/stratif-io/stratif.io/commit/423aa5f1d70e51b1998d60a5222559c58af8ce66))
* **simulator:** show ChartSkeleton while loading in KpiCard and KpiChart ([483f60d](https://github.com/stratif-io/stratif.io/commit/483f60d28f56bdbf5eada183d70f149293a52e36))
* **simulator:** show real dates on KPI charts from simulation start_date ([1278dd3](https://github.com/stratif-io/stratif.io/commit/1278dd3a7e32d2194a118ee84500d72d73ecf9e1))
* **simulator:** show sparkline alongside selected value in sidebar axis items ([0f0d009](https://github.com/stratif-io/stratif.io/commit/0f0d009e73e06bad63f180b516d3e78bea25d032))
* **simulator:** simplify StudioLayout — remove axis routing and ResizablePanel ([3fea447](https://github.com/stratif-io/stratif.io/commit/3fea44744039bbbc3b3dca16bb2fffa8991e1cc0))
* **simulator:** use CardLoadingBar + opacity dimming for chart loading state ([e503b70](https://github.com/stratif-io/stratif.io/commit/e503b703f6aef57b7d71f70f5250a562f2da50bf))
* **simulator:** UX cleanup — labels, defaults, presets ([75beedb](https://github.com/stratif-io/stratif.io/commit/75beedb90e7da6acb8a3dda49ba39b078d501e53))
* **simulator:** zoom brush for time-period selection in expanded KPI chart ([027f0a9](https://github.com/stratif-io/stratif.io/commit/027f0a9543809b6ea245ecbbb696f87438b05059))
* **sim:** update stickiness axis to RetentionParams + add reactivatedUsers to TwinOutput ([00a52ff](https://github.com/stratif-io/stratif.io/commit/00a52ff7be3131e80314a71922d523f75f080e24))
* **sim:** wire cohort+Poisson into runTwin; delete simulate.ts and metricsFromUsers.ts ([2fc2f11](https://github.com/stratif-io/stratif.io/commit/2fc2f117f46dc1028df33408943970cc9b88395a))
* **studio:** add AxisStrip with AxisChip and AxisPopover ([d5e2105](https://github.com/stratif-io/stratif.io/commit/d5e2105b190d62b698a0f5bb76096be22c7ff5cf))
* **studio:** add KpiCard collapsed view ([b01cbf5](https://github.com/stratif-io/stratif.io/commit/b01cbf5e15636d069aa5522b5a6328a62764a41f))
* **studio:** add KpiCardExpanded with formula, params, and daily breakdown ([19ec638](https://github.com/stratif-io/stratif.io/commit/19ec638d76270d6a77404f438e1736d596bd2ced))
* **studio:** add KpiGrid with inline card expansion ([d553516](https://github.com/stratif-io/stratif.io/commit/d55351619d3e93efd0f8c6f2312bafbc397f7735))
* **studio:** add StudioLayout composing AxisStrip and KpiGrid ([d0e1609](https://github.com/stratif-io/stratif.io/commit/d0e16099392f41e757668e97c0acd74253859f00))
* **studio:** delete TypeScript twin simulation engine — Python is now the source of truth ([5d98095](https://github.com/stratif-io/stratif.io/commit/5d9809591c31d24a816a55c5c83a7042e8739ccb))
* **studio:** fetch presets from seeder server instead of main backend ([5b85d39](https://github.com/stratif-io/stratif.io/commit/5b85d39f3222295ef781889268b6a4073ee9ecb8))
* **studio:** remove export button from TopBar ([5c6d720](https://github.com/stratif-io/stratif.io/commit/5c6d7202c7db40cc8a632b777d3e249abb00f0f6))
* **studio:** replace runTwin with async fetch to seeder server ([5b2f121](https://github.com/stratif-io/stratif.io/commit/5b2f12110dbf1dcc0767666cffb429a2f2064155))
* **topbar:** add + Event and Export buttons ([a27a3e3](https://github.com/stratif-io/stratif.io/commit/a27a3e3fe326f6a4b2ae497fb8089d0f455efabe))
* **twin:** add total_outage anomaly type to ANOMALY_SPEC ([84b325a](https://github.com/stratif-io/stratif.io/commit/84b325ad747fff74a2ed0dbda13ef3fa71ba8ff9))
* **twin:** calibrate stickiness output toward dau_mau_target axis value ([06e88ad](https://github.com/stratif-io/stratif.io/commit/06e88ad74b410608cbce0a5e19c369a851facfdc))
* **twin:** zero activeUsers and events during total_outage anomaly window ([5aad1cc](https://github.com/stratif-io/stratif.io/commit/5aad1cc5b526f3b45fe2e30a18a2ee4dd3dc8fbf))
* **types:** add starting_rate to scale config types + resolveScale rate/goal mode ([ef86905](https://github.com/stratif-io/stratif.io/commit/ef869056258c53f4e29322457f729f86005983de))
* **ui:** add CSS variable for total_outage anomaly color ([64cb568](https://github.com/stratif-io/stratif.io/commit/64cb568b673cb89168d02784c91b6a855043e489))
* **ui:** mode badge and starting_rate input in seeder studio ([8549725](https://github.com/stratif-io/stratif.io/commit/85497252f66a0573ea529c098021e9d8bc4f78e1))
* **ui:** mode-aware total users label in KPI card ([b380e2b](https://github.com/stratif-io/stratif.io/commit/b380e2b8d8d7b2ed4dea87f652239dfb52808313))
* use alternate screen buffer for TUI full-screen mode ([ac5adaf](https://github.com/stratif-io/stratif.io/commit/ac5adafd38546f61da1eb31de43f9d6624fab2be))
* **ux:** debounce simulation + loading states in KPI cards ([44c9773](https://github.com/stratif-io/stratif.io/commit/44c97732e43581a29aea574ac39a614edc036296))
* **web:** export Collapsible, CollapsibleTrigger, CollapsibleContent from @stratif-io/web ([2f1065b](https://github.com/stratif-io/stratif.io/commit/2f1065b68ec7e0cd65c40d342816e3376243f622))
* **web:** export DialogDescription, DialogTrigger, DialogClose from @stratif-io/web ([302a73a](https://github.com/stratif-io/stratif.io/commit/302a73ab30ba522d57fac4a3a79e98b2d796c2a7))
* **web:** export UI primitives needed by seeder-studio ([691bc69](https://github.com/stratif-io/stratif.io/commit/691bc69f4c7d3846b965f07f45f079b2d9b0af41))
* wire MarkovRunner into engine; remove DomainRegistry and session archetypes ([b9891ea](https://github.com/stratif-io/stratif.io/commit/b9891eadc40bb37cdf2d560b071a1c2dcdba042c))
* **zoom-brush:** replace Recharts Brush with custom RangeBrush using pointer capture ([7db0e4f](https://github.com/stratif-io/stratif.io/commit/7db0e4fed4428f3e897b2e7963ee35e8b91fadb6))
* **zoom-brush:** replace track brush with click-drag-on-chart to zoom ([505a440](https://github.com/stratif-io/stratif.io/commit/505a44051eb13cd6fd869a5d4377f6133400506d))
* **zoom-brush:** show preview lines while dragging, zoom on release ([39e40c9](https://github.com/stratif-io/stratif.io/commit/39e40c9c209947a3aa46fd4c56c62ee5c7aa5409))


### Bug Fixes

* add development condition to vite resolve so @stratif-io/web sources are used ([99ea46b](https://github.com/stratif-io/stratif.io/commit/99ea46b7bb6f37d6f11f41c70cb969810f9a494c))
* add seasonal growth option and align axis popover columns ([d81a9fb](https://github.com/stratif-io/stratif.io/commit/d81a9fb0379f3bdbcd2def0e1b25c14f1e31fdab))
* add Tailwind plugin to design-system lib build — CSS was missing all utility classes ([192a81d](https://github.com/stratif-io/stratif.io/commit/192a81d1a60505212c1427612770e6709d0bcb33))
* add TooltipProvider and ToastProvider to design-docs root ([8356922](https://github.com/stratif-io/stratif.io/commit/8356922102ac944ff3245b6436c6005218670c6c))
* align all axis values between seeder-studio and Python seeder ([1f3a168](https://github.com/stratif-io/stratif.io/commit/1f3a168a511a03e8d1ff6a879b4a65b152a1e220))
* **analytics:** add [@source](https://github.com/source) for design-system components to Tailwind scan ([3f45870](https://github.com/stratif-io/stratif.io/commit/3f458706d1f5b2f9eaae7c9017598023eb00a375))
* **analytics:** center sidebar brand icon when collapsed ([fd7221a](https://github.com/stratif-io/stratif.io/commit/fd7221a2cf20bfbe66a80ff729e3e1f735a68369))
* **analytics:** fix header layout and harmonise sidebar logo with demo ([3fe734f](https://github.com/stratif-io/stratif.io/commit/3fe734fe87beda9af83a839c47df3acc33dcc656))
* **analytics:** flush header to left edge, add vertical breathing room to sidebar logo ([02eda39](https://github.com/stratif-io/stratif.io/commit/02eda39407e8941b95bb41b0c6ec4c806006021b))
* **analytics:** remove sidebar padding gap and restore stratif.io logo ([7817538](https://github.com/stratif-io/stratif.io/commit/78175382ff9bc93cbcb9df4bf4d7fbc39393117f))
* **app:** update stale discard dialog copy — SavePanel removed ([5987456](https://github.com/stratif-io/stratif.io/commit/5987456ca4ddbb1e55a03e65a6734fde83839fc0))
* **audit:** harden, normalize, colorize, arrange, polish ([d5a1c8c](https://github.com/stratif-io/stratif.io/commit/d5a1c8cfcf1e0352a92e31229d2a1912975638d4))
* batch log updates to eliminate TUI flicker ([382b81b](https://github.com/stratif-io/stratif.io/commit/382b81b79acd3e06925aef28795a932772506d91))
* build design-system lib before analytics in test-install.yml ([ba90894](https://github.com/stratif-io/stratif.io/commit/ba908941e2af4d779ff75e413488d27c32722163))
* build order, cmdk dep, design-system test script, update CLAUDE.md ([79573d4](https://github.com/stratif-io/stratif.io/commit/79573d48571b1f705c49897dc762379655b84741))
* change @/ alias in design-docs to resolve analytics frontend for cross-component imports ([08164d9](https://github.com/stratif-io/stratif.io/commit/08164d914eac9d932df62c795bc119f9a3676fe0))
* clean up TUI layout — remove box borders, fix sidebar alignment, simplify status bar ([cbbd4fd](https://github.com/stratif-io/stratif.io/commit/cbbd4fd410147a5f04fa3014514a68574f848527))
* **config:** enforce ScaleConfig invariant, extract DEFAULT_WINDOW_DAYS ([e4e797a](https://github.com/stratif-io/stratif.io/commit/e4e797aeeb66f4bcb2a8f71edfd698fbcf2a23d1))
* correct design-system package.json (peerDeps, sideEffects, files) ([4a8c844](https://github.com/stratif-io/stratif.io/commit/4a8c844fa74f1d16983aaf0ca4037ec97f25bce3))
* correct sidebar column layout — port and dot no longer fused, fix arrow chars in status bar ([f05eb53](https://github.com/stratif-io/stratif.io/commit/f05eb535b969ccf9efc067ae16f8d29a8c4bcf91))
* **design-system:** axis-aware listbox label, sparkline safety fallback ([59591d1](https://github.com/stratif-io/stratif.io/commit/59591d15a958caea7655f534f30315a13f821ff2))
* **design-system:** center sidebar brand/collapse button when collapsed; smooth brand transition ([a91943a](https://github.com/stratif-io/stratif.io/commit/a91943a0365bf30ace23c2c60556f0a9ef56104c))
* **design-system:** export ChartSkeleton from package index ([6d4f2d9](https://github.com/stratif-io/stratif.io/commit/6d4f2d9ba28021596fb78cc055c165ed4879a0b2))
* **design-system:** replace @/ imports with relative paths ([8a2e61e](https://github.com/stratif-io/stratif.io/commit/8a2e61ee1c8ace79acd2019e3c2a27f97de697a0))
* **design-system:** replace @/ imports with relative paths ([8f23f6e](https://github.com/stratif-io/stratif.io/commit/8f23f6e91f59465ebacb2442d41669f875d1d087))
* **design-system:** tighten AppHeader gap and padding to match demo ([b513ffa](https://github.com/stratif-io/stratif.io/commit/b513ffa8a508e5bb467b756b7c5989b666889eb6))
* **design-system:** use optional chaining on onToggleExpand, add collapsed+expanded test ([513ef0c](https://github.com/stratif-io/stratif.io/commit/513ef0c30a1fb57da35dd6b00819b5e04dc8ebb8))
* **dev-tui:** kill entire process group on stop ([1fcd1bc](https://github.com/stratif-io/stratif.io/commit/1fcd1bccd7d624fa557bf873bba2a9bef0d44b59))
* **dev-tui:** kill entire process group when stopping a service ([a58015d](https://github.com/stratif-io/stratif.io/commit/a58015dd513411ee7721c6a8418b8fff4c32647b))
* **dev-tui:** spawn services detached so kill(-pgid) doesn't exit TUI ([f71317f](https://github.com/stratif-io/stratif.io/commit/f71317f14e010ea7813ec21d590fb08ac26dad8f))
* **dev-tui:** spawn services detached so kill(-pgid) doesn't exit TUI ([01e1f34](https://github.com/stratif-io/stratif.io/commit/01e1f342850d9df59d56310860865c769ca7aab0))
* dev:studio builds lib first; revert vite alias to dist ([c9338eb](https://github.com/stratif-io/stratif.io/commit/c9338ebb4ecf3d3775e3f86f61507ca117a6fa3d))
* draw Poisson at display scale to eliminate arrival_cap quantization ([5e71060](https://github.com/stratif-io/stratif.io/commit/5e71060583dccdd396ab9f1ef75399a348c706c5))
* duplicate React key in AppSidebar sections, tighten activeSection type ([bff25bb](https://github.com/stratif-io/stratif.io/commit/bff25bbccb01a676f995b5c4faebad191700e441))
* **engine:** inline _build_shape cfg reads, fix split_fraction default mismatch ([2f06454](https://github.com/stratif-io/stratif.io/commit/2f064540f9b6b9eeb2e188eb41a379c91d419b14))
* **engine:** scale shape multiplier in seeder engine; fix schema and test mock ([2718724](https://github.com/stratif-io/stratif.io/commit/2718724f62bf34730d3327cdebc84f27127269b3))
* **event-editor:** align handles Left/Right for LR dagre layout ([4507f42](https://github.com/stratif-io/stratif.io/commit/4507f42c587d0a7a94754e73f49513f6f5f94721))
* **event-editor:** center self-loop arc on node top-center ([e85c87e](https://github.com/stratif-io/stratif.io/commit/e85c87e9b08b146cbb9a432323d93363b914d365))
* **event-editor:** curve bidirectional edges apart so both labels are visible ([6e41a50](https://github.com/stratif-io/stratif.io/commit/6e41a501a520dc9bb5c1f0adb47d22398604eb78))
* **event-editor:** use custom BiEdge with perpendicular offset for bidirectional pairs ([00bd7c5](https://github.com/stratif-io/stratif.io/commit/00bd7c5f28b18273e73f08ff2dedf5277065c668))
* **event-simulator:** center brand icon when sidebar is collapsed ([3ded08a](https://github.com/stratif-io/stratif.io/commit/3ded08ac1722014b36b274dd6175908270f2eb8e))
* **event-simulator:** move header title/badge into children to flush content left ([d3cf04f](https://github.com/stratif-io/stratif.io/commit/d3cf04f109bd12048c5e44956bf9012cf90d7040))
* **event-simulator:** no default flow template selection in EventsTab ([fa38923](https://github.com/stratif-io/stratif.io/commit/fa38923b92ab0e99264857c845968d0965bfa12c))
* **event-simulator:** show resolved default in users input instead of blank ([248c9a3](https://github.com/stratif-io/stratif.io/commit/248c9a3c8fd0b942fb2134d01baaa38f702b6947))
* **event-simulator:** widen scenario selector to w-64 h-9 text-sm ([a6ec005](https://github.com/stratif-io/stratif.io/commit/a6ec005422e106011221de23a9b07bdf610b24a4))
* **event-simulator:** widen scenario selector to w-80 to prevent text cut ([ca8c347](https://github.com/stratif-io/stratif.io/commit/ca8c3472501886d048c6277ee9470e72b80eaed5))
* **events:** backfill event colors when loading a preset ([1e5b13a](https://github.com/stratif-io/stratif.io/commit/1e5b13aa59ae526ab89a36bb5bde48bd5bb8754b))
* **events:** backward edges exit from left handle of source node ([1d4fbb0](https://github.com/stratif-io/stratif.io/commit/1d4fbb0786c8d8a9b39f312cc19be39e6de55055))
* **events:** increase arrowhead size from 6 to 10px ([3d78ad7](https://github.com/stratif-io/stratif.io/commit/3d78ad74dbec3e35416a3100251392678e549412))
* **events:** opaque label backgrounds and labels on arc midpoint ([07dbfca](https://github.com/stratif-io/stratif.io/commit/07dbfca5007a9fe2816e1776508292de65d706a6))
* **events:** reduce arrowhead size (5–8px range instead of 8–16px) ([c33a69d](https://github.com/stratif-io/stratif.io/commit/c33a69d469edc10bf26d2414e2ff81a5cf2e13c5))
* **events:** replace SVG markers with manual arrowhead polygons ([7bbfa92](https://github.com/stratif-io/stratif.io/commit/7bbfa920e476e047685336c4fc7fe02d9230da98))
* **events:** separate bidirectional arcs to opposite sides after handle flip ([adf9f5d](https://github.com/stratif-io/stratif.io/commit/adf9f5de4ecee41f16d3fd0774dd4df8fa4de3b2))
* expose report_scale and show k × scale in step-by-step table ([694e342](https://github.com/stratif-io/stratif.io/commit/694e34251bae6773214b765b84640a24930ee22e))
* fix unreachable events in marketplace, saas, streaming, dating presets ([65088d0](https://github.com/stratif-io/stratif.io/commit/65088d02bf3e4913488cff558e99f91ec0571ff7))
* handle undefined scale_config in TopBar window_days test ([78ef996](https://github.com/stratif-io/stratif.io/commit/78ef9969a278f1de35e73737db5a9c862111e12a))
* increase anomaly band fill opacity for better visibility ([5fc217a](https://github.com/stratif-io/stratif.io/commit/5fc217aacff38636683fbaa209d01670a7173af3))
* **install:** remove dead DB_PATH_PREFIX env var ([f7d405c](https://github.com/stratif-io/stratif.io/commit/f7d405c1b19a30ded4f4ee173679a455378f429d))
* **install:** remove dead DB_PATH_PREFIX env var from install.sh ([4be3228](https://github.com/stratif-io/stratif.io/commit/4be32281d0b12b44fa891122f5506c215002fe65))
* kill process group on stop so Vite children don't outlive their bun parent ([46adbe3](https://github.com/stratif-io/stratif.io/commit/46adbe3a1cd3fa88b34469f87578c374d819485b))
* **layout:** make preview grid scroll by adding flex flex-col to wrapper div ([23d9c70](https://github.com/stratif-io/stratif.io/commit/23d9c70471b398dceeec498255da620b250bec6f))
* make total users input controlled in TopBar ([283f91d](https://github.com/stratif-io/stratif.io/commit/283f91d66f4be1a527ea24c981a7a228594f9953))
* move datetime import to top-level, tighten event count assertion ([29cb137](https://github.com/stratif-io/stratif.io/commit/29cb1372658855fe4f6d1b98aeae6ac2f413b712))
* normalize shape curve in rate-driven preview to prevent arrival_cap collapse ([d2d151d](https://github.com/stratif-io/stratif.io/commit/d2d151d89222bd469af2ed7a1b302c012bbc072a))
* **presets:** set dating app growth to strong (was seasonal) ([d8fad2f](https://github.com/stratif-io/stratif.io/commit/d8fad2fe19da2a9f153437ed071f6e18cc67d03d))
* **preview:** compute stickiness as DAU/MAU (30-day unique actives) ([50f0080](https://github.com/stratif-io/stratif.io/commit/50f00805f08984d9a8c013ac665e0b3a83f84367))
* **preview:** correct formula strings on KPI charts to match simulation model ([4990eb2](https://github.com/stratif-io/stratif.io/commit/4990eb2331e120d5b0650475f41d879ab50208c4))
* **preview:** move DayTable+SimMathPanel inside scroll container ([6042823](https://github.com/stratif-io/stratif.io/commit/6042823f17570b93cf178675340d1a503d15859f))
* **preview:** resolve axis defaults before sending config to backend ([67e0c1b](https://github.com/stratif-io/stratif.io/commit/67e0c1ba790c3511383a110b7698b8d2adf676b3))
* **preview:** stop click propagation on SimMathPanel wrapper ([9fec6af](https://github.com/stratif-io/stratif.io/commit/9fec6afb8a6ef9b2dc15bc030ae7ba22b9fa308d))
* reduce TUI flicker with React.memo and slower spinner ([f94cbb0](https://github.com/stratif-io/stratif.io/commit/f94cbb090da189bf6d32b24c5d1d2ddc81a1c0ce))
* remove accidental dist symlink and reformat test file ([0932574](https://github.com/stratif-io/stratif.io/commit/093257493b1bd2705bf59146a71a8bcff76a2235))
* remove domain compatibility shim from SimulationConfig ([3cf87f6](https://github.com/stratif-io/stratif.io/commit/3cf87f6aa22b9b98427549c957fc1239a76569c5))
* remove redundant aria-label from total users input ([667c339](https://github.com/stratif-io/stratif.io/commit/667c3396785d384d6cdb85bc4a786f96e9beabc5))
* remove spinner animation to eliminate TUI flicker ([ccecc5d](https://github.com/stratif-io/stratif.io/commit/ccecc5d72e0c4b6c3682da247c1c7b995e0b8e6f))
* resolve @stratif-io/web from source, not dist ([0226010](https://github.com/stratif-io/stratif.io/commit/022601064774ea1d15020c2809e59192e14903dc))
* resolve pre-merge TypeScript build errors and Python ruff lint ([5c563de](https://github.com/stratif-io/stratif.io/commit/5c563de0fc5ccceb360181d241ff8615aa469412))
* resolve Tailwind scanning for design-docs by adding [@source](https://github.com/source) directive ([22053ae](https://github.com/stratif-io/stratif.io/commit/22053ae45ccbf7bd77c2e6c117ecc8e4d8ec8161))
* restore GET /api/simulator/presets endpoint lost in revert ([d1403ea](https://github.com/stratif-io/stratif.io/commit/d1403ea6fcfbd40ef3c853932840139d29ea7991))
* **retention:** correct stickiness axis label/value mismatch ([c67545e](https://github.com/stratif-io/stratif.io/commit/c67545e340d48dcd8b10cf235963e6cea314ed66))
* **schema:** use nullish() on ScaleOverride fields to accept null from YAML ([0b48e7e](https://github.com/stratif-io/stratif.io/commit/0b48e7e7c225cd439351313501df6948e898dd90))
* **seeder-studio:** account for Y axis width in anomaly overlay offset ([cecbdab](https://github.com/stratif-io/stratif.io/commit/cecbdab78329b68ba7a04ed3dc16f9550bc5690d))
* **seeder-studio:** accumulate fractional arrivals, derive events from whole-number activeUsers ([3a34fed](https://github.com/stratif-io/stratif.io/commit/3a34fed15a67ecbc13f6a58b5e14f86246d974b2))
* **seeder-studio:** add color-scheme declarations for native control dark mode ([695f1e2](https://github.com/stratif-io/stratif.io/commit/695f1e221693277186fbdcaa0941c9bec4fb47c8))
* **seeder-studio:** add CSS var fallbacks and defaultOpen=false test to AxisSidebar ([cb7654e](https://github.com/stratif-io/stratif.io/commit/cb7654eef210ece5c90a58387fafeb2d4a96b018))
* **seeder-studio:** add KpiChart with anomaly overlay to KpiCardExpanded ([5de2bf5](https://github.com/stratif-io/stratif.io/commit/5de2bf590a1a53a031c872078efa879b17dafb0f))
* **seeder-studio:** add min-w-0 to main column to prevent flex overflow ([c73341d](https://github.com/stratif-io/stratif.io/commit/c73341d96ff435e357c6afb1503f9e0cc9010c57))
* **seeder-studio:** add seasonal + explosive to AXIS_DISPLAY, AXIS_SPEC, growthLatex ([7cc018d](https://github.com/stratif-io/stratif.io/commit/7cc018d4abd679cfa9e23cdfb3a5b646116f03a7))
* **seeder-studio:** address all audit findings ([56a44d3](https://github.com/stratif-io/stratif.io/commit/56a44d32385b11199a0e95cfcd53216d0ae29cef))
* **seeder-studio:** clarify events pipeline and add variable legend to all pipeline metrics ([0bc9b4b](https://github.com/stratif-io/stratif.io/commit/0bc9b4b9fa188c34d461a0a87f371cc3f1c3e60d))
* **seeder-studio:** compute MAU as rolling 28-day sum, not average — fixes stickiness always showing 1 ([770ffec](https://github.com/stratif-io/stratif.io/commit/770ffece0adc1cf6564032ac0586eee2d0a73335))
* **seeder-studio:** compute MAU as unique users in window, not sum of DAU ([de00334](https://github.com/stratif-io/stratif.io/commit/de00334d0f8404591d9948a1fe65276ee01fe5e8))
* **seeder-studio:** constrain anomaly track SVG to main column width ([ce5aeb0](https://github.com/stratif-io/stratif.io/commit/ce5aeb0559aa9a3534f7619b311a53adcd7e5851))
* **seeder-studio:** correct lucide-react version to ^0.469.0 ([16d8abd](https://github.com/stratif-io/stratif.io/commit/16d8abda925ba11fcc88d5011c7784e910fc358f))
* **seeder-studio:** define λ₀ in tooltips; make newUsers vars mode-aware ([afc91d0](https://github.com/stratif-io/stratif.io/commit/afc91d0607453b068c4f367acdde84f943c836f2))
* **seeder-studio:** document summation index s in newUsers formula variables ([65f0573](https://github.com/stratif-io/stratif.io/commit/65f0573d245c2883f395f0c29da5e02f26f30856))
* **seeder-studio:** extract headlineStat to own module, delete dead PresetPicker ([dca0807](https://github.com/stratif-io/stratif.io/commit/dca08076fd9970c665d739a66736158b6fc58ff6))
* **seeder-studio:** fix formatNum negative ratios and 999K→1M boundary promotion ([1f28a96](https://github.com/stratif-io/stratif.io/commit/1f28a96989ce04e212e2b15f7154720962c1a179))
* **seeder-studio:** fix ReferenceArea key and no-op assertion in KpiChart ([28c1bb5](https://github.com/stratif-io/stratif.io/commit/28c1bb58c6be606015dc3f018f9c9d0477ea15b7))
* **seeder-studio:** floating editor dismisses on outside click via composedPath ([92fa7de](https://github.com/stratif-io/stratif.io/commit/92fa7de3891da0eadb5fe3364cdb906f7eb21cdb))
* **seeder-studio:** format 0 as "0" not "0.00"; explain preview-cap zeros ([6c7c086](https://github.com/stratif-io/stratif.io/commit/6c7c086ff91e16af2ebb8ebd49e15b4e4edace92))
* **seeder-studio:** guard against invalid date strings in TopBar date handlers ([395c505](https://github.com/stratif-io/stratif.io/commit/395c5058e83b4aadfd68f430c6e71766485da19d))
* **seeder-studio:** guard invalid dates in resolveDateRange to prevent RangeError crash ([892db73](https://github.com/stratif-io/stratif.io/commit/892db738762363a864f7fb6ecd5c2d8cc959e9ba))
* **seeder-studio:** inline Textarea; point CSS alias at web source ([f23b441](https://github.com/stratif-io/stratif.io/commit/f23b44111efd50c2b7c44e2239b61bc6b05a9875))
* **seeder-studio:** keep focus in λ₀ param input while typing ([1b45985](https://github.com/stratif-io/stratif.io/commit/1b45985a6eaf81fcebe61b3e79a21c2c3df57610))
* **seeder-studio:** make entire pipeline step row clickable to pin tooltip ([bd00c9b](https://github.com/stratif-io/stratif.io/commit/bd00c9b79bec2524aca23be7e35ab62d2e2f6897))
* **seeder-studio:** make formula panel mode-aware (rate vs goal) ([619e331](https://github.com/stratif-io/stratif.io/commit/619e3312cd56be54af3778135ed202bd840b384c))
* **seeder-studio:** normalize arrivals to total_users so chart total matches input ([eb3ca90](https://github.com/stratif-io/stratif.io/commit/eb3ca905d87327e071aa2a13f0bc90b36e9df2a2))
* **seeder-studio:** prevent AnomaliesPane from stretching beyond main column ([cba8587](https://github.com/stratif-io/stratif.io/commit/cba8587826dfe42c566c93824acbd455c5ea2aee))
* **seeder-studio:** remove duplicate bands in expanded chart, overlay already draws them ([34c888c](https://github.com/stratif-io/stratif.io/commit/34c888c20acb94a2f925ef84ad745df81fc28a20))
* **seeder-studio:** remove duplicate useTwinOutput from TopBar; fix null scale types ([276305d](https://github.com/stratif-io/stratif.io/commit/276305d6e87d3babe152da5e9c7717f601fb3851))
* **seeder-studio:** remove stale toBands export and unused imports ([aadf451](https://github.com/stratif-io/stratif.io/commit/aadf451912fb3753f6bb00169712dddbddf9932c))
* **seeder-studio:** rename growth axis value 'decline' → 'declining' to match Python seeder ([a2baa52](https://github.com/stratif-io/stratif.io/commit/a2baa52cb675e4c65b686941db01d5aedd900873))
* **seeder-studio:** SaveModal — add DialogDescription, add missing store/clipboard tests ([283d51e](https://github.com/stratif-io/stratif.io/commit/283d51e9d84c8950fdeec556bf900c52a7e6b3db))
* **seeder-studio:** show anomaly bands in KpiCardExpanded chart ([36faa25](https://github.com/stratif-io/stratif.io/commit/36faa2599e4d8a7a9fc31bb8aadc1a38289945be))
* **seeder-studio:** show axis label (not param value) in tooltip axis button ([fb3637a](https://github.com/stratif-io/stratif.io/commit/fb3637a1fb639fcb983f02433dff849cc5369857))
* **seeder-studio:** show where clause below pipeline formula steps ([83005ab](https://github.com/stratif-io/stratif.io/commit/83005abe9264d163256c74d1ac8f0011c17c5164))
* **seeder-studio:** single λ₀ row in tooltip, editable inline ([e0f4f53](https://github.com/stratif-io/stratif.io/commit/e0f4f532ef4bdd232e42d51e5e94348fbee2abd1))
* **seeder-studio:** sync chart tooltips with syncId, remove guideIndex ([b6ba749](https://github.com/stratif-io/stratif.io/commit/b6ba74968293005f82051e210e85d3cbac38a241))
* **seeder-studio:** tooltip uses item.dataKey to resolve ghost line labels ([5b2b98c](https://github.com/stratif-io/stratif.io/commit/5b2b98c70c755f79debaaab19279edc4375c8015))
* **seeder-studio:** use ref guard for URL sync effect, add clipboard catch ([ec9044e](https://github.com/stratif-io/stratif.io/commit/ec9044e7bd3393e9af642024c7532ed708cb8962))
* **seeder-studio:** use ResizeObserver for pixel-accurate anomaly track width ([bf2e43c](https://github.com/stratif-io/stratif.io/commit/bf2e43cc68ca9a7b964be6d54b120542d4f506cc))
* **seeder-studio:** use type=date inputs for calendar picker and valid date values ([306626b](https://github.com/stratif-io/stratif.io/commit/306626bceb61c470f6fa83ce59b8d268979604f1))
* **seeder-studio:** wire missing axis chips and add MAU ghost line ([cbbb791](https://github.com/stratif-io/stratif.io/commit/cbbb7919f93e1adf9830243cca9b179cfc3ee8b8))
* **seeder-studio:** wrap anomaly SVG in flex-1 div to constrain width ([3d37d53](https://github.com/stratif-io/stratif.io/commit/3d37d538dc309aef7d032d22a1c76b7d1ebedd0b))
* **seeder:** address preview engine code quality issues ([e05c85d](https://github.com/stratif-io/stratif.io/commit/e05c85d1485a64e45dfd29d615d68e4a7aa9f544))
* **seeder:** positive relative anomaly start is now relative to window start ([7c8766b](https://github.com/stratif-io/stratif.io/commit/7c8766b5dcdfd01f1dc6e08039c2284c09d8bc81))
* set explicit port 5174 for design-docs dev server ([a316144](https://github.com/stratif-io/stratif.io/commit/a31614466e1587a45fc93551cd4479a12d26da54))
* set intermediate pipeline stages to empty arrays in preview mode ([a296e68](https://github.com/stratif-io/stratif.io/commit/a296e686a6f331e414935b0904709a68682f9e52))
* show real Poisson lambda in step-by-step table ([4bba4c3](https://github.com/stratif-io/stratif.io/commit/4bba4c314af7e40849a12638aebc781f8b0aa3fc))
* **sidebar:** 300px width, wider axis label column (w-24) ([a78f910](https://github.com/stratif-io/stratif.io/commit/a78f910decc7314aa3770d9aa43a43048ca4ec27))
* **sidebar:** balance axis dropdown buttons ([6c3b873](https://github.com/stratif-io/stratif.io/commit/6c3b873be609d61f247cfebe47ecd4d5327c4b9a))
* **sidebar:** increase width 220px → 260px ([55f14bc](https://github.com/stratif-io/stratif.io/commit/55f14bca718355bdd963b703e240ff403612d31e))
* **sidebar:** left-align options + expand/collapse all ([69302ff](https://github.com/stratif-io/stratif.io/commit/69302ff355a50e1066c0fd4d75b66646641b5ef8))
* **sidebar:** remove sparkline from collapsed trigger row ([c0605eb](https://github.com/stratif-io/stratif.io/commit/c0605eb8c5ba9f0f1170ee1865a5ef57230d153d))
* SIGKILL fallback after 3s in stop() to handle processes that ignore SIGTERM ([60695aa](https://github.com/stratif-io/stratif.io/commit/60695aa650ca2297695840d675f875c461eedaff))
* silence react-refresh/only-export-components in test mock file ([9394a45](https://github.com/stratif-io/stratif.io/commit/9394a4597d868081c3ea07895ae0ef15a375acb5))
* **sim:** add comment clarifying approxDau is a seeding-only approximation ([efc571b](https://github.com/stratif-io/stratif.io/commit/efc571b8e588c9bc0f97b1b5bdcd895f0efb9d09))
* **sim:** clarify dormantDays fence-post; use SIM_CAP constant in test ([0428769](https://github.com/stratif-io/stratif.io/commit/04287695f83c442310466e83417eafd7739b973e))
* **sim:** honest MAU approximation comment; document churnedUsers semantics; add reactivation test ([58d86da](https://github.com/stratif-io/stratif.io/commit/58d86da4747d7a332a04dd3f0634f153be4fa9df))
* **simulator:** add [@source](https://github.com/source) for design system components to generate all Tailwind classes ([503975e](https://github.com/stratif-io/stratif.io/commit/503975e7cfe543687e54bdaee6b1b8523acf105a))
* **simulator:** add sparklines and inline axis selectors for seasonality axes ([f8a2ee6](https://github.com/stratif-io/stratif.io/commit/f8a2ee66a76ac07b2b722b4d8aa5b07397365ddc))
* **simulator:** eliminate active-users spike noise via analytical DAU computation ([c12a2a5](https://github.com/stratif-io/stratif.io/commit/c12a2a50857cd740a8696df1c153b26d9e6c76bb))
* **simulator:** eliminate stickiness/MAU noise on large simulation windows ([db7a8a0](https://github.com/stratif-io/stratif.io/commit/db7a8a0522d50d7ed9fcdbdf68d3d69f9056735b))
* **simulator:** fix SavePanel collapse — proper flex-1 wrapper and width-animated toggle ([65004cc](https://github.com/stratif-io/stratif.io/commit/65004cc40f829e8b63d63854229cf93b87665e6c))
* **simulator:** keyword-based emoji labels + case-insensitive dating default ([328d0c6](https://github.com/stratif-io/stratif.io/commit/328d0c6bb3f6ed35b2dce234abfb95ee5c79f097))
* **simulator:** log-space binary search prevents astronomical overflow ([18c73d9](https://github.com/stratif-io/stratif.io/commit/18c73d99b75dbdc98acf8ff01735cac95b29b769))
* **simulator:** make Brush uncontrolled and disable syncId when brush is shown ([76b6dde](https://github.com/stratif-io/stratif.io/commit/76b6ddece2c3156c55ab2ac6d2cd79ebc4fffbfe))
* **simulator:** move sidebar sparkline to right, vertically centered ([53aa3c6](https://github.com/stratif-io/stratif.io/commit/53aa3c69136127bdccf301913e13bdb46f5f6af8))
* **simulator:** move SIDEBAR_AXES to module level, wrap itemWrapper in useCallback ([892f4f6](https://github.com/stratif-io/stratif.io/commit/892f4f653f6bc454b10ebd63f3a139a3409d6a2e))
* **simulator:** noise axis broken in sidebar — outer spec key still 'anomalies' ([6f7fdcd](https://github.com/stratif-io/stratif.io/commit/6f7fdcd6841ee6ad247625d65d5dc472fb2e3d09))
* **simulator:** pass windowStart so ISO-date anomalies render at correct position ([4be738d](https://github.com/stratif-io/stratif.io/commit/4be738d55f84eafa9d34e7a0996077ead728d967))
* **simulator:** remove invalid nested LineChart inside Brush minimap ([e7c7ff9](https://github.com/stratif-io/stratif.io/commit/e7c7ff9fde28e76b857082e2f73d8a1389a0980d))
* **simulator:** seasonality spreads growth curve instead of multiplying it ([bbb988d](https://github.com/stratif-io/stratif.io/commit/bbb988dc278931f0cec493e7c949d9cddbe8ffaf))
* **simulator:** show axis title prominently with selected value below in AxisChip ([b3fdd58](https://github.com/stratif-io/stratif.io/commit/b3fdd581cd0799133eaaa21b8a972661396a098d))
* **simulator:** sidebar shows selected value below axis title; strip includes seasonality axes ([4a7312f](https://github.com/stratif-io/stratif.io/commit/4a7312f639921befc6c3e36a422284fdd737bf50))
* **simulator:** sync start/end date inputs from scale_config.start_date/end_date ([a2eb3ea](https://github.com/stratif-io/stratif.io/commit/a2eb3ea214b818af36bc1d607cbf03ee61cf5cc4))
* **simulator:** sync UI dates to preset's historical window, not today ([e0f8711](https://github.com/stratif-io/stratif.io/commit/e0f871198985513f916b7635498497c906430062))
* **simulator:** weekly_pattern and monthly_seasonality stripped by Zod schema ([025a849](https://github.com/stratif-io/stratif.io/commit/025a849a6867fbfe206ecdda27d12565e09780b2))
* steady growth is linear (1 + r·d), not constant like flat ([e4da932](https://github.com/stratif-io/stratif.io/commit/e4da932fe075fb039501a184fdf6737bed752f14))
* **studio:** export MetricKey, exhaustiveness guards, stable memo deps in KpiCardExpanded ([d7b6152](https://github.com/stratif-io/stratif.io/commit/d7b615256661a68e0f987b7dedc5ae435be5924a))
* **studio:** memoize data, fix valueSuffix, remove redundant role in KpiCard ([cb3f9c7](https://github.com/stratif-io/stratif.io/commit/cb3f9c776ec0c60a8742d802ee214f45649b0a39))
* **studio:** open CORS to all origins for local dev; accept null/unknown preset fields ([8e031fa](https://github.com/stratif-io/stratif.io/commit/8e031fad4163b4575235d8d329da8fa89d63d4d0))
* **studio:** remove dead resolveSimParams in KpiGrid, strengthen test assertion ([6ef3b60](https://github.com/stratif-io/stratif.io/commit/6ef3b60c8cbec9d8775a5e7ccb98c1c10f6e56ea))
* **studio:** replace nested Popover with inline axis picker in formula tooltip ([b19bb0c](https://github.com/stratif-io/stratif.io/commit/b19bb0c3488cd3163836140a29a3956702933db4))
* **studio:** restore visible value label in AxisChip ([de2cf05](https://github.com/stratif-io/stratif.io/commit/de2cf05b7c8df04ad6b63edc26bb88a5bf5df456))
* **studio:** sync IN PRACTICE table λ with chart pipeline curves ([c05ae41](https://github.com/stratif-io/stratif.io/commit/c05ae4164980a99a30649afaf07008ff3ce3ba06))
* **studio:** use aliased destructure for valueSuffix in KpiCard ([3ef54f9](https://github.com/stratif-io/stratif.io/commit/3ef54f9dab5b30320cf6820a69bce80630f6c507))
* **studio:** use cn() and text-primary class in AxisPopover ([e1e0d76](https://github.com/stratif-io/stratif.io/commit/e1e0d76f11d87a2a2d897c43d6030a98a694b163))
* **test:** narrow outage option selector to avoid matching total_outage ([c946e24](https://github.com/stratif-io/stratif.io/commit/c946e240191cf3352bb364cdaf0ae37af2bfe3f2))
* **tests:** make Databricks seeder tests deterministic ([dc74998](https://github.com/stratif-io/stratif.io/commit/dc74998418f6c560c34580647729976854bddf68))
* **tests:** make Databricks seeder tests deterministic ([73b4f88](https://github.com/stratif-io/stratif.io/commit/73b4f88ebd6b4eb91cd79484eed07e3ca489f3d0))
* **tests:** update stickiness tests for cohort model (RetentionParams replaces hazard_curve) ([7991861](https://github.com/stratif-io/stratif.io/commit/7991861b9405381bebfb38ff283b29522a510cca))
* **test:** update axisDisplaySpec test to expect 8 strip axes ([7b41854](https://github.com/stratif-io/stratif.io/commit/7b418548fed0f84b423995820fa5a784b62a7060))
* **test:** update preset count assertion to 11 ([cda5fdf](https://github.com/stratif-io/stratif.io/commit/cda5fdfee1ab6d17db5b984c670a2c4e7f76276c))
* **test:** use columnheader role query + correct day-1 index in DayTable tests ([5a827d2](https://github.com/stratif-io/stratif.io/commit/5a827d25e2fd48c4213d26ad028a6f3920bcb89e))
* topbar date input aria, negative delta guard, window_days test ([218dda9](https://github.com/stratif-io/stratif.io/commit/218dda959b3f526d1a9d8b7e28738b585ac70d7c))
* **topbar:** consolidate store subscriptions, guard URL revoke in handleExport ([d7dfd1e](https://github.com/stratif-io/stratif.io/commit/d7dfd1e5d5271ce50c53fec89d79fa449afac135))
* **twin:** add out-of-range guard for total_outage window (parity with anomalies.ts) ([e074509](https://github.com/stratif-io/stratif.io/commit/e0745096df97fd10cc2d2d410126ef69de1063e2))
* **twin:** also zero newUsers during total_outage window ([cbdbc98](https://github.com/stratif-io/stratif.io/commit/cbdbc9800c373aaa54ad92da0e538bc19337439a))
* **twin:** clamp total_outage start to 0, assert stickiness null in test ([be8050c](https://github.com/stratif-io/stratif.io/commit/be8050c0461122886c851e357f1c2c0163834c1c))
* **twin:** ramp stickiness from 0 during MAU warmup window ([4cc0737](https://github.com/stratif-io/stratif.io/commit/4cc0737df49142ab25298c9b8011ffdb626e315a))
* **twin:** show null stickiness during MAU warmup instead of ramp ([583e166](https://github.com/stratif-io/stratif.io/commit/583e166c1ba6b694acd118c30eedf9c4cac98f36))
* update Calendar component classNames for react-day-picker v9 API ([5ed9ae0](https://github.com/stratif-io/stratif.io/commit/5ed9ae0b9049ba69e0c5eae111ea8aa221de7685))
* update connections.yaml path, stale seeders imports, unused type: ignore ([cea0356](https://github.com/stratif-io/stratif.io/commit/cea0356ba680940c76c20980965e700ecfb69911))
* update dist path in main.py after services/ restructure ([b7dbaf3](https://github.com/stratif-io/stratif.io/commit/b7dbaf340cee946d91b211984a4090fdf60e4315))
* update install.sh module paths after services/ restructure ([438977e](https://github.com/stratif-io/stratif.io/commit/438977e951d9f8550b8c26c347559ddf0e581112))
* update post-commit hook to reference apps/analytics ([8f9c5c9](https://github.com/stratif-io/stratif.io/commit/8f9c5c9b7f815b129f7524c841ded0f33225926a))
* use deterministic rounding instead of Poisson in preview engine ([35d5f7f](https://github.com/stratif-io/stratif.io/commit/35d5f7fc4a7584f389c5b67e69ea10758fc72b26))
* use packages=["services"] so uv installs services.* namespace correctly ([a533f9d](https://github.com/stratif-io/stratif.io/commit/a533f9da2514d95a65a7dcc6d4f1033e237c255d))
* use pkill -P instead of setsid — setsid not available on macOS ([461df00](https://github.com/stratif-io/stratif.io/commit/461df00690dba0ba276ab0a90cde722480066d54))
* use STRATIFIO_OSS_TOKEN for release PR merge ([8650c2e](https://github.com/stratif-io/stratif.io/commit/8650c2e050fc59af9884d5fee1e2d8efd1c513a4))
* use STRATIFIO_OSS_TOKEN for release PR merge to bypass branch protection ([bf6bbdf](https://github.com/stratif-io/stratif.io/commit/bf6bbdf7a76c2ed3c16daf022076e9b9519a6008))
* validate transition to-keys, fix unreachable ReturnInitiated in retail preset ([651479a](https://github.com/stratif-io/stratif.io/commit/651479a7f5de9442c9a33aabb2bcceeb02a305e1))
* **vite:** add index.css sub-path alias for design-system ([3b01d45](https://github.com/stratif-io/stratif.io/commit/3b01d45cb07e715133cd76ffb1aac3462f4c10d9))
* **vite:** add index.css sub-path alias for design-system ([7ee13f4](https://github.com/stratif-io/stratif.io/commit/7ee13f4cbd69f936e040a311da1511897e1c0328))
* **vite:** add index.css sub-path alias for design-system ([8bf4bc0](https://github.com/stratif-io/stratif.io/commit/8bf4bc04e51d44ed9fe520f6af225925432a5d24))
* **zoom-brush:** align brush handles precisely with chart plot area ([5b68767](https://github.com/stratif-io/stratif.io/commit/5b68767e0d9d1d51ea7ee262f0666d58a6150aa7))
* **zoom-brush:** correct event band positions and clipping when zoomed ([6a8488c](https://github.com/stratif-io/stratif.io/commit/6a8488c57d62551fd43298abbb6770bbb242efa3))
* **zoom-brush:** fix handle positions and live chart zooming ([418e63f](https://github.com/stratif-io/stratif.io/commit/418e63fbe6f0b6cc249811b2597bf9da58fc7a95))
* **zoom-brush:** fix invisible events when zoomed ([e4d95b3](https://github.com/stratif-io/stratif.io/commit/e4d95b377702987551629aadefd68c2da83e8865))
* **zoom-brush:** make selection box visible above Recharts SVG ([9344161](https://github.com/stratif-io/stratif.io/commit/934416116950a8d65beea1571bf4ede5d62239f7))
* **zoom-brush:** scale anomaly bands to the zoomed view ([3663020](https://github.com/stratif-io/stratif.io/commit/3663020c8196b2ec58e96866bd219894c30c490e))
* λ₀ = day-0 rate, remove shape normalization ([08d3d38](https://github.com/stratif-io/stratif.io/commit/08d3d387db7534b72db32631d91a39333ce8ca16))


### Performance Improvements

* **simulator:** 33x speedup — precompute survival curve + skip stickiness in binary search ([7979cdd](https://github.com/stratif-io/stratif.io/commit/7979cdda804a8163024efe7eda2fc72d53ac505a))
* **simulator:** 34x speedup for long-window previews ([90eb4d9](https://github.com/stratif-io/stratif.io/commit/90eb4d962239b3d7658d2e17f0b417fe65c9292e))
* **simulator:** early-exit binary search + O(n) stickiness sliding window ([b009b82](https://github.com/stratif-io/stratif.io/commit/b009b821f8f8faa4ee8173c125c6b11083c81627))


### Reverts

* remove @tailwindcss/vite from design-system lib build ([bd059ff](https://github.com/stratif-io/stratif.io/commit/bd059ff4847a933e8607615ec04c0a72a43e1f19))

## [0.39.0](https://github.com/stratif-io/stratif.io/compare/v0.38.0...v0.39.0) (2026-04-18)


### Features

* **demo:** noindex SPA deep routes, keep root indexable ([a833f7a](https://github.com/stratif-io/stratif.io/commit/a833f7a242ceb220c2033da5ad4663ffca85143f))
* **seo:** OSS README honest positioning + docs per-page meta + demo noindex ([4b900a8](https://github.com/stratif-io/stratif.io/commit/4b900a8c9907d163b396a880fde29636de3ace03))

## [0.38.0](https://github.com/stratif-io/stratif.io/compare/v0.37.0...v0.38.0) (2026-04-17)


### Features

* add Starlight docs site (docs.stratif.io) ([8323e96](https://github.com/stratif-io/stratif.io/commit/8323e962159dab55984c38eab95ae0c36c1b9b22))


### Bug Fixes

* **install:** unshallow repo before checkout so version pinning works on existing installs ([fe6eda1](https://github.com/stratif-io/stratif.io/commit/fe6eda19abe6280ccb6636f9c7228f760704b3a3))

## [0.37.0](https://github.com/stratif-io/stratif.io/compare/v0.36.0...v0.37.0) (2026-04-16)


### Features

* ship @stratif-io/web as pre-built ESM lib ([d25ca1c](https://github.com/stratif-io/stratif.io/commit/d25ca1c8e9e98f5d6a70214cd228f81b90975812))

## [0.36.0](https://github.com/stratif-io/stratif.io/compare/v0.35.1...v0.36.0) (2026-04-16)

### Features

- **connections:** add ref column to connection_filter_fields for stable ID-based filter refs ([593138b](https://github.com/stratif-io/stratif.io/commit/593138b7c477e3f9b06f063392ddf62aff9905a5))
- **connections:** db type first in new connection form, add advanced setting descriptions ([f2cbcb6](https://github.com/stratif-io/stratif.io/commit/f2cbcb66640aa8006e146800e2757b518b075aed))
- **connections:** filter refs by ID — backend resolves \$schema_key and UUID refs, legacy field fallback ([68b7875](https://github.com/stratif-io/stratif.io/commit/68b787521459f4fe8943582c05968b0fe7d01dca))
- **connections:** stable custom property IDs — preserve on upsert, include in API response ([a6b82ab](https://github.com/stratif-io/stratif.io/commit/a6b82ab365cb06e14ea4586794ccf2723a1603cf))
- key enabledFields by ref in useSchemaForm, add migrateFilterFields ([cef503e](https://github.com/stratif-io/stratif.io/commit/cef503e9511c529bccf78921c9eec6409ffb5909))
- pass stable refs to toggleFilter in FieldMapStep ([d281c81](https://github.com/stratif-io/stratif.io/commit/d281c81d3d6249452d0c74d8ebbd5194335cc44c))
- show active query name in QueryStatusIndicator ([025db95](https://github.com/stratif-io/stratif.io/commit/025db95d781369a35749cf84c0b0dd36a6923df3))
- use field.ref || field.field as filter key in GlobalFilters ([dbd9019](https://github.com/stratif-io/stratif.io/commit/dbd9019069e4344949677ac76ed2c5887055c5ab))

### Bug Fixes

- CategoryCard filterEnabled uses prop.id not prop.path ([93a1ff2](https://github.com/stratif-io/stratif.io/commit/93a1ff26f041b3d4fa648c363b94e14fc6744a2e))
- Connection page UX fixes ([51e563d](https://github.com/stratif-io/stratif.io/commit/51e563d3f53162c10e668e0cbeb572809d5c7d98))
- **connections:** strict=True in zip, UUID validation for custom property id ([20ead66](https://github.com/stratif-io/stratif.io/commit/20ead66b4d97a66218945108bca76b3a511c8fa0))
- **fieldmap:** sync filter icon on category change; consolidate CATEGORY_ICON_MAP ([eedb0c6](https://github.com/stratif-io/stratif.io/commit/eedb0c6d8560ec54383eada9df9db829e4688b65))
- **fieldmap:** sync icon when per-row category badge changes ([e942a3e](https://github.com/stratif-io/stratif.io/commit/e942a3e9ffc51ece7dfdbffbcfd7f6a7a74e8a1f))
- filter pills visible while options loading; show testing state before ping result ([1a384ca](https://github.com/stratif-io/stratif.io/commit/1a384ca384aede5090c00ef578dc39df412c3a87))
- no-connection screen navigates directly to /connections/new ([9e483cb](https://github.com/stratif-io/stratif.io/commit/9e483cb6f1205b4ec246bc7c1882225b8aa91855))
- **query-log:** log all connection metadata fetches ([5e39732](https://github.com/stratif-io/stratif.io/commit/5e3973287c75007a13ad2b564a9497c541afa046))
- **query-log:** log all queries so panel is never empty while queries run ([7642568](https://github.com/stratif-io/stratif.io/commit/76425680879afa6c2dbbfddd25462a228d377401))
- **query-log:** log connection setup queries (tables, browse, test) ([07cae3c](https://github.com/stratif-io/stratif.io/commit/07cae3ca5af3693b04dae3f2aa952e1c35d31ddf))
- **query-log:** log credentials and connection string fetches ([3de57a5](https://github.com/stratif-io/stratif.io/commit/3de57a5cf3c308273db6ff8328b61710afa148b3))
- set activeConnectionId when entering a connection detail page ([75fa0f5](https://github.com/stratif-io/stratif.io/commit/75fa0f57827afc7897f88498d181763801b76979))
- skip stale refs with empty field path in filter expr resolver ([35514f7](https://github.com/stratif-io/stratif.io/commit/35514f70ed794fc5f06fdeade4c475bdbcf8e5fb))
- use category icon for custom property filter pills instead of MoreHorizontal ([77b6aab](https://github.com/stratif-io/stratif.io/commit/77b6aab721a4f83035eba0d3fb79ddc6791b2ecf))
- wait for schemaConfig before migrating filter refs in useSchemaForm ([476c9ca](https://github.com/stratif-io/stratif.io/commit/476c9ca4d2e22733fba9a4a1c9fe7cf83c957177))

## [0.35.1](https://github.com/stratif-io/stratif.io/compare/v0.35.0...v0.35.1) (2026-04-15)

### Bug Fixes

- **dev:** format main.tsx ([52a7eef](https://github.com/stratif-io/stratif.io/commit/52a7eefd1f13ee5994244d1950bb71de4d50328a))
- **dev:** hide design system when VITE_NO_DESIGN_SYSTEM=true ([77dd12f](https://github.com/stratif-io/stratif.io/commit/77dd12f06079314d118dab04f7f0811738c6d3c7))
- **dev:** hide design system when VITE_NO_DESIGN_SYSTEM=true ([0116a15](https://github.com/stratif-io/stratif.io/commit/0116a15df3bd24c681b8c598dad99f369f3724ee))
- **retention:** correct params order to match CTE sequence ([4cff7f8](https://github.com/stratif-io/stratif.io/commit/4cff7f8a1682684d1b468512a8efd0297ff22c4b))

## [0.35.0](https://github.com/stratif-io/stratif.io/compare/v0.34.1...v0.35.0) (2026-04-15)

### Features

- **dashboard:** per-card error state with red border and retry button ([6323305](https://github.com/stratif-io/stratif.io/commit/63233057e4bb80582576c1c9db12740b7ad57162))
- **dashboard:** per-card error state with red border and retry button ([f57b0d5](https://github.com/stratif-io/stratif.io/commit/f57b0d5a80704bc7aa92c4e7046fe7a06f21aa13))
- **dashboard:** show error reason in parenthesis on failed cards ([3096900](https://github.com/stratif-io/stratif.io/commit/3096900606100f8a944fc8cce70b194671dc0f4b))

## [0.34.1](https://github.com/stratif-io/stratif.io/compare/v0.34.0...v0.34.1) (2026-04-15)

### Bug Fixes

- **browse:** unpack (conn, meta) tuple from \_pool_get before calling backend ([babee89](https://github.com/stratif-io/stratif.io/commit/babee893e3021f1e7a83951a9e6caea07c61f528))
- **databricks:** handle Unity Catalog 4-col SHOW TABLES format ([6b5ffe7](https://github.com/stratif-io/stratif.io/commit/6b5ffe7ab84cd9cca033db6f40aa991f5602e0d0))
- **databricks:** handle Unity Catalog 4-col SHOW TABLES format ([cf4116d](https://github.com/stratif-io/stratif.io/commit/cf4116d14b194b0609a1f007e545728cc9eb52b9))
- **lint:** remove unused pytest import in test_api_connections_browse ([30d5699](https://github.com/stratif-io/stratif.io/commit/30d56994e4fb18786c830ca64a8696c7a1f4d09c))

## [0.34.0](https://github.com/stratif-io/stratif.io/compare/v0.33.0...v0.34.0) (2026-04-15)

### Features

- dimension-value queries in log behind a toggle ([6a48a79](https://github.com/stratif-io/stratif.io/commit/6a48a793a269fb198b600d44470c4020d9c81b32))
- per-row SQL button, last 20 queries from session log, scrollable panel ([586e6bb](https://github.com/stratif-io/stratif.io/commit/586e6bbd1c7122f31d6b6cb2912bf367b2683699))
- query log page + clickable SQL viewer in query clicker ([3cbc49a](https://github.com/stratif-io/stratif.io/commit/3cbc49ad36bf10e1aab802648292817fbc949adb))
- query log page + SQL viewer in query clicker ([92fbfde](https://github.com/stratif-io/stratif.io/commit/92fbfdecfafcac78a29bd85b58ccc42d51c6aa6a))
- wire query log tracking to all analytics fetch functions ([cfc0110](https://github.com/stratif-io/stratif.io/commit/cfc0110ac12a15ea296e04258df33c80563751ae))

### Bug Fixes

- add ClickHouse cases to date_diff_days and date_diff_months in sql_builder ([9f01cb1](https://github.com/stratif-io/stratif.io/commit/9f01cb1b15be07f54e7c5248c115db1af91b6341))
- apply log level at import time, not in lifespan ([9301cbe](https://github.com/stratif-io/stratif.io/commit/9301cbe4a608379709404918949676a4aeca5c73))
- apply log level at import time, not in lifespan ([af40079](https://github.com/stratif-io/stratif.io/commit/af4007999ab9feb8ed797a1c53cd0e877dd04ea8))
- augment bootstrap schema detection with fuzzy identity-field matching ([9c98e96](https://github.com/stratif-io/stratif.io/commit/9c98e966d30ae3f3328b5d6233aaa82649261961))
- **backend:** replace CAST(... AS DOUBLE) with 1.0 _ COUNT(_) in dau_mau_ratio ([bcc75bf](https://github.com/stratif-io/stratif.io/commit/bcc75bf41ea771322b5009349d620ff99af2c877))
- compact query panel — fixes overflow, clipped rows, spurious hint ([fb83a55](https://github.com/stratif-io/stratif.io/commit/fb83a55ff1c21f46d44dd4c167f97df4a0063d49))
- convert backend connection errors in open_analytics_db to HTTP 503 ([c888955](https://github.com/stratif-io/stratif.io/commit/c8889555f563a6631371284942bb9cbbf9d98d67))
- **dashboard:** match skeleton dimensions to actual card layout ([677809c](https://github.com/stratif-io/stratif.io/commit/677809c7fc70a8e2ae4869217df7db03edda1a9c))
- **dashboard:** revert to per-metric requests, fix cache arg order ([0cbfd9c](https://github.com/stratif-io/stratif.io/commit/0cbfd9c5d687e4fbf1e37768e199a2564fb9dbeb))
- look up custom property values by name not path in EventsTable ([2192e41](https://github.com/stratif-io/stratif.io/commit/2192e419a5c69a7651f3fc055521483450657c44))
- **mission-control:** prevent EmptyState flicker while top events still loading ([a8c92e3](https://github.com/stratif-io/stratif.io/commit/a8c92e3b78d700b65ab5b8eeca0e09dda2b428fa))
- pass HTTPException through generic exception handler ([39ec575](https://github.com/stratif-io/stratif.io/commit/39ec575516d576fc01bfe9f6303d2d90772fc764))
- pass log_config=None to uvicorn to prevent log level being overr… ([021fec4](https://github.com/stratif-io/stratif.io/commit/021fec41bb35e1baf0519b56de6516d34b672533))
- pass log_config=None to uvicorn to prevent log level being overridden ([8c9bf1e](https://github.com/stratif-io/stratif.io/commit/8c9bf1e3b56b66a43e30815502ca5dc99793e385))
- pass log_config=None to uvicorn to prevent log level being overridden ([bd27046](https://github.com/stratif-io/stratif.io/commit/bd27046fa440a4c3b0a05f382ed8ecd98c4cc206))
- prevent timezone-induced date drift in URL sync ([1be257e](https://github.com/stratif-io/stratif.io/commit/1be257e27b3886db9b6e7c2a8710d027f037bb59))
- remove snowflake from bootstrap + infer categories on schema detect ([a9f40ee](https://github.com/stratif-io/stratif.io/commit/a9f40ee61e5b61746f4f6e0c35358d7c37fc233e))
- remove sql field from golden snapshots and guard empty state ([5c34f81](https://github.com/stratif-io/stratif.io/commit/5c34f81b3b8cda9f051f99b22888f35b04885132))
- remove sql field from golden snapshots and guard empty state ([056c97b](https://github.com/stratif-io/stratif.io/commit/056c97b8179e8c01e32b5d65940ebaa60cda3abb))
- select filter field values in raw events query ([5b75e53](https://github.com/stratif-io/stratif.io/commit/5b75e53752ed71fa0651b0fea1e4374fc6adca3a))
- **test:** make test_logging robust to test-order structlog pollution ([58264a6](https://github.com/stratif-io/stratif.io/commit/58264a628f31b49f71bd09b089044a1af80c9f80))
- use date-only params for ClickHouse retention queries ([08e8166](https://github.com/stratif-io/stratif.io/commit/08e81666bf6ac47a70e53cfc32cec54f075b388d))
- use extractFromPath for filter field values in EventsTable ([5c04d87](https://github.com/stratif-io/stratif.io/commit/5c04d87b0209178f973033cbaa2099bdd7b02caa))

### Performance Improvements

- **dashboard:** replace 14 per-metric requests with 1 aggregate call ([64cc28d](https://github.com/stratif-io/stratif.io/commit/64cc28d74064357febea688572f460eef84240c5))
- **dashboard:** replace 14 per-metric requests with 1 aggregate call ([bf93a78](https://github.com/stratif-io/stratif.io/commit/bf93a785638587b374144c8273be84fedcc9c1ac))
- eliminate queryLog subscription from QueryStatusIndicator ([530a731](https://github.com/stratif-io/stratif.io/commit/530a7312d3e717e06741c1acdf432c4aad378d2d))

## [0.33.0](https://github.com/stratif-io/stratif.io/compare/v0.32.1...v0.33.0) (2026-04-14)

### Features

- add server-side TTL cache for mission control analytics queries ([93fc5e1](https://github.com/stratif-io/stratif.io/commit/93fc5e1bd88808c8d59369496cec106641c3f3e1))
- **connections:** add query timeout and max concurrent inputs ([87da698](https://github.com/stratif-io/stratif.io/commit/87da698afebf6ec20049f85c9c730d47e41b961a))
- **connections:** form state for query execution settings ([13636c7](https://github.com/stratif-io/stratif.io/commit/13636c7a8691042e51456d6438330e124ddf6253))
- **connections:** persist query_timeout_seconds and max_concurrent_queries ([5a9b3b0](https://github.com/stratif-io/stratif.io/commit/5a9b3b0c6cc832a69a8943a6954b708026bb12aa))
- **dashboard:** apply max_concurrent_queries to semaphore ([d72a7c4](https://github.com/stratif-io/stratif.io/commit/d72a7c4c427cd570f7b73dfc81c7a9a5daca95b2))
- **dashboard:** clickable query history popover ([1573ede](https://github.com/stratif-io/stratif.io/commit/1573edef12d30ced9fff291d5156ddf83834cfa8))
- **dashboard:** show timeout error on mission-control cards ([0bf3067](https://github.com/stratif-io/stratif.io/commit/0bf3067ed104bea07b12caa85da55289a74ac5a2))
- **dashboard:** tag mission-control queries with groupKey, meta and per-connection timeout ([0d2f791](https://github.com/stratif-io/stratif.io/commit/0d2f791247f514cd69477e870e19402754128d67))
- **db:** backfill new schema_config columns on startup ([002a34a](https://github.com/stratif-io/stratif.io/commit/002a34a0a666aaa6b6abf14e99d2af13e817865f))
- no retry on timeout + redesign query history popover ([2b84497](https://github.com/stratif-io/stratif.io/commit/2b844978e3c5221bb67b3ee3df0fafb93977fb8b))
- no retry on timeout + redesign QueryHistoryPanel ([cea7e26](https://github.com/stratif-io/stratif.io/commit/cea7e265f74c8667954b20e6013146cf1e52fd3f))
- query execution control (ordering, history popover, per-connection timeout + concurrency) ([4bc62e1](https://github.com/stratif-io/stratif.io/commit/4bc62e10bc11aa3b37e143c652d067d61a3200ff))
- **schemas:** accept query execution fields on SchemaConfigSchema ([1d10aea](https://github.com/stratif-io/stratif.io/commit/1d10aea4da0147e43a3d53f4ebbd51d85cd63a5c))
- **seeders:** add bootstrap_all_connections script ([f58e8bb](https://github.com/stratif-io/stratif.io/commit/f58e8bb3c43f36d0e2826c800dbf56397923e3ed))
- **seeders:** bootstrap all enabled connections from YAML ([5728a80](https://github.com/stratif-io/stratif.io/commit/5728a80364d893f97aefb955c68b024bf9daf9f5))
- **seeders:** restrict auto global filters to country + city ([3d684f7](https://github.com/stratif-io/stratif.io/commit/3d684f7cafbe013134a1424caa49d9d7a61bbf1c))
- **seeders:** snowflake seeder + bootstrap-all invokes seeders ([8903b1a](https://github.com/stratif-io/stratif.io/commit/8903b1a4471e4c16005f0d85039a730ff5f91072))
- **seeders:** snowflake seeder + bootstrap-all invokes seeders ([7bc2f16](https://github.com/stratif-io/stratif.io/commit/7bc2f16b6c5bc14798047d70f5fb395ab4d3864c))
- **semaphore:** emit start/finish events into store ([56b8492](https://github.com/stratif-io/stratif.io/commit/56b8492cb2c057b2b1e0b284dd0cac420d1128f3))
- **semaphore:** groupKey-aware queue ordering ([4eed3df](https://github.com/stratif-io/stratif.io/commit/4eed3dfdb91dac16fb04688c7e1f10ef750cc5e6))
- **semaphore:** per-task timeout via AbortController ([ffc63a1](https://github.com/stratif-io/stratif.io/commit/ffc63a141ab4a32c299ad4019d6ee2db81d6cb3b))
- server-side TTL cache for analytics queries (Databricks perf) ([c2efc69](https://github.com/stratif-io/stratif.io/commit/c2efc6983078a9f4f00b592d2d6872ddbaad7be5))
- **snowflake:** wire fakesnow for e2e integration tests ([48d1958](https://github.com/stratif-io/stratif.io/commit/48d1958fbc30752ab74c49ff89ee2150ef9a8160))
- **snowflake:** wire fakesnow for e2e integration tests ([3ce8748](https://github.com/stratif-io/stratif.io/commit/3ce8748d258c48baf30725d3119f7e7dbfb4569c))
- **store:** queryHistory slice with rolling finish prune ([d5a8b9a](https://github.com/stratif-io/stratif.io/commit/d5a8b9a2a6ce4b902314197389b85bb0dd222f58))

### Bug Fixes

- make full test suite green ([2a82665](https://github.com/stratif-io/stratif.io/commit/2a826653ebd1cb2e3c60c8ee3462a5ca99fcf680))
- make full test suite green ([8a44c83](https://github.com/stratif-io/stratif.io/commit/8a44c83a749e0989565aa7617b92a94925b4329e))
- **mission-control:** apply filters to all user-classification KPIs ([45a7cec](https://github.com/stratif-io/stratif.io/commit/45a7cec20b3dff8b17957c17a2e5e75429182322))
- **mission-control:** apply filters to new/returning/resurrected/churned ([ad9bca9](https://github.com/stratif-io/stratif.io/commit/ad9bca97e2cb28cd174cedecc1e23a8a2457e712))
- **seeders:** snowflake row-at-a-time insert; databricks accepts YAML host/token ([371cfac](https://github.com/stratif-io/stratif.io/commit/371cfac4deeb83b8fd96425dba134c83f0a4e35d))
- **seeders:** snowflake row-at-a-time insert; databricks accepts YAML… ([456f8e0](https://github.com/stratif-io/stratif.io/commit/456f8e07f62c15d2fc6dcf8a47e51303cdb19243))
- **test:** revert vmThreads pool (caused SIGSEGV in CI) ([516e628](https://github.com/stratif-io/stratif.io/commit/516e628cc1b7bc3a561060fa252f245b5cd1c99d))
- **test:** skip fakesnow.patch() when already active from session fixture ([8b8cd2c](https://github.com/stratif-io/stratif.io/commit/8b8cd2c222af7f1124a17ced921039e856cb7738))
- **test:** skip fakesnow.patch() when already active from session fixture ([c99f942](https://github.com/stratif-io/stratif.io/commit/c99f94263c4be84639ad006062e17d49e9572034))

### Performance Improvements

- cache column types in connection pool to eliminate per-request … ([0a86bf7](https://github.com/stratif-io/stratif.io/commit/0a86bf7205b3c9d17012396b5b991b2a3f65d13f))
- cache column types in connection pool to eliminate per-request LIMIT 0 query ([776c336](https://github.com/stratif-io/stratif.io/commit/776c336c59d781728b2d24213dc0e7a478a89d7d))
- rewrite DAU/MAU to use a single query instead of 2+ per call ([fff210f](https://github.com/stratif-io/stratif.io/commit/fff210f352a19996eedbe72abf55f8788ea8ba01))
- rewrite DAU/MAU to use a single query instead of 2+ per call ([dcc1a36](https://github.com/stratif-io/stratif.io/commit/dcc1a368479868056e7f53a03908cfb22027af28))
- **seeders:** bulk-load snowflake via write_pandas + PARSE_JSON staging ([af00d8e](https://github.com/stratif-io/stratif.io/commit/af00d8eb7e02efce1687882855f6cca64ee975a9))
- **seeders:** fakesnow fast path + multi-row INSERT for snowflake ([817ac4e](https://github.com/stratif-io/stratif.io/commit/817ac4ed1d78fd6126d9fe01d9b50f509959cca8))
- **seeders:** fakesnow fast path + multi-row INSERT for snowflake ([c10399e](https://github.com/stratif-io/stratif.io/commit/c10399e226ecb1f8eb855c8091336ec3120b353e))
- **test:** use vmThreads pool for ~2x faster test runs ([707c1ee](https://github.com/stratif-io/stratif.io/commit/707c1ee980aba6a531fb6930e620ab40a2ae0aa4))

## [0.32.1](https://github.com/stratif-io/stratif.io/compare/v0.32.0...v0.32.1) (2026-04-14)

### Bug Fixes

- **security:** harden auth, crypto, error handling, and SQL identifier inputs ([65a9939](https://github.com/stratif-io/stratif.io/commit/65a993972f53ff31ad87e07193acbf966ee8ccd8))
- **security:** harden auth, crypto, error handling, and SQL identifier inputs ([7dd0196](https://github.com/stratif-io/stratif.io/commit/7dd0196d2efa23f8c2e0aa6a27aebc10ed3b6694))
- **security:** set test encryption key in root conftest ([9b6cf74](https://github.com/stratif-io/stratif.io/commit/9b6cf74d82492e62e61a7c2eedef914404f25931))

## [0.32.0](https://github.com/stratif-io/stratif.io/compare/v0.31.0...v0.32.0) (2026-04-14)

### Features

- add AccessLogMiddleware for structured request logging ([0798cb4](https://github.com/stratif-io/stratif.io/commit/0798cb4e987c6b21eae28cc5eb3ce35fd7fb48f2))
- add analytics abstraction layer (no-op context + hook) ([618c49b](https://github.com/stratif-io/stratif.io/commit/618c49b0d9c5e68c0788f2697bbe25bf2fabb685))
- add close_product_db for graceful shutdown ([5dd7450](https://github.com/stratif-io/stratif.io/commit/5dd7450158a12f998706d0746c36c8621d4b30e1))
- add contains counting mode to PathAnalyzer (DuckDB) ([3df03da](https://github.com/stratif-io/stratif.io/commit/3df03da4cfcabc5af214db221842b6c01de219af))
- add counting_mode param to fetchPathAnalysis ([1e74983](https://github.com/stratif-io/stratif.io/commit/1e749837797bbf62503b3cfbede4f35247e110a9))
- add Exact/Contains counting mode toggle to Paths Explorer toolbar ([c8daed5](https://github.com/stratif-io/stratif.io/commit/c8daed5de60d9fa71a9e07482e1ea449ae65720a))
- add Funnel nav item to sidebar ([bd2ae8a](https://github.com/stratif-io/stratif.io/commit/bd2ae8a59365b3eed941529b5a15e17376989a0a))
- add InterceptHandler to route stdlib logs through structlog ([cd7c552](https://github.com/stratif-io/stratif.io/commit/cd7c552c7556a3b55b8fbb9d421bbfd29a1a8f22))
- add Learn panel to Paths Explorer ([08bc785](https://github.com/stratif-io/stratif.io/commit/08bc785533f4e242707a3560a8afda7b046972ea))
- add logging adapter for local analytics debugging ([6c602d9](https://github.com/stratif-io/stratif.io/commit/6c602d96d691611c520f409808aacc0d630ea0f6))
- add NotFoundPage component to design system ([6849f24](https://github.com/stratif-io/stratif.io/commit/6849f247feb42197b4fc3339bd23769e33aab7ef))
- add PageTracker to OSS app for route change analytics ([3c9161d](https://github.com/stratif-io/stratif.io/commit/3c9161d8cf169a0104f059f62edfbd432c182795))
- add slowapi rate limiting (200 req/min per IP) and wire AccessLogMiddleware ([75347a4](https://github.com/stratif-io/stratif.io/commit/75347a412cba25610547c5fab1d4431e8740f0f1))
- apply semantic color variety to FunnelDetailPage summary cards ([7cbb6b6](https://github.com/stratif-io/stratif.io/commit/7cbb6b64490bb75ca2ca720ddf71fce671d086c2))
- apply TYPOGRAPHY constants to EventsTable cell renderers ([32c6c82](https://github.com/stratif-io/stratif.io/commit/32c6c82092805b0d97b20ff4ce1442ae5c203f5c))
- apply TYPOGRAPHY constants to PivotTable th/td; update row height estimate to 44px ([32b6ca8](https://github.com/stratif-io/stratif.io/commit/32b6ca8bf948cf8becf7a77f9a0b1c3cd7aab94c))
- call close_product_db in lifespan teardown for graceful shutdown ([a61a914](https://github.com/stratif-io/stratif.io/commit/a61a914f7095a7d6f59f413b7feb1bbf0990241e))
- clean pipeline test 1 ([8441e16](https://github.com/stratif-io/stratif.io/commit/8441e16673173e20d9e0a4ffd9fac9e87ff59a12))
- clean pipeline test 1 ([1638751](https://github.com/stratif-io/stratif.io/commit/1638751f61fa94f0e82a9c2fa80657813b99d28b))
- clean pipeline test 3 ([eb4eda9](https://github.com/stratif-io/stratif.io/commit/eb4eda992badba9741bf312c764b6d07cde5150d))
- clean pipeline test 3 ([3eb1df3](https://github.com/stratif-io/stratif.io/commit/3eb1df399e786741057818cce7166b0892165f31))
- **dashboard:** Learn panel — business metric explanations ([#294](https://github.com/stratif-io/stratif.io/issues/294)) ([e0acc26](https://github.com/stratif-io/stratif.io/commit/e0acc26baf06c19a0c2cafbc041e8bbb02acfc83))
- **dashboard:** move Learn button to Mission Control page header ([74ae293](https://github.com/stratif-io/stratif.io/commit/74ae29368d8e86fbf8678ba7ccc148bb83b51024))
- **dashboard:** move Learn button to Mission Control page header ([6c091aa](https://github.com/stratif-io/stratif.io/commit/6c091aa4ce975010e6460c71e23ad210630af8c1))
- **design-system:** export and register PageHeader + SectionHeader ([06645e1](https://github.com/stratif-io/stratif.io/commit/06645e1fbb71e7f3c6f56412d7532b5ac9bf3796))
- deterministic golden-file E2E tests for all 6 backends ([4e45eb4](https://github.com/stratif-io/stratif.io/commit/4e45eb46f2a901de7b651cd38fc1b240de165a31))
- expand event color palette to 10 distinct colors (add chart-6..10) ([f286967](https://github.com/stratif-io/stratif.io/commit/f286967e34f1978de0b876b30da0b15e5b602b4e))
- export AnalyticsProvider and useAnalytics from OSS package ([4e6ee03](https://github.com/stratif-io/stratif.io/commit/4e6ee036b3214d1b0397017adcf09ec12ea9d939))
- expose counting_mode param on /api/path-analysis endpoint ([bbe212b](https://github.com/stratif-io/stratif.io/commit/bbe212baccf2ba36efed32a18eb2ba8773aac5ad))
- Feature/analytics ([a2434c9](https://github.com/stratif-io/stratif.io/commit/a2434c986e60bdad8bba02c766abc43064a960a5))
- go-live hardening — rate limiting, access logging, graceful shutdown, 404 page ([d07e754](https://github.com/stratif-io/stratif.io/commit/d07e7541af80cd63886a698a0972a873f8eb55c5))
- move trend controls to toolbar above card, add TrendFilters compact mode ([6961693](https://github.com/stratif-io/stratif.io/commit/69616938d900c4d9b445dccf70158e2cea9e29eb))
- Parquet + COPY INTO fast path for Databricks seeder ([20c9975](https://github.com/stratif-io/stratif.io/commit/20c997530e47da2dd98501785d0e8671d10ba949))
- Parquet + COPY INTO fast path for Databricks seeder ([15ceb62](https://github.com/stratif-io/stratif.io/commit/15ceb625d16421ca3564dddd93c001c10074e3b1))
- paths counting mode toggle (Exact / Contains) ([38fe743](https://github.com/stratif-io/stratif.io/commit/38fe743bcfffd7afd004a5f840d2520fd324dff7))
- pipeline test 1 (fake feature) ([4c9c842](https://github.com/stratif-io/stratif.io/commit/4c9c8420d45ef54f8a6f42604c98ad23d49595ce))
- pipeline test 1 (fake feature) ([e8df73e](https://github.com/stratif-io/stratif.io/commit/e8df73ecdd6d61f19fa2fcd4606ca1552d3b5640))
- pipeline test 2 (fake feature) ([a93e195](https://github.com/stratif-io/stratif.io/commit/a93e1952d5fb7d110d3d1009b7981e205e0d792d))
- pipeline test 2 (fake feature) ([7ac54f9](https://github.com/stratif-io/stratif.io/commit/7ac54f9da5b1470f53036e2a61d6dff797c053df))
- pipeline test 3 (fake feature) ([7545cbb](https://github.com/stratif-io/stratif.io/commit/7545cbb84337235b79fe1ae02c4390befbc36cfa))
- pipeline test 3 (fake feature) ([55775ac](https://github.com/stratif-io/stratif.io/commit/55775ac154b34c02c8f45a561cf5a43b9eb88029))
- publish @stratif-io/web to GitHub Packages on release ([814826b](https://github.com/stratif-io/stratif.io/commit/814826b7fe2eda63fc3e6f00352ecd8a70028083))
- publish @stratif-io/web to GitHub Packages on release ([f21b6f2](https://github.com/stratif-io/stratif.io/commit/f21b6f20f440702e9646cf08ffb8476634baf809))
- read countingMode option in usePathExplorer, pass counting_mode to API ([28eb94d](https://github.com/stratif-io/stratif.io/commit/28eb94dfc282ac4e379de62f51a8eb6c18ef3f02))
- redesign FunnelSteps — color-coded circles, rounded bars, new connectors ([add51ed](https://github.com/stratif-io/stratif.io/commit/add51eddc4bf60b955207bbab933dc6acc24e460))
- redesign PathFunnelDialog — remove device filter, path chips, colored cards ([0b953ed](https://github.com/stratif-io/stratif.io/commit/0b953eda403c72d3d60fae131d1514916d540d05))
- register NotFoundPage in design system FeedbackSection ([f9290b0](https://github.com/stratif-io/stratif.io/commit/f9290b0f5727ab201f2c8e18a5d9e6d0e7eccde9))
- register table TYPOGRAPHY constants in design system LayoutSection ([7252d7f](https://github.com/stratif-io/stratif.io/commit/7252d7f0b6b48c7b04886dfd0cfcfdc5fcc3fe04))
- remove DevCard component and all usages ([b876ada](https://github.com/stratif-io/stratif.io/commit/b876ada5082e4bcdf3d2f868de51e8c7338cab9c))
- remove devMode state from app-store ([4c61f66](https://github.com/stratif-io/stratif.io/commit/4c61f66d71c6d4eeab400ac228c6098a0992981f))
- remove permalink from funnel modal and page ([08615ea](https://github.com/stratif-io/stratif.io/commit/08615ea04daad9c467cfe8f89479f5b8e47503a0))
- remove unique paths badge from toolbar ([5aef87c](https://github.com/stratif-io/stratif.io/commit/5aef87c0a1dcaf4aeca59d46cb9ce33eb0c67e97))
- **retention:** add BENCHMARKS, getCellClass, milestoneTooltip helpers ([530d6f7](https://github.com/stratif-io/stratif.io/commit/530d6f7184eff3b312199abeb46f8ed7bb7ed8c6))
- **retention:** bracket retention, benchmark colors, Δ column, Learn panel ([b92ec23](https://github.com/stratif-io/stratif.io/commit/b92ec23b1ca86b3af892e4c0fbb78da76039cc11))
- **retention:** redesign RetentionTable with benchmark colors, soon cells, delta column ([275ee26](https://github.com/stratif-io/stratif.io/commit/275ee26b03da045fc314990e350a016d9ad47822))
- **retention:** register RetentionLearnPanel in design system ([a52bce5](https://github.com/stratif-io/stratif.io/commit/a52bce5b991ccf008b08497273bfd309fc814830))
- **retention:** remove metric cards, add Learn panel ([cf7429d](https://github.com/stratif-io/stratif.io/commit/cf7429dbab7d636812a1d3766843f587a88ba0ab))
- **retention:** switch to bracket (cumulative) retention + updated milestones ([d339112](https://github.com/stratif-io/stratif.io/commit/d3391125edd8f15a0e4ca5fba87ca47188e4d767))
- **retention:** update frontend types for nullable milestone_values ([c6d57df](https://github.com/stratif-io/stratif.io/commit/c6d57df259823ce5719d88f3f703c2beaf22df16))
- **seeders:** add Databricks seeder ([9763eaf](https://github.com/stratif-io/stratif.io/commit/9763eaf7f17b1238aac988e37e60761d6aba8dd6))
- **seeders:** add DatabricksSeeder ([742a20f](https://github.com/stratif-io/stratif.io/commit/742a20fe59e1e03f44e5b157532b8eb905571129))
- **seeders:** add get_databricks_credentials ([c2978de](https://github.com/stratif-io/stratif.io/commit/c2978ded5094e1e76bb703945bd8eae8311afc28))
- **seeders:** add overwrite_schema flag to DatabricksSeeder ([04a3fbe](https://github.com/stratif-io/stratif.io/commit/04a3fbe916b000033866eca5a8a2bc01855bef2c))
- **seeders:** Databricks batch insert + STRUCT/MAP columns + overwrite_schema flag ([8da795b](https://github.com/stratif-io/stratif.io/commit/8da795bd9cd0cfa17d0f842ec206c9c7530eac11))
- **seeders:** register seed-databricks CLI entry point ([b0a69e1](https://github.com/stratif-io/stratif.io/commit/b0a69e1c9c5cdc0d8822586027e1fa1126f643c5))
- **seeders:** use multi-row batch INSERT for Databricks seeder ([0027bdf](https://github.com/stratif-io/stratif.io/commit/0027bdfddcbdc07ca4f73b1bb3e51e46669ae906))
- **seeders:** use STRUCT/MAP column types for Databricks events table ([455948c](https://github.com/stratif-io/stratif.io/commit/455948c339bf4e5560a3d4d37576d148a7b5df32))
- sortable column headers in DataTable + pivot table sorts by row dimension ([b9f9f39](https://github.com/stratif-io/stratif.io/commit/b9f9f391f0643f2d456f3669fe49c3316bb4431d))
- sortable headers in DataTable + pivot table row sorting ([a031f23](https://github.com/stratif-io/stratif.io/commit/a031f23903e02a33e529c28889031085619cd40d))
- table typography consistency (EventsTable + LayoutSection) ([3bc0b1e](https://github.com/stratif-io/stratif.io/commit/3bc0b1e1e77f03c85a9a448b0cfee21a3600a1ee))
- track chart_viewed on analytics page mount ([ba5c862](https://github.com/stratif-io/stratif.io/commit/ba5c8627f5028b0512f441a9542748185204f77c))
- track connection_created with db_type ([ba6393a](https://github.com/stratif-io/stratif.io/commit/ba6393abbb1cf68b2e1385d00c83058fccbf7200))
- track date_range_changed and breakdown_applied ([dc1cdb4](https://github.com/stratif-io/stratif.io/commit/dc1cdb40761d17138b85895eec945807407d022e))
- track export_triggered on CSV download ([7ae3787](https://github.com/stratif-io/stratif.io/commit/7ae378711ebc2e597908ea1b6908940a03c53716))
- track funnel_step_selected on step event change ([d63e12e](https://github.com/stratif-io/stratif.io/commit/d63e12e45330aaca042cc2bb9d7ef2bff77c9cb4))
- track query_executed with duration in trend hook ([55b5334](https://github.com/stratif-io/stratif.io/commit/55b533481f6b0f34430e782af60efd5ed36b409f))
- track schema_tab_opened ([4a3ee0a](https://github.com/stratif-io/stratif.io/commit/4a3ee0a5fcf1e919fc7e1ec8ca1af52ad601c4c4))
- track sql_studio_opened ([f5ccae1](https://github.com/stratif-io/stratif.io/commit/f5ccae111ec77943d9e49fe9713e0bcefbffe3b6))
- UI homogenisation — enforce design system constants across all pages ([5f18554](https://github.com/stratif-io/stratif.io/commit/5f18554cff977ed4c7d96e93e4a6a8eb4a0d05d2))
- UI navigation & trend page redesign ([7f08997](https://github.com/stratif-io/stratif.io/commit/7f08997e130b59eafd9aec36350935f475079b00))
- **ui:** add PageHeader component ([e7521fc](https://github.com/stratif-io/stratif.io/commit/e7521fc6835abb1e9bf4de29aa9a1d8879b0ed8e))
- **ui:** add SectionHeader component ([9a545a1](https://github.com/stratif-io/stratif.io/commit/9a545a15eb0413680bf2cd2d3868045e18dec266))
- unified structlog — route all stdlib logs through structlog ([181a09a](https://github.com/stratif-io/stratif.io/commit/181a09a42cad1e5a5266902e810a916bfa8a0605))
- use per-event colors in PathFunnelDialog chips — matches path list color coding ([b477828](https://github.com/stratif-io/stratif.io/commit/b477828382e4d67c945aa2a240fe876c3f252795))
- wire NotFoundPage as catch-all route, replacing redirect to dashboard ([32ccb08](https://github.com/stratif-io/stratif.io/commit/32ccb08378dddf891bc8d03e1357a95e9d668233))
- wrap OSS app with AnalyticsProvider (no-op) ([b3ace9c](https://github.com/stratif-io/stratif.io/commit/b3ace9c74623dbbcdbd4804bffb8517e5f629786))

### Bug Fixes

- add .npmrc to wire STRATIFIO_OSS_TOKEN for GitHub Packages publish ([3293d90](https://github.com/stratif-io/stratif.io/commit/3293d900d14ab9015b82b31b82ef33a8b7a22de5))
- add .npmrc to wire STRATIFIO_OSS_TOKEN for GitHub Packages publish ([2eb29e3](https://github.com/stratif-io/stratif.io/commit/2eb29e3335cf545e21d8e47a66b13858fbddf92f))
- add BUN_AUTH_TOKEN for GitHub Packages auth in bun publish ([79ec6ba](https://github.com/stratif-io/stratif.io/commit/79ec6ba2e2a88a5e8d751d6edb93f10bd5a3cd3b))
- add BUN_AUTH_TOKEN for GitHub Packages auth in bun publish ([b121c6b](https://github.com/stratif-io/stratif.io/commit/b121c6b750b0e4ceeabcbbdd810f85bdcc6a9e95))
- add type: ignore for slowapi and combine nested with in test ([05fe159](https://github.com/stratif-io/stratif.io/commit/05fe159b195ff595623eb38082450f72378e5927))
- add workflow_dispatch to trigger run 2 after PR merge ([48de86f](https://github.com/stratif-io/stratif.io/commit/48de86fa887ee59373cfa29ad30e73420bfe0660))
- add workflow_dispatch to trigger run 2 after PR merge ([f87475f](https://github.com/stratif-io/stratif.io/commit/f87475fb82fcb72e9db665cab22a8ea340b27d24))
- address code review feedback — dead alias, stale comment, positioning, type fix ([77774c2](https://github.com/stratif-io/stratif.io/commit/77774c2f5c6fe268f919d710e34a0edd1e0282d1))
- align Learn button style with Mission Control pill; add no-gap callout ([1b2167f](https://github.com/stratif-io/stratif.io/commit/1b2167f6f74cb7b62d389d93ded01e90ce50836b))
- **analytics:** use TYPOGRAPHY.label for h4 in PathFunnelDialog ([b38bc3f](https://github.com/stratif-io/stratif.io/commit/b38bc3fef53c2b82aa743ed9038dc513686edf09))
- assert rate-limit headers in test_rate_limit_headers_present ([b483f1c](https://github.com/stratif-io/stratif.io/commit/b483f1cc79dc20f4422adb5f4a74343a60c330f3))
- bootstrap_connection reads context._ not properties._ for custom props ([4fd1278](https://github.com/stratif-io/stratif.io/commit/4fd1278fdbe6f0be6c86d37a726cd7d777faf68b))
- bootstrap_connection reads context._ not properties._ for custom… ([0e87cbe](https://github.com/stratif-io/stratif.io/commit/0e87cbeacddb7923247955ffde2e7a460ba05716))
- cast Parquet timestamps to microseconds for Databricks COPY INTO ([d698eb4](https://github.com/stratif-io/stratif.io/commit/d698eb4b84e60f6d9080818163b34e902154cfbe))
- cast Parquet timestamps to microseconds for Databricks COPY INTO ([6032a7a](https://github.com/stratif-io/stratif.io/commit/6032a7a7a54f876b6d258af99caf3bda52f508a0))
- center sidebar icons when collapsed by zeroing gap on hidden label ([6732e79](https://github.com/stratif-io/stratif.io/commit/6732e7914d277345ed8831986647d7a6e33ba2c7))
- change install.sh default port from 8000 to 6870 ([#392](https://github.com/stratif-io/stratif.io/issues/392)) ([710e930](https://github.com/stratif-io/stratif.io/commit/710e930705a225d5fdc55072615730c3e07f2950))
- change install.sh default port from 8000 to 6870 ([#394](https://github.com/stratif-io/stratif.io/issues/394)) ([1775ba6](https://github.com/stratif-io/stratif.io/commit/1775ba6c0fd134faa6cea1c750c2ad571c32361f))
- **ci:** auto-regenerate uv.lock at pre-commit time ([4e83ed8](https://github.com/stratif-io/stratif.io/commit/4e83ed8914799e8436c8133720cfacd21738b350))
- **ci:** auto-regenerate uv.lock at pre-commit time instead of just checking ([a6f4f1e](https://github.com/stratif-io/stratif.io/commit/a6f4f1ef7df2e9e278f58c0948746cc1a2d3a7b0))
- **ci:** push Docker image to ghcr.io/stratif-io instead of cabichahine ([7fcd227](https://github.com/stratif-io/stratif.io/commit/7fcd2272eff3227fa114fc1ab42eba4393030885))
- **ci:** write .npmrc auth token before bun publish ([8f05e94](https://github.com/stratif-io/stratif.io/commit/8f05e940ecbb6fd7efdb276b9ce9c5675b7988b8))
- **ci:** write .npmrc auth token before bun publish ([27c8b14](https://github.com/stratif-io/stratif.io/commit/27c8b1444172b7d2999f2460c5a6d95c5c92429b))
- clean pipeline test 2 ([944ce0e](https://github.com/stratif-io/stratif.io/commit/944ce0e07bf282e60440909434c46d45cf4a5453))
- clean pipeline test 2 ([e407b8b](https://github.com/stratif-io/stratif.io/commit/e407b8bd31e246635122d5b18014b7d8f180cd20))
- clean up review issues in deterministic test suite ([b5c76a4](https://github.com/stratif-io/stratif.io/commit/b5c76a420cacb74e9bbd6380a019145c2f950d77))
- cohort retention counts only truly new users, not returning users ([4b1824c](https://github.com/stratif-io/stratif.io/commit/4b1824c419990c0a410a7113cde9eca1d2d07d55))
- configure bun publish via .bunfig.toml [publish] section ([c76cbdc](https://github.com/stratif-io/stratif.io/commit/c76cbdc7fb54992211004071b2f0cd5375b5b56e))
- configure bun publish via .bunfig.toml for GitHub Packages auth ([750744c](https://github.com/stratif-io/stratif.io/commit/750744cb74b4065420f4d80f012dfebc8ac0a960))
- confirm workflow_dispatch release trigger works end-to-end ([94f1d82](https://github.com/stratif-io/stratif.io/commit/94f1d826494d2c092a188cd458ef2f6541b81a68))
- confirm workflow_dispatch release trigger works end-to-end ([76fe837](https://github.com/stratif-io/stratif.io/commit/76fe83716e05066dd99c5b7b10d72055c7b0eba5))
- **connections:** replace h1 with SectionHeader in ConnectionList ([77c511d](https://github.com/stratif-io/stratif.io/commit/77c511d86fae7632ce7bd6853f1ecc0c7a50e96f))
- **connections:** use h1+pageLabel directly in ConnectionDetailPage, not PageHeader wrapper ([2f2b390](https://github.com/stratif-io/stratif.io/commit/2f2b3909ccb6cc33fe54bfa72b248680eff66005))
- **connections:** use PageHeader in ConnectionDetailPage ([0eb8238](https://github.com/stratif-io/stratif.io/commit/0eb823810292bf988313e912ac60d220f7b82590))
- **connections:** use TYPOGRAPHY.label for h3 headings in ConnectionConfigTab ([f2f25cb](https://github.com/stratif-io/stratif.io/commit/f2f25cb71ed9696377efe1ff8e17cb49d5404fc0))
- consolidate AnalyticsProvider into context.tsx per spec ([73e2f1e](https://github.com/stratif-io/stratif.io/commit/73e2f1eff448fb0ca4f5e8605c1a20e918d89fd3))
- correct Docker product DB env var, port in README, and missing connections.yaml in entrypoint ([dfe17af](https://github.com/stratif-io/stratif.io/commit/dfe17af7912e3926a75905e58e59aedc11b9860c))
- correct workspace filter from @stratifio/web to @stratif-io/web ([589934a](https://github.com/stratif-io/stratif.io/commit/589934af21ccba48fa7b497b84ec480235bf70f1))
- count total pattern occurrences in contains mode, not just distinct users ([9e39655](https://github.com/stratif-io/stratif.io/commit/9e39655ae16601f08eb8fcd036568cc563909903))
- Databricks table quoting and seeder param limit ([fcf0f43](https://github.com/stratif-io/stratif.io/commit/fcf0f43a58b846df94c2e3d29504eff93b453f1c))
- debug STRATIFIO_OSS_TOKEN availability in publish-npm job ([ab49e96](https://github.com/stratif-io/stratif.io/commit/ab49e968672bab39b6976d613646f4590bb8e0dd))
- debug STRATIFIO_OSS_TOKEN in publish-npm job ([2ec40be](https://github.com/stratif-io/stratif.io/commit/2ec40bef5bca9c83ff253df9ac105e866f72bda9))
- defer connections.yaml load to fixture time so CI collection doesn't fail ([c56736a](https://github.com/stratif-io/stratif.io/commit/c56736a9eb8151583f060f59abf1801fc8269378))
- disable pointer events on DevCard back face when not flipped ([6fac268](https://github.com/stratif-io/stratif.io/commit/6fac268b211c9bec5ad35914d3b112d828e927e4))
- Docker, README port, and missing connections.yaml in entrypoint ([0c9f3ee](https://github.com/stratif-io/stratif.io/commit/0c9f3eef8281ec9fa2d1931d384a1072fc13789e))
- exclude .venv from copy, use GITHUB_TOKEN for private repo testing ([d9a2bfb](https://github.com/stratif-io/stratif.io/commit/d9a2bfbd398eb1b5017e9875e6b13c70035f2b74))
- exclude .venv from copy, use venv binaries directly, fix mktemp suffix ([8dcae2c](https://github.com/stratif-io/stratif.io/commit/8dcae2c090681ba655420716a09205c0f36008a1))
- fetch main before force-with-lease push to handle UI-merged PRs ([85563f5](https://github.com/stratif-io/stratif.io/commit/85563f58fb8de9c32e113d3466af5b3b7fef7119))
- fetch main before force-with-lease push to handle UI-merged PRs ([ea63a2b](https://github.com/stratif-io/stratif.io/commit/ea63a2b37aebc9396538784c8c9f0caf5366fce6))
- final end-to-end automated release loop validation ([bb43261](https://github.com/stratif-io/stratif.io/commit/bb43261885adda45691c0823b66f52b210802828))
- final end-to-end automated release loop validation ([b55527f](https://github.com/stratif-io/stratif.io/commit/b55527f9674b18394cbf8a5339828a1e98b01052))
- forward exc_info through InterceptHandler ([1ea3b5a](https://github.com/stratif-io/stratif.io/commit/1ea3b5acb01e82fa6d0633cb939dee36ada44bb2))
- install.sh UX — step labels, spinner, fix .git copy flood ([7ef48b4](https://github.com/stratif-io/stratif.io/commit/7ef48b45b9183392ee51ad102d0260c4e4731937))
- **install:** detect sh and print clear error directing user to use bash ([a902d70](https://github.com/stratif-io/stratif.io/commit/a902d70b72022b95811e4c30606a5f79d833ed49))
- **install:** replace bash array GH_AUTH_ARGS with gh_curl helper ([9ae9d02](https://github.com/stratif-io/stratif.io/commit/9ae9d022c63434601a6c720f091cc0f65120b94f))
- **install:** rewrite as POSIX sh — works with both sh and bash ([695cf9b](https://github.com/stratif-io/stratif.io/commit/695cf9b5e55b9a1cc1a3906749276babf9339133))
- **install:** use GitHub API to fetch release asset, support private repo with GITHUB_TOKEN ([d3d47ad](https://github.com/stratif-io/stratif.io/commit/d3d47ad48fa7ea7f43c2cd9e82a50fde7a12efe1))
- less deps ([2903f12](https://github.com/stratif-io/stratif.io/commit/2903f12188490ce660a3ad4fb4a4a5f6cbbfc65c))
- log on exceptions in AccessLogMiddleware and fix middleware order for 429 logging ([5b23279](https://github.com/stratif-io/stratif.io/commit/5b232796df9db377758f2bbcbd542ca792ad7e58))
- migrate SeedConfig to pydantic-settings v2 SettingsConfigDict ([0271270](https://github.com/stratif-io/stratif.io/commit/0271270dbcf6290adabe41cb60c4689875d6a0a1))
- migrate SeedConfig to pydantic-settings v2 SettingsConfigDict ([2021cda](https://github.com/stratif-io/stratif.io/commit/2021cda4f2b9d38cf0974aa14ff4e9a3c0d830b3))
- **mission-control:** correct DAU/MAU computation and clean up Learn panel ([#391](https://github.com/stratif-io/stratif.io/issues/391)) ([a5deb22](https://github.com/stratif-io/stratif.io/commit/a5deb22e74c95cd51293801f4d134c3bdfd976d7))
- mock useSearchParams in FunnelDetailPage test to prevent infinite re-render loop ([9ff2d94](https://github.com/stratif-io/stratif.io/commit/9ff2d94821aa104ea6c4469a88eca5070935fe9a))
- move sys import to top level in test_logging ([d72d0a5](https://github.com/stratif-io/stratif.io/commit/d72d0a5220518b25fa919f6392deda1439389c39))
- null engine globals before dispose() to handle shutdown errors ([f99ef10](https://github.com/stratif-io/stratif.io/commit/f99ef105b273fd117e55c8373b82d96b27a9801f))
- **pages:** add PageHeader to pages missing a heading ([916f1ed](https://github.com/stratif-io/stratif.io/commit/916f1ed19c8e9504a7aaacfd2962a6e63ba69c9c))
- pass connection_id to path-funnel query in PathFunnelDialog ([bb0e75b](https://github.com/stratif-io/stratif.io/commit/bb0e75b1dc17002880a022a7bd8d05392151f3ac))
- **people:** use PageHeader and TYPOGRAPHY constants in PeoplePage ([3befe7e](https://github.com/stratif-io/stratif.io/commit/3befe7ecaa9e0cd3a01cbb8b5557736932a67838))
- prevent infinite loop when navigating away from funnel page ([dd2ad77](https://github.com/stratif-io/stratif.io/commit/dd2ad775739e8b78f4520798c847a4471a106702))
- prevent infinite loop when navigating away from funnel page ([6c409af](https://github.com/stratif-io/stratif.io/commit/6c409af64b4001934837f70bdb31243959755687))
- quote each part of dotted table name separately for Databricks ([2f0df9d](https://github.com/stratif-io/stratif.io/commit/2f0df9dbe34babf44644ae76e0d94287f687ed37))
- read counting mode from URL searchParams in usePathExplorer (not from props) ([213942b](https://github.com/stratif-io/stratif.io/commit/213942b97b752ba2f805a9a0182c556c0d15feb9))
- remove .tar.gz suffix from mktemp template (breaks on macOS) ([4fc019a](https://github.com/stratif-io/stratif.io/commit/4fc019a9f231e6d8055c57a4a2151c7b0ffe2101))
- remove off-by-one in subsequence LATERAL range that caused duplicate paths ([5c853dc](https://github.com/stratif-io/stratif.io/commit/5c853dc7d185b2b2b2a62e080fce7e9e5d17572f))
- remove redundant date sync effects from FunnelDetailPage — useUrlSync handles this ([6374257](https://github.com/stratif-io/stratif.io/commit/6374257177cc5acf162cd012f14c2be34105d185))
- remove unused imports and fix docstring in test_access_log ([4d73823](https://github.com/stratif-io/stratif.io/commit/4d73823da410fe87c4e11cccdfa4a557a6b999e2))
- render funnel dialog tooltips below buttons ([3b078ac](https://github.com/stratif-io/stratif.io/commit/3b078ac29003cd765aff1eb7a427f92e8ecd75e1))
- render funnel dialog tooltips below buttons ([94d4ef5](https://github.com/stratif-io/stratif.io/commit/94d4ef5afbc491c069ede48060802ddc69e3b6c8))
- restore DevCard component and re-add to all call sites ([5c7b91e](https://github.com/stratif-io/stratif.io/commit/5c7b91e9f383da9bcfbfd9d451f87eb6e3c005e6))
- restore Open full page button in funnel dialog ([ad10734](https://github.com/stratif-io/stratif.io/commit/ad10734b07cc19b0be88569d12a858343b3aed72))
- restore package name to @stratif-io/web ([7c683b1](https://github.com/stratif-io/stratif.io/commit/7c683b1cde85f7dea7598ae13d2d417feffd2c3e))
- restore package name to @stratif-io/web and use setup-node for publish ([6010839](https://github.com/stratif-io/stratif.io/commit/601083973f7051d9a36300bf77d8a5fbf70e3688))
- restore package name to @stratif-io/web and use setup-node for publish ([c73f5bb](https://github.com/stratif-io/stratif.io/commit/c73f5bb754f48c07d88cc942ba2b1d5fdc250866))
- restore package name to @stratif-io/web and use setup-node for publish ([b09e875](https://github.com/stratif-io/stratif.io/commit/b09e875d33ae30fe670737fdca4ae014865b59fb))
- retention cohorts only include truly new users ([06d0fed](https://github.com/stratif-io/stratif.io/commit/06d0fedc2dc01954f392fa7f5879170d39b97bb9))
- **retention:** calendar-accurate is_reached for month/quarter/year + null test ([51c55cb](https://github.com/stratif-io/stratif.io/commit/51c55cb0b9013049a160df2f54ee76be65fa23d4))
- **retention:** fix avg row showing 0% for unreached milestones ([85e999f](https://github.com/stratif-io/stratif.io/commit/85e999fb017d0403b2bbba73d6b1c6856a8a8d76))
- **retention:** fix timezone off-by-one in formatDate, remove dead avgMilestones from hook ([9447c61](https://github.com/stratif-io/stratif.io/commit/9447c6120af2d8bea2e8365b03ba33bccc64f099))
- **retention:** use TableHead for Average row label for accessibility ([e374e7c](https://github.com/stratif-io/stratif.io/commit/e374e7ce389f44ace2da1dcc3725305bec664462))
- right-align counting mode toggle with flex-1 spacer ([aacded0](https://github.com/stratif-io/stratif.io/commit/aacded06825e18f054328509ca454892922e4602))
- **seeders:** use named_struct/from_json for Databricks STRUCT and MAP inserts ([e4ae29c](https://github.com/stratif-io/stratif.io/commit/e4ae29cd00ebf078afea56c86eccf8871cbadbc8))
- set log level to error in install.sh server invocations ([b92822a](https://github.com/stratif-io/stratif.io/commit/b92822acf38c14e0fd4f0d966352b773f0a98894))
- split large seeder batches to stay within Databricks 10k param limit ([5595b28](https://github.com/stratif-io/stratif.io/commit/5595b283b5c5bee10f595e03c432a619941ba525))
- suppress uvicorn INFO logs in install.sh ([fc47a54](https://github.com/stratif-io/stratif.io/commit/fc47a54cee376b6da1a1a2bfa858dc07a66cfc19))
- suppress uvicorn INFO logs in install.sh ([dff88d1](https://github.com/stratif-io/stratif.io/commit/dff88d185b11959bfa2b5d8697bc0c7117502865))
- test STRATIFIO_OSS_TOKEN secret ([c69d6b7](https://github.com/stratif-io/stratif.io/commit/c69d6b7d4831abb102eb83a2a5c04cc1cc7c76fd))
- test STRATIFIO_OSS_TOKEN secret ([d4de1ea](https://github.com/stratif-io/stratif.io/commit/d4de1ea6a1c1300c3dfe35bf101527bd6a41fd80))
- trigger npm publish after STRATIFIO_OSS_TOKEN was set ([2eeabc0](https://github.com/stratif-io/stratif.io/commit/2eeabc08e134cc94b3df8735f0fcf61d6ea16677))
- trigger npm publish with correct STRATIFIO_OSS_TOKEN ([303fdca](https://github.com/stratif-io/stratif.io/commit/303fdcaf1780ec682bfca5bf34d89c191e6a3193))
- trigger publish with STRATIFIO_OSS_TOKEN now set ([e960e64](https://github.com/stratif-io/stratif.io/commit/e960e641de5f80b7108ccf44ec7f9266d17d5985))
- trigger publish with STRATIFIO_OSS_TOKEN now set ([16e340e](https://github.com/stratif-io/stratif.io/commit/16e340ed2f901cb2172c8abe4eccea052d25a7f0))
- **ui:** move page-header test to **tests** dir ([00ce39d](https://github.com/stratif-io/stratif.io/commit/00ce39d66cb321199a756fbef0dc6383af5370ab))
- **ui:** replace hardcoded colors with theme tokens in NotFoundPage ([888efbf](https://github.com/stratif-io/stratif.io/commit/888efbf6231489d30f850e3b3e3e7cdaa22b613e))
- **ui:** use TYPOGRAPHY.cardTitle in EmptyState ([30a945a](https://github.com/stratif-io/stratif.io/commit/30a945a828a958c2e0becaeefe183afb3dd97826))
- update bootstrap-sha to current main HEAD ([c67ddec](https://github.com/stratif-io/stratif.io/commit/c67ddec54fd9bf68d834d7a3fdc4da499337841d))
- update bootstrap-sha to current main HEAD ([767d2f9](https://github.com/stratif-io/stratif.io/commit/767d2f90c0507865bdb49c5253f190b933b7152e))
- update bootstrap-sha to post-0.27.0 main HEAD ([995b3bc](https://github.com/stratif-io/stratif.io/commit/995b3bcc498c21e8397ce4f693ee07cc284411de))
- update bootstrap-sha to post-0.27.0 main HEAD ([eb12724](https://github.com/stratif-io/stratif.io/commit/eb12724f6a4099c30b4129c3db4189f627a2ad19))
- update ClickHouse week trunc unit test to expect Monday-start (mode 1) ([f22b544](https://github.com/stratif-io/stratif.io/commit/f22b544535fa1aede5e7175e1d61fb7e211808b4))
- use --force-with-lease when pushing develop→main in sync-develop ([4812454](https://github.com/stratif-io/stratif.io/commit/48124545dbcbfaf22bad5d35f4d938a0ffff160f))
- use --force-with-lease when pushing develop→main in sync-develop ([fbe9b32](https://github.com/stratif-io/stratif.io/commit/fbe9b328377acadde6d6412837346391d0f003d9))
- use &gt;= for funnel timestamp comparison to handle same-timestamp events ([ea7ab69](https://github.com/stratif-io/stratif.io/commit/ea7ab693ab1bbd929b379c73958079c9e5d665fb))
- use COUNT(DISTINCT user_id) for unique_sessions in contains mode; add structural tests ([68fceda](https://github.com/stratif-io/stratif.io/commit/68fceda2e41f55ce9f743c5688212077e78a0a38))
- use npm publish instead of bun publish for GitHub Packages auth ([5f5ef82](https://github.com/stratif-io/stratif.io/commit/5f5ef823ee71dc744f82bac15312c6ba84a682ee))
- use npm publish instead of bun publish for GitHub Packages auth ([a11b068](https://github.com/stratif-io/stratif.io/commit/a11b0683d962ba537a87d34e53528bbf22124404))
- use PrintLoggerFactory to prevent InterceptHandler recursion ([2d35339](https://github.com/stratif-io/stratif.io/commit/2d3533990c9a80cdd0d4a450de3c2da4cc038087))
- use regex URL match in e2e test to allow query params ([0da4678](https://github.com/stratif-io/stratif.io/commit/0da46781bde80bbfe74c05257884120a2f365ec4))
- use setup-node + npm publish for GitHub Packages ([b6c6d68](https://github.com/stratif-io/stratif.io/commit/b6c6d687e2d052784a82474eac6b81b7dfe1ac34))
- use setup-node + npm publish for GitHub Packages auth ([c73c8e1](https://github.com/stratif-io/stratif.io/commit/c73c8e1736f6207c9b0ba6a6d96ae1af9a03b4e4))
- use STRATIFIO_OSS_TOKEN for npm publish auth ([c120ea9](https://github.com/stratif-io/stratif.io/commit/c120ea9cc67ff715f3c5577bc796570a3d10b664))
- use STRATIFIO_OSS_TOKEN for npm publish auth ([035b517](https://github.com/stratif-io/stratif.io/commit/035b5176e7204a1798d824d9fb4aae3a6cc313f4))
- use subquery+WHERE instead of QUALIFY for match_count filter ([d233a52](https://github.com/stratif-io/stratif.io/commit/d233a52b6b3fcf65887e6158f65ebc10fd30644a))
- verify automated release loop end-to-end ([5afeab4](https://github.com/stratif-io/stratif.io/commit/5afeab4b8e921e64eb00fc878cc8ac3f1b6d4b5d))
- verify automated release loop end-to-end ([d279be9](https://github.com/stratif-io/stratif.io/commit/d279be95bb060d83f938d714a2b34d031dc0ec2b))
- write .npmrc directly with STRATIFIO_OSS_TOKEN for npm publish ([d77c0a4](https://github.com/stratif-io/stratif.io/commit/d77c0a4a749e53a4223dc74324fd330131475c3c))
- write .npmrc directly with STRATIFIO_OSS_TOKEN for npm publish ([d3ef1be](https://github.com/stratif-io/stratif.io/commit/d3ef1bebc585254d6c3055e05af28f688c782982))
- write auth to ~/.npmrc to avoid workspace config warning ([d90cd10](https://github.com/stratif-io/stratif.io/commit/d90cd107d54aeefb0a8d6b0ea0310f6357620a5e))
- write npm auth to ~/.npmrc to avoid workspace config warning ([159f8a4](https://github.com/stratif-io/stratif.io/commit/159f8a4b32b5fa27dc8b149de320825424afb0cf))
- write npm auth to ~/.npmrc to bypass workspace .npmrc suppression ([46e1586](https://github.com/stratif-io/stratif.io/commit/46e1586ef2da00f32857df1b34cfe9d1f19a0979))
- write npm auth to ~/.npmrc to bypass workspace .npmrc suppression ([b81eea2](https://github.com/stratif-io/stratif.io/commit/b81eea277485f4e8b5608dd5d5d4d88e23f41dc0))

### Reverts

- remove E2E job from CI (deferred) ([2969202](https://github.com/stratif-io/stratif.io/commit/2969202e1ea5116ca0d9776079072748024ac3dd))

## [0.31.0](https://github.com/stratif-io/stratif.io/compare/v0.30.0...v0.31.0) (2026-04-13)

### Features

- Parquet + COPY INTO fast path for Databricks seeder ([caf2181](https://github.com/stratif-io/stratif.io/commit/caf21819ce75b4815c31f0cdb98f81399362cd5a))
- Parquet + COPY INTO fast path for Databricks seeder ([8f49c14](https://github.com/stratif-io/stratif.io/commit/8f49c14e5e745a43cae744e953e9f2f9b946bbd0))

### Bug Fixes

- cast Parquet timestamps to microseconds for Databricks COPY INTO ([920a031](https://github.com/stratif-io/stratif.io/commit/920a03132dff66223833cdd7d7a9887fd9474690))
- cast Parquet timestamps to microseconds for Databricks COPY INTO ([9cf8543](https://github.com/stratif-io/stratif.io/commit/9cf8543c37a78c1fbad64550a466a03bb8887abd))
- change install.sh default port from 8000 to 6870 ([#392](https://github.com/stratif-io/stratif.io/issues/392)) ([ca9c349](https://github.com/stratif-io/stratif.io/commit/ca9c34922ff64dc841b47345247ec5f69d085680))
- change install.sh default port from 8000 to 6870 ([#394](https://github.com/stratif-io/stratif.io/issues/394)) ([af14ae1](https://github.com/stratif-io/stratif.io/commit/af14ae13bc20282515805a5275ea774bde4853ac))
- correct Docker product DB env var, port in README, and missing connections.yaml in entrypoint ([fd1551f](https://github.com/stratif-io/stratif.io/commit/fd1551fe4c6b6d2b96506fe91d468d5874f99278))
- Databricks table quoting and seeder param limit ([a50deed](https://github.com/stratif-io/stratif.io/commit/a50deedc77125d5fa420a47ff6cdbc716cbad837))
- Docker, README port, and missing connections.yaml in entrypoint ([031b533](https://github.com/stratif-io/stratif.io/commit/031b5338d3ec785b969194f1d96b264650f1b544))
- **mission-control:** correct DAU/MAU computation and clean up Learn panel ([#391](https://github.com/stratif-io/stratif.io/issues/391)) ([41494b9](https://github.com/stratif-io/stratif.io/commit/41494b926cc6649a654bb4db0b1cdc76beb6a25f))
- quote each part of dotted table name separately for Databricks ([014889e](https://github.com/stratif-io/stratif.io/commit/014889e3e3b5acc50d55546e8972879735e80f72))
- split large seeder batches to stay within Databricks 10k param limit ([9fe3b1b](https://github.com/stratif-io/stratif.io/commit/9fe3b1ba263b8711ff4162a8a6c1e4f04ce0be5f))

## [0.30.0](https://github.com/stratif-io/stratif.io/compare/v0.29.0...v0.30.0) (2026-04-13)

### Features

- deterministic golden-file E2E tests for all 6 backends ([e79b8af](https://github.com/stratif-io/stratif.io/commit/e79b8af8506528a4f23dc1e02fd5b0c571b09388))
- **seeders:** add Databricks seeder ([f14fadf](https://github.com/stratif-io/stratif.io/commit/f14fadf661ad6570fea0a73306045880f276f708))
- **seeders:** add DatabricksSeeder ([32b9d0d](https://github.com/stratif-io/stratif.io/commit/32b9d0d0921d22fa743ea1494b76ec5b1757635a))
- **seeders:** add get_databricks_credentials ([cf2c6db](https://github.com/stratif-io/stratif.io/commit/cf2c6db480f7138419393d88fd0c99a872aae688))
- **seeders:** add overwrite_schema flag to DatabricksSeeder ([5ab90ed](https://github.com/stratif-io/stratif.io/commit/5ab90ed41b2ace1e51ac3a9836820b6efd49fd57))
- **seeders:** Databricks batch insert + STRUCT/MAP columns + overwrite_schema flag ([88e922f](https://github.com/stratif-io/stratif.io/commit/88e922f88f827048d9d2d9e5d3b6b866d9028f91))
- **seeders:** register seed-databricks CLI entry point ([3409dd7](https://github.com/stratif-io/stratif.io/commit/3409dd764b709e907bdfed9520b0ae393fd71c5c))
- **seeders:** use multi-row batch INSERT for Databricks seeder ([c10f66d](https://github.com/stratif-io/stratif.io/commit/c10f66ddb439bb96b7452c1f68dd0773b84240e3))
- **seeders:** use STRUCT/MAP column types for Databricks events table ([de33348](https://github.com/stratif-io/stratif.io/commit/de33348ed2e79176cf7ab608fda4e1a02b9b466b))

### Bug Fixes

- **seeders:** use named_struct/from_json for Databricks STRUCT and MAP inserts ([dcdc7d1](https://github.com/stratif-io/stratif.io/commit/dcdc7d14f6918f9b8408ba56f4a9acb5c58ee1eb))

## [0.29.0](https://github.com/stratif-io/stratif.io/compare/v0.28.1...v0.29.0) (2026-04-12)

### Features

- clean pipeline test 3 ([8b851ad](https://github.com/stratif-io/stratif.io/commit/8b851ad246196b070f301d9427ffced3b377be85))
- clean pipeline test 3 ([4a568fb](https://github.com/stratif-io/stratif.io/commit/4a568fbb759c926d08ae63a7b42677b8dc59c28c))

## [0.28.1](https://github.com/stratif-io/stratif.io/compare/v0.28.0...v0.28.1) (2026-04-12)

### Bug Fixes

- clean pipeline test 2 ([a7a0e2f](https://github.com/stratif-io/stratif.io/commit/a7a0e2f6a3dc459a3869cf657518354a3eff2375))
- clean pipeline test 2 ([10bfa9a](https://github.com/stratif-io/stratif.io/commit/10bfa9a1a567e51c0d6a91ac941e9fd3d8ac7758))

## [0.28.0](https://github.com/stratif-io/stratif.io/compare/v0.27.0...v0.28.0) (2026-04-12)

### Features

- clean pipeline test 1 ([297c2bd](https://github.com/stratif-io/stratif.io/commit/297c2bdda518c3406a802bd2c23e4b84b08b31a5))
- clean pipeline test 1 ([2983269](https://github.com/stratif-io/stratif.io/commit/298326934f88d96f89e74f4dbc4c4c5c9350528a))

## [0.27.0](https://github.com/stratif-io/stratif.io/compare/v0.26.2...v0.27.0) (2026-04-12)

### Features

- add AccessLogMiddleware for structured request logging ([9072ad1](https://github.com/stratif-io/stratif.io/commit/9072ad10e7ea33c5d3edc005dbf6711c1ad4eca5))
- add analytics abstraction layer (no-op context + hook) ([3fe1acd](https://github.com/stratif-io/stratif.io/commit/3fe1acdd8ed5aab7b709fe1e408589aef83222df))
- add close_product_db for graceful shutdown ([b20b74b](https://github.com/stratif-io/stratif.io/commit/b20b74bc1a19bd29dcbe3f6eee6fab69c2498de8))
- add contains counting mode to PathAnalyzer (DuckDB) ([79d2380](https://github.com/stratif-io/stratif.io/commit/79d23808749e0b1f1188c2837970259a3a11c000))
- add counting_mode param to fetchPathAnalysis ([2c6af6e](https://github.com/stratif-io/stratif.io/commit/2c6af6e8b919bbcfe65df0deda3b8545c3258ffa))
- add Exact/Contains counting mode toggle to Paths Explorer toolbar ([a56fe49](https://github.com/stratif-io/stratif.io/commit/a56fe4906f3c1286068b81cabc6531119a6cb088))
- add Funnel nav item to sidebar ([882b69c](https://github.com/stratif-io/stratif.io/commit/882b69c51293f48ca3a991eb23f6b68617917863))
- add InterceptHandler to route stdlib logs through structlog ([f23ecf6](https://github.com/stratif-io/stratif.io/commit/f23ecf6aafc65347aaa243bb13bdd19d5703f066))
- add Learn panel to Paths Explorer ([f930e10](https://github.com/stratif-io/stratif.io/commit/f930e10736403afc8994737fef421a1f127d425f))
- add logging adapter for local analytics debugging ([8e2297c](https://github.com/stratif-io/stratif.io/commit/8e2297c738e4549cb1cb5734bf04ec767e8ab556))
- add NotFoundPage component to design system ([a23fdda](https://github.com/stratif-io/stratif.io/commit/a23fdda3eebfc3abc24038905e14fd2bd176a63a))
- add PageTracker to OSS app for route change analytics ([bb23e86](https://github.com/stratif-io/stratif.io/commit/bb23e86c570acf9da93ea3eb74226b1c6ab28de6))
- add slowapi rate limiting (200 req/min per IP) and wire AccessLogMiddleware ([032a26c](https://github.com/stratif-io/stratif.io/commit/032a26ca5b96e6e4bdef05a71553893e843e5553))
- add SQLAlchemy ORM models for product DB ([6b764fb](https://github.com/stratif-io/stratif.io/commit/6b764fbafe22c8b519472239e3798f3fe6634354))
- add sqlalchemy[asyncio], aiosqlite, asyncpg, pytest-asyncio deps ([0b248d6](https://github.com/stratif-io/stratif.io/commit/0b248d606c35ab169e9d00e548bdf86250d77881))
- apply semantic color variety to FunnelDetailPage summary cards ([50bef55](https://github.com/stratif-io/stratif.io/commit/50bef55b32266722d56038a66641f72ee6b8c463))
- apply TYPOGRAPHY constants to EventsTable cell renderers ([dd3d368](https://github.com/stratif-io/stratif.io/commit/dd3d368c46135e9ccb89c0a2c34c58bead6e233d))
- apply TYPOGRAPHY constants to PivotTable th/td; update row height estimate to 44px ([932be6b](https://github.com/stratif-io/stratif.io/commit/932be6b8e3948b771ed859f2250fa432805a9d7d))
- async get_db() dependency + create_all schema init ([8f49447](https://github.com/stratif-io/stratif.io/commit/8f49447a6fb62f770b6f89c23bb6e73fdddce498))
- async SQLAlchemy engine + updated product_db_url default ([c43601b](https://github.com/stratif-io/stratif.io/commit/c43601bea5206dbb2a0a85c04d43fccc9e1249b6))
- call close_product_db in lifespan teardown for graceful shutdown ([3eaf8a7](https://github.com/stratif-io/stratif.io/commit/3eaf8a77372d4990f666cd7aeda2924c1a7351e1))
- complete SQLAlchemy async ORM migration — all tests passing ([5cea98f](https://github.com/stratif-io/stratif.io/commit/5cea98fb7403cbb15f6fb1679b25ffa5e87d29b1))
- **dashboard:** Learn panel — business metric explanations ([#294](https://github.com/stratif-io/stratif.io/issues/294)) ([829c909](https://github.com/stratif-io/stratif.io/commit/829c909ec7f9f0f27c17cee707ddf457833be038))
- **dashboard:** move Learn button to Mission Control page header ([f1d0152](https://github.com/stratif-io/stratif.io/commit/f1d0152f564e9037fe6bd1aa7d0d02c56f11d744))
- **dashboard:** move Learn button to Mission Control page header ([42f9362](https://github.com/stratif-io/stratif.io/commit/42f936241cb8d97c8fa16eaca8958945d0d07f3e))
- **design-system:** export and register PageHeader + SectionHeader ([66a1389](https://github.com/stratif-io/stratif.io/commit/66a1389955b04e89401d39174d23fb944ba404e1))
- expand event color palette to 10 distinct colors (add chart-6..10) ([a8291df](https://github.com/stratif-io/stratif.io/commit/a8291df0790d4427f62cebc7b10162a05af6ab27))
- export AnalyticsProvider and useAnalytics from OSS package ([c3b9d16](https://github.com/stratif-io/stratif.io/commit/c3b9d16959dbfa5a7e382035c2695d732f8cb232))
- expose counting_mode param on /api/path-analysis endpoint ([42a7645](https://github.com/stratif-io/stratif.io/commit/42a7645ae16d515931d09ef04ed7c849744a8b61))
- Feature/analytics ([93ac320](https://github.com/stratif-io/stratif.io/commit/93ac32024c90b9d7f005075b65441307a0f48690))
- go-live hardening — rate limiting, access logging, graceful shutdown, 404 page ([f71c6d3](https://github.com/stratif-io/stratif.io/commit/f71c6d355abaeeb9de4a88f6ec0d6a041d92bab0))
- make open_analytics_db async, use AsyncSession ([6d3a514](https://github.com/stratif-io/stratif.io/commit/6d3a514e1302815f9771cc27df49699e8e3293bb))
- move trend controls to toolbar above card, add TrendFilters compact mode ([0f59d60](https://github.com/stratif-io/stratif.io/commit/0f59d6097e2aa182c691445e3f0a8aa5f1562382))
- paths counting mode toggle (Exact / Contains) ([4bd2381](https://github.com/stratif-io/stratif.io/commit/4bd23818dd96b5522eb4d2ba08341511bdc1d6bc))
- pipeline test 1 (fake feature) ([7b08c41](https://github.com/stratif-io/stratif.io/commit/7b08c41fe19996b388279bc70b54d22657d8a189))
- pipeline test 1 (fake feature) ([c38ea32](https://github.com/stratif-io/stratif.io/commit/c38ea329d099d42e8944d0cfa12fde79e23e5ee8))
- pipeline test 2 (fake feature) ([5f42d42](https://github.com/stratif-io/stratif.io/commit/5f42d428c2b179c0188601d7787af685f71c6061))
- pipeline test 2 (fake feature) ([cf4174b](https://github.com/stratif-io/stratif.io/commit/cf4174bfad318f63494946bc0ff978d9df309928))
- pipeline test 3 (fake feature) ([0151e6d](https://github.com/stratif-io/stratif.io/commit/0151e6d6b24032a5bcbf1caa10f7eea4dbc7e5ed))
- pipeline test 3 (fake feature) ([4f9710f](https://github.com/stratif-io/stratif.io/commit/4f9710f8a1adb8790abc78d037dbb54e700b0ddc))
- publish @stratif-io/web to GitHub Packages on release ([7ef9fc5](https://github.com/stratif-io/stratif.io/commit/7ef9fc58e89ed29f1f25c4feebcb3a4d3b783b8c))
- publish @stratif-io/web to GitHub Packages on release ([05dbb2d](https://github.com/stratif-io/stratif.io/commit/05dbb2dce1fe2193a0e9ddcccc186dac0f7682ac))
- read countingMode option in usePathExplorer, pass counting_mode to API ([63e8ca1](https://github.com/stratif-io/stratif.io/commit/63e8ca144522ac35d86df55a37568070c8e80873))
- redesign FunnelSteps — color-coded circles, rounded bars, new connectors ([a022174](https://github.com/stratif-io/stratif.io/commit/a022174091a09d934485390b735f036fc7835625))
- redesign PathFunnelDialog — remove device filter, path chips, colored cards ([6d899ce](https://github.com/stratif-io/stratif.io/commit/6d899ce93e871fa5dcd887c6ccd0261a135c8896))
- register NotFoundPage in design system FeedbackSection ([e8a6429](https://github.com/stratif-io/stratif.io/commit/e8a64292cb1376f342a65a78bc74166ea8e56d1b))
- register table TYPOGRAPHY constants in design system LayoutSection ([d76cba1](https://github.com/stratif-io/stratif.io/commit/d76cba138c913dbeb4c43892e830ce500a3c6b4a))
- remove DevCard component and all usages ([c83fe34](https://github.com/stratif-io/stratif.io/commit/c83fe3472b8175b005125342f116555e8d313e63))
- remove devMode state from app-store ([984b4ef](https://github.com/stratif-io/stratif.io/commit/984b4efc2388a6f0e96852fb57c2a2138aab91f8))
- remove permalink from funnel modal and page ([8a81bb8](https://github.com/stratif-io/stratif.io/commit/8a81bb802fa9d1402d3ef5dc09644fe79f562c06))
- remove unique paths badge from toolbar ([f834d07](https://github.com/stratif-io/stratif.io/commit/f834d07702a2e50d323afd4be23048cb6ffdcd63))
- replace Docker installer with curl | sh (uv + GitHub release assets) ([8765ab7](https://github.com/stratif-io/stratif.io/commit/8765ab71e0aa5021b7a1660d9565d883d195ed79))
- replace Docker installer with curl | sh using uv + GitHub release assets ([6ffa8a2](https://github.com/stratif-io/stratif.io/commit/6ffa8a25a8528f985d43ff69a6031db2900521d1))
- **retention:** add BENCHMARKS, getCellClass, milestoneTooltip helpers ([14df518](https://github.com/stratif-io/stratif.io/commit/14df5189bd61fe645a0e3ee8e8117248604442a3))
- **retention:** bracket retention, benchmark colors, Δ column, Learn panel ([0296554](https://github.com/stratif-io/stratif.io/commit/02965545d0ae79810736f0a2256780f43d211478))
- **retention:** redesign RetentionTable with benchmark colors, soon cells, delta column ([3141a2e](https://github.com/stratif-io/stratif.io/commit/3141a2e19305b59470780d8e93974b1c7fdf5e71))
- **retention:** register RetentionLearnPanel in design system ([9b36848](https://github.com/stratif-io/stratif.io/commit/9b36848eb013ebdaf469c3eea05135f53e0654e9))
- **retention:** remove metric cards, add Learn panel ([85bd16d](https://github.com/stratif-io/stratif.io/commit/85bd16d3939cd8b1a02080fa32f001b487fa4ec3))
- **retention:** switch to bracket (cumulative) retention + updated milestones ([c405cb5](https://github.com/stratif-io/stratif.io/commit/c405cb54012d471bb93a9eb79b897ab91efb79b5))
- **retention:** update frontend types for nullable milestone_values ([c2531e8](https://github.com/stratif-io/stratif.io/commit/c2531e80d6a026f424ce18de7916239c2d93fcf4))
- rewrite connections crud.py with SQLAlchemy async ORM ([3f14e87](https://github.com/stratif-io/stratif.io/commit/3f14e87b327e961d6a147d748cbe6f63978c7745))
- sortable column headers in DataTable + pivot table sorts by row dimension ([99e6dcf](https://github.com/stratif-io/stratif.io/commit/99e6dcfc47f167c28b29ba95fa97c1be67bbe2ed))
- sortable headers in DataTable + pivot table row sorting ([5342911](https://github.com/stratif-io/stratif.io/commit/53429118d154a9400c7a03ce120910ac9c51818c))
- SQLAlchemy async ORM for product DB ([96d7580](https://github.com/stratif-io/stratif.io/commit/96d7580d0479a92600bec3f2295c532e221e1ff6))
- table typography consistency (EventsTable + LayoutSection) ([a2dc32e](https://github.com/stratif-io/stratif.io/commit/a2dc32e4502d682cd8b3ba29c74ceb24775b94b7))
- track chart_viewed on analytics page mount ([a82ac75](https://github.com/stratif-io/stratif.io/commit/a82ac750949ae45d05dee58e8b00ebd153940c5f))
- track connection_created with db_type ([ce5783b](https://github.com/stratif-io/stratif.io/commit/ce5783b27aa8d12e58dfffa847036466135bae6a))
- track date_range_changed and breakdown_applied ([8816fc0](https://github.com/stratif-io/stratif.io/commit/8816fc09228004631b7ee303585c239d7dc476da))
- track export_triggered on CSV download ([56d4b09](https://github.com/stratif-io/stratif.io/commit/56d4b09c4fec637bc0b7fa21fd55db7b5116b036))
- track funnel_step_selected on step event change ([dd75add](https://github.com/stratif-io/stratif.io/commit/dd75add11298cf391a359fa560df62834103da7c))
- track query_executed with duration in trend hook ([be2f434](https://github.com/stratif-io/stratif.io/commit/be2f434c078d4a5f58cedd40675a364cfcb960a5))
- track schema_tab_opened ([f1a4fdd](https://github.com/stratif-io/stratif.io/commit/f1a4fdd5926fb9eed6f6d01525ae74613d13f8ac))
- track sql_studio_opened ([c9e900d](https://github.com/stratif-io/stratif.io/commit/c9e900d41d7e34d0268459b2499f4516a3890cb2))
- UI homogenisation — enforce design system constants across all pages ([588607d](https://github.com/stratif-io/stratif.io/commit/588607d81db8a7e8ac597cafe12740d3f7e023a1))
- UI navigation & trend page redesign ([14d47a7](https://github.com/stratif-io/stratif.io/commit/14d47a718da78c60a38b67305163515d04999947))
- **ui:** add PageHeader component ([c8d0b69](https://github.com/stratif-io/stratif.io/commit/c8d0b69ca8cf99a85eab2684bc079281a7845395))
- **ui:** add SectionHeader component ([601c8e7](https://github.com/stratif-io/stratif.io/commit/601c8e71a29cdd51e9cb79bb86b7986eb68a0314))
- unified structlog — route all stdlib logs through structlog ([2990764](https://github.com/stratif-io/stratif.io/commit/2990764441d0b56b24ca7081eebd73f9c767b8c2))
- update browse, schema_detect, auth to use DBSession ([df55056](https://github.com/stratif-io/stratif.io/commit/df550560f6610fd8ac96e96e99ef856c640535c7))
- update e2e conftest to use async SQLAlchemy product DB setup ([b1176df](https://github.com/stratif-io/stratif.io/commit/b1176df55af8ac3e84b5dab0e69efe4016bc3a51))
- use per-event colors in PathFunnelDialog chips — matches path list color coding ([c8c2654](https://github.com/stratif-io/stratif.io/commit/c8c2654c0417fb04af9e04971b38fbd80db97834))
- wire NotFoundPage as catch-all route, replacing redirect to dashboard ([af99791](https://github.com/stratif-io/stratif.io/commit/af99791aa39aa2b73d6f49895b2c46cbee19bef6))
- wrap OSS app with AnalyticsProvider (no-op) ([cfe23f3](https://github.com/stratif-io/stratif.io/commit/cfe23f3909d55ebac4bb28bb1a0ceba6a2d89fe9))

### Bug Fixes

- **a11y:** hide decorative icon container from screen reader tree in EmptyState ([81ef1f5](https://github.com/stratif-io/stratif.io/commit/81ef1f56e4ece41252815ba68fe50cd86593f244))
- **a11y:** increase DateRangePicker inline trigger to 44px touch target ([3c59f79](https://github.com/stratif-io/stratif.io/commit/3c59f794307564c1c7302a1874209a6443fc9b0d))
- **a11y:** increase touch targets to minimum 44px in filters and sidebar nav ([93162c5](https://github.com/stratif-io/stratif.io/commit/93162c5b453522fe4d6d4d45427ffe0caff86aef))
- **a11y:** make sidebar mobile overlay discoverable to screen readers ([2684bba](https://github.com/stratif-io/stratif.io/commit/2684bba68f293ea645670d4f0819ecbb177d0f5d))
- add .npmrc to wire STRATIFIO_OSS_TOKEN for GitHub Packages publish ([444e628](https://github.com/stratif-io/stratif.io/commit/444e628acf7c866cfa35e3edf116b5dd0e062107))
- add .npmrc to wire STRATIFIO_OSS_TOKEN for GitHub Packages publish ([21a0609](https://github.com/stratif-io/stratif.io/commit/21a0609612c8438d7dced11d49b0517803a0563b))
- add BUN_AUTH_TOKEN for GitHub Packages auth in bun publish ([f112f6b](https://github.com/stratif-io/stratif.io/commit/f112f6b880a4972700de91138667fe5a10fa49d3))
- add BUN_AUTH_TOKEN for GitHub Packages auth in bun publish ([e86ea2e](https://github.com/stratif-io/stratif.io/commit/e86ea2ee09fb3b2cacb8b1ff550e6e060565876b))
- add type: ignore for slowapi and combine nested with in test ([0db671f](https://github.com/stratif-io/stratif.io/commit/0db671f1731045e6ede8e779bbcb0404abc88d98))
- add workflow_dispatch to trigger run 2 after PR merge ([4077726](https://github.com/stratif-io/stratif.io/commit/4077726fd9f5305ad4ea6c5af011a024ac1eda7a))
- add workflow_dispatch to trigger run 2 after PR merge ([7a19381](https://github.com/stratif-io/stratif.io/commit/7a19381e5840418e0ab14e6eff19a36f5a613c2b))
- address code review feedback — dead alias, stale comment, positioning, type fix ([ad21d0c](https://github.com/stratif-io/stratif.io/commit/ad21d0c278ee3b7d81e69472142e96d740f68e5f))
- align Learn button style with Mission Control pill; add no-gap callout ([c0e88ab](https://github.com/stratif-io/stratif.io/commit/c0e88ab8219dcad2cbbf93fd62552a917cd71cbe))
- **analytics:** use TYPOGRAPHY.label for h4 in PathFunnelDialog ([dd3ce6d](https://github.com/stratif-io/stratif.io/commit/dd3ce6d0faf07e17f62a34ac21a35d758e39bf4e))
- assert rate-limit headers in test_rate_limit_headers_present ([312ee1d](https://github.com/stratif-io/stratif.io/commit/312ee1d61371323cb734eab2f5e9d42f1adc46e1))
- bootstrap_connection reads context._ not properties._ for custom props ([ddff4b3](https://github.com/stratif-io/stratif.io/commit/ddff4b35f2cfa7e2674e07385cc1a571f7c61623))
- bootstrap_connection reads context._ not properties._ for custom… ([8ebd1e0](https://github.com/stratif-io/stratif.io/commit/8ebd1e0fc8a95ec8c0161c39950f2582e33a01f3))
- center sidebar icons when collapsed by zeroing gap on hidden label ([7d95b4c](https://github.com/stratif-io/stratif.io/commit/7d95b4c3fa3a4ae6e775378ed5325c68da58cf4b))
- **ci:** auto-regenerate uv.lock at pre-commit time ([87019dd](https://github.com/stratif-io/stratif.io/commit/87019dda8912ae0dd8d2145c4be629edc8b00f2c))
- **ci:** auto-regenerate uv.lock at pre-commit time instead of just checking ([e3ff024](https://github.com/stratif-io/stratif.io/commit/e3ff024cadd54d69b526f81178bafa2d009ddf4f))
- **ci:** push Docker image to ghcr.io/stratif-io instead of cabichahine ([fa4265e](https://github.com/stratif-io/stratif.io/commit/fa4265e23e3582a9fec2a7557a8ffeba4b9b7114))
- **ci:** skip git clone in test — use checked-out repo via STRATIFIO_REPO_DIR ([f0b6885](https://github.com/stratif-io/stratif.io/commit/f0b6885b65d347644fd7343f8b927b3cd61e49d7))
- **ci:** write .npmrc auth token before bun publish ([41756bb](https://github.com/stratif-io/stratif.io/commit/41756bbcdda7798841d2d7febe23f63731e4e7b2))
- **ci:** write .npmrc auth token before bun publish ([8c38a8f](https://github.com/stratif-io/stratif.io/commit/8c38a8f85fea74f22e410082c2b5f59e2a40bfe1))
- cohort retention counts only truly new users, not returning users ([a865199](https://github.com/stratif-io/stratif.io/commit/a86519903c67da873ac7c176d89b0f6fba985c0e))
- configure bun publish via .bunfig.toml [publish] section ([3e7156a](https://github.com/stratif-io/stratif.io/commit/3e7156afcd3d26800128b6f0e1bd28dc417e7590))
- configure bun publish via .bunfig.toml for GitHub Packages auth ([4ea85e9](https://github.com/stratif-io/stratif.io/commit/4ea85e9647c4e840f46daa8b61459a61e25b6beb))
- confirm workflow_dispatch release trigger works end-to-end ([b23b79b](https://github.com/stratif-io/stratif.io/commit/b23b79b6dd611c549ff8359554f714cf032deb7e))
- confirm workflow_dispatch release trigger works end-to-end ([71c10dd](https://github.com/stratif-io/stratif.io/commit/71c10ddbba947e6cdafb30e099218a2166a99a56))
- **connections:** replace h1 with SectionHeader in ConnectionList ([805c6dd](https://github.com/stratif-io/stratif.io/commit/805c6dd524c6b96bbda5d01acd188882b3328e6d))
- **connections:** use h1+pageLabel directly in ConnectionDetailPage, not PageHeader wrapper ([398bf4d](https://github.com/stratif-io/stratif.io/commit/398bf4d84078e5be67a9379abb7c5c15f9d762f7))
- **connections:** use PageHeader in ConnectionDetailPage ([0538617](https://github.com/stratif-io/stratif.io/commit/0538617d6eb32176571d82a3ce9094ddfef28980))
- **connections:** use TYPOGRAPHY.label for h3 headings in ConnectionConfigTab ([046b837](https://github.com/stratif-io/stratif.io/commit/046b8372749550b66777a20b63f4edb6c4585ecf))
- consolidate AnalyticsProvider into context.tsx per spec ([93161ef](https://github.com/stratif-io/stratif.io/commit/93161efffacffdc688564afe335c6276ba77d7bb))
- correct REPO to stratif-io/stratif.io in install.sh ([70d9e55](https://github.com/stratif-io/stratif.io/commit/70d9e55c07bde696ccc906b81712d0c68477ab4f))
- correct REPO to stratif-io/stratif.io in install.sh ([b473aa2](https://github.com/stratif-io/stratif.io/commit/b473aa2844a0cc2a96ecabcfa22731d1b063bc2d))
- correct workspace filter from @stratifio/web to @stratif-io/web ([6740b18](https://github.com/stratif-io/stratif.io/commit/6740b182fef0f70eb90e3a195b651814c95868a8))
- count total pattern occurrences in contains mode, not just distinct users ([dc45e0f](https://github.com/stratif-io/stratif.io/commit/dc45e0f71cbb6839bcd22925f6b5728e57d7d3db))
- **css:** remove hover-scale — creates stacking context that clips popovers ([4fb645d](https://github.com/stratif-io/stratif.io/commit/4fb645d1413c2ce42d95aef2383be70a287a16fc))
- debug STRATIFIO_OSS_TOKEN availability in publish-npm job ([a97822f](https://github.com/stratif-io/stratif.io/commit/a97822f424d26bedf47d1c4340de552954a068c6))
- debug STRATIFIO_OSS_TOKEN in publish-npm job ([b70879b](https://github.com/stratif-io/stratif.io/commit/b70879b01aec4d5a9d7f47e27cd5300fe89012e0))
- disable git credential prompt when running via curl | bash ([62afa86](https://github.com/stratif-io/stratif.io/commit/62afa86744e1bfe6e0488cd915707523767ebc3e))
- disable pointer events on DevCard back face when not flipped ([bedde3a](https://github.com/stratif-io/stratif.io/commit/bedde3a591e440eff32b9b410bcb35ee2778008a))
- exclude .venv from copy, use GITHUB_TOKEN for private repo testing ([2fae36c](https://github.com/stratif-io/stratif.io/commit/2fae36c4dac1d50077c51c37a2155d69aa30a257))
- exclude .venv from copy, use venv binaries directly, fix mktemp suffix ([e7302e4](https://github.com/stratif-io/stratif.io/commit/e7302e4dfdeb6d5870f0545969fc278b730eb8c4))
- fetch main before force-with-lease push to handle UI-merged PRs ([0afe092](https://github.com/stratif-io/stratif.io/commit/0afe092d9d812430296fc746d1b49435c763cb90))
- fetch main before force-with-lease push to handle UI-merged PRs ([f3613b0](https://github.com/stratif-io/stratif.io/commit/f3613b01d84a1c5834ca7cffd524b14f1103d541))
- final end-to-end automated release loop validation ([26d5be5](https://github.com/stratif-io/stratif.io/commit/26d5be5a3fe1df5d17a349cc5a7d3fd889808aca))
- final end-to-end automated release loop validation ([997cb43](https://github.com/stratif-io/stratif.io/commit/997cb436b709d526077fe11b32b4666fc4d7e486))
- forward exc_info through InterceptHandler ([e4a4d8d](https://github.com/stratif-io/stratif.io/commit/e4a4d8d427e3afe6c392daf1f1bf57d393e33d4c))
- improve install.sh UX — step labels, spinner, fix cp excluding .git ([26852a3](https://github.com/stratif-io/stratif.io/commit/26852a3efc1370c62a4ba721ff88a25cbae7619d))
- install.sh UX — step labels, spinner, fix .git copy flood ([185a2bf](https://github.com/stratif-io/stratif.io/commit/185a2bf19b13e836264ba85feaad6e021190dbf1))
- **install:** detect sh and print clear error directing user to use bash ([78d68bf](https://github.com/stratif-io/stratif.io/commit/78d68bfc5dc45f4bc3ca2b97f6dee367b19c84aa))
- **install:** extract frontend dist to INSTALL_DIR root ([319ccbd](https://github.com/stratif-io/stratif.io/commit/319ccbd41ae7875002bb7a5165155ccde6d83be6))
- **install:** generate connections.yaml and fix seeder invocation ([20e6f3e](https://github.com/stratif-io/stratif.io/commit/20e6f3ed38b6f1f4dab5ae4362f4a0881fe2c5f6))
- **install:** replace bash array GH_AUTH_ARGS with gh_curl helper ([1a0bcd0](https://github.com/stratif-io/stratif.io/commit/1a0bcd0d3c9f7187c47308cd5ec3989dc2dfaefa))
- **install:** rewrite as POSIX sh — works with both sh and bash ([ab1669f](https://github.com/stratif-io/stratif.io/commit/ab1669fe40f86482183d44736d113b6b658364d8))
- **install:** use GitHub API to fetch release asset, support private repo with GITHUB_TOKEN ([434d156](https://github.com/stratif-io/stratif.io/commit/434d15663c403572f530e7483d70d2d5be2cbb70))
- less deps ([3dcedd8](https://github.com/stratif-io/stratif.io/commit/3dcedd864b480d8c09b2b3a8c88074c77f22e095))
- log on exceptions in AccessLogMiddleware and fix middleware order for 429 logging ([9c584be](https://github.com/stratif-io/stratif.io/commit/9c584beefa4943c7d66a3cc9c8ca41e6145a34c2))
- migrate SeedConfig to pydantic-settings v2 SettingsConfigDict ([4cd44d7](https://github.com/stratif-io/stratif.io/commit/4cd44d7fa5da10dc0c12553836458a656b0a2b49))
- migrate SeedConfig to pydantic-settings v2 SettingsConfigDict ([4e49e69](https://github.com/stratif-io/stratif.io/commit/4e49e693c5108eb6eb9482c173cbc6d1023df71d))
- **mobile:** guard global hover transitions with hover:hover media query ([82771a6](https://github.com/stratif-io/stratif.io/commit/82771a69536054cde97626a5fe66544e3451b0fb))
- **mobile:** keep filter bar horizontal on all screens — scroll instead of stack ([ea13e30](https://github.com/stratif-io/stratif.io/commit/ea13e303feedda3f640d97fd1af261215e302a2e))
- mock useSearchParams in FunnelDetailPage test to prevent infinite re-render loop ([bdec652](https://github.com/stratif-io/stratif.io/commit/bdec6527c0c624ff68dd82e36fc4f19cc6110e1d))
- move sys import to top level in test_logging ([2def16d](https://github.com/stratif-io/stratif.io/commit/2def16d744c89dc704dd0b8d10573c9a35a8502b))
- null engine globals before dispose() to handle shutdown errors ([3ef70f7](https://github.com/stratif-io/stratif.io/commit/3ef70f79ef55a31962dd850a52372062b05db72e))
- **pages:** add PageHeader to pages missing a heading ([3c8a4fe](https://github.com/stratif-io/stratif.io/commit/3c8a4fe6e3b554ff345bfcfd3c13744c4a7c0046))
- pass connection_id to path-funnel query in PathFunnelDialog ([f7c8545](https://github.com/stratif-io/stratif.io/commit/f7c8545be3171045899d5836d56fe6d23515865a))
- **people:** use PageHeader and TYPOGRAPHY constants in PeoplePage ([ecb68a5](https://github.com/stratif-io/stratif.io/commit/ecb68a57f8eb858b330b26c103bd3023d3779428))
- **polish:** align MetricCardSkeleton radius with actual cards (rounded-xl) ([42a0689](https://github.com/stratif-io/stratif.io/commit/42a068938da08ea999b2926f8b8a3fa128850486))
- **polish:** normalize page title style across feature pages ([f5f02ba](https://github.com/stratif-io/stratif.io/commit/f5f02baad4b37779c7a4616d9a535b6516994816))
- prevent infinite loop when navigating away from funnel page ([710d24f](https://github.com/stratif-io/stratif.io/commit/710d24fa995bae677d9cef164c99eab0ad63e48b))
- prevent infinite loop when navigating away from funnel page ([d043d84](https://github.com/stratif-io/stratif.io/commit/d043d84263a897d1ca892ceb3a2869ef14f6d25f))
- read counting mode from URL searchParams in usePathExplorer (not from props) ([60b2d63](https://github.com/stratif-io/stratif.io/commit/60b2d636a6d84817baaf3e2b0d57b76725bee81f))
- remove .tar.gz suffix from mktemp template (breaks on macOS) ([b09fc13](https://github.com/stratif-io/stratif.io/commit/b09fc1343d4b5b788eb525bbbfd225ed3f07438d))
- remove off-by-one in subsequence LATERAL range that caused duplicate paths ([0e3f48f](https://github.com/stratif-io/stratif.io/commit/0e3f48f0e9d94075cd25d5514658eaad30ed155b))
- remove redundant date sync effects from FunnelDetailPage — useUrlSync handles this ([1693428](https://github.com/stratif-io/stratif.io/commit/1693428226b28e2772aff4d99d3922636858ea8f))
- remove unused imports and fix docstring in test_access_log ([71b6919](https://github.com/stratif-io/stratif.io/commit/71b6919ea2ee276702ddbc7f0e044fcfd2f53d69))
- render funnel dialog tooltips below buttons ([93a356a](https://github.com/stratif-io/stratif.io/commit/93a356a52cc40c85afd95dc7a67410f6fd513121))
- render funnel dialog tooltips below buttons ([d710e43](https://github.com/stratif-io/stratif.io/commit/d710e43612370f1f2c764581110d134fa0108c1c))
- resolve ruff linting errors ([aa7e841](https://github.com/stratif-io/stratif.io/commit/aa7e841552a3862e94a5be7ebe78fbc23240c185))
- restore DevCard component and re-add to all call sites ([2dc74a9](https://github.com/stratif-io/stratif.io/commit/2dc74a95b6c3cd86c8e0294ae2facff401f9a966))
- restore Open full page button in funnel dialog ([58f6631](https://github.com/stratif-io/stratif.io/commit/58f6631cad2c1ac107c3603e4afc8c64cf78bfff))
- restore package name to @stratif-io/web ([e50fe95](https://github.com/stratif-io/stratif.io/commit/e50fe95942a50f2d4aa8f6b1c6021640ba66fc7b))
- restore package name to @stratif-io/web and use setup-node for publish ([6b11658](https://github.com/stratif-io/stratif.io/commit/6b11658885d8bba12445b3fe4c8a248cd81f7501))
- restore package name to @stratif-io/web and use setup-node for publish ([20c5de8](https://github.com/stratif-io/stratif.io/commit/20c5de86de4be94b80b5effbc4b703484ecf3a5f))
- restore package name to @stratif-io/web and use setup-node for publish ([f78998b](https://github.com/stratif-io/stratif.io/commit/f78998b478a86170e3859148ac6baa55c3a8e15b))
- retention cohorts only include truly new users ([ae48428](https://github.com/stratif-io/stratif.io/commit/ae484289a5434a196e88be4486e2ce51c3392ac6))
- **retention:** calendar-accurate is_reached for month/quarter/year + null test ([aedaf2b](https://github.com/stratif-io/stratif.io/commit/aedaf2bf1a12c16a67f0ba382e00c36ac1621f2c))
- **retention:** fix avg row showing 0% for unreached milestones ([ef342ae](https://github.com/stratif-io/stratif.io/commit/ef342ae1c9fcb8f9e1899ad860a92bfa541a16ac))
- **retention:** fix timezone off-by-one in formatDate, remove dead avgMilestones from hook ([306fae3](https://github.com/stratif-io/stratif.io/commit/306fae3de7516f6b5991167a0213c0df9a32cf55))
- **retention:** use TableHead for Average row label for accessibility ([5a89504](https://github.com/stratif-io/stratif.io/commit/5a895040d40fbdaed623bc98d1aad4151ff42dd6))
- rewrite bootstrap_connection seeder and tests for async ORM ([cbd936a](https://github.com/stratif-io/stratif.io/commit/cbd936a7802468f21f8caef2372de51672e03184))
- right-align counting mode toggle with flex-1 spacer ([5aec0a4](https://github.com/stratif-io/stratif.io/commit/5aec0a427b15a7c806d9b53c01277b1148c3e03f))
- set log level to error in install.sh server invocations ([5dd82ba](https://github.com/stratif-io/stratif.io/commit/5dd82ba918eb43127a7ab2f3eb8124b7aca08895))
- suppress uvicorn INFO logs in install.sh ([648018a](https://github.com/stratif-io/stratif.io/commit/648018a628270aa46ee02ef0feeb25c0aa9db6b5))
- suppress uvicorn INFO logs in install.sh ([316b79d](https://github.com/stratif-io/stratif.io/commit/316b79d2bf460c2635e5d9da34fe9b816e39dec1))
- test STRATIFIO_OSS_TOKEN secret ([d14eeed](https://github.com/stratif-io/stratif.io/commit/d14eeedfd793cc7876e05427197bf399fef65f7f))
- test STRATIFIO_OSS_TOKEN secret ([ac836c2](https://github.com/stratif-io/stratif.io/commit/ac836c26f3486e9498ebe1b5386be72745a633cb))
- **theme:** differentiate card surface from page background in dark mode ([abca4d3](https://github.com/stratif-io/stratif.io/commit/abca4d3cd6d46bcc9f3322571752862278f9ae80))
- **theme:** use CSS variable-based heatmap colors that work in dark mode ([5addf5e](https://github.com/stratif-io/stratif.io/commit/5addf5ed864891e6ce6074fe4dace559ac0f6e88))
- trigger npm publish after STRATIFIO_OSS_TOKEN was set ([52bbb57](https://github.com/stratif-io/stratif.io/commit/52bbb57eb530f9b3bcaa9118fd2a1cd21693783c))
- trigger npm publish with correct STRATIFIO_OSS_TOKEN ([b3b683e](https://github.com/stratif-io/stratif.io/commit/b3b683e06e1ab8a9ad304c561ae3486dcf1d7dc7))
- trigger publish with STRATIFIO_OSS_TOKEN now set ([14b0216](https://github.com/stratif-io/stratif.io/commit/14b0216dfab5deae44b2511b7998ae76a869a17c))
- trigger publish with STRATIFIO_OSS_TOKEN now set ([a992ce9](https://github.com/stratif-io/stratif.io/commit/a992ce95f4cee8f7f7e111d89d463261c5c1d887))
- trigger release-please ([fb9d6ab](https://github.com/stratif-io/stratif.io/commit/fb9d6ab77bf8572d8bca1ab76c986a544d88ce46))
- ui audit — a11y, theming, responsiveness, and polish ([d5b4a9f](https://github.com/stratif-io/stratif.io/commit/d5b4a9f67a7563e4b16bcb5d4ef8c0664b01fd3b))
- **ui:** move page-header test to **tests** dir ([088c5ab](https://github.com/stratif-io/stratif.io/commit/088c5ab4fc39bffe74ea735b21052046b17806d7))
- **ui:** replace hardcoded colors with theme tokens in NotFoundPage ([23c44ce](https://github.com/stratif-io/stratif.io/commit/23c44ceb8ff128c639c1d025a7e7b25b8e7f4a67))
- **ui:** use TYPOGRAPHY.cardTitle in EmptyState ([305dcb4](https://github.com/stratif-io/stratif.io/commit/305dcb4c6ab62711d025c810744094b9aa15f4be))
- update bootstrap-sha to current main HEAD ([897ecab](https://github.com/stratif-io/stratif.io/commit/897ecab183cb563d3eb194aeca7a8988ca1bcb72))
- update bootstrap-sha to current main HEAD ([3b237d6](https://github.com/stratif-io/stratif.io/commit/3b237d6c84d5285a3de9f2903adc15f2d743dedb))
- update bootstrap-sha to post-0.27.0 main HEAD ([15a131c](https://github.com/stratif-io/stratif.io/commit/15a131ca5df9071146c72e65b09a4a5b965214d1))
- update bootstrap-sha to post-0.27.0 main HEAD ([185b20a](https://github.com/stratif-io/stratif.io/commit/185b20a3d6db670a7e90618ebef9379c3374d5cd))
- use --force-with-lease when pushing develop→main in sync-develop ([9665514](https://github.com/stratif-io/stratif.io/commit/9665514af1f81e31b64764638f35caa47c724316))
- use --force-with-lease when pushing develop→main in sync-develop ([553cc56](https://github.com/stratif-io/stratif.io/commit/553cc568aa7811814be1d466acb5521028527553))
- use &gt;= for funnel timestamp comparison to handle same-timestamp events ([5393c16](https://github.com/stratif-io/stratif.io/commit/5393c16077e9bac37b88b218fe76d6ce56f2d94d))
- use COUNT(DISTINCT user_id) for unique_sessions in contains mode; add structural tests ([ad8b542](https://github.com/stratif-io/stratif.io/commit/ad8b5427aa81b5b56037079ae74b051c625ee999))
- use npm publish instead of bun publish for GitHub Packages auth ([4432d4b](https://github.com/stratif-io/stratif.io/commit/4432d4b4d3be0a9712fb61308808b4837f82ebfd))
- use npm publish instead of bun publish for GitHub Packages auth ([a2e9d59](https://github.com/stratif-io/stratif.io/commit/a2e9d59762ed0e57b9e3cfa9b62eeebe3a00a660))
- use PrintLoggerFactory to prevent InterceptHandler recursion ([0ec462c](https://github.com/stratif-io/stratif.io/commit/0ec462c6881cb35743f53509d0b5880b69053538))
- use regex URL match in e2e test to allow query params ([5ced3c2](https://github.com/stratif-io/stratif.io/commit/5ced3c2a065e52ecac44a1207dc1df1f37251bf9))
- use setup-node + npm publish for GitHub Packages ([cd159f5](https://github.com/stratif-io/stratif.io/commit/cd159f5ece0f0cdfcab418c126a376538c5da40b))
- use setup-node + npm publish for GitHub Packages auth ([d50772f](https://github.com/stratif-io/stratif.io/commit/d50772f0fe10285bc5d852c099b58fcad58b68bd))
- use STRATIFIO_OSS_TOKEN for npm publish auth ([06a879d](https://github.com/stratif-io/stratif.io/commit/06a879d5702069b9418ab33f8490dc345ea429b4))
- use STRATIFIO_OSS_TOKEN for npm publish auth ([173a020](https://github.com/stratif-io/stratif.io/commit/173a0204b1226a0d84accdad6a82d6edc78645f9))
- use subquery+WHERE instead of QUALIFY for match_count filter ([0436aea](https://github.com/stratif-io/stratif.io/commit/0436aeaf5fcfa3ead9f160c4af448a41035265df))
- **ux:** make sparklines legible in mini cards — dedicated bottom strip with gradient fill ([01c584b](https://github.com/stratif-io/stratif.io/commit/01c584bf50894399d536941561646db11a58f13a))
- **ux:** show Monitor icon in theme toggle when system mode is active ([2d9126b](https://github.com/stratif-io/stratif.io/commit/2d9126b63eb610e536a1a165a2ecf931ca3d4be7))
- verify automated release loop end-to-end ([8fd785a](https://github.com/stratif-io/stratif.io/commit/8fd785acd535d81aae209acbd0c74655959fac14))
- verify automated release loop end-to-end ([7bae449](https://github.com/stratif-io/stratif.io/commit/7bae44912a0b1e43c6df9d8c27ad13a5b28e3d10))
- write .npmrc directly with STRATIFIO_OSS_TOKEN for npm publish ([ce8e029](https://github.com/stratif-io/stratif.io/commit/ce8e029adc98610743e2c82c34b54c2726d59a28))
- write .npmrc directly with STRATIFIO_OSS_TOKEN for npm publish ([69a4bf9](https://github.com/stratif-io/stratif.io/commit/69a4bf9c759739de3e36b45863645f68f2c9fee5))
- write auth to ~/.npmrc to avoid workspace config warning ([e3839e7](https://github.com/stratif-io/stratif.io/commit/e3839e7ffcef4315d4caf279ddf0c766baa5818b))
- write npm auth to ~/.npmrc to avoid workspace config warning ([b20b807](https://github.com/stratif-io/stratif.io/commit/b20b807130b9e30d10cd900d550b3ab0bc3abbd7))
- write npm auth to ~/.npmrc to bypass workspace .npmrc suppression ([62a09af](https://github.com/stratif-io/stratif.io/commit/62a09afb00b2133205d90800d2cc8f36fa82553f))
- write npm auth to ~/.npmrc to bypass workspace .npmrc suppression ([c2b96e7](https://github.com/stratif-io/stratif.io/commit/c2b96e7c685a511c8d4c963b047df617d5894c23))

### Reverts

- remove E2E job from CI (deferred) ([69b3ad6](https://github.com/stratif-io/stratif.io/commit/69b3ad6479278d5589966b6ce84239ec1b7fe30a))

## [0.26.2](https://github.com/stratif-io/stratif.io/compare/v0.26.1...v0.26.2) (2026-04-12)

### Bug Fixes

- fetch main before force-with-lease push to handle UI-merged PRs ([0afe092](https://github.com/stratif-io/stratif.io/commit/0afe092d9d812430296fc746d1b49435c763cb90))

## [0.26.1](https://github.com/stratif-io/stratif.io/compare/v0.26.0...v0.26.1) (2026-04-12)

### Bug Fixes

- use --force-with-lease when pushing develop→main in sync-develop ([9665514](https://github.com/stratif-io/stratif.io/commit/9665514af1f81e31b64764638f35caa47c724316))
- use --force-with-lease when pushing develop→main in sync-develop ([553cc56](https://github.com/stratif-io/stratif.io/commit/553cc568aa7811814be1d466acb5521028527553))

## [0.26.0](https://github.com/stratif-io/stratif.io/compare/v0.25.2...v0.26.0) (2026-04-12)

### Features

- **retention:** add BENCHMARKS, getCellClass, milestoneTooltip helpers ([14df518](https://github.com/stratif-io/stratif.io/commit/14df5189bd61fe645a0e3ee8e8117248604442a3))
- **retention:** bracket retention, benchmark colors, Δ column, Learn panel ([0296554](https://github.com/stratif-io/stratif.io/commit/02965545d0ae79810736f0a2256780f43d211478))
- **retention:** redesign RetentionTable with benchmark colors, soon cells, delta column ([3141a2e](https://github.com/stratif-io/stratif.io/commit/3141a2e19305b59470780d8e93974b1c7fdf5e71))
- **retention:** register RetentionLearnPanel in design system ([9b36848](https://github.com/stratif-io/stratif.io/commit/9b36848eb013ebdaf469c3eea05135f53e0654e9))
- **retention:** remove metric cards, add Learn panel ([85bd16d](https://github.com/stratif-io/stratif.io/commit/85bd16d3939cd8b1a02080fa32f001b487fa4ec3))
- **retention:** switch to bracket (cumulative) retention + updated milestones ([c405cb5](https://github.com/stratif-io/stratif.io/commit/c405cb54012d471bb93a9eb79b897ab91efb79b5))
- **retention:** update frontend types for nullable milestone_values ([c2531e8](https://github.com/stratif-io/stratif.io/commit/c2531e80d6a026f424ce18de7916239c2d93fcf4))
- sortable column headers in DataTable + pivot table sorts by row dimension ([99e6dcf](https://github.com/stratif-io/stratif.io/commit/99e6dcfc47f167c28b29ba95fa97c1be67bbe2ed))
- sortable headers in DataTable + pivot table row sorting ([5342911](https://github.com/stratif-io/stratif.io/commit/53429118d154a9400c7a03ce120910ac9c51818c))

### Bug Fixes

- **retention:** calendar-accurate is_reached for month/quarter/year + null test ([aedaf2b](https://github.com/stratif-io/stratif.io/commit/aedaf2bf1a12c16a67f0ba382e00c36ac1621f2c))
- **retention:** fix avg row showing 0% for unreached milestones ([ef342ae](https://github.com/stratif-io/stratif.io/commit/ef342ae1c9fcb8f9e1899ad860a92bfa541a16ac))
- **retention:** fix timezone off-by-one in formatDate, remove dead avgMilestones from hook ([306fae3](https://github.com/stratif-io/stratif.io/commit/306fae3de7516f6b5991167a0213c0df9a32cf55))
- **retention:** use TableHead for Average row label for accessibility ([5a89504](https://github.com/stratif-io/stratif.io/commit/5a895040d40fbdaed623bc98d1aad4151ff42dd6))

## [0.25.2](https://github.com/stratif-io/stratif.io/compare/v0.25.1...v0.25.2) (2026-04-11)

### Bug Fixes

- final end-to-end automated release loop validation ([26d5be5](https://github.com/stratif-io/stratif.io/commit/26d5be5a3fe1df5d17a349cc5a7d3fd889808aca))
- final end-to-end automated release loop validation ([997cb43](https://github.com/stratif-io/stratif.io/commit/997cb436b709d526077fe11b32b4666fc4d7e486))

## [0.25.1](https://github.com/stratif-io/stratif.io/compare/v0.25.0...v0.25.1) (2026-04-11)

### Bug Fixes

- confirm workflow_dispatch release trigger works end-to-end ([b23b79b](https://github.com/stratif-io/stratif.io/commit/b23b79b6dd611c549ff8359554f714cf032deb7e))
- confirm workflow_dispatch release trigger works end-to-end ([71c10dd](https://github.com/stratif-io/stratif.io/commit/71c10ddbba947e6cdafb30e099218a2166a99a56))

## [0.25.0](https://github.com/stratif-io/stratif.io/compare/v0.24.1...v0.25.0) (2026-04-11)

### Features

- add 'Run in Pivot Explorer' button to Trends page ([4081fb3](https://github.com/stratif-io/stratif.io/commit/4081fb3015acacfec0e821449e97336b23c923de))
- add AccessLogMiddleware for structured request logging ([9072ad1](https://github.com/stratif-io/stratif.io/commit/9072ad10e7ea33c5d3edc005dbf6711c1ad4eca5))
- add analytics abstraction layer (no-op context + hook) ([3fe1acd](https://github.com/stratif-io/stratif.io/commit/3fe1acdd8ed5aab7b709fe1e408589aef83222df))
- add buildPivotUrl helper for Trend → Pivot handoff ([01bc42b](https://github.com/stratif-io/stratif.io/commit/01bc42b7d8fefcf593ad8f913b70962f0983cc35))
- add buildPivotUrl helper for Trend → Pivot handoff ([8aa6c35](https://github.com/stratif-io/stratif.io/commit/8aa6c3539279cd5a78ec43ca1f802fedfdad465c))
- add close_product_db for graceful shutdown ([b20b74b](https://github.com/stratif-io/stratif.io/commit/b20b74bc1a19bd29dcbe3f6eee6fab69c2498de8))
- add contains counting mode to PathAnalyzer (DuckDB) ([79d2380](https://github.com/stratif-io/stratif.io/commit/79d23808749e0b1f1188c2837970259a3a11c000))
- add counting_mode param to fetchPathAnalysis ([2c6af6e](https://github.com/stratif-io/stratif.io/commit/2c6af6e8b919bbcfe65df0deda3b8545c3258ffa))
- add Exact/Contains counting mode toggle to Paths Explorer toolbar ([a56fe49](https://github.com/stratif-io/stratif.io/commit/a56fe4906f3c1286068b81cabc6531119a6cb088))
- add Funnel nav item to sidebar ([882b69c](https://github.com/stratif-io/stratif.io/commit/882b69c51293f48ca3a991eb23f6b68617917863))
- add initial-state props to PivotTableProps ([ba5569c](https://github.com/stratif-io/stratif.io/commit/ba5569c490bd0daefdb70f01ab7d38671e08cec0))
- add InterceptHandler to route stdlib logs through structlog ([f23ecf6](https://github.com/stratif-io/stratif.io/commit/f23ecf6aafc65347aaa243bb13bdd19d5703f066))
- add Learn panel to Paths Explorer ([f930e10](https://github.com/stratif-io/stratif.io/commit/f930e10736403afc8994737fef421a1f127d425f))
- add logging adapter for local analytics debugging ([8e2297c](https://github.com/stratif-io/stratif.io/commit/8e2297c738e4549cb1cb5734bf04ec767e8ab556))
- add NotFoundPage component to design system ([a23fdda](https://github.com/stratif-io/stratif.io/commit/a23fdda3eebfc3abc24038905e14fd2bd176a63a))
- add PageTracker to OSS app for route change analytics ([bb23e86](https://github.com/stratif-io/stratif.io/commit/bb23e86c570acf9da93ea3eb74226b1c6ab28de6))
- add parseTrendParams helper for Trend → Pivot handoff ([9312c91](https://github.com/stratif-io/stratif.io/commit/9312c91e7db82398471cf5454ccb497e563eb389))
- add parseTrendParams helper for Trend → Pivot handoff ([7a93acd](https://github.com/stratif-io/stratif.io/commit/7a93acdb07db425dc34ce2a0251c8d8c8dbcf9fa))
- add slowapi rate limiting (200 req/min per IP) and wire AccessLogMiddleware ([032a26c](https://github.com/stratif-io/stratif.io/commit/032a26ca5b96e6e4bdef05a71553893e843e5553))
- add SQLAlchemy ORM models for product DB ([6b764fb](https://github.com/stratif-io/stratif.io/commit/6b764fbafe22c8b519472239e3798f3fe6634354))
- add sqlalchemy[asyncio], aiosqlite, asyncpg, pytest-asyncio deps ([0b248d6](https://github.com/stratif-io/stratif.io/commit/0b248d606c35ab169e9d00e548bdf86250d77881))
- apply semantic color variety to FunnelDetailPage summary cards ([50bef55](https://github.com/stratif-io/stratif.io/commit/50bef55b32266722d56038a66641f72ee6b8c463))
- apply TYPOGRAPHY constants to EventsTable cell renderers ([dd3d368](https://github.com/stratif-io/stratif.io/commit/dd3d368c46135e9ccb89c0a2c34c58bead6e233d))
- apply TYPOGRAPHY constants to PivotTable th/td; update row height estimate to 44px ([932be6b](https://github.com/stratif-io/stratif.io/commit/932be6b8e3948b771ed859f2250fa432805a9d7d))
- async get_db() dependency + create_all schema init ([8f49447](https://github.com/stratif-io/stratif.io/commit/8f49447a6fb62f770b6f89c23bb6e73fdddce498))
- async SQLAlchemy engine + updated product_db_url default ([c43601b](https://github.com/stratif-io/stratif.io/commit/c43601bea5206dbb2a0a85c04d43fccc9e1249b6))
- breakdown goes to pivot columns, date stays as row group ([01b2ff4](https://github.com/stratif-io/stratif.io/commit/01b2ff42c1af39c0143e8ef9dea60e768f46553d))
- call close_product_db in lifespan teardown for graceful shutdown ([3eaf8a7](https://github.com/stratif-io/stratif.io/commit/3eaf8a77372d4990f666cd7aeda2924c1a7351e1))
- complete SQLAlchemy async ORM migration — all tests passing ([5cea98f](https://github.com/stratif-io/stratif.io/commit/5cea98fb7403cbb15f6fb1679b25ffa5e87d29b1))
- **dashboard:** Learn panel — business metric explanations ([#294](https://github.com/stratif-io/stratif.io/issues/294)) ([829c909](https://github.com/stratif-io/stratif.io/commit/829c909ec7f9f0f27c17cee707ddf457833be038))
- **dashboard:** move Learn button to Mission Control page header ([f1d0152](https://github.com/stratif-io/stratif.io/commit/f1d0152f564e9037fe6bd1aa7d0d02c56f11d744))
- **dashboard:** move Learn button to Mission Control page header ([42f9362](https://github.com/stratif-io/stratif.io/commit/42f936241cb8d97c8fa16eaca8958945d0d07f3e))
- **design-system:** export and register PageHeader + SectionHeader ([66a1389](https://github.com/stratif-io/stratif.io/commit/66a1389955b04e89401d39174d23fb944ba404e1))
- **dev:** add run button to DevCard back face ([#168](https://github.com/stratif-io/stratif.io/issues/168)) ([24506fa](https://github.com/stratif-io/stratif.io/commit/24506fa94365a4a30bd5b487ab55d0981b86ec2c))
- expand event color palette to 10 distinct colors (add chart-6..10) ([a8291df](https://github.com/stratif-io/stratif.io/commit/a8291df0790d4427f62cebc7b10162a05af6ab27))
- export AnalyticsProvider and useAnalytics from OSS package ([c3b9d16](https://github.com/stratif-io/stratif.io/commit/c3b9d16959dbfa5a7e382035c2695d732f8cb232))
- expose counting_mode param on /api/path-analysis endpoint ([42a7645](https://github.com/stratif-io/stratif.io/commit/42a7645ae16d515931d09ef04ed7c849744a8b61))
- Feature/analytics ([93ac320](https://github.com/stratif-io/stratif.io/commit/93ac32024c90b9d7f005075b65441307a0f48690))
- go-live hardening — rate limiting, access logging, graceful shutdown, 404 page ([f71c6d3](https://github.com/stratif-io/stratif.io/commit/f71c6d355abaeeb9de4a88f6ec0d6a041d92bab0))
- make open_analytics_db async, use AsyncSession ([6d3a514](https://github.com/stratif-io/stratif.io/commit/6d3a514e1302815f9771cc27df49699e8e3293bb))
- move trend controls to toolbar above card, add TrendFilters compact mode ([0f59d60](https://github.com/stratif-io/stratif.io/commit/0f59d6097e2aa182c691445e3f0a8aa5f1562382))
- NewPivotPage reads trend params and pre-seeds PivotTable ([ef7bdfa](https://github.com/stratif-io/stratif.io/commit/ef7bdfa39c846211b74cdcd44444cadd42667ebb))
- paths counting mode toggle (Exact / Contains) ([4bd2381](https://github.com/stratif-io/stratif.io/commit/4bd23818dd96b5522eb4d2ba08341511bdc1d6bc))
- PivotTable accepts initialRowGroups, initialValueCols, initialPivotFilters ([6542600](https://github.com/stratif-io/stratif.io/commit/6542600a0f136b2631c075ed77e61b5d48afbcf7))
- publish @stratif-io/web to GitHub Packages on release ([7ef9fc5](https://github.com/stratif-io/stratif.io/commit/7ef9fc58e89ed29f1f25c4feebcb3a4d3b783b8c))
- publish @stratif-io/web to GitHub Packages on release ([05dbb2d](https://github.com/stratif-io/stratif.io/commit/05dbb2dce1fe2193a0e9ddcccc186dac0f7682ac))
- read countingMode option in usePathExplorer, pass counting_mode to API ([63e8ca1](https://github.com/stratif-io/stratif.io/commit/63e8ca144522ac35d86df55a37568070c8e80873))
- redesign FunnelSteps — color-coded circles, rounded bars, new connectors ([a022174](https://github.com/stratif-io/stratif.io/commit/a022174091a09d934485390b735f036fc7835625))
- redesign PathFunnelDialog — remove device filter, path chips, colored cards ([6d899ce](https://github.com/stratif-io/stratif.io/commit/6d899ce93e871fa5dcd887c6ccd0261a135c8896))
- register NotFoundPage in design system FeedbackSection ([e8a6429](https://github.com/stratif-io/stratif.io/commit/e8a64292cb1376f342a65a78bc74166ea8e56d1b))
- register table TYPOGRAPHY constants in design system LayoutSection ([d76cba1](https://github.com/stratif-io/stratif.io/commit/d76cba138c913dbeb4c43892e830ce500a3c6b4a))
- remove DevCard component and all usages ([c83fe34](https://github.com/stratif-io/stratif.io/commit/c83fe3472b8175b005125342f116555e8d313e63))
- remove devMode state from app-store ([984b4ef](https://github.com/stratif-io/stratif.io/commit/984b4efc2388a6f0e96852fb57c2a2138aab91f8))
- remove permalink from funnel modal and page ([8a81bb8](https://github.com/stratif-io/stratif.io/commit/8a81bb802fa9d1402d3ef5dc09644fe79f562c06))
- remove unique paths badge from toolbar ([f834d07](https://github.com/stratif-io/stratif.io/commit/f834d07702a2e50d323afd4be23048cb6ffdcd63))
- replace Docker installer with curl | sh (uv + GitHub release assets) ([8765ab7](https://github.com/stratif-io/stratif.io/commit/8765ab71e0aa5021b7a1660d9565d883d195ed79))
- replace Docker installer with curl | sh using uv + GitHub release assets ([6ffa8a2](https://github.com/stratif-io/stratif.io/commit/6ffa8a25a8528f985d43ff69a6031db2900521d1))
- rewrite connections crud.py with SQLAlchemy async ORM ([3f14e87](https://github.com/stratif-io/stratif.io/commit/3f14e87b327e961d6a147d748cbe6f63978c7745))
- Run in Pivot Explorer from Trend page ([c4d8bc0](https://github.com/stratif-io/stratif.io/commit/c4d8bc04dadbcb0cd43a95abaf52c8537113b1cc))
- SQLAlchemy async ORM for product DB ([96d7580](https://github.com/stratif-io/stratif.io/commit/96d7580d0479a92600bec3f2295c532e221e1ff6))
- table typography consistency (EventsTable + LayoutSection) ([a2dc32e](https://github.com/stratif-io/stratif.io/commit/a2dc32e4502d682cd8b3ba29c74ceb24775b94b7))
- track chart_viewed on analytics page mount ([a82ac75](https://github.com/stratif-io/stratif.io/commit/a82ac750949ae45d05dee58e8b00ebd153940c5f))
- track connection_created with db_type ([ce5783b](https://github.com/stratif-io/stratif.io/commit/ce5783b27aa8d12e58dfffa847036466135bae6a))
- track date_range_changed and breakdown_applied ([8816fc0](https://github.com/stratif-io/stratif.io/commit/8816fc09228004631b7ee303585c239d7dc476da))
- track export_triggered on CSV download ([56d4b09](https://github.com/stratif-io/stratif.io/commit/56d4b09c4fec637bc0b7fa21fd55db7b5116b036))
- track funnel_step_selected on step event change ([dd75add](https://github.com/stratif-io/stratif.io/commit/dd75add11298cf391a359fa560df62834103da7c))
- track query_executed with duration in trend hook ([be2f434](https://github.com/stratif-io/stratif.io/commit/be2f434c078d4a5f58cedd40675a364cfcb960a5))
- track schema_tab_opened ([f1a4fdd](https://github.com/stratif-io/stratif.io/commit/f1a4fdd5926fb9eed6f6d01525ae74613d13f8ac))
- track sql_studio_opened ([c9e900d](https://github.com/stratif-io/stratif.io/commit/c9e900d41d7e34d0268459b2499f4516a3890cb2))
- **trends:** unify metric picker + toolbar polish ([a0a8f04](https://github.com/stratif-io/stratif.io/commit/a0a8f04f7404c362c4d8f9186219d8f7779cfd84))
- UI homogenisation — enforce design system constants across all pages ([588607d](https://github.com/stratif-io/stratif.io/commit/588607d81db8a7e8ac597cafe12740d3f7e023a1))
- UI navigation & trend page redesign ([14d47a7](https://github.com/stratif-io/stratif.io/commit/14d47a718da78c60a38b67305163515d04999947))
- **ui:** add PageHeader component ([c8d0b69](https://github.com/stratif-io/stratif.io/commit/c8d0b69ca8cf99a85eab2684bc079281a7845395))
- **ui:** add SectionHeader component ([601c8e7](https://github.com/stratif-io/stratif.io/commit/601c8e71a29cdd51e9cb79bb86b7986eb68a0314))
- unified structlog — route all stdlib logs through structlog ([2990764](https://github.com/stratif-io/stratif.io/commit/2990764441d0b56b24ca7081eebd73f9c767b8c2))
- update browse, schema_detect, auth to use DBSession ([df55056](https://github.com/stratif-io/stratif.io/commit/df550560f6610fd8ac96e96e99ef856c640535c7))
- update e2e conftest to use async SQLAlchemy product DB setup ([b1176df](https://github.com/stratif-io/stratif.io/commit/b1176df55af8ac3e84b5dab0e69efe4016bc3a51))
- use per-event colors in PathFunnelDialog chips — matches path list color coding ([c8c2654](https://github.com/stratif-io/stratif.io/commit/c8c2654c0417fb04af9e04971b38fbd80db97834))
- wire NotFoundPage as catch-all route, replacing redirect to dashboard ([af99791](https://github.com/stratif-io/stratif.io/commit/af99791aa39aa2b73d6f49895b2c46cbee19bef6))
- wrap OSS app with AnalyticsProvider (no-op) ([cfe23f3](https://github.com/stratif-io/stratif.io/commit/cfe23f3909d55ebac4bb28bb1a0ceba6a2d89fe9))

### Bug Fixes

- **a11y:** hide decorative icon container from screen reader tree in EmptyState ([81ef1f5](https://github.com/stratif-io/stratif.io/commit/81ef1f56e4ece41252815ba68fe50cd86593f244))
- **a11y:** increase DateRangePicker inline trigger to 44px touch target ([3c59f79](https://github.com/stratif-io/stratif.io/commit/3c59f794307564c1c7302a1874209a6443fc9b0d))
- **a11y:** increase touch targets to minimum 44px in filters and sidebar nav ([93162c5](https://github.com/stratif-io/stratif.io/commit/93162c5b453522fe4d6d4d45427ffe0caff86aef))
- **a11y:** make sidebar mobile overlay discoverable to screen readers ([2684bba](https://github.com/stratif-io/stratif.io/commit/2684bba68f293ea645670d4f0819ecbb177d0f5d))
- **a11y:** move clear button outside PopoverTrigger — nested buttons invalid HTML ([efa8bd3](https://github.com/stratif-io/stratif.io/commit/efa8bd326d930fc5c58bd227a9455e05e21b7c1c))
- add ([5bddeea](https://github.com/stratif-io/stratif.io/commit/5bddeea1be9324f53ca86bf592cd6cf6eedaeff3))
- add .npmrc to wire STRATIFIO_OSS_TOKEN for GitHub Packages publish ([444e628](https://github.com/stratif-io/stratif.io/commit/444e628acf7c866cfa35e3edf116b5dd0e062107))
- add .npmrc to wire STRATIFIO_OSS_TOKEN for GitHub Packages publish ([21a0609](https://github.com/stratif-io/stratif.io/commit/21a0609612c8438d7dced11d49b0517803a0563b))
- add BUN_AUTH_TOKEN for GitHub Packages auth in bun publish ([f112f6b](https://github.com/stratif-io/stratif.io/commit/f112f6b880a4972700de91138667fe5a10fa49d3))
- add BUN_AUTH_TOKEN for GitHub Packages auth in bun publish ([e86ea2e](https://github.com/stratif-io/stratif.io/commit/e86ea2ee09fb3b2cacb8b1ff550e6e060565876b))
- add type: ignore for slowapi and combine nested with in test ([0db671f](https://github.com/stratif-io/stratif.io/commit/0db671f1731045e6ede8e779bbcb0404abc88d98))
- address code review feedback — dead alias, stale comment, positioning, type fix ([ad21d0c](https://github.com/stratif-io/stratif.io/commit/ad21d0c278ee3b7d81e69472142e96d740f68e5f))
- align Learn button style with Mission Control pill; add no-gap callout ([c0e88ab](https://github.com/stratif-io/stratif.io/commit/c0e88ab8219dcad2cbbf93fd62552a917cd71cbe))
- also guard default-seeding effect when initialRowGroups provided ([fc36061](https://github.com/stratif-io/stratif.io/commit/fc36061ee0f6df9b2a46154e48a69ba09894f4d6))
- also guard default-seeding effect when initialRowGroups provided ([b0e766a](https://github.com/stratif-io/stratif.io/commit/b0e766a25bb36536d759a326a4bb28642303e543))
- **analytics:** use TYPOGRAPHY.label for h4 in PathFunnelDialog ([dd3ce6d](https://github.com/stratif-io/stratif.io/commit/dd3ce6d0faf07e17f62a34ac21a35d758e39bf4e))
- assert rate-limit headers in test_rate_limit_headers_present ([312ee1d](https://github.com/stratif-io/stratif.io/commit/312ee1d61371323cb734eab2f5e9d42f1adc46e1))
- bootstrap_connection reads context._ not properties._ for custom props ([ddff4b3](https://github.com/stratif-io/stratif.io/commit/ddff4b35f2cfa7e2674e07385cc1a571f7c61623))
- bootstrap_connection reads context._ not properties._ for custom… ([8ebd1e0](https://github.com/stratif-io/stratif.io/commit/8ebd1e0fc8a95ec8c0161c39950f2582e33a01f3))
- build_filter_clauses must check filter_exprs not only custom_prop_exprs ([09fbaf1](https://github.com/stratif-io/stratif.io/commit/09fbaf1787a49fa178cc06210ae7ace2283f5ff5))
- center sidebar icons when collapsed by zeroing gap on hidden label ([7d95b4c](https://github.com/stratif-io/stratif.io/commit/7d95b4c3fa3a4ae6e775378ed5325c68da58cf4b))
- **ci:** auto-regenerate uv.lock at pre-commit time ([87019dd](https://github.com/stratif-io/stratif.io/commit/87019dda8912ae0dd8d2145c4be629edc8b00f2c))
- **ci:** auto-regenerate uv.lock at pre-commit time instead of just checking ([e3ff024](https://github.com/stratif-io/stratif.io/commit/e3ff024cadd54d69b526f81178bafa2d009ddf4f))
- **ci:** push Docker image to ghcr.io/stratif-io instead of cabichahine ([fa4265e](https://github.com/stratif-io/stratif.io/commit/fa4265e23e3582a9fec2a7557a8ffeba4b9b7114))
- **ci:** skip git clone in test — use checked-out repo via STRATIFIO_REPO_DIR ([f0b6885](https://github.com/stratif-io/stratif.io/commit/f0b6885b65d347644fd7343f8b927b3cd61e49d7))
- **ci:** write .npmrc auth token before bun publish ([41756bb](https://github.com/stratif-io/stratif.io/commit/41756bbcdda7798841d2d7febe23f63731e4e7b2))
- **ci:** write .npmrc auth token before bun publish ([8c38a8f](https://github.com/stratif-io/stratif.io/commit/8c38a8f85fea74f22e410082c2b5f59e2a40bfe1))
- cohort retention counts only truly new users, not returning users ([a865199](https://github.com/stratif-io/stratif.io/commit/a86519903c67da873ac7c176d89b0f6fba985c0e))
- configure bun publish via .bunfig.toml [publish] section ([3e7156a](https://github.com/stratif-io/stratif.io/commit/3e7156afcd3d26800128b6f0e1bd28dc417e7590))
- configure bun publish via .bunfig.toml for GitHub Packages auth ([4ea85e9](https://github.com/stratif-io/stratif.io/commit/4ea85e9647c4e840f46daa8b61459a61e25b6beb))
- **connections:** replace h1 with SectionHeader in ConnectionList ([805c6dd](https://github.com/stratif-io/stratif.io/commit/805c6dd524c6b96bbda5d01acd188882b3328e6d))
- **connections:** use h1+pageLabel directly in ConnectionDetailPage, not PageHeader wrapper ([398bf4d](https://github.com/stratif-io/stratif.io/commit/398bf4d84078e5be67a9379abb7c5c15f9d762f7))
- **connections:** use PageHeader in ConnectionDetailPage ([0538617](https://github.com/stratif-io/stratif.io/commit/0538617d6eb32176571d82a3ce9094ddfef28980))
- **connections:** use TYPOGRAPHY.label for h3 headings in ConnectionConfigTab ([046b837](https://github.com/stratif-io/stratif.io/commit/046b8372749550b66777a20b63f4edb6c4585ecf))
- consolidate AnalyticsProvider into context.tsx per spec ([93161ef](https://github.com/stratif-io/stratif.io/commit/93161efffacffdc688564afe335c6276ba77d7bb))
- correct REPO to stratif-io/stratif.io in install.sh ([70d9e55](https://github.com/stratif-io/stratif.io/commit/70d9e55c07bde696ccc906b81712d0c68477ab4f))
- correct REPO to stratif-io/stratif.io in install.sh ([b473aa2](https://github.com/stratif-io/stratif.io/commit/b473aa2844a0cc2a96ecabcfa22731d1b063bc2d))
- correct workspace filter from @stratifio/web to @stratif-io/web ([6740b18](https://github.com/stratif-io/stratif.io/commit/6740b182fef0f70eb90e3a195b651814c95868a8))
- count total pattern occurrences in contains mode, not just distinct users ([dc45e0f](https://github.com/stratif-io/stratif.io/commit/dc45e0f71cbb6839bcd22925f6b5728e57d7d3db))
- **css:** remove hover-scale — creates stacking context that clips popovers ([4fb645d](https://github.com/stratif-io/stratif.io/commit/4fb645d1413c2ce42d95aef2383be70a287a16fc))
- debug STRATIFIO_OSS_TOKEN availability in publish-npm job ([a97822f](https://github.com/stratif-io/stratif.io/commit/a97822f424d26bedf47d1c4340de552954a068c6))
- debug STRATIFIO_OSS_TOKEN in publish-npm job ([b70879b](https://github.com/stratif-io/stratif.io/commit/b70879b01aec4d5a9d7f47e27cd5300fe89012e0))
- disable git credential prompt when running via curl | bash ([62afa86](https://github.com/stratif-io/stratif.io/commit/62afa86744e1bfe6e0488cd915707523767ebc3e))
- disable pointer events on DevCard back face when not flipped ([bedde3a](https://github.com/stratif-io/stratif.io/commit/bedde3a591e440eff32b9b410bcb35ee2778008a))
- document filter truncation; guard malformed measure in parseTrendParams ([c7f50c7](https://github.com/stratif-io/stratif.io/commit/c7f50c7c9d3e6b92070506ebeb06b03c26eef6f3))
- dotted path filter fields resolve to JSON extraction not quoted identifier ([8f8bcc5](https://github.com/stratif-io/stratif.io/commit/8f8bcc5e9d58729424d1808f0e1e5587d60ca354))
- exclude .venv from copy, use GITHUB_TOKEN for private repo testing ([2fae36c](https://github.com/stratif-io/stratif.io/commit/2fae36c4dac1d50077c51c37a2155d69aa30a257))
- exclude .venv from copy, use venv binaries directly, fix mktemp suffix ([e7302e4](https://github.com/stratif-io/stratif.io/commit/e7302e4dfdeb6d5870f0545969fc278b730eb8c4))
- forward exc_info through InterceptHandler ([e4a4d8d](https://github.com/stratif-io/stratif.io/commit/e4a4d8d427e3afe6c392daf1f1bf57d393e33d4c))
- global filters broken for identity fields (first_name, email, etc.) ([ac8476b](https://github.com/stratif-io/stratif.io/commit/ac8476b4ebb4687aa3825a91e35f5f756f4be675))
- identity field expressions use \_resolve_path_to_sql to support dotted paths ([a084e46](https://github.com/stratif-io/stratif.io/commit/a084e4675f7bb65a9a70855be0d0355202c8021f))
- improve install.sh UX — step labels, spinner, fix cp excluding .git ([26852a3](https://github.com/stratif-io/stratif.io/commit/26852a3efc1370c62a4ba721ff88a25cbae7619d))
- install.sh UX — step labels, spinner, fix .git copy flood ([185a2bf](https://github.com/stratif-io/stratif.io/commit/185a2bf19b13e836264ba85feaad6e021190dbf1))
- **install:** detect sh and print clear error directing user to use bash ([78d68bf](https://github.com/stratif-io/stratif.io/commit/78d68bfc5dc45f4bc3ca2b97f6dee367b19c84aa))
- **install:** extract frontend dist to INSTALL_DIR root ([319ccbd](https://github.com/stratif-io/stratif.io/commit/319ccbd41ae7875002bb7a5165155ccde6d83be6))
- **install:** generate connections.yaml and fix seeder invocation ([20e6f3e](https://github.com/stratif-io/stratif.io/commit/20e6f3ed38b6f1f4dab5ae4362f4a0881fe2c5f6))
- **install:** replace bash array GH_AUTH_ARGS with gh_curl helper ([1a0bcd0](https://github.com/stratif-io/stratif.io/commit/1a0bcd0d3c9f7187c47308cd5ec3989dc2dfaefa))
- **install:** rewrite as POSIX sh — works with both sh and bash ([ab1669f](https://github.com/stratif-io/stratif.io/commit/ab1669fe40f86482183d44736d113b6b658364d8))
- **install:** use GitHub API to fetch release asset, support private repo with GITHUB_TOKEN ([434d156](https://github.com/stratif-io/stratif.io/commit/434d15663c403572f530e7483d70d2d5be2cbb70))
- less deps ([3dcedd8](https://github.com/stratif-io/stratif.io/commit/3dcedd864b480d8c09b2b3a8c88074c77f22e095))
- log on exceptions in AccessLogMiddleware and fix middleware order for 429 logging ([9c584be](https://github.com/stratif-io/stratif.io/commit/9c584beefa4943c7d66a3cc9c8ca41e6145a34c2))
- migrate SeedConfig to pydantic-settings v2 SettingsConfigDict ([4cd44d7](https://github.com/stratif-io/stratif.io/commit/4cd44d7fa5da10dc0c12553836458a656b0a2b49))
- migrate SeedConfig to pydantic-settings v2 SettingsConfigDict ([4e49e69](https://github.com/stratif-io/stratif.io/commit/4e49e693c5108eb6eb9482c173cbc6d1023df71d))
- **mobile:** guard global hover transitions with hover:hover media query ([82771a6](https://github.com/stratif-io/stratif.io/commit/82771a69536054cde97626a5fe66544e3451b0fb))
- **mobile:** keep filter bar horizontal on all screens — scroll instead of stack ([ea13e30](https://github.com/stratif-io/stratif.io/commit/ea13e303feedda3f640d97fd1af261215e302a2e))
- mock useSearchParams in FunnelDetailPage test to prevent infinite re-render loop ([bdec652](https://github.com/stratif-io/stratif.io/commit/bdec6527c0c624ff68dd82e36fc4f19cc6110e1d))
- move sys import to top level in test_logging ([2def16d](https://github.com/stratif-io/stratif.io/commit/2def16d744c89dc704dd0b8d10573c9a35a8502b))
- null engine globals before dispose() to handle shutdown errors ([3ef70f7](https://github.com/stratif-io/stratif.io/commit/3ef70f79ef55a31962dd850a52372062b05db72e))
- **pages:** add PageHeader to pages missing a heading ([3c8a4fe](https://github.com/stratif-io/stratif.io/commit/3c8a4fe6e3b554ff345bfcfd3c13744c4a7c0046))
- pass connection_id to path-funnel query in PathFunnelDialog ([f7c8545](https://github.com/stratif-io/stratif.io/commit/f7c8545be3171045899d5836d56fe6d23515865a))
- **people:** use PageHeader and TYPOGRAPHY constants in PeoplePage ([ecb68a5](https://github.com/stratif-io/stratif.io/commit/ecb68a57f8eb858b330b26c103bd3023d3779428))
- plain column filter fields work without identity field mapping ([17bf6fc](https://github.com/stratif-io/stratif.io/commit/17bf6fccc7f9cd3e93fd909912f8f984fc821e3e))
- **polish:** align MetricCardSkeleton radius with actual cards (rounded-xl) ([42a0689](https://github.com/stratif-io/stratif.io/commit/42a068938da08ea999b2926f8b8a3fa128850486))
- **polish:** normalize page title style across feature pages ([f5f02ba](https://github.com/stratif-io/stratif.io/commit/f5f02baad4b37779c7a4616d9a535b6516994816))
- prevent infinite loop when navigating away from funnel page ([710d24f](https://github.com/stratif-io/stratif.io/commit/710d24fa995bae677d9cef164c99eab0ad63e48b))
- prevent infinite loop when navigating away from funnel page ([d043d84](https://github.com/stratif-io/stratif.io/commit/d043d84263a897d1ca892ceb3a2869ef14f6d25f))
- read counting mode from URL searchParams in usePathExplorer (not from props) ([60b2d63](https://github.com/stratif-io/stratif.io/commit/60b2d636a6d84817baaf3e2b0d57b76725bee81f))
- remove .tar.gz suffix from mktemp template (breaks on macOS) ([b09fc13](https://github.com/stratif-io/stratif.io/commit/b09fc1343d4b5b788eb525bbbfd225ed3f07438d))
- remove off-by-one in subsequence LATERAL range that caused duplicate paths ([0e3f48f](https://github.com/stratif-io/stratif.io/commit/0e3f48f0e9d94075cd25d5514658eaad30ed155b))
- remove redundant date sync effects from FunnelDetailPage — useUrlSync handles this ([1693428](https://github.com/stratif-io/stratif.io/commit/1693428226b28e2772aff4d99d3922636858ea8f))
- remove unused imports and fix docstring in test_access_log ([71b6919](https://github.com/stratif-io/stratif.io/commit/71b6919ea2ee276702ddbc7f0e044fcfd2f53d69))
- render funnel dialog tooltips below buttons ([93a356a](https://github.com/stratif-io/stratif.io/commit/93a356a52cc40c85afd95dc7a67410f6fd513121))
- render funnel dialog tooltips below buttons ([d710e43](https://github.com/stratif-io/stratif.io/commit/d710e43612370f1f2c764581110d134fa0108c1c))
- resolve merge conflicts between develop and main ([00ce077](https://github.com/stratif-io/stratif.io/commit/00ce0779554481ad044b49d7116e3107e613fe87))
- resolve ruff linting errors ([aa7e841](https://github.com/stratif-io/stratif.io/commit/aa7e841552a3862e94a5be7ebe78fbc23240c185))
- restore DevCard component and re-add to all call sites ([2dc74a9](https://github.com/stratif-io/stratif.io/commit/2dc74a95b6c3cd86c8e0294ae2facff401f9a966))
- restore Open full page button in funnel dialog ([58f6631](https://github.com/stratif-io/stratif.io/commit/58f6631cad2c1ac107c3603e4afc8c64cf78bfff))
- restore package name to @stratif-io/web ([e50fe95](https://github.com/stratif-io/stratif.io/commit/e50fe95942a50f2d4aa8f6b1c6021640ba66fc7b))
- restore package name to @stratif-io/web and use setup-node for publish ([6b11658](https://github.com/stratif-io/stratif.io/commit/6b11658885d8bba12445b3fe4c8a248cd81f7501))
- restore package name to @stratif-io/web and use setup-node for publish ([20c5de8](https://github.com/stratif-io/stratif.io/commit/20c5de86de4be94b80b5effbc4b703484ecf3a5f))
- restore package name to @stratif-io/web and use setup-node for publish ([f78998b](https://github.com/stratif-io/stratif.io/commit/f78998b478a86170e3859148ac6baa55c3a8e15b))
- retention cohorts only include truly new users ([ae48428](https://github.com/stratif-io/stratif.io/commit/ae484289a5434a196e88be4486e2ce51c3392ac6))
- rewrite bootstrap_connection seeder and tests for async ORM ([cbd936a](https://github.com/stratif-io/stratif.io/commit/cbd936a7802468f21f8caef2372de51672e03184))
- right-align counting mode toggle with flex-1 spacer ([5aec0a4](https://github.com/stratif-io/stratif.io/commit/5aec0a427b15a7c806d9b53c01277b1148c3e03f))
- run pre-commit from Husky and resolve all ty type errors ([ff7594c](https://github.com/stratif-io/stratif.io/commit/ff7594c5c83a0d71114bc758e38f0a4fb04afbc0))
- run pre-commit from Husky and resolve all ty type errors ([758b144](https://github.com/stratif-io/stratif.io/commit/758b14429a1b70c9c9e498ca1327a0b19ffe71ca))
- seed time dimension into rows even when initialValueCols is provided ([19a218a](https://github.com/stratif-io/stratif.io/commit/19a218a2b304ec987573cf33edf93cbf48b6e96b))
- set log level to error in install.sh server invocations ([5dd82ba](https://github.com/stratif-io/stratif.io/commit/5dd82ba918eb43127a7ab2f3eb8124b7aca08895))
- sort imports in test file (ruff I001) ([ec1ba07](https://github.com/stratif-io/stratif.io/commit/ec1ba07cbefae08566415d63432f1b412f9b4a53))
- suppress uvicorn INFO logs in install.sh ([648018a](https://github.com/stratif-io/stratif.io/commit/648018a628270aa46ee02ef0feeb25c0aa9db6b5))
- suppress uvicorn INFO logs in install.sh ([316b79d](https://github.com/stratif-io/stratif.io/commit/316b79d2bf460c2635e5d9da34fe9b816e39dec1))
- test STRATIFIO_OSS_TOKEN secret ([d14eeed](https://github.com/stratif-io/stratif.io/commit/d14eeedfd793cc7876e05427197bf399fef65f7f))
- test STRATIFIO_OSS_TOKEN secret ([ac836c2](https://github.com/stratif-io/stratif.io/commit/ac836c26f3486e9498ebe1b5386be72745a633cb))
- **theme:** differentiate card surface from page background in dark mode ([abca4d3](https://github.com/stratif-io/stratif.io/commit/abca4d3cd6d46bcc9f3322571752862278f9ae80))
- **theme:** use CSS variable-based heatmap colors that work in dark mode ([5addf5e](https://github.com/stratif-io/stratif.io/commit/5addf5ed864891e6ce6074fe4dace559ac0f6e88))
- trigger npm publish after STRATIFIO_OSS_TOKEN was set ([52bbb57](https://github.com/stratif-io/stratif.io/commit/52bbb57eb530f9b3bcaa9118fd2a1cd21693783c))
- trigger npm publish with correct STRATIFIO_OSS_TOKEN ([b3b683e](https://github.com/stratif-io/stratif.io/commit/b3b683e06e1ab8a9ad304c561ae3486dcf1d7dc7))
- trigger publish with STRATIFIO_OSS_TOKEN now set ([14b0216](https://github.com/stratif-io/stratif.io/commit/14b0216dfab5deae44b2511b7998ae76a869a17c))
- trigger publish with STRATIFIO_OSS_TOKEN now set ([a992ce9](https://github.com/stratif-io/stratif.io/commit/a992ce95f4cee8f7f7e111d89d463261c5c1d887))
- trigger release-please ([fb9d6ab](https://github.com/stratif-io/stratif.io/commit/fb9d6ab77bf8572d8bca1ab76c986a544d88ce46))
- ui audit — a11y, theming, responsiveness, and polish ([d5b4a9f](https://github.com/stratif-io/stratif.io/commit/d5b4a9f67a7563e4b16bcb5d4ef8c0664b01fd3b))
- **ui:** move page-header test to **tests** dir ([088c5ab](https://github.com/stratif-io/stratif.io/commit/088c5ab4fc39bffe74ea735b21052046b17806d7))
- **ui:** replace hardcoded colors with theme tokens in NotFoundPage ([23c44ce](https://github.com/stratif-io/stratif.io/commit/23c44ceb8ff128c639c1d025a7e7b25b8e7f4a67))
- **ui:** use TYPOGRAPHY.cardTitle in EmptyState ([305dcb4](https://github.com/stratif-io/stratif.io/commit/305dcb4c6ab62711d025c810744094b9aa15f4be))
- use &gt;= for funnel timestamp comparison to handle same-timestamp events ([5393c16](https://github.com/stratif-io/stratif.io/commit/5393c16077e9bac37b88b218fe76d6ce56f2d94d))
- use COUNT(DISTINCT user_id) for unique_sessions in contains mode; add structural tests ([ad8b542](https://github.com/stratif-io/stratif.io/commit/ad8b5427aa81b5b56037079ae74b051c625ee999))
- use npm publish instead of bun publish for GitHub Packages auth ([4432d4b](https://github.com/stratif-io/stratif.io/commit/4432d4b4d3be0a9712fb61308808b4837f82ebfd))
- use npm publish instead of bun publish for GitHub Packages auth ([a2e9d59](https://github.com/stratif-io/stratif.io/commit/a2e9d59762ed0e57b9e3cfa9b62eeebe3a00a660))
- use PrintLoggerFactory to prevent InterceptHandler recursion ([0ec462c](https://github.com/stratif-io/stratif.io/commit/0ec462c6881cb35743f53509d0b5880b69053538))
- use regex URL match in e2e test to allow query params ([5ced3c2](https://github.com/stratif-io/stratif.io/commit/5ced3c2a065e52ecac44a1207dc1df1f37251bf9))
- use setup-node + npm publish for GitHub Packages ([cd159f5](https://github.com/stratif-io/stratif.io/commit/cd159f5ece0f0cdfcab418c126a376538c5da40b))
- use setup-node + npm publish for GitHub Packages auth ([d50772f](https://github.com/stratif-io/stratif.io/commit/d50772f0fe10285bc5d852c099b58fcad58b68bd))
- use STRATIFIO_OSS_TOKEN for npm publish auth ([06a879d](https://github.com/stratif-io/stratif.io/commit/06a879d5702069b9418ab33f8490dc345ea429b4))
- use STRATIFIO_OSS_TOKEN for npm publish auth ([173a020](https://github.com/stratif-io/stratif.io/commit/173a0204b1226a0d84accdad6a82d6edc78645f9))
- use subquery+WHERE instead of QUALIFY for match_count filter ([0436aea](https://github.com/stratif-io/stratif.io/commit/0436aeaf5fcfa3ead9f160c4af448a41035265df))
- **ux:** make sparklines legible in mini cards — dedicated bottom strip with gradient fill ([01c584b](https://github.com/stratif-io/stratif.io/commit/01c584bf50894399d536941561646db11a58f13a))
- **ux:** show Monitor icon in theme toggle when system mode is active ([2d9126b](https://github.com/stratif-io/stratif.io/commit/2d9126b63eb610e536a1a165a2ecf931ca3d4be7))
- verify automated release loop end-to-end ([8fd785a](https://github.com/stratif-io/stratif.io/commit/8fd785acd535d81aae209acbd0c74655959fac14))
- verify automated release loop end-to-end ([7bae449](https://github.com/stratif-io/stratif.io/commit/7bae44912a0b1e43c6df9d8c27ad13a5b28e3d10))
- wire onAggChange in design system demo; test countDistinct badge passthrough ([105b607](https://github.com/stratif-io/stratif.io/commit/105b6072de5d1c12a38debc55bc7966f20063a9a))
- write .npmrc directly with STRATIFIO_OSS_TOKEN for npm publish ([ce8e029](https://github.com/stratif-io/stratif.io/commit/ce8e029adc98610743e2c82c34b54c2726d59a28))
- write .npmrc directly with STRATIFIO_OSS_TOKEN for npm publish ([69a4bf9](https://github.com/stratif-io/stratif.io/commit/69a4bf9c759739de3e36b45863645f68f2c9fee5))
- write auth to ~/.npmrc to avoid workspace config warning ([e3839e7](https://github.com/stratif-io/stratif.io/commit/e3839e7ffcef4315d4caf279ddf0c766baa5818b))
- write npm auth to ~/.npmrc to avoid workspace config warning ([b20b807](https://github.com/stratif-io/stratif.io/commit/b20b807130b9e30d10cd900d550b3ab0bc3abbd7))
- write npm auth to ~/.npmrc to bypass workspace .npmrc suppression ([62a09af](https://github.com/stratif-io/stratif.io/commit/62a09afb00b2133205d90800d2cc8f36fa82553f))
- write npm auth to ~/.npmrc to bypass workspace .npmrc suppression ([c2b96e7](https://github.com/stratif-io/stratif.io/commit/c2b96e7c685a511c8d4c963b047df617d5894c23))

### Reverts

- remove E2E job from CI (deferred) ([69b3ad6](https://github.com/stratif-io/stratif.io/commit/69b3ad6479278d5589966b6ce84239ec1b7fe30a))

## [0.24.1](https://github.com/stratif-io/stratif.io/compare/v0.24.0...v0.24.1) (2026-04-11)

### Bug Fixes

- verify automated release loop end-to-end ([8fd785a](https://github.com/stratif-io/stratif.io/commit/8fd785acd535d81aae209acbd0c74655959fac14))
- verify automated release loop end-to-end ([7bae449](https://github.com/stratif-io/stratif.io/commit/7bae44912a0b1e43c6df9d8c27ad13a5b28e3d10))

## [0.24.0](https://github.com/stratif-io/stratif.io/compare/v0.23.3...v0.24.0) (2026-04-11)

### Features

- **dashboard:** move Learn button to Mission Control page header ([f1d0152](https://github.com/stratif-io/stratif.io/commit/f1d0152f564e9037fe6bd1aa7d0d02c56f11d744))
- **dashboard:** move Learn button to Mission Control page header ([42f9362](https://github.com/stratif-io/stratif.io/commit/42f936241cb8d97c8fa16eaca8958945d0d07f3e))

## [0.23.3](https://github.com/stratif-io/stratif.io/compare/v0.23.2...v0.23.3) (2026-04-11)

### Bug Fixes

- retention cohorts only include truly new users ([ae48428](https://github.com/stratif-io/stratif.io/commit/ae484289a5434a196e88be4486e2ce51c3392ac6))
- suppress uvicorn INFO logs in install.sh ([648018a](https://github.com/stratif-io/stratif.io/commit/648018a628270aa46ee02ef0feeb25c0aa9db6b5))
- suppress uvicorn INFO logs in install.sh ([316b79d](https://github.com/stratif-io/stratif.io/commit/316b79d2bf460c2635e5d9da34fe9b816e39dec1))

## [0.23.2](https://github.com/stratif-io/stratif.io/compare/v0.23.1...v0.23.2) (2026-04-11)

### Bug Fixes

- write npm auth to ~/.npmrc to bypass workspace .npmrc suppression ([62a09af](https://github.com/stratif-io/stratif.io/commit/62a09afb00b2133205d90800d2cc8f36fa82553f))
- write npm auth to ~/.npmrc to bypass workspace .npmrc suppression ([c2b96e7](https://github.com/stratif-io/stratif.io/commit/c2b96e7c685a511c8d4c963b047df617d5894c23))

## [0.23.1](https://github.com/stratif-io/stratif.io/compare/v0.23.0...v0.23.1) (2026-04-11)

### Bug Fixes

- migrate SeedConfig to pydantic-settings v2 SettingsConfigDict ([4cd44d7](https://github.com/stratif-io/stratif.io/commit/4cd44d7fa5da10dc0c12553836458a656b0a2b49))
- migrate SeedConfig to pydantic-settings v2 SettingsConfigDict ([4e49e69](https://github.com/stratif-io/stratif.io/commit/4e49e693c5108eb6eb9482c173cbc6d1023df71d))

## [0.23.0](https://github.com/stratif-io/stratif.io/compare/v0.22.1...v0.23.0) (2026-04-11)

### Features

- add contains counting mode to PathAnalyzer (DuckDB) ([79d2380](https://github.com/stratif-io/stratif.io/commit/79d23808749e0b1f1188c2837970259a3a11c000))
- add counting_mode param to fetchPathAnalysis ([2c6af6e](https://github.com/stratif-io/stratif.io/commit/2c6af6e8b919bbcfe65df0deda3b8545c3258ffa))
- add Exact/Contains counting mode toggle to Paths Explorer toolbar ([a56fe49](https://github.com/stratif-io/stratif.io/commit/a56fe4906f3c1286068b81cabc6531119a6cb088))
- add InterceptHandler to route stdlib logs through structlog ([f23ecf6](https://github.com/stratif-io/stratif.io/commit/f23ecf6aafc65347aaa243bb13bdd19d5703f066))
- add Learn panel to Paths Explorer ([f930e10](https://github.com/stratif-io/stratif.io/commit/f930e10736403afc8994737fef421a1f127d425f))
- apply TYPOGRAPHY constants to EventsTable cell renderers ([dd3d368](https://github.com/stratif-io/stratif.io/commit/dd3d368c46135e9ccb89c0a2c34c58bead6e233d))
- apply TYPOGRAPHY constants to PivotTable th/td; update row height estimate to 44px ([932be6b](https://github.com/stratif-io/stratif.io/commit/932be6b8e3948b771ed859f2250fa432805a9d7d))
- **dashboard:** Learn panel — business metric explanations ([#294](https://github.com/stratif-io/stratif.io/issues/294)) ([829c909](https://github.com/stratif-io/stratif.io/commit/829c909ec7f9f0f27c17cee707ddf457833be038))
- **design-system:** export and register PageHeader + SectionHeader ([66a1389](https://github.com/stratif-io/stratif.io/commit/66a1389955b04e89401d39174d23fb944ba404e1))
- expose counting_mode param on /api/path-analysis endpoint ([42a7645](https://github.com/stratif-io/stratif.io/commit/42a7645ae16d515931d09ef04ed7c849744a8b61))
- read countingMode option in usePathExplorer, pass counting_mode to API ([63e8ca1](https://github.com/stratif-io/stratif.io/commit/63e8ca144522ac35d86df55a37568070c8e80873))
- register table TYPOGRAPHY constants in design system LayoutSection ([d76cba1](https://github.com/stratif-io/stratif.io/commit/d76cba138c913dbeb4c43892e830ce500a3c6b4a))
- remove permalink from funnel modal and page ([8a81bb8](https://github.com/stratif-io/stratif.io/commit/8a81bb802fa9d1402d3ef5dc09644fe79f562c06))
- remove unique paths badge from toolbar ([f834d07](https://github.com/stratif-io/stratif.io/commit/f834d07702a2e50d323afd4be23048cb6ffdcd63))
- **ui:** add PageHeader component ([c8d0b69](https://github.com/stratif-io/stratif.io/commit/c8d0b69ca8cf99a85eab2684bc079281a7845395))
- **ui:** add SectionHeader component ([601c8e7](https://github.com/stratif-io/stratif.io/commit/601c8e71a29cdd51e9cb79bb86b7986eb68a0314))

### Bug Fixes

- align Learn button style with Mission Control pill; add no-gap callout ([c0e88ab](https://github.com/stratif-io/stratif.io/commit/c0e88ab8219dcad2cbbf93fd62552a917cd71cbe))
- **analytics:** use TYPOGRAPHY.label for h4 in PathFunnelDialog ([dd3ce6d](https://github.com/stratif-io/stratif.io/commit/dd3ce6d0faf07e17f62a34ac21a35d758e39bf4e))
- center sidebar icons when collapsed by zeroing gap on hidden label ([7d95b4c](https://github.com/stratif-io/stratif.io/commit/7d95b4c3fa3a4ae6e775378ed5325c68da58cf4b))
- **connections:** replace h1 with SectionHeader in ConnectionList ([805c6dd](https://github.com/stratif-io/stratif.io/commit/805c6dd524c6b96bbda5d01acd188882b3328e6d))
- **connections:** use h1+pageLabel directly in ConnectionDetailPage, not PageHeader wrapper ([398bf4d](https://github.com/stratif-io/stratif.io/commit/398bf4d84078e5be67a9379abb7c5c15f9d762f7))
- **connections:** use PageHeader in ConnectionDetailPage ([0538617](https://github.com/stratif-io/stratif.io/commit/0538617d6eb32176571d82a3ce9094ddfef28980))
- **connections:** use TYPOGRAPHY.label for h3 headings in ConnectionConfigTab ([046b837](https://github.com/stratif-io/stratif.io/commit/046b8372749550b66777a20b63f4edb6c4585ecf))
- count total pattern occurrences in contains mode, not just distinct users ([dc45e0f](https://github.com/stratif-io/stratif.io/commit/dc45e0f71cbb6839bcd22925f6b5728e57d7d3db))
- forward exc_info through InterceptHandler ([e4a4d8d](https://github.com/stratif-io/stratif.io/commit/e4a4d8d427e3afe6c392daf1f1bf57d393e33d4c))
- move sys import to top level in test_logging ([2def16d](https://github.com/stratif-io/stratif.io/commit/2def16d744c89dc704dd0b8d10573c9a35a8502b))
- **pages:** add PageHeader to pages missing a heading ([3c8a4fe](https://github.com/stratif-io/stratif.io/commit/3c8a4fe6e3b554ff345bfcfd3c13744c4a7c0046))
- **people:** use PageHeader and TYPOGRAPHY constants in PeoplePage ([ecb68a5](https://github.com/stratif-io/stratif.io/commit/ecb68a57f8eb858b330b26c103bd3023d3779428))
- read counting mode from URL searchParams in usePathExplorer (not from props) ([60b2d63](https://github.com/stratif-io/stratif.io/commit/60b2d636a6d84817baaf3e2b0d57b76725bee81f))
- remove off-by-one in subsequence LATERAL range that caused duplicate paths ([0e3f48f](https://github.com/stratif-io/stratif.io/commit/0e3f48f0e9d94075cd25d5514658eaad30ed155b))
- restore Open full page button in funnel dialog ([58f6631](https://github.com/stratif-io/stratif.io/commit/58f6631cad2c1ac107c3603e4afc8c64cf78bfff))
- right-align counting mode toggle with flex-1 spacer ([5aec0a4](https://github.com/stratif-io/stratif.io/commit/5aec0a427b15a7c806d9b53c01277b1148c3e03f))
- **ui:** move page-header test to **tests** dir ([088c5ab](https://github.com/stratif-io/stratif.io/commit/088c5ab4fc39bffe74ea735b21052046b17806d7))
- **ui:** replace hardcoded colors with theme tokens in NotFoundPage ([23c44ce](https://github.com/stratif-io/stratif.io/commit/23c44ceb8ff128c639c1d025a7e7b25b8e7f4a67))
- **ui:** use TYPOGRAPHY.cardTitle in EmptyState ([305dcb4](https://github.com/stratif-io/stratif.io/commit/305dcb4c6ab62711d025c810744094b9aa15f4be))
- use &gt;= for funnel timestamp comparison to handle same-timestamp events ([5393c16](https://github.com/stratif-io/stratif.io/commit/5393c16077e9bac37b88b218fe76d6ce56f2d94d))
- use COUNT(DISTINCT user_id) for unique_sessions in contains mode; add structural tests ([ad8b542](https://github.com/stratif-io/stratif.io/commit/ad8b5427aa81b5b56037079ae74b051c625ee999))
- use PrintLoggerFactory to prevent InterceptHandler recursion ([0ec462c](https://github.com/stratif-io/stratif.io/commit/0ec462c6881cb35743f53509d0b5880b69053538))
- use subquery+WHERE instead of QUALIFY for match_count filter ([0436aea](https://github.com/stratif-io/stratif.io/commit/0436aeaf5fcfa3ead9f160c4af448a41035265df))

## [0.22.1](https://github.com/stratif-io/stratif.io/compare/v0.22.0...v0.22.1) (2026-04-10)

### Bug Fixes

- add .npmrc to wire STRATIFIO_OSS_TOKEN for GitHub Packages publish ([21a0609](https://github.com/stratif-io/stratif.io/commit/21a0609612c8438d7dced11d49b0517803a0563b))

## [0.22.0](https://github.com/stratif-io/stratif.io/compare/v0.21.14...v0.22.0) (2026-04-10)

### Features

- add NotFoundPage component to design system ([a23fdda](https://github.com/stratif-io/stratif.io/commit/a23fdda3eebfc3abc24038905e14fd2bd176a63a))
- add slowapi rate limiting (200 req/min per IP) and wire AccessLogMiddleware ([032a26c](https://github.com/stratif-io/stratif.io/commit/032a26ca5b96e6e4bdef05a71553893e843e5553))
- register NotFoundPage in design system FeedbackSection ([e8a6429](https://github.com/stratif-io/stratif.io/commit/e8a64292cb1376f342a65a78bc74166ea8e56d1b))
- wire NotFoundPage as catch-all route, replacing redirect to dashboard ([af99791](https://github.com/stratif-io/stratif.io/commit/af99791aa39aa2b73d6f49895b2c46cbee19bef6))

### Bug Fixes

- add type: ignore for slowapi and combine nested with in test ([0db671f](https://github.com/stratif-io/stratif.io/commit/0db671f1731045e6ede8e779bbcb0404abc88d98))
- assert rate-limit headers in test_rate_limit_headers_present ([312ee1d](https://github.com/stratif-io/stratif.io/commit/312ee1d61371323cb734eab2f5e9d42f1adc46e1))
- bootstrap_connection reads context._ not properties._ for custom props ([ddff4b3](https://github.com/stratif-io/stratif.io/commit/ddff4b35f2cfa7e2674e07385cc1a571f7c61623))
- log on exceptions in AccessLogMiddleware and fix middleware order for 429 logging ([9c584be](https://github.com/stratif-io/stratif.io/commit/9c584beefa4943c7d66a3cc9c8ca41e6145a34c2))
- pass connection_id to path-funnel query in PathFunnelDialog ([f7c8545](https://github.com/stratif-io/stratif.io/commit/f7c8545be3171045899d5836d56fe6d23515865a))
- set log level to error in install.sh server invocations ([5dd82ba](https://github.com/stratif-io/stratif.io/commit/5dd82ba918eb43127a7ab2f3eb8124b7aca08895))
- use regex URL match in e2e test to allow query params ([5ced3c2](https://github.com/stratif-io/stratif.io/commit/5ced3c2a065e52ecac44a1207dc1df1f37251bf9))

## [0.21.14](https://github.com/stratif-io/stratif.io/compare/v0.21.13...v0.21.14) (2026-04-10)

### Bug Fixes

- render funnel dialog tooltips below buttons ([d710e43](https://github.com/stratif-io/stratif.io/commit/d710e43612370f1f2c764581110d134fa0108c1c))

## [0.21.13](https://github.com/stratif-io/stratif.io/compare/v0.21.12...v0.21.13) (2026-04-10)

### Bug Fixes

- correct workspace filter from @stratifio/web to @stratif-io/web ([6740b18](https://github.com/stratif-io/stratif.io/commit/6740b182fef0f70eb90e3a195b651814c95868a8))

## [0.21.12](https://github.com/stratif-io/stratif.io/compare/v0.21.11...v0.21.12) (2026-04-09)

### Bug Fixes

- trigger publish with STRATIFIO_OSS_TOKEN now set ([a992ce9](https://github.com/stratif-io/stratif.io/commit/a992ce95f4cee8f7f7e111d89d463261c5c1d887))

## [0.21.11](https://github.com/stratif-io/stratif.io/compare/v0.21.10...v0.21.11) (2026-04-09)

### Bug Fixes

- debug STRATIFIO_OSS_TOKEN availability in publish-npm job ([a97822f](https://github.com/stratif-io/stratif.io/commit/a97822f424d26bedf47d1c4340de552954a068c6))

## [0.21.10](https://github.com/stratif-io/stratif.io/compare/v0.21.9...v0.21.10) (2026-04-09)

### Bug Fixes

- test STRATIFIO_OSS_TOKEN secret ([ac836c2](https://github.com/stratif-io/stratif.io/commit/ac836c26f3486e9498ebe1b5386be72745a633cb))

## [0.21.9](https://github.com/stratif-io/stratif.io/compare/v0.21.8...v0.21.9) (2026-04-09)

### Bug Fixes

- write auth to ~/.npmrc to avoid workspace config warning ([e3839e7](https://github.com/stratif-io/stratif.io/commit/e3839e7ffcef4315d4caf279ddf0c766baa5818b))

## [0.21.8](https://github.com/stratif-io/stratif.io/compare/v0.21.7...v0.21.8) (2026-04-09)

### Bug Fixes

- write .npmrc directly with STRATIFIO_OSS_TOKEN for npm publish ([69a4bf9](https://github.com/stratif-io/stratif.io/commit/69a4bf9c759739de3e36b45863645f68f2c9fee5))

## [0.21.7](https://github.com/stratif-io/stratif.io/compare/v0.21.6...v0.21.7) (2026-04-09)

### Bug Fixes

- trigger npm publish after STRATIFIO_OSS_TOKEN was set ([52bbb57](https://github.com/stratif-io/stratif.io/commit/52bbb57eb530f9b3bcaa9118fd2a1cd21693783c))

## [0.21.6](https://github.com/stratif-io/stratif.io/compare/v0.21.5...v0.21.6) (2026-04-09)

### Bug Fixes

- use STRATIFIO_OSS_TOKEN for npm publish auth ([173a020](https://github.com/stratif-io/stratif.io/commit/173a0204b1226a0d84accdad6a82d6edc78645f9))

## [0.21.5](https://github.com/stratif-io/stratif.io/compare/v0.21.4...v0.21.5) (2026-04-09)

### Bug Fixes

- restore package name to @stratif-io/web and use setup-node for publish ([6b11658](https://github.com/stratif-io/stratif.io/commit/6b11658885d8bba12445b3fe4c8a248cd81f7501))

## [0.21.4](https://github.com/stratif-io/stratif.io/compare/v0.21.3...v0.21.4) (2026-04-09)

### Bug Fixes

- use setup-node + npm publish for GitHub Packages ([cd159f5](https://github.com/stratif-io/stratif.io/commit/cd159f5ece0f0cdfcab418c126a376538c5da40b))

## [0.21.3](https://github.com/stratif-io/stratif.io/compare/v0.21.2...v0.21.3) (2026-04-09)

### Bug Fixes

- configure bun publish via .bunfig.toml [publish] section ([3e7156a](https://github.com/stratif-io/stratif.io/commit/3e7156afcd3d26800128b6f0e1bd28dc417e7590))

## [0.21.2](https://github.com/stratif-io/stratif.io/compare/v0.21.1...v0.21.2) (2026-04-09)

### Bug Fixes

- add BUN_AUTH_TOKEN for GitHub Packages auth in bun publish ([e86ea2e](https://github.com/stratif-io/stratif.io/commit/e86ea2ee09fb3b2cacb8b1ff550e6e060565876b))

## [0.21.1](https://github.com/stratif-io/stratif.io/compare/v0.21.0...v0.21.1) (2026-04-09)

### Bug Fixes

- use npm publish instead of bun publish for GitHub Packages auth ([a2e9d59](https://github.com/stratif-io/stratif.io/commit/a2e9d59762ed0e57b9e3cfa9b62eeebe3a00a660))

## [0.21.0](https://github.com/stratif-io/stratif.io/compare/v0.20.2...v0.21.0) (2026-04-09)

### Features

- add analytics abstraction layer (no-op context + hook) ([3fe1acd](https://github.com/stratif-io/stratif.io/commit/3fe1acdd8ed5aab7b709fe1e408589aef83222df))
- add logging adapter for local analytics debugging ([8e2297c](https://github.com/stratif-io/stratif.io/commit/8e2297c738e4549cb1cb5734bf04ec767e8ab556))
- add PageTracker to OSS app for route change analytics ([bb23e86](https://github.com/stratif-io/stratif.io/commit/bb23e86c570acf9da93ea3eb74226b1c6ab28de6))
- export AnalyticsProvider and useAnalytics from OSS package ([c3b9d16](https://github.com/stratif-io/stratif.io/commit/c3b9d16959dbfa5a7e382035c2695d732f8cb232))
- track chart_viewed on analytics page mount ([a82ac75](https://github.com/stratif-io/stratif.io/commit/a82ac750949ae45d05dee58e8b00ebd153940c5f))
- track connection_created with db_type ([ce5783b](https://github.com/stratif-io/stratif.io/commit/ce5783b27aa8d12e58dfffa847036466135bae6a))
- track date_range_changed and breakdown_applied ([8816fc0](https://github.com/stratif-io/stratif.io/commit/8816fc09228004631b7ee303585c239d7dc476da))
- track export_triggered on CSV download ([56d4b09](https://github.com/stratif-io/stratif.io/commit/56d4b09c4fec637bc0b7fa21fd55db7b5116b036))
- track funnel_step_selected on step event change ([dd75add](https://github.com/stratif-io/stratif.io/commit/dd75add11298cf391a359fa560df62834103da7c))
- track query_executed with duration in trend hook ([be2f434](https://github.com/stratif-io/stratif.io/commit/be2f434c078d4a5f58cedd40675a364cfcb960a5))
- track schema_tab_opened ([f1a4fdd](https://github.com/stratif-io/stratif.io/commit/f1a4fdd5926fb9eed6f6d01525ae74613d13f8ac))
- track sql_studio_opened ([c9e900d](https://github.com/stratif-io/stratif.io/commit/c9e900d41d7e34d0268459b2499f4516a3890cb2))
- wrap OSS app with AnalyticsProvider (no-op) ([cfe23f3](https://github.com/stratif-io/stratif.io/commit/cfe23f3909d55ebac4bb28bb1a0ceba6a2d89fe9))

### Bug Fixes

- consolidate AnalyticsProvider into context.tsx per spec ([93161ef](https://github.com/stratif-io/stratif.io/commit/93161efffacffdc688564afe335c6276ba77d7bb))

## [0.20.2](https://github.com/stratif-io/stratif.io/compare/v0.20.1...v0.20.2) (2026-04-07)

### Reverts

- remove E2E job from CI (deferred) ([69b3ad6](https://github.com/stratif-io/stratif.io/commit/69b3ad6479278d5589966b6ce84239ec1b7fe30a))

## [0.20.1](https://github.com/stratif-io/stratif.io/compare/v0.20.0...v0.20.1) (2026-04-07)

### Bug Fixes

- **ci:** write .npmrc auth token before bun publish ([8c38a8f](https://github.com/stratif-io/stratif.io/commit/8c38a8f85fea74f22e410082c2b5f59e2a40bfe1))

## [0.20.0](https://github.com/stratif-io/stratif.io/compare/v0.19.1...v0.20.0) (2026-04-07)

### Features

- publish @stratif-io/web to GitHub Packages on release ([05dbb2d](https://github.com/stratif-io/stratif.io/commit/05dbb2dce1fe2193a0e9ddcccc186dac0f7682ac))

## [0.19.1](https://github.com/stratif-io/stratif.io/compare/v0.19.0...v0.19.1) (2026-04-07)

### Bug Fixes

- prevent infinite loop when navigating away from funnel page ([d043d84](https://github.com/stratif-io/stratif.io/commit/d043d84263a897d1ca892ceb3a2869ef14f6d25f))

## [0.19.0](https://github.com/stratif-io/stratif.io/compare/v0.18.5...v0.19.0) (2026-04-04)

### Features

- add Funnel nav item to sidebar ([882b69c](https://github.com/stratif-io/stratif.io/commit/882b69c51293f48ca3a991eb23f6b68617917863))
- apply semantic color variety to FunnelDetailPage summary cards ([50bef55](https://github.com/stratif-io/stratif.io/commit/50bef55b32266722d56038a66641f72ee6b8c463))
- expand event color palette to 10 distinct colors (add chart-6..10) ([a8291df](https://github.com/stratif-io/stratif.io/commit/a8291df0790d4427f62cebc7b10162a05af6ab27))
- move trend controls to toolbar above card, add TrendFilters compact mode ([0f59d60](https://github.com/stratif-io/stratif.io/commit/0f59d6097e2aa182c691445e3f0a8aa5f1562382))
- redesign FunnelSteps — color-coded circles, rounded bars, new connectors ([a022174](https://github.com/stratif-io/stratif.io/commit/a022174091a09d934485390b735f036fc7835625))
- redesign PathFunnelDialog — remove device filter, path chips, colored cards ([6d899ce](https://github.com/stratif-io/stratif.io/commit/6d899ce93e871fa5dcd887c6ccd0261a135c8896))
- remove DevCard component and all usages ([c83fe34](https://github.com/stratif-io/stratif.io/commit/c83fe3472b8175b005125342f116555e8d313e63))
- remove devMode state from app-store ([984b4ef](https://github.com/stratif-io/stratif.io/commit/984b4efc2388a6f0e96852fb57c2a2138aab91f8))
- use per-event colors in PathFunnelDialog chips — matches path list color coding ([c8c2654](https://github.com/stratif-io/stratif.io/commit/c8c2654c0417fb04af9e04971b38fbd80db97834))

### Bug Fixes

- address code review feedback — dead alias, stale comment, positioning, type fix ([ad21d0c](https://github.com/stratif-io/stratif.io/commit/ad21d0c278ee3b7d81e69472142e96d740f68e5f))
- disable pointer events on DevCard back face when not flipped ([bedde3a](https://github.com/stratif-io/stratif.io/commit/bedde3a591e440eff32b9b410bcb35ee2778008a))
- mock useSearchParams in FunnelDetailPage test to prevent infinite re-render loop ([bdec652](https://github.com/stratif-io/stratif.io/commit/bdec6527c0c624ff68dd82e36fc4f19cc6110e1d))
- remove redundant date sync effects from FunnelDetailPage — useUrlSync handles this ([1693428](https://github.com/stratif-io/stratif.io/commit/1693428226b28e2772aff4d99d3922636858ea8f))
- restore DevCard component and re-add to all call sites ([2dc74a9](https://github.com/stratif-io/stratif.io/commit/2dc74a95b6c3cd86c8e0294ae2facff401f9a966))

## [0.18.5](https://github.com/stratif-io/stratif.io/compare/v0.18.4...v0.18.5) (2026-04-03)

### Bug Fixes

- **install:** detect sh and print clear error directing user to use bash ([78d68bf](https://github.com/stratif-io/stratif.io/commit/78d68bfc5dc45f4bc3ca2b97f6dee367b19c84aa))
- **install:** rewrite as POSIX sh — works with both sh and bash ([ab1669f](https://github.com/stratif-io/stratif.io/commit/ab1669fe40f86482183d44736d113b6b658364d8))

## [0.18.4](https://github.com/stratif-io/stratif.io/compare/v0.18.3...v0.18.4) (2026-04-03)

### Bug Fixes

- **ci:** auto-regenerate uv.lock at pre-commit time instead of just checking ([e3ff024](https://github.com/stratif-io/stratif.io/commit/e3ff024cadd54d69b526f81178bafa2d009ddf4f))
- **ci:** push Docker image to ghcr.io/stratif-io instead of cabichahine ([fa4265e](https://github.com/stratif-io/stratif.io/commit/fa4265e23e3582a9fec2a7557a8ffeba4b9b7114))
- **install:** replace bash array GH_AUTH_ARGS with gh_curl helper ([1a0bcd0](https://github.com/stratif-io/stratif.io/commit/1a0bcd0d3c9f7187c47308cd5ec3989dc2dfaefa))

## [0.18.3](https://github.com/stratif-io/stratif.io/compare/v0.18.2...v0.18.3) (2026-04-03)

### Bug Fixes

- exclude .venv from copy, use GITHUB_TOKEN for private repo testing ([2fae36c](https://github.com/stratif-io/stratif.io/commit/2fae36c4dac1d50077c51c37a2155d69aa30a257))
- **install:** use GitHub API to fetch release asset, support private repo with GITHUB_TOKEN ([434d156](https://github.com/stratif-io/stratif.io/commit/434d15663c403572f530e7483d70d2d5be2cbb70))

## [0.18.2](https://github.com/stratif-io/stratif.io/compare/v0.18.1...v0.18.2) (2026-04-03)

### Bug Fixes

- exclude .venv from copy, use venv binaries directly, fix mktemp suffix ([e7302e4](https://github.com/stratif-io/stratif.io/commit/e7302e4dfdeb6d5870f0545969fc278b730eb8c4))
- remove .tar.gz suffix from mktemp template (breaks on macOS) ([b09fc13](https://github.com/stratif-io/stratif.io/commit/b09fc1343d4b5b788eb525bbbfd225ed3f07438d))

## [0.18.1](https://github.com/stratif-io/stratif.io/compare/v0.18.0...v0.18.1) (2026-04-03)

### Bug Fixes

- correct REPO to stratif-io/stratif.io in install.sh ([b473aa2](https://github.com/stratif-io/stratif.io/commit/b473aa2844a0cc2a96ecabcfa22731d1b063bc2d))
- improve install.sh UX — step labels, spinner, fix cp excluding .git ([26852a3](https://github.com/stratif-io/stratif.io/commit/26852a3efc1370c62a4ba721ff88a25cbae7619d))

## [0.18.0](https://github.com/cabichahine/stratif.io/compare/v0.17.1...v0.18.0) (2026-04-02)

### Features

- add SQLAlchemy ORM models for product DB ([6b764fb](https://github.com/cabichahine/stratif.io/commit/6b764fbafe22c8b519472239e3798f3fe6634354))
- add sqlalchemy[asyncio], aiosqlite, asyncpg, pytest-asyncio deps ([0b248d6](https://github.com/cabichahine/stratif.io/commit/0b248d606c35ab169e9d00e548bdf86250d77881))
- async get_db() dependency + create_all schema init ([8f49447](https://github.com/cabichahine/stratif.io/commit/8f49447a6fb62f770b6f89c23bb6e73fdddce498))
- async SQLAlchemy engine + updated product_db_url default ([c43601b](https://github.com/cabichahine/stratif.io/commit/c43601bea5206dbb2a0a85c04d43fccc9e1249b6))
- complete SQLAlchemy async ORM migration — all tests passing ([5cea98f](https://github.com/cabichahine/stratif.io/commit/5cea98fb7403cbb15f6fb1679b25ffa5e87d29b1))
- make open_analytics_db async, use AsyncSession ([6d3a514](https://github.com/cabichahine/stratif.io/commit/6d3a514e1302815f9771cc27df49699e8e3293bb))
- rewrite connections crud.py with SQLAlchemy async ORM ([3f14e87](https://github.com/cabichahine/stratif.io/commit/3f14e87b327e961d6a147d748cbe6f63978c7745))
- update browse, schema_detect, auth to use DBSession ([df55056](https://github.com/cabichahine/stratif.io/commit/df550560f6610fd8ac96e96e99ef856c640535c7))
- update e2e conftest to use async SQLAlchemy product DB setup ([b1176df](https://github.com/cabichahine/stratif.io/commit/b1176df55af8ac3e84b5dab0e69efe4016bc3a51))

### Bug Fixes

- resolve ruff linting errors ([aa7e841](https://github.com/cabichahine/stratif.io/commit/aa7e841552a3862e94a5be7ebe78fbc23240c185))
- rewrite bootstrap_connection seeder and tests for async ORM ([cbd936a](https://github.com/cabichahine/stratif.io/commit/cbd936a7802468f21f8caef2372de51672e03184))

## [0.17.1](https://github.com/cabichahine/stratif.io/compare/v0.17.0...v0.17.1) (2026-04-02)

### Bug Fixes

- trigger release-please ([fb9d6ab](https://github.com/cabichahine/stratif.io/commit/fb9d6ab77bf8572d8bca1ab76c986a544d88ce46))

## [0.17.0](https://github.com/cabichahine/stratif.io/compare/v0.16.0...v0.17.0) (2026-04-01)

### Features

- replace Docker installer with curl | sh using uv + GitHub release assets ([6ffa8a2](https://github.com/cabichahine/stratif.io/commit/6ffa8a25a8528f985d43ff69a6031db2900521d1))

### Bug Fixes

- **a11y:** hide decorative icon container from screen reader tree in EmptyState ([81ef1f5](https://github.com/cabichahine/stratif.io/commit/81ef1f56e4ece41252815ba68fe50cd86593f244))
- **a11y:** increase DateRangePicker inline trigger to 44px touch target ([3c59f79](https://github.com/cabichahine/stratif.io/commit/3c59f794307564c1c7302a1874209a6443fc9b0d))
- **a11y:** increase touch targets to minimum 44px in filters and sidebar nav ([93162c5](https://github.com/cabichahine/stratif.io/commit/93162c5b453522fe4d6d4d45427ffe0caff86aef))
- **a11y:** make sidebar mobile overlay discoverable to screen readers ([2684bba](https://github.com/cabichahine/stratif.io/commit/2684bba68f293ea645670d4f0819ecbb177d0f5d))
- **a11y:** move clear button outside PopoverTrigger — nested buttons invalid HTML ([efa8bd3](https://github.com/cabichahine/stratif.io/commit/efa8bd326d930fc5c58bd227a9455e05e21b7c1c))
- **ci:** skip git clone in test — use checked-out repo via STRATIFIO_REPO_DIR ([f0b6885](https://github.com/cabichahine/stratif.io/commit/f0b6885b65d347644fd7343f8b927b3cd61e49d7))
- **css:** remove hover-scale — creates stacking context that clips popovers ([4fb645d](https://github.com/cabichahine/stratif.io/commit/4fb645d1413c2ce42d95aef2383be70a287a16fc))
- disable git credential prompt when running via curl | bash ([62afa86](https://github.com/cabichahine/stratif.io/commit/62afa86744e1bfe6e0488cd915707523767ebc3e))
- **install:** extract frontend dist to INSTALL_DIR root ([319ccbd](https://github.com/cabichahine/stratif.io/commit/319ccbd41ae7875002bb7a5165155ccde6d83be6))
- **install:** generate connections.yaml and fix seeder invocation ([20e6f3e](https://github.com/cabichahine/stratif.io/commit/20e6f3ed38b6f1f4dab5ae4362f4a0881fe2c5f6))
- **mobile:** guard global hover transitions with hover:hover media query ([82771a6](https://github.com/cabichahine/stratif.io/commit/82771a69536054cde97626a5fe66544e3451b0fb))
- **mobile:** keep filter bar horizontal on all screens — scroll instead of stack ([ea13e30](https://github.com/cabichahine/stratif.io/commit/ea13e303feedda3f640d97fd1af261215e302a2e))
- **polish:** align MetricCardSkeleton radius with actual cards (rounded-xl) ([42a0689](https://github.com/cabichahine/stratif.io/commit/42a068938da08ea999b2926f8b8a3fa128850486))
- **polish:** normalize page title style across feature pages ([f5f02ba](https://github.com/cabichahine/stratif.io/commit/f5f02baad4b37779c7a4616d9a535b6516994816))
- **theme:** differentiate card surface from page background in dark mode ([abca4d3](https://github.com/cabichahine/stratif.io/commit/abca4d3cd6d46bcc9f3322571752862278f9ae80))
- **theme:** use CSS variable-based heatmap colors that work in dark mode ([5addf5e](https://github.com/cabichahine/stratif.io/commit/5addf5ed864891e6ce6074fe4dace559ac0f6e88))
- **ux:** make sparklines legible in mini cards — dedicated bottom strip with gradient fill ([01c584b](https://github.com/cabichahine/stratif.io/commit/01c584bf50894399d536941561646db11a58f13a))
- **ux:** show Monitor icon in theme toggle when system mode is active ([2d9126b](https://github.com/cabichahine/stratif.io/commit/2d9126b63eb610e536a1a165a2ecf931ca3d4be7))

## [0.16.0](https://github.com/cabichahine/stratif.io/compare/v0.15.0...v0.16.0) (2026-04-01)

### Features

- breakdown goes to pivot columns, date stays as row group ([01b2ff4](https://github.com/cabichahine/stratif.io/commit/01b2ff42c1af39c0143e8ef9dea60e768f46553d))

### Bug Fixes

- add ([5bddeea](https://github.com/cabichahine/stratif.io/commit/5bddeea1be9324f53ca86bf592cd6cf6eedaeff3))
- run pre-commit from Husky and resolve all ty type errors ([758b144](https://github.com/cabichahine/stratif.io/commit/758b14429a1b70c9c9e498ca1327a0b19ffe71ca))
- seed time dimension into rows even when initialValueCols is provided ([19a218a](https://github.com/cabichahine/stratif.io/commit/19a218a2b304ec987573cf33edf93cbf48b6e96b))

## [0.15.0](https://github.com/cabichahine/stratif.io/compare/v0.14.0...v0.15.0) (2026-04-01)

### Features

- **dev:** add run button to DevCard back face ([#168](https://github.com/cabichahine/stratif.io/issues/168)) ([24506fa](https://github.com/cabichahine/stratif.io/commit/24506fa94365a4a30bd5b487ab55d0981b86ec2c))

## [0.14.0](https://github.com/cabichahine/stratif.io/compare/v0.13.0...v0.14.0) (2026-04-01)

### Features

- add Metrics category to dimension-categories config ([889e2aa](https://github.com/cabichahine/stratif.io/commit/889e2aa46cebaf537f77e8b82f16e48c7bbe9402))
- add shared AggBadge component with popover agg picker ([434eba2](https://github.com/cabichahine/stratif.io/commit/434eba22c0d9804e704fe0bb23c3be6f5bc92eb9))
- extend LeafMeta and ValuePickerPopover with trigger, fixedAgg, category ([99816b6](https://github.com/cabichahine/stratif.io/commit/99816b6c6485f8caa69b134a8704a2c9f36d85ec))
- move ValuePickerPopover to shared components; add all dimensions to Trends picker ([2de5e73](https://github.com/cabichahine/stratif.io/commit/2de5e73280d3904ee49ed741fa52795d02678171))
- replace cycle button with AggBadge in pivot ValueChip ([c0e9ca3](https://github.com/cabichahine/stratif.io/commit/c0e9ca3817ab3d5002d0239150238beee121ad81))
- rewrite TrendMetricPicker as thin adapter over ValuePickerPopover ([bfc60cd](https://github.com/cabichahine/stratif.io/commit/bfc60cd3152d1e9d78515023f011088a87a17cad))
- **trends:** integrate AggBadge into TrendMetricPicker chip ([758fa25](https://github.com/cabichahine/stratif.io/commit/758fa25e5cb7b09ebac8a75bddcc40a8136d8dcb))
- unify trends toolbar controls to h-7 chip/inner-pill style ([f38afef](https://github.com/cabichahine/stratif.io/commit/f38afef8a12269a9fa2799454f94c38d74d9b7e0))

### Bug Fixes

- allow count/count_distinct on standard dimensions (user_id, country, etc.) ([5c0c56f](https://github.com/cabichahine/stratif.io/commit/5c0c56fdb688921027daf2d226dfed5316652157))
- build_filter_clauses must check filter_exprs not only custom_prop_exprs ([09fbaf1](https://github.com/cabichahine/stratif.io/commit/09fbaf1787a49fa178cc06210ae7ace2283f5ff5))
- dotted path filter fields resolve to JSON extraction not quoted identifier ([8f8bcc5](https://github.com/cabichahine/stratif.io/commit/8f8bcc5e9d58729424d1808f0e1e5587d60ca354))
- identity field expressions use \_resolve_path_to_sql to support dotted paths ([a084e46](https://github.com/cabichahine/stratif.io/commit/a084e4675f7bb65a9a70855be0d0355202c8021f))
- include identity fields in filter_exprs so global filters work ([88b795b](https://github.com/cabichahine/stratif.io/commit/88b795b721de803cfd6e508dba074dc38a1e23d2))
- plain column filter fields work without identity field mapping ([17bf6fc](https://github.com/cabichahine/stratif.io/commit/17bf6fccc7f9cd3e93fd909912f8f984fc821e3e))
- remove special Metrics category from TrendMetricPicker — use natural categories like Pivot ([14e0407](https://github.com/cabichahine/stratif.io/commit/14e0407d90329fab1f141a81ab6f55a8ce13a184))
- resolve all ruff violations (B904, B905, E702, F401, C408, SIM108, SIM117, E402, B008, F811, B017) ([01bd536](https://github.com/cabichahine/stratif.io/commit/01bd536bb908ffe27ab22117725d52b38098c2bf))
- run ruff format + add pull-requests:write for pr-title job ([066a4fd](https://github.com/cabichahine/stratif.io/commit/066a4fdea62ebdf8c37b1616971e10aa3649dda8))
- sort imports in test file (ruff I001) ([ec1ba07](https://github.com/cabichahine/stratif.io/commit/ec1ba07cbefae08566415d63432f1b412f9b4a53))
- update uv.lock (stratifio-core 0.12.0 → 0.13.0) ([#158](https://github.com/cabichahine/stratif.io/issues/158)) ([ed7ae4f](https://github.com/cabichahine/stratif.io/commit/ed7ae4f4ed691d6f61683c11bcef25fe843482c3))
- wire onAggChange in design system demo; test countDistinct badge passthrough ([105b607](https://github.com/cabichahine/stratif.io/commit/105b6072de5d1c12a38debc55bc7966f20063a9a))

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
