import type { TextUIDSL } from '../renderer/types';
import { getProvider, listProviders, type CliProviderDefinition } from './provider-registry';

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


export interface CliProviderInfo {
  name: string;
  extension: string;
  version: string;
  source: CliProviderDefinition['source'];
}

export function getSupportedProviders(): CliProviderInfo[] {
  return listProviders().map(provider => ({
    name: provider.name,
    extension: provider.extension,
    version: provider.version,
    source: provider.source
  }));
}
