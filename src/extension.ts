// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as YAML from 'yaml';

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
	let disposable = vscode.commands.registerCommand('textui-designer.openPreview', () => {
		const columnToShowIn = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		if (currentPanel) {
			currentPanel.reveal(columnToShowIn);
		} else {
			currentPanel = vscode.window.createWebviewPanel(
				'textuiPreview',
				'TextUI Preview',
				columnToShowIn || vscode.ViewColumn.One,
				{
					enableScripts: true,
					retainContextWhenHidden: true,
				}
			);

			// WebViewの内容を更新
			updateWebviewContent(currentPanel, context);

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
					updateWebviewContent(currentPanel, context);
				}
			}
		})
	);

	// ドキュメントが変更されたときの処理
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(event => {
			if (event.document.fileName.endsWith('.tui.yml')) {
				if (currentPanel) {
					updateWebviewContent(currentPanel, context);
				}
			}
		})
	);
}

function updateWebviewContent(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		panel.webview.html = getErrorHtml('エディタが開かれていません');
		return;
	}

	const document = editor.document;
	if (!document.fileName.endsWith('.tui.yml')) {
		panel.webview.html = getErrorHtml('TextUI YAMLファイルを開いてください');
		return;
	}

	// YAMLファイルの内容を取得
	const yamlContent = document.getText();

	// YAML→JSON変換
	let json: any = null;
	let error: string | null = null;
	try {
		json = YAML.parse(yamlContent);
	} catch (e: any) {
		error = e.message;
	}

	// WebViewのHTMLを生成
	panel.webview.html = getWebviewContent(context, panel);

	// JSONまたはエラーをWebViewに送信
	setTimeout(() => {
		panel.webview.postMessage(
			error
				? { type: 'error', error }
				: { type: 'json', json }
		);
	}, 100);
}

function getWebviewContent(context: vscode.ExtensionContext, panel?: vscode.WebviewPanel): string {
	let scriptSrc = '';
	if (panel) {
		const scriptUri = vscode.Uri.joinPath(context.extensionUri, 'media', 'webview.js');
		scriptSrc = panel.webview.asWebviewUri(scriptUri).toString();
	}
	return `<!DOCTYPE html>
	<html lang="ja">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>TextUI Preview</title>
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
