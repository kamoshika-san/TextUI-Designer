import { describe, it, before, after } from 'mocha';
import * as chai from 'chai';
const chaiAsPromised = require('chai-as-promised').default;
chai.use(chaiAsPromised);
const expect: any = chai.expect;
import { TemplateParser, TemplateException } from '../../src/services/template-parser';
import * as fs from 'fs';
import * as path from 'path';
import { removeDirectoryRecursive } from '../utils/test-utils';

describe('TemplateParser', () => {
  const baseDir = path.resolve(__dirname, '../fixtures');
  const parser = new TemplateParser();

  before(() => {
    console.log('TemplateParser test setup - creating test files');
    // テスト用テンプレートファイルを作成
    fs.writeFileSync(path.join(baseDir, 'simple.template.yml'), `- Text:\n    variant: h1\n    value: "{{ $params.title }}"`);
    fs.writeFileSync(path.join(baseDir, 'circular1.template.yml'), `- $include:\n    template: "circular2.template.yml"`);
    fs.writeFileSync(path.join(baseDir, 'circular2.template.yml'), `- $include:\n    template: "circular1.template.yml"`);
    
    // テスト用のtemplatesディレクトリを作成
    const templatesDir = path.join(baseDir, 'templates');
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }
    
    // form.template.ymlを作成
    fs.writeFileSync(path.join(templatesDir, 'form.template.yml'), `- Form:\n    id: "{{ $params.formId }}"\n    fields:\n      - Input:\n          label: "{{ $params.nameLabel }}"\n          name: name\n          type: text\n          required: true\n          placeholder: "{{ $params.namePlaceholder }}"\n      - Input:\n          label: "{{ $params.emailLabel }}"\n          name: email\n          type: email\n          required: true\n          placeholder: "{{ $params.emailPlaceholder }}"\n      - Checkbox:\n          label: "{{ $params.agreeLabel }}"\n          name: agree\n          required: true\n    actions:\n      - Button:\n          kind: submit\n          label: "{{ $params.submitLabel }}"\n          submit: true`);
    
    console.log('TemplateParser test setup - test files created');
  });

  after(() => {
    console.log('TemplateParser test cleanup - removing test files');
    // テスト用テンプレートファイルを削除
    try {
      fs.unlinkSync(path.join(baseDir, 'simple.template.yml'));
      fs.unlinkSync(path.join(baseDir, 'circular1.template.yml'));
      fs.unlinkSync(path.join(baseDir, 'circular2.template.yml'));
      
      // templatesディレクトリを再帰的に削除
      const templatesDir = path.join(baseDir, 'templates');
      removeDirectoryRecursive(templatesDir);
    } catch (error) {
      console.log('Error during cleanup:', error);
    }
    console.log('TemplateParser test cleanup - test files removed');
  });

  it('should resolve $include and apply params', async () => {
    console.log('Running should resolve $include and apply params test');
    const main = `- $include:\n    template: "simple.template.yml"\n    params:\n      title: "Hello"`;
    console.log('Main content:', main);
    console.log('Template file content:', fs.readFileSync(path.join(baseDir, 'simple.template.yml'), 'utf8'));
    const result = await parser.parseWithTemplates(main, path.join(baseDir, 'main.yml'));
    // fs.writeFileSync(path.join(baseDir, 'result-dump.json'), JSON.stringify(result, null, 2), 'utf8'); // デバッグ用出力削除
    console.log('Final result:', JSON.stringify(result, null, 2));
    expect(result[0][0].Text.value).to.equal('Hello');
  });

  it('should throw on missing template file', async () => {
    console.log('Running should throw on missing template file test');
    const main = `- $include:\n    template: "notfound.template.yml"`;
    await expect(parser.parseWithTemplates(main, path.join(baseDir, 'main.yml')))
      .to.eventually.be.rejectedWith(TemplateException);
  });

  it('should detect circular reference', async () => {
    console.log('Running should detect circular reference test');
    const main = `- $include:\n    template: "circular1.template.yml"`;
    await expect(parser.parseWithTemplates(main, path.join(baseDir, 'main.yml')))
      .to.eventually.be.rejectedWith(TemplateException);
  });

  it('should handle template-demo.tui.yml structure correctly', async () => {
    const main = `page:
  id: template-demo
  title: "テンプレート参照デモ"
  layout: vertical
  components:
    - $include:
        template: "./templates/form.template.yml"
        params:
          formId: "user-registration"
          nameLabel: "お名前"
          namePlaceholder: "山田太郎"
          emailLabel: "メールアドレス"
          emailPlaceholder: "yamada@example.com"
          agreeLabel: "利用規約に同意する"
          submitLabel: "登録する"`;
    
    const result = await parser.parseWithTemplates(main, path.join(baseDir, 'template-demo.yml'));
    console.log('Template demo result structure:', JSON.stringify(result, null, 2));
    
    // page.componentsが配列であることを確認
    expect(result.page).to.exist;
    expect(result.page.components).to.be.an('array');
    expect(result.page.components.length).to.be.greaterThan(0);
    
    // 最初の要素がFormオブジェクトであることを確認
    expect(result.page.components[0]).to.have.property('Form');
  });

  it('should parse actual template-demo.tui.yml file and log expanded result', async () => {
    const demoPath = path.resolve(__dirname, '../../sample/template-demo.tui.yml');
    const demoContent = fs.readFileSync(demoPath, 'utf8');
    const result = await parser.parseWithTemplates(demoContent, demoPath);
    console.log('Expanded template-demo.tui.yml:', JSON.stringify(result, null, 2));
    // page.componentsが配列であり、最初の要素がFormまたはText等のオブジェクトであることを確認
    expect(result.page).to.exist;
    expect(result.page.components).to.be.an('array');
    expect(result.page.components.length).to.be.greaterThan(0);
    // 1つ目の要素がForm/Divider/Text/Container等のいずれかであること
    const firstKey = Object.keys(result.page.components[0])[0];
    expect(['Form', 'Divider', 'Text', 'Container', 'Button', 'Alert', 'Checkbox', 'Radio', 'Select']).to.include(firstKey);
  });
}); 