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
		if (!document.fileName.endsWith('.tui.yml')) return;
		const text = document.getText();
		let diagnostics: vscode.Diagnostic[] = [];
		try {
			const yaml = YAML.parse(text);
			const schemaPath = path.join(context.extensionPath, 'schemas', 'schema.json');
			const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
			const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
			const validate = ajv.compile(schema);
			const valid = validate(yaml);
			if (!valid && validate.errors) {
				for (const err of validate.errors) {
					const key = err.instancePath.split('/').filter(Boolean).pop();
					if (key) {
						const regex = new RegExp(`^\s*${key}:`, 'm');
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
