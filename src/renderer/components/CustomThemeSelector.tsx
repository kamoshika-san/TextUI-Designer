import React, { useState, useEffect } from 'react';

interface Theme {
  name: string;
  path: string;
  isActive: boolean;
  description?: string;
}

interface CustomThemeSelectorProps {
  className?: string;
}

export const CustomThemeSelector: React.FC<CustomThemeSelectorProps> = ({ className = '' }) => {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const vscode = (window as any).vscode;

  // コンポーネント初期化時にテーマ一覧を要求
  useEffect(() => {
    if (vscode && vscode.postMessage) {
      console.log('[CustomThemeSelector] テーマ一覧を要求');
      vscode.postMessage({ type: 'get-themes' });
    }
  }, []);

  // WebViewからのメッセージを監視
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'available-themes') {
        console.log('[CustomThemeSelector] テーマ一覧を受信:', message.themes);
        setThemes(message.themes || []);
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // テーマ切り替え処理
  const handleThemeSwitch = (theme: Theme) => {
    if (vscode && vscode.postMessage && !theme.isActive) {
      console.log('[CustomThemeSelector] テーマ切り替えを要求:', theme);
      setIsLoading(true);
      vscode.postMessage({ 
        type: 'theme-switch', 
        themePath: theme.path 
      });
    }
    setIsOpen(false);
  };

  // アクティブなテーマを取得
  const activeTheme = themes.find(t => t.isActive) || themes[0];

  // 外部クリックでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.custom-theme-selector')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  if (themes.length === 0) {
    return null; // テーマがない場合は非表示
  }

  // パネル内用: position: static, 右上固定用: position: fixed
  const isFixed = className.includes('fixed') || className.includes('absolute');

  return (
    <div className={`custom-theme-selector ${className}`} style={{ position: isFixed ? 'fixed' : 'static' }}>
      {/* メインボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        title={`現在のテーマ: ${activeTheme?.name || 'デフォルト'}`}
        className={isFixed
          ? ''
          : 'w-full min-w-[160px] h-10 px-4 py-2 bg-gray-700 text-white rounded-md shadow-sm flex items-center gap-2 transition-colors hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60'}
        style={isFixed ? {
          position: 'fixed',
          top: '1rem',
          right: '10rem',
          backgroundColor: 'rgba(75, 85, 99, 0.8)',
          color: '#d1d5db',
          border: '1px solid rgba(107, 114, 128, 0.5)',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          cursor: isLoading ? 'wait' : 'pointer',
          transition: 'all 0.2s',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '2.5rem',
          minWidth: '5rem',
          opacity: isLoading ? 0.7 : 1
        } : {}}
        onMouseEnter={isFixed ? (e) => {
          if (!isLoading) {
            e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.9)';
            e.currentTarget.style.borderColor = 'rgba(75, 85, 99, 0.7)';
          }
        } : undefined}
        onMouseLeave={isFixed ? (e) => {
          if (!isLoading) {
            e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.8)';
            e.currentTarget.style.borderColor = 'rgba(107, 114, 128, 0.5)';
          }
        } : undefined}
      >
        <span className="mr-1">🎨</span>
        {isLoading ? (
          <span className="text-xs">⏳</span>
        ) : (
          <>
            <span className="truncate max-w-[6rem]">{activeTheme?.name || 'テーマ'}</span>
            <span className="ml-1 text-xs">{isOpen ? '▲' : '▼'}</span>
          </>
        )}
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div
          style={isFixed ? {
            position: 'fixed',
            top: '4rem',
            right: '10rem',
            backgroundColor: 'rgba(31, 41, 55, 0.95)',
            border: '1px solid rgba(75, 85, 99, 0.7)',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
            zIndex: 1001,
            minWidth: '12rem',
            maxWidth: '20rem',
            maxHeight: '20rem',
            overflowY: 'auto',
            backdropFilter: 'blur(10px)'
          } : {
            position: 'absolute',
            top: '2.8rem',
            left: 0,
            backgroundColor: 'rgba(31, 41, 55, 0.95)',
            border: '1px solid rgba(75, 85, 99, 0.7)',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
            zIndex: 10,
            minWidth: '14rem',
            maxWidth: '22rem',
            maxHeight: '20rem',
            overflowY: 'auto',
            backdropFilter: 'blur(10px)'
          }}
        >
          {themes.map((theme, index) => (
            <button
              key={`${theme.path}-${index}`}
              onClick={() => handleThemeSwitch(theme)}
              disabled={theme.isActive || isLoading}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: theme.isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: theme.isActive ? '#60a5fa' : '#d1d5db',
                border: 'none',
                borderBottom: index < themes.length - 1 ? '1px solid rgba(75, 85, 99, 0.3)' : 'none',
                cursor: theme.isActive || isLoading ? 'default' : 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.2s',
                borderRadius: index === 0 ? '0.5rem 0.5rem 0 0' : 
                            index === themes.length - 1 ? '0 0 0.5rem 0.5rem' : '0'
              }}
              onMouseEnter={(e) => {
                if (!theme.isActive && !isLoading) {
                  e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!theme.isActive && !isLoading) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ 
                    fontWeight: theme.isActive ? 'bold' : 'normal',
                    fontSize: '0.875rem',
                    marginBottom: theme.description ? '0.25rem' : '0'
                  }}>
                    {theme.name}
                  </div>
                  {theme.description && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#9ca3af',
                      maxWidth: '10rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {theme.description}
                    </div>
                  )}
                </div>
                {theme.isActive && (
                  <span style={{ fontSize: '0.875rem', color: '#10b981' }}>✓</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}; 