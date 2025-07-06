import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

interface ParameterControlProps {
  onParameterChange: (params: Record<string, any>) => void;
}

export const ParameterControl = forwardRef<any, ParameterControlProps>(({ onParameterChange }, ref) => {
  // localStorageキー
  const STORAGE_KEY = 'textui-params';

  // 初期値
  const defaultParams = {
    showWelcome: true,
    showAdvanced: false,
    userRole: 'user',
    welcomeMessage: 'ようこそ！'
  };

  // localStorageから復元
  const loadParams = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...defaultParams, ...JSON.parse(saved) };
      }
    } catch (e) {}
    return defaultParams;
  };

  const [params, setParams] = useState<null | typeof defaultParams>(null);

  // マウント時にもlocalStorageから再セット（WebViewリロードやテーマ切り替え時の対策）
  useEffect(() => {
    const loaded = loadParams();
    setParams(loaded);
    onParameterChange(loaded); // 初回も必ず送信
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ref経由で外部からパラメータ再同期できるようにする
  useImperativeHandle(ref, () => ({
    reloadParams: () => setParams(loadParams())
  }));

  // パラメータ変更時にlocalStorageへ保存（useEffectでonParameterChangeは呼ばない）
  useEffect(() => {
    if (params) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
      } catch (e) {}
    }
  }, [params]);

  const handleParamChange = (key: string, value: any) => {
    setParams(prev => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      onParameterChange(next);
      return next;
    });
  };

  // リセット時もlocalStorageをクリア
  const handleReset = () => {
    setParams(defaultParams);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    onParameterChange(defaultParams);
  };

  if (!params) return null;

  return (
    <div className="space-y-3">
      {/* showWelcome */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-700 dark:text-gray-300">
          showWelcome
        </label>
        <input
          type="checkbox"
          checked={params.showWelcome}
          onChange={(e) => handleParamChange('showWelcome', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      </div>
      {/* showAdvanced */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-700 dark:text-gray-300">
          showAdvanced
        </label>
        <input
          type="checkbox"
          checked={params.showAdvanced}
          onChange={(e) => handleParamChange('showAdvanced', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      </div>
      {/* userRole */}
      <div>
        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
          userRole
        </label>
        <select
          value={params.userRole}
          onChange={(e) => handleParamChange('userRole', e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="user">user</option>
          <option value="admin">admin</option>
          <option value="guest">guest</option>
        </select>
      </div>
      {/* welcomeMessage */}
      <div>
        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
          welcomeMessage
        </label>
        <input
          type="text"
          value={params.welcomeMessage}
          onChange={(e) => handleParamChange('welcomeMessage', e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      {/* リセットボタン */}
      <button
        onClick={handleReset}
        className="w-full px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
      >
        リセット
      </button>
    </div>
  );
}); 