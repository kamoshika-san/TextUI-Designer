import React, { useState, useEffect } from 'react';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeToggleProps {
  className?: string;
  onThemeChange?: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', onThemeChange }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('auto');
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('dark');

  // 初期化時にlocalStorageから設定を読み込み
  useEffect(() => {
    const savedMode = localStorage.getItem('textui-theme-mode') as ThemeMode;
    if (savedMode && ['light', 'dark', 'auto'].includes(savedMode)) {
      setThemeMode(savedMode);
    }
  }, []);

  // テーマモードが変更された時の処理
  useEffect(() => {
    localStorage.setItem('textui-theme-mode', themeMode);
    
    if (themeMode === 'auto') {
      // VSCodeのテーマに連動
      const vscode = (window as any).vscode;
      if (vscode && vscode.getState) {
        const state = vscode.getState();
        const vscodeTheme = state?.theme || 'dark';
        setCurrentTheme(vscodeTheme === 'light' ? 'light' : 'dark');
      }
    } else {
      setCurrentTheme(themeMode);
    }
  }, [themeMode]);

  // 現在のテーマに応じてbodyクラスを設定
  useEffect(() => {
    const body = document.body;
    if (currentTheme === 'dark') {
      body.classList.add('dark');
      body.classList.remove('light');
    } else {
      body.classList.add('light');
      body.classList.remove('dark');
    }
  }, [currentTheme]);

  // VSCodeからのメッセージでテーマ変更を検知
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'theme-change' && themeMode === 'auto') {
        const newTheme = message.theme === 'light' ? 'light' : 'dark';
        setCurrentTheme(newTheme);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [themeMode]);

  const handleThemeChange = () => {
    const modes: ThemeMode[] = ['auto', 'light', 'dark'];
    const currentIndex = modes.indexOf(themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setThemeMode(modes[nextIndex]);
  };

  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light':
        return '☀️';
      case 'dark':
        return '🌙';
      case 'auto':
        return '🔄';
      default:
        return '🌙';
    }
  };

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'light':
        return 'ライト';
      case 'dark':
        return 'ダーク';
      case 'auto':
        return '自動';
      default:
        return '自動';
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => { setThemeMode('light'); onThemeChange && onThemeChange(); }}
        className={`w-8 h-8 flex items-center justify-center rounded border text-lg transition-colors
          ${themeMode === 'light' ? 'bg-yellow-100 border-yellow-400 text-yellow-700 shadow' : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-yellow-50 dark:hover:bg-gray-600'}`}
        title="ライトモード"
      >
        ☀️
      </button>
      <button
        onClick={() => { setThemeMode('dark'); onThemeChange && onThemeChange(); }}
        className={`w-8 h-8 flex items-center justify-center rounded border text-lg transition-colors
          ${themeMode === 'dark' ? 'bg-blue-900 border-blue-400 text-blue-100 shadow' : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-blue-900/30 dark:hover:bg-gray-600'}`}
        title="ダークモード"
      >
        🌙
      </button>
      <button
        onClick={() => { setThemeMode('auto'); onThemeChange && onThemeChange(); }}
        className={`w-8 h-8 flex items-center justify-center rounded border text-lg transition-colors
          ${themeMode === 'auto' ? 'bg-green-100 border-green-400 text-green-700 shadow' : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-600'}`}
        title="システム設定に合わせる"
      >
        🖥️
      </button>
    </div>
  );
}; 