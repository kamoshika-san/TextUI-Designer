/**
 * ExportApplicationService — ポート経由のオーケストレーション（vscode 非依存の検証）
 */
const assert = require('assert');
const path = require('path');

describe('ExportApplicationService', () => {
  it('ポート経由で形式選択・保存先・通知まで進む（vscode API を直接呼ばない）', async () => {
    const { ExportApplicationService } = require('../../out/services/export/export-application-service.js');

    const calls = { pickFormat: 0, pickOutput: 0, notify: 0, write: 0 };
    const mockExportManager = {
      getSupportedFormats: () => ['html', 'react'],
      getFileExtension: (f) => (f === 'html' ? '.html' : '.txt'),
      exportFromFile: async () => {
        throw new Error('exportFromFile は performWrite モック側で扱う');
      }
    };

    const port = {
      pickExportFormat: async (formats) => {
        calls.pickFormat++;
        assert.ok(formats.includes('html'));
        return 'html';
      },
      pickOutputFilePath: async () => {
        calls.pickOutput++;
        return '/tmp/out.html';
      },
      notifyExportSuccess: (msg) => {
        calls.notify++;
        assert.ok(msg.includes('HTML'));
      }
    };

    const performWrite = async (fp, format, out) => {
      calls.write++;
      assert.strictEqual(format, 'html');
      assert.strictEqual(out, '/tmp/out.html');
      assert.ok(fp.endsWith('.tui.yml'));
    };

    const app = new ExportApplicationService(
      mockExportManager,
      port,
      async () => path.join(__dirname, 'export-test.tui.yml'),
      performWrite
    );

    await app.run();

    assert.strictEqual(calls.pickFormat, 1);
    assert.strictEqual(calls.pickOutput, 1);
    assert.strictEqual(calls.write, 1);
    assert.strictEqual(calls.notify, 1);
  });
});
