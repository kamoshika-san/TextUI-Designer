/**
 * a11y/button-label — Button の label が空または未設定の場合に警告を返す Rule
 *
 * アクセシビリティ要件: Button には必ず label が必要。
 */

import type { TextUIRule, Finding, RuleContext } from '../text-ui-rule';
import type { TextUIDSL, ComponentDef } from '../../../domain/dsl-types';

export const a11yButtonLabel: TextUIRule = {
  id: 'a11y/button-label',
  description: 'Button components must have a non-empty label for accessibility.',
  defaultSeverity: 'warning',

  check(dsl: TextUIDSL, _context: RuleContext): Finding[] {
    const findings: Finding[] = [];
    const components = dsl.page?.components ?? [];

    components.forEach((comp, index) => {
      checkComponent(comp, `/page/components/${index}`, findings);
    });

    return findings;
  },
};

function checkComponent(comp: ComponentDef, path: string, findings: Finding[]): void {
  if (typeof comp !== 'object' || comp === null) { return; }

  const keys = Object.keys(comp);
  const kind = keys[0];
  if (!kind) { return; }

  const def = (comp as Record<string, unknown>)[kind];
  if (typeof def !== 'object' || def === null) { return; }

  if (kind === 'Button') {
    const label = (def as Record<string, unknown>)['label'];
    if (!label || (typeof label === 'string' && label.trim() === '')) {
      findings.push({
        ruleId: 'a11y/button-label',
        severity: 'warning',
        message: `Button at ${path} has no label. Add a descriptive label for accessibility.`,
        entityPath: path,
        fixHint: 'Add a label property to the Button component.',
        tags: ['a11y'],
      });
    }
  }

  // 子コンポーネントを再帰的にチェック
  const children = (def as Record<string, unknown>)['components'];
  if (Array.isArray(children)) {
    children.forEach((child, i) => {
      checkComponent(child as ComponentDef, `${path}/components/${i}`, findings);
    });
  }
}
