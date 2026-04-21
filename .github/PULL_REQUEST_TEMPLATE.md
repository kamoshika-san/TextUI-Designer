## Package / contributes (optional)

- For **manifest / contributes** changes, review **`package-contributes/*.json`** diffs first (`npm run diff:contributes:fragments`). Treat `package.json` updates from `npm run sync:package-contributes` as **generated** unless you intentionally edited `package.json` for non-contributes reasons.
- See `docs/current/operations/package-contributes-pr-review.md` (Japanese).

## 讎りｦ・

<!-- 1縲・陦後〒縲御ｽ輔ｒ繝ｻ縺ｪ縺懊阪ｒ譖ｸ縺・※縺上□縺輔＞ -->

萓・ `schema-manager` 縺ｮ繧ｭ繝｣繝・す繝･雋ｬ蜍吶ｒ蛻･繝｢繧ｸ繝･繝ｼ繝ｫ縺ｫ蛻・ｊ蜃ｺ縺励∝､画峩譎ゅ・蠖ｱ髻ｿ遽・峇繧貞ｱ謇蛹悶☆繧九・

---

## 螟画峩縺ｮ遞ｮ鬘橸ｼ郁ｩｲ蠖薙☆繧九ｂ縺ｮ縺ｫ繝√ぉ繝・け・・

- [ ] 繝舌げ菫ｮ豁｣
- [ ] 讖溯・霑ｽ蜉
- [ ] 繝ｪ繝輔ぃ繧ｯ繧ｿ・域嫌蜍穂ｸ榊､会ｼ・
- [ ] 繝峨く繝･繝｡繝ｳ繝医・縺ｿ
- [ ] CI / 繝薙Ν繝峨・縺ｿ
- [ ] 縺昴・莉・

---

## 蠖ｱ髻ｿ遽・峇・亥ｿ・茨ｼ・

<!-- 荳ｻ縺ｫ隗ｦ繧後◆繝ｬ繧､繝､繧貞・謖吶りｩｲ蠖薙↑縺励・縲後↑縺励阪→譏手ｨ・-->

萓・

- `extension`・・S Code 諡｡蠑ｵ譛ｬ菴難ｼ・
- `CLI`・・out/cli` / `npm run cli`・・
- `MCP`・・src/mcp/*`・・
- `WebView` / `media`
- `schema`・亥ｮ夂ｾｩ繝ｻ逕滓・繝ｻ讀懆ｨｼ・・
- `exporter`・・TML/React/Pug 遲会ｼ・
- `CI`・・.github/workflows`・・

螳滄圀縺ｮ險伜・:

-

---

## 繝・せ繝亥・鬘槭ち繧ｰ・亥ｿ・茨ｼ・

<!-- 螟ｱ謨玲凾縺ｮ荳谺｡蛻・ｊ蛻・￠逕ｨ縲りｩｲ蠖薙☆繧九ｂ縺ｮ縺ｫ繝√ぉ繝・け縲り､・焚蜿ｯ -->

- [ ] `schema`
- [ ] `exporter`
- [ ] `preview`・・ebView / 繝励Ξ繝薙Η繝ｼ髢｢騾｣・・
- [ ] `mcp`
- [ ] `ssot`・・domain/dsl-types` 縺ｨ `renderer/types` 蠅・阜縺ｫ蠖ｱ髻ｿ縺ゅｊ・・
- [ ] 隧ｲ蠖薙↑縺暦ｼ医ラ繧ｭ繝･繝｡繝ｳ繝医・縺ｿ繝ｻCI繝｡繧ｿ縺ｮ縺ｿ遲会ｼ俄・逅・罰繧・陦後〒:

### SSoT 蠖ｱ髻ｿ繝√ぉ繝・け・郁ｩｲ蠖捺凾・・

- [ ] 蜈ｱ譛・DSL 蝙九・譖ｴ譁ｰ襍ｷ轤ｹ縺・`src/domain/dsl-types.ts` 縺ｫ縺ｪ縺｣縺ｦ縺・ｋ
- [ ] `src/renderer/types.ts` 縺ｫ蝙区悽菴薙・迢ｬ閾ｪ alias繝ｻ讌ｭ蜍吶Ο繧ｸ繝・け繧定ｿｽ蜉縺励※縺・↑縺・ｼ・hin facade 邯ｭ謖・ｼ・
- [ ] `src/renderer/**` 螟悶〒 `renderer/types` 繧呈眠隕・import 縺励※縺・↑縺・ｼ亥ｿ・ｦ√↑繧臥炊逕ｱ繧呈・險假ｼ・
- [ ] `npm run check:dsl-types-ssot` 繧貞ｮ溯｡後＠縺ｦ邨先棡繧堤｢ｺ隱搾ｼ・mport 蠅・阜縺ｮ讖滓｢ｰ讀懈渊・・
- [ ] `npm test` 繧貞ｮ溯｡後＠縲ヾSoT 髢｢騾｣繝ｦ繝九ャ繝医′騾夐℃縺吶ｋ縺薙→繧堤｢ｺ隱搾ｼ亥句挨螳溯｡後☆繧句ｴ蜷医・ `npx mocha --grep "renderer/types|SSoT eslint restriction scope guard" tests/unit` 縺ｧ繧ょ庄・・

---

## 繝ｭ繝ｼ繝ｫ繝舌ャ繧ｯ譁ｹ豕包ｼ亥ｿ・茨ｼ・

<!-- 繝槭・繧ｸ蠕後↓蝠城｡後′蜃ｺ縺溘→縺阪・譛遏ｭ謇矩・-->

萓・

1. 譛ｬPR繧・`git revert <merge-commit>` 縺吶ｋ
2. 縺ｾ縺溘・ `main` 荳翫〒隧ｲ蠖薙さ繝溘ャ繝医∪縺ｧ謌ｻ縺呻ｼ医メ繝ｼ繝驕狗畑縺ｫ蠕薙≧・・
3. 險ｭ螳壹・逕滓・迚ｩ繧呈綾縺吝ｴ蜷医・ `npm run sync:configuration` / `check:*` 縺ｮ謇矩・ｒ譏手ｨ・

螳滄圀縺ｮ險伜・:

-

---

## CI 蜩∬ｳｪ繧ｲ繝ｼ繝茨ｼ亥盾辣ｧ・・

<!-- PR 縺ｧ縺ｩ縺ｮ繝√ぉ繝・け繧貞ｿ・医↓縺吶ｋ縺九・`test:all:ci` 縺ｮ菴咲ｽｮ縺･縺代・ T-043 縺ｮ繝峨く繝･繝｡繝ｳ繝医↓貅匁侠 -->

- 蠢・医メ繧ｧ繝・け縺ｮ驕ｸ螳壹・branch protection 謇矩・ [`docs/current/testing-ci/ci-quality-gate.md`](docs/current/testing-ci/ci-quality-gate.md)
- 繝ｭ繝ｼ繧ｫ繝ｫ縺ｧ CI 逶ｸ蠖薙・蜴ｳ縺励＆繧貞・迴ｾ縺吶ｋ蝣ｴ蜷・ `npm run test:all:ci`・・pretest:ci` 繧貞性繧・・

---

## 讀懆ｨｼ

<!-- 螳滓命縺励◆繧ゅ・縺ｫ繝√ぉ繝・け縲よ悴螳滓命縺ｯ逅・罰繧剃ｽｵ險・-->

- [ ] `npm run compile`
- [ ] `npm run check:configuration`・郁ｨｭ螳壼､画峩譎ゑｼ・
- [ ] `npm run check:commands`・医さ繝槭Φ繝牙ｮ夂ｾｩ螟画峩譎ゑｼ・
- [ ] `npm run check:contributes`・・contributes` 驟堺ｸ句､画峩譎ゑｼ・
- [ ] `npm run test:unit`
- [ ] `npm run test:all` 縺ｾ縺溘・ CI 縺ｮ `Test All CI` 縺檎ｷ・
- [ ] ・・SL 螟画峩譎ゑｼ荏DSL Plan (PR)` 縺ｮ邨先棡繧堤｢ｺ隱・

陬懆ｶｳ・井ｻｻ諢擾ｼ・

-

---

## 髢｢騾｣繝峨く繝･繝｡繝ｳ繝・

- 繝｡繝ｳ繝・リ繝ｼ蜷代￠螳溷漁: [`docs/current/operations/MAINTAINER_GUIDE.md`](docs/current/operations/MAINTAINER_GUIDE.md)
- CI / DSL Plan: [`docs/current/testing-ci/CI_TEMPLATE.md`](docs/current/testing-ci/CI_TEMPLATE.md)
- SSoT 譁ｹ驥・ADR: [`docs/adr/0003-dsl-types-canonical-source.md`](docs/adr/0003-dsl-types-canonical-source.md)
- 蝙玖ｿｽ蜉繝輔Ο繝ｼ: [`docs/current/workflow-onboarding/adding-built-in-component.md`](docs/current/workflow-onboarding/adding-built-in-component.md)
- 蠖ｱ髻ｿ蜊雁ｾ・・螳御ｺ・屮譟ｻ: [`docs/current/dsl-ssot-types/dsl-types-change-impact-audit.md`](docs/current/dsl-ssot-types/dsl-types-change-impact-audit.md)
## Docs Update Check

<!-- Documentation governance baseline: docs/current/documentation-governance/documentation-owner-and-review-cadence.md -->

- [ ] I checked whether this PR changes contributor flow, setup, testing or CI, runtime boundaries, canonical contracts, or operations docs.
- [ ] If docs updates are required, I updated the canonical page and the narrow entry or workflow links that point to it.
- [ ] If no docs update is required, I stated the reason explicitly in this PR.
- [ ] I used the current owner and review-cadence policy when deciding which page to update: [`docs/current/documentation-governance/documentation-owner-and-review-cadence.md`](docs/current/documentation-governance/documentation-owner-and-review-cadence.md)

## CSS SSoT Check

<!-- CSS canonicalization baseline: docs/current/theme-export-rendering/css-ssot-contributor-checklist.md and docs/current/theme-export-rendering/css-ssot-metrics-definition.md -->

- [ ] If this PR touches built-in component CSS or export-side CSS, I checked the current CSS SSoT checklist: [`docs/current/theme-export-rendering/css-ssot-contributor-checklist.md`](docs/current/theme-export-rendering/css-ssot-contributor-checklist.md)
- [ ] I checked whether this PR changes one of the approved CSS SSoT metrics in [`docs/current/theme-export-rendering/css-ssot-metrics-definition.md`](docs/current/theme-export-rendering/css-ssot-metrics-definition.md)
- [ ] If a CSS SSoT metric moved, I stated which metric changed and why in this PR or in the review handoff
- [ ] If this PR changes fallback compatibility CSS only, I recorded why the Primary path was not the right target

## Fallback-only note

<!-- HtmlExporter fallback lane (useReactRender === false) changes require an explicit local reason. -->

- [ ] This PR includes a fallback-only change only when the Primary path is not the right implementation target.
- [ ] If this PR changes only fallback behavior, the reason and affected preview/export entry points are recorded in the review handoff.

---

## SSoT Exception Log

- [ ] If this PR introduces or extends any temporary SSoT exception, the PR description records `reason`, `scope`, `owner`, `parent ticket`, and `removal deadline`.
- [ ] No indefinite exception is introduced for `renderer/types`, lint suppression, or guard bypass.
- [ ] If there is no exception, this section is explicitly recorded as `none`.
