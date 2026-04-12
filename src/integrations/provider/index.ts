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
