"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mocha_1 = require("mocha");
const chai = __importStar(require("chai"));
const chaiAsPromised = require('chai-as-promised').default;
chai.use(chaiAsPromised);
const expect = chai.expect;
const template_parser_1 = require("../../out/src/services/template-parser.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const { removeDirectoryRecursive } = require('../utils/test-utils');
(0, mocha_1.describe)('TemplateParser', () => {
    const baseDir = path.resolve(__dirname, '../fixtures');
    const parser = new template_parser_1.TemplateParser();
    (0, mocha_1.before)(() => {
        console.log('TemplateParser test setup - creating test files');
        // テスト用テンプレートファイルを作成
        fs.writeFileSync(path.join(baseDir, 'simple.template.yml'), `- Text:
    variant: h1
    value: "{{ $params.title }}"`);
        fs.writeFileSync(path.join(baseDir, 'circular1.template.yml'), `- $include:
    template: "circular2.template.yml"`);
        fs.writeFileSync(path.join(baseDir, 'circular2.template.yml'), `- $include:
    template: "circular1.template.yml"`);
        // テスト用のtemplatesディレクトリを作成
        const templatesDir = path.join(baseDir, 'templates');
        if (!fs.existsSync(templatesDir)) {
            fs.mkdirSync(templatesDir, { recursive: true });
        }
        // form.template.ymlを作成
        fs.writeFileSync(path.join(templatesDir, 'form.template.yml'), `- Form:
    id: "{{ $params.formId }}"
    fields:
      - Input:
          label: "{{ $params.nameLabel }}"
          name: name
          type: text
          required: true
          placeholder: "{{ $params.namePlaceholder }}"
      - Input:
          label: "{{ $params.emailLabel }}"
          name: email
          type: email
          required: true
          placeholder: "{{ $params.emailPlaceholder }}"
      - Checkbox:
          label: "{{ $params.agreeLabel }}"
          name: agree
          required: true
    actions:
      - Button:
          kind: submit
          label: "{{ $params.submitLabel }}"
          submit: true`);
        console.log('TemplateParser test setup - test files created');
    });
    (0, mocha_1.after)(() => {
        console.log('TemplateParser test cleanup - removing test files');
        // テスト用テンプレートファイルを削除
        try {
            fs.unlinkSync(path.join(baseDir, 'simple.template.yml'));
            fs.unlinkSync(path.join(baseDir, 'circular1.template.yml'));
            fs.unlinkSync(path.join(baseDir, 'circular2.template.yml'));
            // templatesディレクトリとその中身を削除
            const templatesDir = path.join(baseDir, 'templates');
            if (fs.existsSync(templatesDir)) {
                fs.unlinkSync(path.join(templatesDir, 'form.template.yml'));
                fs.rmdirSync(templatesDir);
            }
        }
        catch (error) {
            console.log('Error during cleanup:', error);
        }
        console.log('TemplateParser test cleanup - test files removed');
    });
    (0, mocha_1.it)('should resolve $include and apply params', async () => {
        console.log('Running should resolve $include and apply params test');
        const main = `- $include:\n    template: "simple.template.yml"\n    params:\n      title: "Hello"`;
        console.log('Main content:', main);
        console.log('Template file content:', fs.readFileSync(path.join(baseDir, 'simple.template.yml'), 'utf8'));
        const result = await parser.parseWithTemplates(main, path.join(baseDir, 'main.yml'));
        // fs.writeFileSync(path.join(baseDir, 'result-dump.json'), JSON.stringify(result, null, 2), 'utf8'); // デバッグ用出力削除
        console.log('Final result:', JSON.stringify(result, null, 2));
        expect(result[0].Text.value).to.equal('Hello');
    });
    (0, mocha_1.it)('should throw on missing template file', async () => {
        console.log('Running should throw on missing template file test');
        const main = `- $include:\n    template: "notfound.template.yml"`;
        await expect(parser.parseWithTemplates(main, path.join(baseDir, 'main.yml')))
            .to.eventually.be.rejectedWith(template_parser_1.TemplateException);
    });
    (0, mocha_1.it)('should detect circular reference', async () => {
        console.log('Running should detect circular reference test');
        const main = `- $include:\n    template: "circular1.template.yml"`;
        await expect(parser.parseWithTemplates(main, path.join(baseDir, 'main.yml')))
            .to.eventually.be.rejectedWith(template_parser_1.TemplateException);
    });
    (0, mocha_1.it)('should handle template-demo.tui.yml structure correctly', async () => {
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
    (0, mocha_1.it)('should parse actual template-demo.tui.yml file and log expanded result', async () => {
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
//# sourceMappingURL=template-parser.test.js.map