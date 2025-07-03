/**
 * 包括的なVSCodeモック
 * テスト環境でVSCode APIをシミュレートします
 */

// コンソールメソッドを保存
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
};

class MockOutputChannel {
  constructor(name) {
    this.name = name;
    this.logs = [];
  }

  append(value) {
    this.logs.push(value);
  }

  appendLine(value) {
    this.logs.push(value + '\n');
  }

  clear() {
    this.logs = [];
  }

  show() {
    // No-op in tests
  }

  hide() {
    // No-op in tests
  }

  dispose() {
    this.logs = [];
  }
}

class MockWorkspaceConfiguration {
  constructor(values = {}) {
    this.values = values;
  }

  get(key, defaultValue) {
    return this.values.hasOwnProperty(key) ? this.values[key] : defaultValue;
  }

  update(key, value, target) {
    this.values[key] = value;
    return Promise.resolve();
  }

  has(key) {
    return this.values.hasOwnProperty(key);
  }

  inspect(key) {
    return {
      key,
      defaultValue: undefined,
      globalValue: this.values[key],
      workspaceValue: undefined,
      workspaceFolderValue: undefined
    };
  }
}

class MockTextDocument {
  constructor(uri, languageId = 'yaml', version = 1, content = '') {
    this.uri = uri;
    this.fileName = uri.fsPath || uri;
    this.languageId = languageId;
    this.version = version;
    this.isDirty = false;
    this.isClosed = false;
    this.content = content;
  }

  getText() {
    return this.content;
  }

  save() {
    return Promise.resolve(true);
  }
}

class MockTextEditor {
  constructor(document) {
    this.document = document;
    this.selection = null;
    this.selections = [];
    this.visibleRanges = [];
    this.options = {};
    this.viewColumn = 1;
  }
}

class MockUri {
  constructor(scheme, authority, path, query, fragment) {
    this.scheme = scheme || 'file';
    this.authority = authority || '';
    this.path = path || '';
    this.query = query || '';
    this.fragment = fragment || '';
    this.fsPath = this.path;
  }

  static file(path) {
    return new MockUri('file', '', path);
  }

  static parse(value) {
    return new MockUri('file', '', value);
  }

  toString() {
    return `${this.scheme}://${this.authority}${this.path}`;
  }
}

class MockWebviewPanel {
  constructor(viewType, title, showOptions, options) {
    this.viewType = viewType;
    this.title = title;
    this.webview = {
      html: '',
      options: options?.webviewOptions || {},
      postMessage: (message) => Promise.resolve(),
      onDidReceiveMessage: () => ({ dispose: () => {} })
    };
    this.visible = true;
    this.active = true;
    this.viewColumn = showOptions;
    this.onDidDispose = () => ({ dispose: () => {} });
    this.onDidChangeViewState = () => ({ dispose: () => {} });
  }

  reveal(viewColumn, preserveFocus) {
    this.viewColumn = viewColumn;
  }

  dispose() {
    this.visible = false;
  }
}

// メインのVSCodeモックオブジェクト
const mockVscode = {
  // Console methods (グローバルconsoleを保持)
  console: originalConsole,

  // Configuration
  workspace: {
    getConfiguration: (section) => {
      const defaultConfigs = {
        'textui-designer': {
          'supportedFileExtensions': ['.tui.yml', '.tui.yaml'],
          'autoPreview.enabled': true,
          'devTools.enabled': false,
          'webview.disableThemeVariables': false
        }
      };
      
      const config = defaultConfigs[section] || {};
      return new MockWorkspaceConfiguration(config);
    },
    
    workspaceFolders: [],
    
    openTextDocument: (uri) => {
      const document = new MockTextDocument(uri);
      return Promise.resolve(document);
    },

    onDidSaveTextDocument: () => ({ dispose: () => {} }),
    onDidChangeTextDocument: () => ({ dispose: () => {} }),
    onDidCloseTextDocument: () => ({ dispose: () => {} })
  },

  // Window
  window: {
    createOutputChannel: (name) => new MockOutputChannel(name),
    
    showInformationMessage: (message, ...items) => Promise.resolve(items[0]),
    showWarningMessage: (message, ...items) => Promise.resolve(items[0]),
    showErrorMessage: (message, ...items) => Promise.resolve(items[0]),
    
    createWebviewPanel: (viewType, title, showOptions, options) => {
      return new MockWebviewPanel(viewType, title, showOptions, options);
    },

    activeTextEditor: null,
    visibleTextEditors: [],
    terminals: [],

    showTextDocument: (document, column, preserveFocus) => {
      const editor = new MockTextEditor(document);
      mockVscode.window.activeTextEditor = editor;
      return Promise.resolve(editor);
    },

    onDidChangeActiveTextEditor: () => ({ dispose: () => {} }),
    onDidChangeVisibleTextEditors: () => ({ dispose: () => {} })
  },

  // Commands
  commands: {
    registerCommand: (command, callback) => ({ dispose: () => {} }),
    executeCommand: (command, ...args) => Promise.resolve(),
    getCommands: () => Promise.resolve([
      'textui-designer.openPreview',
      'textui-designer.export',
      'textui-designer.createTemplate',
      'textui-designer.insertTemplate'
    ])
  },

  // Languages
  languages: {
    registerCompletionItemProvider: () => ({ dispose: () => {} }),
    registerHoverProvider: () => ({ dispose: () => {} }),
    registerDefinitionProvider: () => ({ dispose: () => {} }),
    createDiagnosticCollection: () => ({
      set: () => {},
      delete: () => {},
      clear: () => {},
      dispose: () => {}
    })
  },

  // Uri
  Uri: MockUri,

  // ConfigurationTarget
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3
  },

  // ViewColumn
  ViewColumn: {
    Active: -1,
    Beside: -2,
    One: 1,
    Two: 2,
    Three: 3
  },

  // Extensions
  extensions: {
    getExtension: () => undefined,
    all: []
  },

  // FileSystem
  FileSystemError: class FileSystemError extends Error {
    constructor(message) {
      super(message);
      this.name = 'FileSystemError';
    }
  }
};

module.exports = mockVscode; 