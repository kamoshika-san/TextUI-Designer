// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as YAML from 'yaml';
import Ajv from 'ajv';
import { ExportManager } from './exporters';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let currentPanel: vscode.WebviewPanel | undefined = undefined;
	let lastTuiFile: string | undefined = undefined; // 最後に開いていたtui.ymlファイルのパスを保持
	const exportManager = new ExportManager();

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
					// 開発者ツールを有効化
					enableFindWidget: true,
					// リソースルートを制限してテーマ変数の自動適用を防ぐ
					localResourceRoots: [context.extensionUri],
					// 開発モードでのみ開発者ツールを有効
					...(process.env.NODE_ENV === 'development' && {
						enableCommandUris: true,
					}),
				}
			);

			// WebViewのHTMLは初回のみセット
			currentPanel.webview.html = getWebviewContent(context, currentPanel);

			// 初回データ送信
			sendYamlToWebview(currentPanel, context);

			// WebViewからのメッセージを処理
			currentPanel.webview.onDidReceiveMessage(
				async (message) => {
					if (message.type === 'export') {
						// Exportコマンドを実行
						await vscode.commands.executeCommand('textui-designer.export');
					}
				},
				undefined,
				context.subscriptions
			);

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

	// 開発者ツールを開くコマンドの登録
	context.subscriptions.push(
		vscode.commands.registerCommand('textui-designer.openDevTools', () => {
			if (currentPanel) {
				// WebViewの開発者ツールを開く
				currentPanel.webview.postMessage({ type: 'openDevTools' });
			} else {
				vscode.window.showWarningMessage('プレビューが開かれていません。先にプレビューを開いてください。');
			}
		})
	);

	// アクティブなエディタが変更されたときの処理
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor && editor.document.fileName.endsWith('.tui.yml')) {
				lastTuiFile = editor.document.fileName; // ファイルパスを保持
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

	// --- Exportコマンド ---
	context.subscriptions.push(
		vscode.commands.registerCommand('textui-designer.export', async () => {
			// アクティブなエディタまたは最後に開いていたtui.ymlファイルを取得
			let tuiFile: string | undefined;
			const editor = vscode.window.activeTextEditor;
			
			if (editor && editor.document.fileName.endsWith('.tui.yml')) {
				tuiFile = editor.document.fileName;
			} else if (lastTuiFile && fs.existsSync(lastTuiFile)) {
				tuiFile = lastTuiFile;
			} else {
				vscode.window.showWarningMessage('*.tui.ymlファイルを開いているか、プレビューが表示されている状態でのみExportが可能です');
				return;
			}

			// 出力形式を選択
			const format = await vscode.window.showQuickPick([
				{ label: 'React + Tailwind CSS (.tsx)', value: 'react' },
				{ label: 'Pug Template (.pug)', value: 'pug' },
				{ label: 'Static HTML (.html)', value: 'html' }
			], { placeHolder: '出力形式を選択してください' });
			
			if (!format) return;

			// 出力先ファイルを選択
			const defaultFileName = `generated-ui${exportManager.getFileExtension(format.value)}`;
			const uri = await vscode.window.showSaveDialog({
				filters: { 
					'React Component': ['tsx'],
					'Pug Template': ['pug'],
					'HTML File': ['html']
				},
				defaultUri: vscode.Uri.joinPath(
					vscode.workspace.workspaceFolders?.[0]?.uri || vscode.Uri.file(''),
					defaultFileName
				)
			});
			
			if (!uri) return;

			try {
				// プログレス表示
				await vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification,
					title: 'TextUI Export',
					cancellable: false
				}, async (progress) => {
					progress.report({ message: 'コードを生成中...' });
					
					// Export実行
					const generatedCode = await exportManager.exportFromFile(
						tuiFile,
						{ format: format.value as 'react' | 'pug' | 'html' }
					);

					// ファイルに保存
					await vscode.workspace.fs.writeFile(uri, Buffer.from(generatedCode, 'utf8'));
					
					progress.report({ message: '完了' });
				});

				// 成功メッセージ
				vscode.window.showInformationMessage(
					`Export完了: ${vscode.workspace.asRelativePath(uri)}`
				);

				// 生成されたファイルを開く
				const doc = await vscode.workspace.openTextDocument(uri);
				await vscode.window.showTextDocument(doc);

			} catch (error) {
				vscode.window.showErrorMessage(
					`Export失敗: ${error instanceof Error ? error.message : String(error)}`
				);
			}
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
		const cssFiles = files.filter(f => f.endsWith('.css'));
		
		if (cssFiles.length > 0 && panel) {
			// 最新のCSSファイルを選択（ファイルサイズが大きい方を優先）
			let latestCssFile = cssFiles[0];
			let maxSize = 0;
			
			for (const cssFile of cssFiles) {
				const filePath = path.join(assetsDir, cssFile);
				const stats = fs.statSync(filePath);
				if (stats.size > maxSize) {
					maxSize = stats.size;
					latestCssFile = cssFile;
				}
			}
			
			const cssUri = vscode.Uri.joinPath(context.extensionUri, 'media', 'assets', latestCssFile);
			const cssSrc = panel.webview.asWebviewUri(cssUri).toString();
			cssLink = `<link rel="stylesheet" href="${cssSrc}" />`;
		}
	} catch (e) {
		// CSSが見つからない場合は何もしない
		console.log('CSS file detection error:', e);
	}

	return `<!DOCTYPE html>
	<html lang="ja">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>TextUI Preview</title>
		<style>
			/* VS Codeテーマ変数の影響を排除 */
			:root {
				--vscode-foreground: unset !important;
				--vscode-background: unset !important;
				--vscode-editor-foreground: unset !important;
				--vscode-editor-background: unset !important;
				--vscode-sideBar-background: unset !important;
				--vscode-descriptionForeground: unset !important;
				--vscode-focusBorder: unset !important;
				--vscode-selection-background: unset !important;
				--vscode-button-background: unset !important;
				--vscode-button-foreground: unset !important;
				--vscode-button-hoverBackground: unset !important;
				--vscode-input-background: unset !important;
				--vscode-input-foreground: unset !important;
				--vscode-input-border: unset !important;
				--vscode-errorForeground: unset !important;
				--vscode-warningForeground: unset !important;
				--vscode-infoForeground: unset !important;
				--vscode-font-family: unset !important;
				--vscode-font-size: unset !important;
				--vscode-font-weight: unset !important;
				--vscode-line-height: unset !important;
				--vscode-letter-spacing: unset !important;
				--vscode-text-decoration: unset !important;
				--vscode-text-transform: unset !important;
				--vscode-text-align: unset !important;
				--vscode-vertical-align: unset !important;
				--vscode-white-space: unset !important;
				--vscode-word-break: unset !important;
				--vscode-word-wrap: unset !important;
				--vscode-overflow-wrap: unset !important;
				--vscode-text-overflow: unset !important;
				--vscode-text-indent: unset !important;
				--vscode-text-shadow: unset !important;
				--vscode-box-shadow: unset !important;
				--vscode-border-radius: unset !important;
				--vscode-border-width: unset !important;
				--vscode-border-style: unset !important;
				--vscode-border-color: unset !important;
				--vscode-outline: unset !important;
				--vscode-outline-offset: unset !important;
				--vscode-margin: unset !important;
				--vscode-padding: unset !important;
				--vscode-width: unset !important;
				--vscode-height: unset !important;
				--vscode-min-width: unset !important;
				--vscode-max-width: unset !important;
				--vscode-min-height: unset !important;
				--vscode-max-height: unset !important;
				--vscode-display: unset !important;
				--vscode-position: unset !important;
				--vscode-top: unset !important;
				--vscode-right: unset !important;
				--vscode-bottom: unset !important;
				--vscode-left: unset !important;
				--vscode-z-index: unset !important;
				--vscode-float: unset !important;
				--vscode-clear: unset !important;
				--vscode-overflow: unset !important;
				--vscode-overflow-x: unset !important;
				--vscode-overflow-y: unset !important;
				--vscode-clip: unset !important;
				--vscode-zoom: unset !important;
				--vscode-opacity: unset !important;
				--vscode-visibility: unset !important;
				--vscode-cursor: unset !important;
				--vscode-pointer-events: unset !important;
				--vscode-user-select: unset !important;
				--vscode-resize: unset !important;
				--vscode-transition: unset !important;
				--vscode-animation: unset !important;
				--vscode-transform: unset !important;
				--vscode-transform-origin: unset !important;
				--vscode-backface-visibility: unset !important;
				--vscode-perspective: unset !important;
				--vscode-perspective-origin: unset !important;
				--vscode-filter: unset !important;
				--vscode-backdrop-filter: unset !important;
				--vscode-mix-blend-mode: unset !important;
				--vscode-isolation: unset !important;
				--vscode-object-fit: unset !important;
				--vscode-object-position: unset !important;
				--vscode-image-rendering: unset !important;
				--vscode-image-orientation: unset !important;
				--vscode-image-resolution: unset !important;
				--vscode-shape-image-threshold: unset !important;
				--vscode-shape-margin: unset !important;
				--vscode-shape-outside: unset !important;
				--vscode-clip-path: unset !important;
				--vscode-mask: unset !important;
				--vscode-mask-clip: unset !important;
				--vscode-mask-composite: unset !important;
				--vscode-mask-image: unset !important;
				--vscode-mask-mode: unset !important;
				--vscode-mask-origin: unset !important;
				--vscode-mask-position: unset !important;
				--vscode-mask-repeat: unset !important;
				--vscode-mask-size: unset !important;
				--vscode-mask-type: unset !important;
				--vscode-paint-order: unset !important;
				--vscode-vector-effect: unset !important;
				--vscode-d: unset !important;
				--vscode-calc: unset !important;
				--vscode-attr: unset !important;
				--vscode-counter-increment: unset !important;
				--vscode-counter-reset: unset !important;
				--vscode-counter-set: unset !important;
				--vscode-quotes: unset !important;
				--vscode-content: unset !important;
				--vscode-target: unset !important;
				--vscode-tab-size: unset !important;
				--vscode-text-size-adjust: unset !important;
				--vscode-text-rendering: unset !important;
				--vscode-text-orientation: unset !important;
				--vscode-text-emphasis: unset !important;
				--vscode-text-emphasis-color: unset !important;
				--vscode-text-emphasis-style: unset !important;
				--vscode-text-emphasis-position: unset !important;
				--vscode-text-underline-position: unset !important;
				--vscode-text-underline-offset: unset !important;
				--vscode-text-combine-upright: unset !important;
				--vscode-text-autospace: unset !important;
				--vscode-text-justify: unset !important;
				--vscode-text-align-last: unset !important;
				--vscode-text-align-all: unset !important;
				--vscode-text-spacing: unset !important;
				--vscode-text-spacing-trim: unset !important;
				--vscode-text-edge: unset !important;
				--vscode-text-group-align: unset !important;
				--vscode-text-group-justify: unset !important;
				--vscode-text-group-kinsoku: unset !important;
				--vscode-text-group-overflow: unset !important;
				--vscode-text-group-wrap: unset !important;
				--vscode-text-group-indent: unset !important;
				--vscode-text-group-indent-first: unset !important;
				--vscode-text-group-indent-last: unset !important;
				--vscode-text-group-indent-hanging: unset !important;
				--vscode-text-group-indent-negative: unset !important;
				--vscode-text-group-indent-positive: unset !important;
				--vscode-text-group-indent-zero: unset !important;
				--vscode-text-group-indent-inherit: unset !important;
				--vscode-text-group-indent-initial: unset !important;
				--vscode-text-group-indent-unset: unset !important;
				--vscode-text-group-indent-revert: unset !important;
				--vscode-text-group-indent-revert-layer: unset !important;
			}
			
			/* 基本的なスタイルリセット（Tailwind CSSを妨げない程度） */
			*,
			*::before,
			*::after {
				box-sizing: border-box;
			}
			
			/* HTML要素の基本設定 */
			html {
				font-size: 16px;
				line-height: 1.5;
				-webkit-text-size-adjust: 100%;
				-ms-text-size-adjust: 100%;
			}
			
			body {
				margin: 0;
				padding: 0;
				font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
				font-size: 16px;
				line-height: 1.5;
				color: #cccccc;
				background-color: #1e1e1e;
				-webkit-font-smoothing: antialiased;
				-moz-osx-font-smoothing: grayscale;
			}
			
			/* フォーム要素の基本リセット */
			input,
			button,
			textarea,
			select {
				font-family: inherit;
				font-size: inherit;
				line-height: inherit;
				color: inherit;
				margin: 0;
				padding: 0;
			}
			
			/* リンクの基本リセット */
			a {
				color: inherit;
				text-decoration: none;
			}
			
			/* 画像の基本リセット */
			img {
				max-width: 100%;
				height: auto;
			}
			
			/* テーブルの基本リセット */
			table {
				border-collapse: collapse;
				border-spacing: 0;
			}
			
			/* 引用の基本リセット */
			blockquote,
			q {
				quotes: none;
			}
			
			blockquote:before,
			blockquote:after,
			q:before,
			q:after {
				content: '';
				content: none;
			}
			
			/* プレースホルダーの基本リセット */
			::placeholder {
				opacity: 1;
			}
			
			/* スクロールバーの非表示 */
			::-webkit-scrollbar {
				width: 0;
				height: 0;
			}
			
			/* Tailwind CSSが確実に適用されるように */
			#root {
				display: block;
			}

			/* エクスポートボタンのスタイル */
			.export-button {
				position: fixed;
				top: 8px;
				right: 8px;
				z-index: 1000;
				background-color: #f3f4f6;
				color: #374151;
				border: 1px solid #d1d5db;
				border-radius: 4px;
				padding: 4px 8px;
				font-size: 12px;
				font-weight: normal;
				cursor: pointer;
				transition: all 0.2s;
				opacity: 0.8;
				box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
			}

			.export-button:hover {
				background-color: #e5e7eb;
				border-color: #9ca3af;
				opacity: 1;
			}

			.export-button:active {
				background-color: #d1d5db;
				transform: translateY(1px);
			}
		</style>
		${cssLink}
	</head>
	<body>
		<button class="export-button" onclick="exportUI()">Export</button>
		<div id="root"></div>
		<script>
			function exportUI() {
				if (window.vscode) {
					window.vscode.postMessage({ type: 'export' });
				}
			}
		</script>
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
