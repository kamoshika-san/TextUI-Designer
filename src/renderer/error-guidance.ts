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
      title: 'YAML parse error',
      actionItems: [
        'Check indentation and colons near the reported line.',
        'Verify quotes and that arrays/objects are properly closed.'
      ],
      documentLinks: [
        { label: 'YAML specification', href: DOCUMENT_LINKS.yamlSyntax },
        { label: 'TextUI README', href: DOCUMENT_LINKS.textuiReadme }
      ],
      technicalDetails: errorInfo
    };
  }

  if (errorInfo.type === 'parse' && errorInfo.details) {
    return {
      title: 'YAML syntax error',
      actionItems: [
        ...errorInfo.details.suggestions.slice(0, 2),
        'Save the file after fixing to refresh the preview automatically.'
      ],
      documentLinks: [
        { label: 'YAML specification', href: DOCUMENT_LINKS.yamlSyntax },
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
      title: 'Schema validation error',
      actionItems: [
        ...errorInfo.details.suggestions.slice(0, 2),
        'Confirm component property names and values match schema.json.'
      ],
      documentLinks: [
        { label: 'TextUI schema', href: DOCUMENT_LINKS.textuiSchema },
        { label: 'TextUI README', href: DOCUMENT_LINKS.textuiReadme }
      ],
      technicalDetails: allErrorsSummary || errorInfo.details.message
    };
  }

  const fallbackMessage = errorInfo.message || 'Unknown error';
  return {
    title: 'Preview error',
    actionItems: [
      'Review your DSL syntax and configuration values.',
      'Save the file and open the preview again after fixing.'
    ],
    documentLinks: [{ label: 'TextUI README', href: DOCUMENT_LINKS.textuiReadme }],
    technicalDetails: fallbackMessage
  };
};
