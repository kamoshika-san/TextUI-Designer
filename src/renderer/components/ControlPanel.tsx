import React, { useState, useRef, useEffect } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { CustomThemeSelector } from './CustomThemeSelector';
import { ParameterControl } from './ParameterControl';

interface ControlPanelProps {
  onExport: () => void;
  onParameterChange: (params: Record<string, any>) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ onExport, onParameterChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'main' | 'parameters' | 'themes'>('main');
  const panelRef = useRef<HTMLDivElement>(null);
  const paramRef = useRef<any>(null);

  // テーマ切り替え時にパラメータを再同期
  const handleThemeChange = () => {
    if (paramRef.current && typeof paramRef.current.reloadParams === 'function') {
      paramRef.current.reloadParams();
    }
  };

  // パネル外クリックで閉じる
  useEffect(() => {
    if (!isExpanded) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isExpanded]);

  return (
    <div ref={panelRef} className="fixed top-4 right-4 z-50">
      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg backdrop-blur-sm">
        {/* メインコントロール */}
        <div className="flex items-center space-x-2 p-3">
          {/* エクスポートボタン */}
          <button 
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition-colors shadow-sm min-w-[110px]"
            title="エクスポート"
          >
            <span aria-hidden>📤</span>
            <span>Export</span>
          </button>

          {/* パラメータボタン */}
          <button 
            onClick={() => {
              setIsExpanded(!isExpanded);
              setActiveTab('parameters');
            }}
            className={`px-3 py-2 text-sm rounded-md transition-colors font-medium ${
              activeTab === 'parameters' && isExpanded
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            title="パラメータ制御"
          >
            ⚙️ Params
          </button>

          {/* テーマボタン */}
          <button 
            onClick={() => {
              setIsExpanded(!isExpanded);
              setActiveTab('themes');
            }}
            className={`px-3 py-2 text-sm rounded-md transition-colors font-medium ${
              activeTab === 'themes' && isExpanded
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            title="テーマ設定"
          >
            🎨 Theme
          </button>

          {/* 展開/折りたたみボタン */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            title={isExpanded ? "折りたたむ" : "展開する"}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>

        {/* 展開パネル */}
        {isExpanded && (
          <div className="border-t border-gray-300 dark:border-gray-600">
            {/* タブヘッダー */}
            <div className="flex border-b border-gray-300 dark:border-gray-600">
              <button
                onClick={() => setActiveTab('parameters')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'parameters'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-b-2 border-green-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                パラメータ
              </button>
              <button
                onClick={() => setActiveTab('themes')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'themes'
                    ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-b-2 border-purple-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                テーマ
              </button>
            </div>

            {/* タブコンテンツ */}
            <div className="p-4 max-h-96 overflow-y-auto">
              {activeTab === 'parameters' && (
                <ParameterControl ref={paramRef} onParameterChange={onParameterChange} />
              )}
              {activeTab === 'themes' && (
                <div className="flex flex-col gap-6">
                  {/* テーマ選択ラベル＋コントロール群を横並びで配置 */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">テーマ選択</label>
                    <div className="flex items-center gap-2 ml-6">
                      <CustomThemeSelector className="min-w-[110px] w-auto h-8 text-sm px-1 flex items-center flex-shrink-0" />
                      <ThemeToggle onClick={handleThemeChange} />
                    </div>
                  </div>
                  {/* ダーク/ライト/自動切り替えラベルは不要なので削除 */}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 