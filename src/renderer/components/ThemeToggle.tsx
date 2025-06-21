import React, { useState, useEffect } from 'react';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
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
    <button
      onClick={handleThemeChange}
      className={`theme-toggle ${className}`}
      title={`テーマ: ${getThemeLabel()} (クリックで切り替え)`}
      style={{
        position: 'fixed',
        top: '1rem',
        right: '6rem', // Exportボタンとの間隔を広げる
        backgroundColor: 'rgba(75, 85, 99, 0.8)',
        color: '#d1d5db',
        border: '1px solid rgba(107, 114, 128, 0.5)',
        padding: '0.5rem 0.75rem',
        borderRadius: '0.375rem',
        fontSize: '0.875rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '2.5rem', // Exportボタンと同じ高さ
        minWidth: '3rem',
        width: '3rem' // 幅を固定
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.9)';
        e.currentTarget.style.borderColor = 'rgba(75, 85, 99, 0.7)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.8)';
        e.currentTarget.style.borderColor = 'rgba(107, 114, 128, 0.5)';
      }}
    >
      <span style={{ fontSize: '1rem' }}>{getThemeIcon()}</span>
    </button>
  );
}; 