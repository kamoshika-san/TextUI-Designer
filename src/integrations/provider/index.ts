/**
 * TextUI Provider API — エントリポイント
 *
 * 外部 Provider はこのモジュールから型をインポートする。
 */

export type {
  ProviderCapability,
  ProviderInput,
  ProviderExportOptions,
  ExportArtifact,
  ProviderDiagnostic,
  TextUIProvider,
} from './text-ui-provider';

export { HtmlProviderAdapter } from './html-provider-adapter';
export { ReactProviderAdapter } from './react-provider-adapter';
export { VueProviderAdapter } from './vue-provider-adapter';
export { SvelteProviderAdapter } from './svelte-provider-adapter';
