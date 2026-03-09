export interface YamlSource {
  fileName: string;
  content: string;
}

interface TextDocumentLike {
  fileName: string;
  getText(): string;
}

interface ActiveEditorLike {
  document: TextDocumentLike;
}

export class YamlContentReader {
  constructor(
    private readonly defaultSampleYaml: string,
    private readonly getActiveEditor: () => ActiveEditorLike | null | undefined,
    private readonly openTextDocument: (filePath: string) => Promise<TextDocumentLike>
  ) {}

  async read(filePath?: string): Promise<YamlSource> {
    if (filePath) {
      const document = await this.openTextDocument(filePath);
      return {
        fileName: filePath,
        content: document.getText()
      };
    }

    const activeEditor = this.getActiveEditor();

    if (activeEditor && this.isLikelyTextUiDslFile(activeEditor.document.fileName)) {
      const fileName = activeEditor.document.fileName;
      console.log(`[YamlParser] アクティブエディタからYAMLを取得: ${fileName}`);
      return {
        fileName,
        content: activeEditor.document.getText()
      };
    }

    return {
      fileName: 'sample.tui.yml',
      content: this.defaultSampleYaml
    };
  }

  private isLikelyTextUiDslFile(fileName: string): boolean {
    return /\.tui\.ya?ml$/i.test(fileName);
  }
}
