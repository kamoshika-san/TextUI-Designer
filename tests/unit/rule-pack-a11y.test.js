/**
 * Rule Pack — a11y/button-label Rule テスト
 */

const assert = require('assert');

describe('rule-pack: a11y/button-label', () => {
  let rulePack;

  before(() => {
    rulePack = require('../../out/integrations/rule-pack');
  });

  const rule = () => rulePack.a11yButtonLabel;

  it('has id "a11y/button-label"', () => {
    assert.strictEqual(rule().id, 'a11y/button-label');
  });

  it('has defaultSeverity "warning"', () => {
    assert.strictEqual(rule().defaultSeverity, 'warning');
  });

  it('returns no findings for Button with label', () => {
    const dsl = {
      page: {
        id: 'test',
        title: 'Test',
        components: [{ Button: { id: 'btn', label: 'Submit' } }]
      }
    };
    const findings = rule().check(dsl, {});
    assert.strictEqual(findings.length, 0);
  });

  it('returns warning for Button with empty label', () => {
    const dsl = {
      page: {
        id: 'test',
        title: 'Test',
        components: [{ Button: { id: 'btn', label: '' } }]
      }
    };
    const findings = rule().check(dsl, {});
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].severity, 'warning');
    assert.ok(findings[0].tags.includes('a11y'));
    assert.strictEqual(findings[0].ruleId, 'a11y/button-label');
  });

  it('returns warning for Button with no label property', () => {
    const dsl = {
      page: {
        id: 'test',
        title: 'Test',
        components: [{ Button: { id: 'btn' } }]
      }
    };
    const findings = rule().check(dsl, {});
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].entityPath, '/page/components/0');
  });

  it('returns no findings for non-Button components', () => {
    const dsl = {
      page: {
        id: 'test',
        title: 'Test',
        components: [{ Text: { id: 'txt', content: 'Hello' } }]
      }
    };
    const findings = rule().check(dsl, {});
    assert.strictEqual(findings.length, 0);
  });

  it('returns no findings for empty page', () => {
    const dsl = { page: { id: 'test', title: 'Test', components: [] } };
    const findings = rule().check(dsl, {});
    assert.deepStrictEqual(findings, []);
  });

  it('check() does not mutate the input DSL', () => {
    const dsl = {
      page: {
        id: 'test',
        title: 'Test',
        components: [{ Button: { id: 'btn' } }]
      }
    };
    const original = JSON.stringify(dsl);
    rule().check(dsl, {});
    assert.strictEqual(JSON.stringify(dsl), original);
  });

  it('finding includes fixHint', () => {
    const dsl = {
      page: {
        id: 'test',
        title: 'Test',
        components: [{ Button: { id: 'btn' } }]
      }
    };
    const findings = rule().check(dsl, {});
    assert.ok(typeof findings[0].fixHint === 'string');
    assert.ok(findings[0].fixHint.length > 0);
  });
});
