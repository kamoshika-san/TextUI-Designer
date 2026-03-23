const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('dsl-types text/navigation/media placement guard (T-20260324-371)', () => {
  it('bundle entry re-exports text-navigation-media.ts', () => {
    const code = read('src/domain/dsl-types/dsl-types.ts');
    assert.match(
      code,
      /export \* from '\.\/text-navigation-media';/,
      'src/domain/dsl-types/dsl-types.ts must re-export text-navigation-media.ts'
    );
  });

  it('form.ts depends on text/navigation/media contracts through text-navigation-media.ts', () => {
    const code = read('src/domain/dsl-types/form.ts');
    assert.match(
      code,
      /from '\.\/text-navigation-media';/,
      'src/domain/dsl-types/form.ts must import text/navigation/media contracts from text-navigation-media.ts'
    );
  });

  it('component-def.ts depends on text/navigation/media contracts through text-navigation-media.ts', () => {
    const code = read('src/domain/dsl-types/component-def.ts');
    assert.match(
      code,
      /from '\.\/text-navigation-media';/,
      'src/domain/dsl-types/component-def.ts must import text/navigation/media contracts from text-navigation-media.ts'
    );
  });
});
