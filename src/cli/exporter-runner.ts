import type { TextUIDSL } from '../renderer/types';
import * as path from 'path';
import * as fs from 'fs';
import { getProvider, listProviders, type CliProviderDefinition } from './provider-registry';

export type CliProvider = string;

export interface ProviderLookupOptions {
  providerModulePath?: string;
}

const externalProviderCache = new Map<string, Promise<CliProviderDefinition>>();

function isProviderDefinition(value: unknown): value is CliProviderDefinition {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<CliProviderDefinition>;
  return typeof candidate.name === 'string'
    && typeof candidate.extension === 'string'
    && typeof candidate.version === 'string'
    && typeof candidate.render === 'function';
}

export async function loadExternalProvider(providerModulePath: string): Promise<CliProviderDefinition> {
  const absolutePath = path.resolve(providerModulePath);
  const cached = externalProviderCache.get(absolutePath);
  if (cached) {
    return cached;
  }

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`provider module not found: ${absolutePath}`);
  }

  const loadPromise = (async (): Promise<CliProviderDefinition> => {
    const imported = await import(absolutePath);
    const candidate = (imported.default ?? imported) as unknown;

    if (!isProviderDefinition(candidate)) {
      throw new Error('invalid provider module: expected { name, extension, version, render }');
    }

    return candidate;
  })();

  externalProviderCache.set(absolutePath, loadPromise);

  try {
    return await loadPromise;
  } catch (error) {
    externalProviderCache.delete(absolutePath);
    throw error;
  }
}

export async function resolveProviderDefinition(
  provider: CliProvider,
  options: ProviderLookupOptions = {}
): Promise<CliProviderDefinition | null> {
  const builtinProvider = getProvider(provider);
  if (builtinProvider) {
    return builtinProvider;
  }

  if (!options.providerModulePath) {
    return null;
  }

  const externalProvider = await loadExternalProvider(options.providerModulePath);
  if (externalProvider.name !== provider) {
    throw new Error(`provider module name mismatch: expected '${provider}', got '${externalProvider.name}'`);
  }

  return externalProvider;
}

export async function getProviderExtension(provider: CliProvider, options: ProviderLookupOptions = {}): Promise<string> {
  const definition = await resolveProviderDefinition(provider, options);
  return definition?.extension ?? '.txt';
}

export async function getProviderVersion(provider: CliProvider, options: ProviderLookupOptions = {}): Promise<string> {
  const definition = await resolveProviderDefinition(provider, options);
  return definition?.version ?? 'unknown';
}

export async function isSupportedProvider(provider: CliProvider, options: ProviderLookupOptions = {}): Promise<boolean> {
  const definition = await resolveProviderDefinition(provider, options);
  return definition !== null;
}

export async function getSupportedProviderNames(options: ProviderLookupOptions = {}): Promise<string[]> {
  const builtins = listProviders().map(providerDefinition => providerDefinition.name);
  if (!options.providerModulePath) {
    return builtins;
  }

  const externalProvider = await loadExternalProvider(options.providerModulePath);
  return Array.from(new Set([...builtins, externalProvider.name])).sort((a, b) => a.localeCompare(b));
}

export async function runExport(
  dsl: TextUIDSL,
  provider: CliProvider,
  options: ProviderLookupOptions = {}
): Promise<string> {
  const definition = await resolveProviderDefinition(provider, options);
  if (!definition) {
    throw new Error(`unsupported provider: ${provider}`);
  }

  return definition.render(dsl);
}
