const assert = require('assert');
const {
  decodeDslComponent,
  decodeDslComponentAs,
  decodeDslComponentObjectProps,
  decodeDslComponentUnion,
  decodeTextDslComponent,
  decodeButtonDslComponent
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

  it('decodeDslComponentAs: 期待名と一致すると name をリテラルとして返す', () => {
    const decoded = decodeDslComponentAs({ Input: { name: 'n' } }, 'Input');
    assert.strictEqual(decoded.reason, null);
    assert.strictEqual(decoded.value.name, 'Input');
    assert.deepStrictEqual(decoded.value.props, { name: 'n' });
  });

  it('decodeDslComponentAs: 名前不一致は invalid-name', () => {
    const decoded = decodeDslComponentAs({ Text: { value: 'x' } }, 'Button');
    assert.strictEqual(decoded.value, null);
    assert.strictEqual(decoded.reason, 'invalid-name');
  });

  it('decodeButtonDslComponent: 妥当な Button を返す', () => {
    const decoded = decodeButtonDslComponent({ Button: { label: 'ok', kind: 'primary' } });
    assert.strictEqual(decoded.reason, null);
    assert.deepStrictEqual(decoded.value, {
      name: 'Button',
      props: { label: 'ok', kind: 'primary' }
    });
  });

  it('decodeButtonDslComponent: kind が不正なら失敗', () => {
    const decoded = decodeButtonDslComponent({ Button: { label: 'x', kind: 'weird' } });
    assert.strictEqual(decoded.value, null);
    assert.strictEqual(decoded.reason, 'props-not-object');
  });

  it('decodeDslComponentUnion: Text は kind+TextComponent に narrow（T-180）', () => {
    const decoded = decodeDslComponentUnion({ Text: { value: 'hi', variant: 'p' } });
    assert.strictEqual(decoded.reason, null);
    assert.strictEqual(decoded.value.kind, 'Text');
    assert.deepStrictEqual(decoded.value.props, { value: 'hi', variant: 'p' });
  });

  it('decodeDslComponentUnion: Button は kind+ButtonComponent に narrow', () => {
    const decoded = decodeDslComponentUnion({ Button: { label: 'go', kind: 'primary' } });
    assert.strictEqual(decoded.reason, null);
    assert.strictEqual(decoded.value.kind, 'Button');
    assert.deepStrictEqual(decoded.value.props, { label: 'go', kind: 'primary' });
  });

  it('decodeDslComponentUnion: その他は name を kind に載せる', () => {
    const decoded = decodeDslComponentUnion({ Input: { name: 'email', label: 'E', type: 'text' } });
    assert.strictEqual(decoded.reason, null);
    assert.strictEqual(decoded.value.kind, 'Input');
    assert.deepStrictEqual(decoded.value.props, { name: 'email', label: 'E', type: 'text' });
  });
});

