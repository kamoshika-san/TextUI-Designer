export const RESOURCE_DEFINITIONS = [
  {
    uri: 'textui://schema/main',
    name: 'TextUI Main Schema',
    description: 'DSL本体のJSON Schema',
    mimeType: 'application/json'
  },
  {
    uri: 'textui://schema/template',
    name: 'TextUI Template Schema',
    description: 'テンプレート定義のJSON Schema',
    mimeType: 'application/json'
  },
  {
    uri: 'textui://schema/theme',
    name: 'TextUI Theme Schema',
    description: 'テーマ定義のJSON Schema',
    mimeType: 'application/json'
  },
  {
    uri: 'textui://components/catalog',
    name: 'TextUI Components Catalog',
    description: '利用可能コンポーネント一覧',
    mimeType: 'application/json'
  },
  {
    uri: 'textui://cli/run',
    name: 'TextUI CLI Runner Resource',
    description: 'resource-onlyクライアント向け。queryでCLIを実行します（args/cwd/timeoutMs/parseJson）。',
    mimeType: 'application/json'
  }
] as const;

export const PROMPT_DEFINITIONS = [
  {
    name: 'design_screen',
    description: '要件からTextUI DSLを設計するための指示テンプレート'
  },
  {
    name: 'fix_validation_error',
    description: '診断結果からDSL修正案を作るための指示テンプレート'
  }
] as const;

export function resolvePrompt(name: string, args: Record<string, unknown>): unknown {
  if (name === 'design_screen') {
    const requirements = typeof args.requirements === 'string'
      ? args.requirements
      : '要件未指定';

    return {
      description: '画面要件からTextUI DSLを作るプロンプト',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `以下の要件に基づいてTextUI DSLを設計してください。\n要件:\n${requirements}\n\n手順:\n1) list_componentsで使える部品を確認\n2) generate_uiで最初のDSLを作成\n3) validate_uiで検証し、必要ならexplain_errorで修正方針を作る`
          }
        }
      ]
    };
  }

  if (name === 'fix_validation_error') {
    const diagnostics = typeof args.diagnostics === 'string'
      ? args.diagnostics
      : '[]';
    return {
      description: '検証エラーの修正支援プロンプト',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `次の診断を原因別に分類し、最小修正パッチを提案してください。\n${diagnostics}`
          }
        }
      ]
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
}
