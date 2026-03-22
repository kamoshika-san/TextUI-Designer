const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { ThemeUtils } = require('../../out/theme/theme-utils.js');
const { ThemeLoader } = require('../../out/theme/theme-loader.js');
const { ThemeValidator } = require('../../out/theme/theme-validator.js');

describe('Theme modules', () => {
  describe('ThemeUtils', () => {
    it('deepMerge merges nested objects and keeps override precedence', () => {
      const base = { theme: { tokens: { colors: { primary: { value: '#111111' }, secondary: { value: '#222222' } } } } };
      const override = { theme: { tokens: { colors: { primary: { value: '#FF0000' } } } } };

      const merged = ThemeUtils.deepMerge(base, override);
      assert.strictEqual(merged.theme.tokens.colors.primary.value, '#FF0000');
      assert.strictEqual(merged.theme.tokens.colors.secondary.value, '#222222');
    });

    it('deepMerge replaces arrays with override value', () => {
      const base = { list: ['a', 'b'] };
      const override = { list: ['z'] };

      const merged = ThemeUtils.deepMerge(base, override);
      assert.deepStrictEqual(merged.list, ['z']);
    });

    it('buildCssVariables outputs flattened token and component vars', () => {
      const css = ThemeUtils.buildCssVariables(
        { colors: { primary: { value: '#FF0000' } }, spacing: { md: { value: '2rem' } } },
        { button: { primary: { backgroundColor: '#FF0000' } } }
      );

      assert.ok(css.includes('--colors-primary: #FF0000'));
      assert.ok(css.includes('--spacing-md: 2rem'));
      assert.ok(css.includes('--component-button-primary-backgroundColor: #FF0000'));
    });
  });

  describe('ThemeLoader', () => {
    it('resolves extends chain and merges theme definitions', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-loader-test-'));
      const parentPath = path.join(dir, 'parent.yml');
      const childPath = path.join(dir, 'child.yml');

      try {
        fs.writeFileSync(parentPath, JSON.stringify({
          theme: {
            tokens: { colors: { primary: { value: '#111111' }, secondary: { value: '#222222' } } }
          }
        }));

        fs.writeFileSync(childPath, JSON.stringify({
          theme: {
            extends: './parent.yml',
            tokens: { colors: { primary: { value: '#FF0000' } } }
          }
        }));

        const loader = new ThemeLoader();
        const resolved = await loader.resolveThemeDefinition(childPath);
        assert.strictEqual(resolved.theme.tokens.colors.primary.value, '#FF0000');
        assert.strictEqual(resolved.theme.tokens.colors.secondary.value, '#222222');
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it('mtime が変わるとキャッシュを使わず再読込する', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-loader-mtime-'));
      const themePath = path.join(dir, 't.yml');

      try {
        fs.writeFileSync(
          themePath,
          JSON.stringify({
            theme: { tokens: { colors: { primary: { value: '#111111' } } } }
          })
        );
        const loader = new ThemeLoader();
        const resolved1 = await loader.resolveThemeDefinition(themePath);
        assert.strictEqual(resolved1.theme.tokens.colors.primary.value, '#111111');

        await new Promise(r => setTimeout(r, 20));
        fs.writeFileSync(
          themePath,
          JSON.stringify({
            theme: { tokens: { colors: { primary: { value: '#222222' } } } }
          })
        );

        const resolved2 = await loader.resolveThemeDefinition(themePath);
        assert.strictEqual(resolved2.theme.tokens.colors.primary.value, '#222222');
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it('throws for unsupported npm: extends path', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-loader-npm-'));
      const childPath = path.join(dir, 'child.yml');

      try {
        fs.writeFileSync(childPath, JSON.stringify({
          theme: {
            extends: 'npm:@scope/theme',
            tokens: { colors: { primary: { value: '#FF0000' } } }
          }
        }));

        const loader = new ThemeLoader();
        await assert.rejects(
          () => loader.resolveThemeDefinition(childPath),
          (error) => error instanceof Error && error.message.includes('Unsupported extends path')
        );
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it('throws when extends target does not exist', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-loader-missing-'));
      const childPath = path.join(dir, 'child.yml');

      try {
        fs.writeFileSync(childPath, JSON.stringify({
          theme: {
            extends: './missing.yml',
            tokens: { colors: { primary: { value: '#FF0000' } } }
          }
        }));

        const loader = new ThemeLoader();
        await assert.rejects(
          () => loader.resolveThemeDefinition(childPath),
          (error) => error instanceof Error && error.message.includes('Extended theme file not found')
        );
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it('throws for circular extends references', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-loader-cycle-'));
      const themeAPath = path.join(dir, 'a.yml');
      const themeBPath = path.join(dir, 'b.yml');

      try {
        fs.writeFileSync(themeAPath, JSON.stringify({
          theme: {
            extends: './b.yml',
            tokens: { colors: { primary: { value: '#111111' } } }
          }
        }));

        fs.writeFileSync(themeBPath, JSON.stringify({
          theme: {
            extends: './a.yml',
            tokens: { colors: { secondary: { value: '#222222' } } }
          }
        }));

        const loader = new ThemeLoader();
        await assert.rejects(
          () => loader.resolveThemeDefinition(themeAPath),
          (error) => error instanceof Error && error.message.includes('Circular theme inheritance detected')
        );
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe('ThemeValidator', () => {
    it('does not throw when schema file is missing', async () => {
      const validator = new ThemeValidator();
      const context = { extensionPath: path.join(os.tmpdir(), 'non-existent-ext') };
      await validator.validateTheme(context, { theme: {} });
      assert.ok(true);
    });
  });
});
