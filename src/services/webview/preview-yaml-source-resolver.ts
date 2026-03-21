import * as vscode from 'vscode';
import { ConfigManager } from '../../utils/config-manager';
import { Logger } from '../../utils/logger';

/**
 * プレビュー更新パイプライン用: アクティブ編集内容または lastTuiFile から、
 * キャッシュキー用の { fileName, content } を解決する（T-070 第1スライスで分離）。
 */
export class PreviewYamlSourceResolver {
  constructor(
    private readonly getLastTuiFile: () => string | undefined,
    private readonly logger: Logger
  ) {}

  async resolveCurrentYamlForCache(): Promise<{ fileName: string; content: string } | null> {
    const activeEditor = vscode.window.activeTextEditor;
    const activeFileName = activeEditor?.document.fileName;
    const isSupportedActiveFile = Boolean(activeFileName && ConfigManager.isSupportedFile(activeFileName));
    const lastTuiFile = this.getLastTuiFile();

    if (
      activeEditor &&
      activeFileName &&
      isSupportedActiveFile &&
      (!lastTuiFile || lastTuiFile === activeFileName)
    ) {
      return {
        fileName: activeFileName,
        content: activeEditor.document.getText()
      };
    }

    if (lastTuiFile) {
      try {
        const document = await vscode.workspace.openTextDocument(lastTuiFile);
        return {
          fileName: lastTuiFile,
          content: document.getText()
        };
      } catch (error) {
        this.logger.warn('キャッシュ用YAMLの読み込みに失敗しました:', error);
      }
    }

    return null;
  }
}
