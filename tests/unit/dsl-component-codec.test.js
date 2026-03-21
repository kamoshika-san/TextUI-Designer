const assert = require('assert');
const {
  decodeDslComponent,
  decodeDslComponentObjectProps,
  decodeTextDslComponent
} = require('../../out/registry/dsl-component-codec');

describe('DslComponentCodec', () => {
  it('decodeDslComponent: 先頭キーを name として取得する', () => {
    const decoded = decodeDslComponent({ Text: { value: 'hello' } });
    assert.deepStrictEqual(decoded, {
      value: { name: 'Text', props: { value: 'hello' } },
      reason: null
    });
  });

  it('decodeDslComponent: 非オブジェクト入力を失敗として返す', () => {
    const decoded = decodeDslComponent('Text');
    assert.deepStrictEqual(decoded, {
      value: null,
      reason: 'not-object'
    });
  });

  it('decodeDslComponentObjectProps: props が object でない入力を失敗として返す', () => {
    const decoded = decodeDslComponentObjectProps({ Text: 'hello' });
    assert.deepStrictEqual(decoded, {
      value: null,
      reason: 'props-not-object'
    });
  });

  it('decodeDslComponentObjectProps: object props を安全に返す', () => {
    const decoded = decodeDslComponentObjectProps({ Button: { label: 'ok' } });
    assert.deepStrictEqual(decoded, {
      value: { name: 'Button', props: { label: 'ok' } },
      reason: null
    });
  });

  it('decodeTextDslComponent: Text の props を TextComponent として返す', () => {
    const decoded = decodeTextDslComponent({ Text: { value: 'hello', variant: 'h1' } });
    assert.strictEqual(decoded.reason, null);
    assert.deepStrictEqual(decoded.value, {
      name: 'Text',
      props: { value: 'hello', variant: 'h1' }
    });
  });

  it('decodeTextDslComponent: Text 以外は invalid-name', () => {
    const decoded = decodeTextDslComponent({ Button: { label: 'x' } });
    assert.strictEqual(decoded.value, null);
    assert.strictEqual(decoded.reason, 'invalid-name');
  });
});

