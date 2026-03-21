import { BUILT_IN_COMPONENTS, type BuiltInComponentName } from './built-in-components';
import type { ExporterRendererMethod, TokenStyleProperty } from './types';

export type { ExporterRendererMethod };

export type ExporterRendererDefinition = {
  /**
   * BaseComponentRenderer 側が呼び出す renderXxx メソッド名。
   * ディスパッチは `BaseComponentRenderer.dispatchExporterRenderer` の網羅的 switch に対応付けられる。
   */
  rendererMethod: ExporterRendererMethod;
  /**
   * token を inline style に反映する CSS プロパティ名（kebab-case）。
   * `COMPONENT_DEFINITIONS.tokenStyleProperty` と `token-style-property-map` の入力の正本。
   */
  tokenStyleProperty: TokenStyleProperty;
};

/**
 * Exporter 側の「組み込み handler」と「token 既定反映先」を定義するテーブル（値の正本）。
 * `component-definitions.ts` で `COMPONENT_DEFINITIONS` に合成され、ランタイム参照は `token-style-property-map.ts` 経由。
 */
export const BUILT_IN_EXPORTER_RENDERER_DEFINITIONS: Record<
  BuiltInComponentName,
  ExporterRendererDefinition
> = {
  Text: { rendererMethod: 'renderText', tokenStyleProperty: 'color' },
  Input: { rendererMethod: 'renderInput', tokenStyleProperty: 'border-color' },
  Button: { rendererMethod: 'renderButton', tokenStyleProperty: 'background-color' },
  Checkbox: { rendererMethod: 'renderCheckbox', tokenStyleProperty: 'accent-color' },
  Radio: { rendererMethod: 'renderRadio', tokenStyleProperty: 'accent-color' },
  Select: { rendererMethod: 'renderSelect', tokenStyleProperty: 'border-color' },
  DatePicker: { rendererMethod: 'renderDatePicker', tokenStyleProperty: 'border-color' },
  Divider: { rendererMethod: 'renderDivider', tokenStyleProperty: 'border-color' },
  Spacer: { rendererMethod: 'renderSpacer', tokenStyleProperty: 'height' },
  Alert: { rendererMethod: 'renderAlert', tokenStyleProperty: 'border-color' },
  Container: { rendererMethod: 'renderContainer', tokenStyleProperty: 'background-color' },
  Form: { rendererMethod: 'renderForm', tokenStyleProperty: 'border-color' },
  Accordion: { rendererMethod: 'renderAccordion', tokenStyleProperty: 'border-color' },
  Tabs: { rendererMethod: 'renderTabs', tokenStyleProperty: 'border-color' },
  TreeView: { rendererMethod: 'renderTreeView', tokenStyleProperty: 'border-color' },
  Table: { rendererMethod: 'renderTable', tokenStyleProperty: 'border-color' },
  Link: { rendererMethod: 'renderLink', tokenStyleProperty: 'color' },
  Breadcrumb: { rendererMethod: 'renderBreadcrumb', tokenStyleProperty: 'color' },
  Badge: { rendererMethod: 'renderBadge', tokenStyleProperty: 'background-color' },
  Progress: { rendererMethod: 'renderProgress', tokenStyleProperty: 'background-color' },
  Image: { rendererMethod: 'renderImage', tokenStyleProperty: 'border-color' },
  Icon: { rendererMethod: 'renderIcon', tokenStyleProperty: 'color' }
};

// 取り違えを早期に検知するため、BUILT_IN_COMPONENTS とキーの一致を確認。
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
BUILT_IN_COMPONENTS.every((name) => Boolean(BUILT_IN_EXPORTER_RENDERER_DEFINITIONS[name]));

