import type { TextUIDSL } from '../renderer/types';
import { getProvider, listProviders } from './provider-registry';

export type CliProvider = string;

export function getProviderExtension(provider: CliProvider): string {
  return getProvider(provider)?.extension ?? '.txt';
}

export function getProviderVersion(provider: CliProvider): string {
  return getProvider(provider)?.version ?? 'unknown';
}

export function isSupportedProvider(provider: CliProvider): boolean {
  return getProvider(provider) !== null;
}

export function getSupportedProviderNames(): string[] {
  return listProviders().map(provider => provider.name);
}

export async function runExport(dsl: TextUIDSL, provider: CliProvider): Promise<string> {
  const definition = getProvider(provider);
  if (!definition) {
    throw new Error(`unsupported provider: ${provider}`);
  }

  return definition.render(dsl);
}
