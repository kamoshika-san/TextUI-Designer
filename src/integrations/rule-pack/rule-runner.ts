/**
 * RuleRunner — Rule Pack を DSL に対して実行し Finding[] を返す
 *
 * pure function。副作用なし。DSL を変更しない。
 */

import type { TextUIDSL } from '../../domain/dsl-types';
import type { TextUIRule, Finding, RuleContext } from './text-ui-rule';

export interface RunRulesOptions {
  context?: RuleContext;
}

/**
 * 指定した Rule 配列を DSL に対して実行し、全 Finding を返す。
 */
export function runRules(
  dsl: TextUIDSL,
  rules: TextUIRule[],
  options: RunRulesOptions = {}
): Finding[] {
  const context: RuleContext = options.context ?? {};
  const findings: Finding[] = [];

  for (const rule of rules) {
    const result = rule.check(dsl, context);
    findings.push(...result);
  }

  return findings;
}
