# TextUI Designer パフォーマンス監視ガイド

## 🎯 概要

TextUI Designerのパフォーマンス監視システムは、拡張機能の性能をリアルタイムで測定し、最適化の機会を特定するためのツールです。

## 🚀 パフォーマンス監視の有効化

### 1. 自動有効化
パフォーマンス監視は、開発モードでは自動的に有効になります。

### 2. 手動有効化
VS Codeのコマンドパレット（`Ctrl+Shift+P`）から以下のコマンドを実行：

```
TextUI Designer: Enable Performance Monitoring
```

### 3. 設定での有効化
VS Codeの設定で `textui-designer.performance.enablePerformanceLogs` を `true` に設定

## 📊 パフォーマンスレポートの表示

### 1. コマンドパレットから表示
```
TextUI Designer: Show Performance Report
```

### 2. プログラムから表示
```typescript
import { PerformanceMonitor } from './utils/performance-monitor';

const monitor = PerformanceMonitor.getInstance();
const report = monitor.generateReport();
console.log(report);
```

## 📈 測定されるメトリクス

### レンダリング時間
- **平均レンダリング時間**: WebViewの更新にかかる平均時間
- **測定箇所**: YAML解析、WebView更新、コンポーネントレンダリング

### キャッシュ効率
- **キャッシュヒット率**: キャッシュからデータを取得した割合
- **測定箇所**: WebView更新時のキャッシュ使用状況

### 差分更新効率
- **差分更新効率**: 変更されたコンポーネントの割合
- **測定箇所**: DSLの変更検出と部分更新

### メモリ使用量
- **メモリ使用量**: 現在のヒープ使用量（MB）
- **測定箇所**: プロセスのメモリ使用状況

### エクスポート時間
- **エクスポート時間**: ファイルエクスポートにかかる時間
- **測定箇所**: HTML/React/Pug形式への変換処理

## 🔧 デバッグ機能

### サンプルイベントの生成
テスト用のサンプルデータを生成してパフォーマンス監視をテストできます：

```
TextUI Designer: Generate Sample Events
```

### メトリクスのクリア
蓄積されたパフォーマンスデータをクリアできます：

```
TextUI Designer: Clear Performance Metrics
```

### 監視の切り替え
パフォーマンス監視の有効/無効を切り替えできます：

```
TextUI Designer: Toggle Performance Monitoring
```

## 📝 パフォーマンスレポートの読み方

### メトリクスセクション
```
## メトリクス
- 平均レンダリング時間: 150.25ms
- キャッシュヒット率: 75.0%
- 差分更新効率: 85.0%
- メモリ使用量: 45.67MB
- 総操作数: 42
```

### 最近のイベントセクション
```
## 最近のイベント
- render: 150ms (15:30:25)
- cache: 0ms (15:30:24)
- diff: 0ms (15:30:23)
- export: 500ms (15:30:20)
```

### 推奨事項セクション
```
## 推奨事項
- 現在のパフォーマンスは良好です
```

## 🎯 最適化のベストプラクティス

### 1. レンダリング時間の最適化
- **目標**: 100ms以下
- **対策**: 
  - 大きなYAMLファイルの分割
  - 不要なコンポーネントの削除
  - キャッシュの活用

### 2. キャッシュヒット率の向上
- **目標**: 80%以上
- **対策**:
  - 同じファイルの繰り返し編集
  - キャッシュTTLの調整
  - メモリ使用量の監視

### 3. 差分更新効率の向上
- **目標**: 90%以上
- **対策**:
  - 小さな変更の頻繁な保存
  - コンポーネントの適切な分割
  - 不要な再レンダリングの回避

### 4. メモリ使用量の最適化
- **目標**: 100MB以下
- **対策**:
  - 定期的なキャッシュクリア
  - 大きなファイルの分割
  - 不要なオブジェクトの解放

## 🔍 トラブルシューティング

### パフォーマンス監視が動作しない場合

1. **設定の確認**
   ```json
   {
     "textui-designer.performance.enablePerformanceLogs": true
   }
   ```

2. **開発者ツールでの確認**
   - VS Codeの開発者ツールを開く
   - コンソールで `[PerformanceMonitor]` のログを確認

3. **強制有効化**
   ```typescript
   const monitor = PerformanceMonitor.getInstance();
   monitor.forceEnable();
   ```

### メトリクスが0のままの場合

1. **イベントの生成確認**
   - WebViewの更新を実行
   - ファイルのエクスポートを実行
   - サンプルイベントの生成

2. **ログの確認**
   - コンソールでパフォーマンスイベントのログを確認
   - `[Performance]` プレフィックスのログを探す

## 📚 高度な使用方法

### カスタムメトリクスの追加
```typescript
const monitor = PerformanceMonitor.getInstance();

// カスタムイベントの記録
monitor.recordEvent('custom', 100, { 
  operation: 'dataProcessing',
  dataSize: 1024 
});
```

### パフォーマンス統計の取得
```typescript
const metrics = monitor.getMetrics();
console.log('平均レンダリング時間:', metrics.renderTime);
console.log('キャッシュヒット率:', metrics.cacheHitRate);
```

### リアルタイム監視
```typescript
// 定期的にメトリクスを取得
setInterval(() => {
  const metrics = monitor.getMetrics();
  console.log('リアルタイムメトリクス:', metrics);
}, 5000);
```

## 🎉 まとめ

パフォーマンス監視システムを活用することで、TextUI Designerの性能を継続的に改善できます。定期的にレポートを確認し、推奨事項に従って最適化を行うことで、より快適な開発体験を実現できます。 