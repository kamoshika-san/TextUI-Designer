// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as YAML from 'yaml';
import Ajv from 'ajv';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let currentPanel: vscode.WebviewPanel | undefined = undefined;

	// YAML/JSONスキーマ連携: *.tui.yml, *.tui.json, *.template.yml, *.template.yaml, *.template.json に schema.json を紐付け
	const schemaPath = path.join(context.extensionPath, 'schemas', 'schema.json');
	const schemaUri = vscode.Uri.file(schemaPath).toString();

	// テンプレート用スキーマを一時ファイルとして生成
	const templateSchemaPath = path.join(context.extensionPath, 'schemas', 'template-schema.json');
	if (!fs.existsSync(templateSchemaPath)) {
		const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
		const templateSchema = {
			...schema,
			type: 'array',
			items: schema.definitions.component
		};
		fs.writeFileSync(templateSchemaPath, JSON.stringify(templateSchema, null, 2), 'utf-8');
	}
	const templateSchemaUri = vscode.Uri.file(templateSchemaPath).toString();

	// YAML拡張（redhat.vscode-yaml）向け
	vscode.workspace.getConfiguration('yaml').update('schemas', {
		[schemaUri]: ['*.tui.yml', '*.tui.json'],
		[templateSchemaUri]: ['*.template.yml', '*.template.yaml', '*.template.json']
	}, vscode.ConfigurationTarget.Global);

	// JSON拡張向け
	vscode.workspace.getConfiguration('json').update('schemas', [
		{
			fileMatch: ['*.tui.json', '*.template.json'],
			schema: JSON.parse(fs.readFileSync(schemaPath, 'utf-8'))
		}
	], vscode.ConfigurationTarget.Global);

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "textui-designer" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	// プレビューを開くコマンドの登録
	let disposable = vscode.commands.registerCommand('textui-designer.openPreview', async () => {
		// 右側（ViewColumn.Two）にWebViewパネルを表示
		const columnToShowIn = vscode.ViewColumn.Two;

		if (currentPanel) {
			currentPanel.reveal(columnToShowIn);
		} else {
			currentPanel = vscode.window.createWebviewPanel(
				'textuiPreview',
				'TextUI Preview',
				columnToShowIn,
				{
					enableScripts: true,
					retainContextWhenHidden: true,
				}
			);

			// WebViewのHTMLは初回のみセット
			currentPanel.webview.html = getWebviewContent(context, currentPanel);

			// 初回データ送信
			sendYamlToWebview(currentPanel, context);

			// パネルが閉じられたときの処理
			currentPanel.onDidDispose(
				() => {
					currentPanel = undefined;
				},
				null,
				context.subscriptions
			);
		}
	});

	context.subscriptions.push(disposable);

	// アクティブなエディタが変更されたときの処理
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor && editor.document.fileName.endsWith('.tui.yml')) {
				if (currentPanel) {
					sendYamlToWebview(currentPanel, context);
				}
			}
		})
	);

	// ドキュメントが変更されたときの処理
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(event => {
			if (event.document.fileName.endsWith('.tui.yml')) {
				if (currentPanel) {
					sendYamlToWebview(currentPanel, context);
				}
			}
		})
	);

	// --- Diagnostics（赤波線）機能 ---
	const diagnosticCollection = vscode.languages.createDiagnosticCollection('textui-designer');

	async function validateAndReportDiagnostics(document: vscode.TextDocument) {
		const isTui = document.fileName.endsWith('.tui.yml');
		const isTemplate = /\.template\.(ya?ml|json)$/.test(document.fileName);
		if (!isTui && !isTemplate) return;
		const text = document.getText();
		let diagnostics: vscode.Diagnostic[] = [];
		try {
			const yaml = YAML.parse(text);
			const schemaPath = path.join(context.extensionPath, 'schemas', 'schema.json');
			const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
			const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
			let validate;
			if (isTemplate) {
				// テンプレート用: ルートがコンポーネント配列でもOKなスキーマを動的生成
				const templateSchema = {
					...schema,
					type: 'array',
					items: schema.definitions.component
				};
				validate = ajv.compile(templateSchema);
			} else {
				validate = ajv.compile(schema);
			}
			const valid = validate(yaml);
			if (!valid && validate.errors) {
				for (const err of validate.errors) {
					const key = err.instancePath.split('/').filter(Boolean).pop();
					if (key) {
						const regex = new RegExp(`^\\s*${key}:`, 'm');
						const match = text.match(regex);
						if (match) {
							const start = text.indexOf(match[0]);
							const startPos = document.positionAt(start);
							const endPos = document.positionAt(start + match[0].length);
							const diag = new vscode.Diagnostic(
								new vscode.Range(startPos, endPos),
								err.message || 'スキーマエラー',
								vscode.DiagnosticSeverity.Error
							);
							diagnostics.push(diag);
						}
					}
				}
			}
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			const diag = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 1),
				msg,
				vscode.DiagnosticSeverity.Error
			);
			diagnostics.push(diag);
		}
		diagnosticCollection.set(document.uri, diagnostics);
	}

	// ドキュメント変更時にDiagnosticsを更新
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(event => {
			validateAndReportDiagnostics(event.document);
		})
	);
	// アクティブ時にもDiagnosticsを更新
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) validateAndReportDiagnostics(editor.document);
		})
	);
	// 拡張機能起動時にも全*.tui.ymlをチェック
	vscode.workspace.textDocuments.forEach(doc => validateAndReportDiagnostics(doc));
	// --- YAML用IntelliSense: コンポーネント名補完 ---
	const COMPONENT_NAMES = [
		'Text', 'Input', 'Button', 'Checkbox', 'Radio', 'Select', 'Divider', 'Container', 'Alert', 'Form'
	];

	const INDENT_COMMAND = 'textui-designer.insertIndent';
	context.subscriptions.push(
		vscode.commands.registerCommand(INDENT_COMMAND, async () => {
			const editor = vscode.window.activeTextEditor;
			if (editor) {
				await editor.edit(editBuilder => {
					editBuilder.insert(editor.selection.active, '  ');
				});
			}
		})
	);

	// --- YAML用IntelliSense: プロパティ名・値の補完 ---
	const COMPONENT_PROPERTIES: Record<string, { props: string[]; enums?: Record<string, string[]>; booleans?: string[] }> = {
		Text: { props: ['variant', 'value'], enums: { variant: ['h1', 'h2', 'h3', 'p', 'small', 'caption'] } },
		Input: { props: ['label', 'name', 'type', 'required'], enums: { type: ['text', 'email', 'password', 'number', 'multiline'] }, booleans: ['required'] },
		Button: { props: ['kind', 'label', 'submit'], enums: { kind: ['primary', 'secondary', 'submit'] }, booleans: ['submit'] },
		Checkbox: { props: ['label', 'name', 'required'], booleans: ['required'] },
		Radio: { props: ['label', 'name', 'options'] },
		Select: { props: ['label', 'name', 'options', 'multiple'], booleans: ['multiple'] },
		Divider: { props: ['orientation'], enums: { orientation: ['horizontal', 'vertical'] } },
		Container: { props: ['layout', 'components'], enums: { layout: ['vertical', 'horizontal', 'flex', 'grid'] } },
		Alert: { props: ['variant', 'message'], enums: { variant: ['info', 'success', 'warning', 'error'] } },
		Form: { props: ['id', 'fields', 'actions'] },
	};

	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			{ language: 'yaml', pattern: '**/*.tui.yml' },
			{
				provideCompletionItems(document, position) {
					const line = document.lineAt(position.line).text;
					const currIndent = line.match(/^\s*/)?.[0].length ?? 0;

					// 上方向に探索して、1段浅い行がコンポーネント名ならプロパティ補完
					for (let i = position.line - 1; i >= 0; i--) {
						const prev = document.lineAt(i).text;
						const prevIndent = prev.match(/^\s*/)?.[0].length ?? 0;
						if (prevIndent < currIndent) {
							const compMatch = prev.match(/^[ \t]*([A-Za-z]+):/);
							if (compMatch) {
								const comp = compMatch[1];
								const def = COMPONENT_PROPERTIES[comp];
								if (def) {
									return def.props.map(prop => {
										const item = new vscode.CompletionItem(prop, vscode.CompletionItemKind.Property);
										item.detail = `${comp}のプロパティ`;
										item.insertText = prop + ': ';
										return item;
									});
								}
							}
							break;
						}
					}

					// 上方向に探索して、2段浅い行がコンポーネント名、1段浅い行がプロパティ名なら値補完
					for (let i = position.line - 1; i >= 1; i--) {
						const prev = document.lineAt(i).text;
						const prevIndent = prev.match(/^\s*/)?.[0].length ?? 0;
						if (prevIndent < currIndent) {
							const propMatch = prev.match(/^[ \t]*([a-zA-Z0-9_]+):/);
							if (propMatch) {
								const prop = propMatch[1];
								for (let j = i - 1; j >= 0; j--) {
									const compLine = document.lineAt(j).text;
									const compIndent = compLine.match(/^\s*/)?.[0].length ?? 0;
									if (compIndent < prevIndent) {
										const compMatch = compLine.match(/^[ \t]*([A-Za-z]+):/);
										if (compMatch) {
											const comp = compMatch[1];
											const def = COMPONENT_PROPERTIES[comp];
											if (def) {
												if (def.enums && def.enums[prop]) {
													return def.enums[prop].map(val => {
														const item = new vscode.CompletionItem(val, vscode.CompletionItemKind.EnumMember);
														item.detail = `${comp}.${prop}の候補値`;
														item.insertText = val;
														return item;
													});
												}
												if (def.booleans && def.booleans.includes(prop)) {
													return ['true', 'false'].map(val => {
														const item = new vscode.CompletionItem(val, vscode.CompletionItemKind.Value);
														item.detail = `${comp}.${prop}の真偽値`;
														item.insertText = val;
														return item;
													});
												}
											}
										}
										break;
									}
								}
							}
							break;
						}
					}

					// 既存のコンポーネント名補完
					if (/^\s*-\s*$/.test(line)) {
						return COMPONENT_NAMES.map(name => {
							const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Class);
							item.detail = 'TextUIコンポーネント';
							item.insertText = ` ${name}: `;
							item.command = { command: INDENT_COMMAND, title: 'インデントを挿入' };
							return item;
						});
					}
					return undefined;
				}
			},
			'-', ':' // トリガー文字: ハイフン・コロン
		)
	);

	// --- コマンドパレットからの新規テンプレート作成 ---
	context.subscriptions.push(
		vscode.commands.registerCommand('textui-designer.createTemplate', async () => {
			// テンプレート種別を選択
			const templateType = await vscode.window.showQuickPick([
				{ label: 'フォーム', value: 'form' },
				{ label: '一覧', value: 'list' },
				{ label: '空テンプレート', value: 'empty' }
			], { placeHolder: 'テンプレート種別を選択してください' });
			if (!templateType) return;

			// 保存先・ファイル名を選択
			const defaultFileName = `${templateType.value}-template.template.yml`;
			const uri = await vscode.window.showSaveDialog({
				filters: { 'YAMLテンプレート': ['template.yml'] },
				defaultUri: vscode.Uri.joinPath(
					vscode.workspace.workspaceFolders?.[0]?.uri || vscode.Uri.file(''),
					defaultFileName
				)
			});
			if (!uri) return;

			// テンプレート内容を決定
			let content = '';
			if (templateType.value === 'form') {
				content = `- Form:\n    id: myForm\n    fields:\n      - Input:\n          label: ユーザー名\n          name: username\n          type: text\n    actions:\n      - Button:\n          kind: primary\n          label: 送信\n          submit: true\n`;
			} else if (templateType.value === 'list') {
				content = `- Container:\n    layout: vertical\n    components:\n      - Text:\n          variant: h2\n          value: 一覧タイトル\n      - Divider:\n      - Alert:\n          variant: info\n          message: サンプル一覧\n`;
			} else {
				content = `# TextUI Designer 空テンプレート\n`;
			}

			// ファイル生成・内容挿入
			await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
			// エディタで自動的に開く
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);
		})
	);

	// --- テンプレート挿入コマンド ---
	context.subscriptions.push(
		vscode.commands.registerCommand('textui-designer.insertTemplate', async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor || !editor.document.fileName.match(/\.ya?ml$/)) {
				vscode.window.showWarningMessage('YAMLファイルを開いているときのみテンプレート挿入が可能です');
				return;
			}

			// プリセットテンプレート
			const presets = [
				{ label: 'フォーム（プリセット）', value: 'form', kind: vscode.QuickPickItemKind.Default },
				{ label: '一覧（プリセット）', value: 'list', kind: vscode.QuickPickItemKind.Default },
				{ label: '空テンプレート（プリセット）', value: 'empty', kind: vscode.QuickPickItemKind.Default }
			];

			// ユーザーテンプレート（カレントディレクトリ配下の*.yml, *.yaml, *.json）
			const cwd = vscode.workspace.workspaceFolders?.[0]?.uri;
			let userTemplates: { label: string; value: vscode.Uri; kind: vscode.QuickPickItemKind }[] = [];
			if (cwd) {
				const files = await vscode.workspace.findFiles('**/*.template.{yml,yaml,json}', '**/node_modules/**', 50);
				userTemplates = files.map(uri => ({
					label: `${vscode.workspace.asRelativePath(uri)}（ユーザーテンプレート）`,
					value: uri,
					kind: vscode.QuickPickItemKind.Default
				}));
			}

			const items = [
				{ label: '--- プリセット ---', kind: vscode.QuickPickItemKind.Separator },
				...presets,
				{ label: '--- ユーザーテンプレート ---', kind: vscode.QuickPickItemKind.Separator },
				...userTemplates
			];

			const picked = await vscode.window.showQuickPick(items, { placeHolder: '挿入するテンプレートを選択してください' });
			if (!picked || !('value' in picked)) return;

			let content = '';
			if (typeof picked.value === 'string') {
				if (picked.value === 'form') {
					content = `- Form:\n    id: myForm\n    fields:\n      - Input:\n          label: ユーザー名\n          name: username\n          type: text\n    actions:\n      - Button:\n          kind: primary\n          label: 送信\n          submit: true\n`;
				} else if (picked.value === 'list') {
					content = `- Container:\n    layout: vertical\n    components:\n      - Text:\n          variant: h2\n          value: 一覧タイトル\n      - Divider:\n      - Alert:\n          variant: info\n          message: サンプル一覧\n`;
				} else {
					content = `# TextUI Designer 空テンプレート\n`;
				}
			} else if (picked.value instanceof vscode.Uri) {
				const buf = await vscode.workspace.fs.readFile(picked.value);
				content = buf.toString();
			}

			// カーソル位置のインデント量を取得
			const lineText = editor.document.lineAt(editor.selection.active.line).text;
			const indentMatch = lineText.match(/^\s*/);
			const baseIndent = indentMatch ? indentMatch[0] : '';

			// テンプレート各行にインデントを付与
			const indentedContent = content.split('\n').map((line, idx) => idx === 0 ? line : (line ? baseIndent + line : '')).join('\n');

			// カーソル位置に挿入
			editor.edit(editBuilder => {
				editBuilder.insert(editor.selection.active, indentedContent);
			});
		})
	);
}

function sendYamlToWebview(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;
	const document = editor.document;
	if (!document.fileName.endsWith('.tui.yml')) return;
	const yamlContent = document.getText();
	let json: any = null;
	let error: string | null = null;
	let schemaErrors: any = null;
	try {
		json = YAML.parse(yamlContent);
		// スキーマバリデーション
		const schemaPath = path.join(context.extensionPath, 'schemas', 'schema.json');
		const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
		const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
		const validate = ajv.compile(schema);
		const valid = validate(json);
		if (!valid) {
			schemaErrors = validate.errors;
		}
	} catch (e: any) {
		error = e.message;
	}
	setTimeout(() => {
		if (error) {
			panel.webview.postMessage({ type: 'error', error });
		} else if (schemaErrors) {
			panel.webview.postMessage({ type: 'schema-error', errors: schemaErrors });
		} else {
			panel.webview.postMessage({ type: 'json', json });
		}
	}, 100);
}

function getWebviewContent(context: vscode.ExtensionContext, panel?: vscode.WebviewPanel): string {
	let scriptSrc = '';
	if (panel) {
		const scriptUri = vscode.Uri.joinPath(context.extensionUri, 'media', 'webview.js');
		scriptSrc = panel.webview.asWebviewUri(scriptUri).toString();
	}

	// media/assets配下のCSSファイルを検出
	let cssLink = '';
	try {
		const assetsDir = path.join(context.extensionPath, 'media', 'assets');
		const files = fs.readdirSync(assetsDir);
		const cssFile = files.find(f => f.endsWith('.css'));
		if (cssFile && panel) {
			const cssUri = vscode.Uri.joinPath(context.extensionUri, 'media', 'assets', cssFile);
			const cssSrc = panel.webview.asWebviewUri(cssUri).toString();
			cssLink = `<link rel="stylesheet" href="${cssSrc}" />`;
		}
	} catch (e) {
		// CSSが見つからない場合は何もしない
	}

	return `<!DOCTYPE html>
	<html lang="ja">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>TextUI Preview</title>
		${cssLink}
	</head>
	<body>
		<div id="root"></div>
		<script src="${scriptSrc}"></script>
	</body>
	</html>`;
}

function getErrorHtml(message: string): string {
	return `<!DOCTYPE html>
	<html lang="ja">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>TextUI Preview</title>
		<style>
			body {
				display: flex;
				justify-content: center;
				align-items: center;
				height: 100vh;
				margin: 0;
				font-family: sans-serif;
				color: #666;
			}
		</style>
	</head>
	<body>
		<div>${message}</div>
	</body>
	</html>`;
}

// This method is called when your extension is deactivated
export function deactivate() {}
