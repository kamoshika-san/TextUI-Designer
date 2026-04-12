/**
 * RuleRunner テスト
 */

const assert = require('assert');

describe('rule-runner: runRules', () => {
  let rulePack;

  before(() => {
    rulePack = require('../../out/integrations/rule-pack');
  });

  it('returns empty array when no rules provided', () => {
    const dsl = { page: { id: 'p', title: 'P', components: [] } };
    const findings = rulePack.runRules(dsl, []);
    assert.deepStrictEqual(findings, []);
  });

  it('returns findings from a single rule', () => {
    const dsl = {
      page: {
        id: 'p', title: 'P',
        components: [{ Button: { id: 'btn' } }]  // no label → warning
      }
    };
    const findings = rulePack.runRules(dsl, [rulePack.a11yButtonLabel]);
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].ruleId, 'a11y/button-label');
  });

  it('aggregates findings from multiple rules', () => {
    // 2 つの同じ Rule を渡すと 2 件返る（重複チェック）
    const dsl = {
      page: {
        id: 'p', title: 'P',
        components: [{ Button: { id: 'btn' } }]
      }
    };
    const findings = rulePack.runRules(dsl, [rulePack.a11yButtonLabel, rulePack.a11yButtonLabel]);
    assert.strictEqual(findings.length, 2);
  });

  it('passes context to each rule', () => {
    const dsl = { page: { id: 'p', title: 'P', components: [] } };
    let receivedContext = null;
    const mockRule = {
      id: 'mock/rule',
      description: 'mock',
      defaultSeverity: 'info',
      check: (d, ctx) => { receivedContext = ctx; return []; }
    };
    rulePack.runRules(dsl, [mockRule], { context: { filePath: 'test.tui.yml' } });
    assert.strictEqual(receivedContext.filePath, 'test.tui.yml');
  });

  it('does not mutate the DSL', () => {
    const dsl = {
      page: {
        id: 'p', title: 'P',
        components: [{ Button: { id: 'btn' } }]
      }
    };
    const original = JSON.stringify(dsl);
    rulePack.runRules(dsl, [rulePack.a11yButtonLabel]);
    assert.strictEqual(JSON.stringify(dsl), original);
  });
});
