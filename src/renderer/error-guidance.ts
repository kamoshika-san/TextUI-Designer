interface DetailedErrorInfo {
  message: string;
  lineNumber: number;
  columnNumber: number;
  errorContext: string;
  suggestions: string[];
  fileName: string;
  fullPath: string;
  allErrors?: Array<{
    path: string;
    message: string;
    allowedValues?: string[];
  }>;
}

export interface ErrorInfo {
  type: 'simple' | 'parse' | 'schema';
  message?: string;
  details?: DetailedErrorInfo;
  fileName?: string;
  content?: string;
}

export interface ErrorGuidance {
  title: string;
  actionItems: string[];
  documentLinks: Array<{ label: string; href: string }>;
  technicalDetails?: string;
}

const DOCUMENT_LINKS = {
  yamlSyntax: 'https://yaml.org/spec/1.2.2/',
  textuiSchema: 'https://github.com/kamoshika-san/TextUI-Designer/tree/main/schemas',
  textuiReadme: 'https://github.com/kamoshika-san/TextUI-Designer/blob/main/README.md'
} as const;

export const createErrorGuidance = (errorInfo: ErrorInfo | string): ErrorGuidance => {
  if (typeof errorInfo === 'string') {
    return {
      title: 'YAMLパースエラー',
      actionItems: [
        'エラー行付近のインデントとコロンの有無を確認してください。',
        'クォートと配列・オブジェクトの閉じ忘れがないかを確認してください。'
      ],
      documentLinks: [
        { label: 'YAML仕様', href: DOCUMENT_LINKS.yamlSyntax },
        { label: 'TextUI README', href: DOCUMENT_LINKS.textuiReadme }
      ],
      technicalDetails: errorInfo
    };
  }

  if (errorInfo.type === 'parse' && errorInfo.details) {
    return {
      title: 'YAML構文エラー',
      actionItems: [
        ...errorInfo.details.suggestions.slice(0, 2),
        '修正後にファイルを保存するとプレビューが自動更新されます。'
      ],
      documentLinks: [
        { label: 'YAML仕様', href: DOCUMENT_LINKS.yamlSyntax },
        { label: 'TextUI README', href: DOCUMENT_LINKS.textuiReadme }
      ],
      technicalDetails: errorInfo.details.message
    };
  }

  if (errorInfo.type === 'schema' && errorInfo.details) {
    const allErrorsSummary = errorInfo.details.allErrors
      ?.map(err => `${err.path || 'root'}: ${err.message}`)
      .join('\n');

    return {
      title: 'スキーマバリデーションエラー',
      actionItems: [
        ...errorInfo.details.suggestions.slice(0, 2),
        'コンポーネントのプロパティ名・値が schema.json と一致しているか確認してください。'
      ],
      documentLinks: [
        { label: 'TextUIスキーマ定義', href: DOCUMENT_LINKS.textuiSchema },
        { label: 'TextUI README', href: DOCUMENT_LINKS.textuiReadme }
      ],
      technicalDetails: allErrorsSummary || errorInfo.details.message
    };
  }

  const fallbackMessage = errorInfo.message || '不明なエラー';
  return {
    title: 'プレビューエラー',
    actionItems: [
      'DSLの構文と設定値を確認してください。',
      '修正後にファイルを保存して再度プレビューを確認してください。'
    ],
    documentLinks: [{ label: 'TextUI README', href: DOCUMENT_LINKS.textuiReadme }],
    technicalDetails: fallbackMessage
  };
};
