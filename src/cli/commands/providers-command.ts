import {
  getProviderExtension,
  getProviderVersion,
  getSupportedProviderNames,
  loadExternalProvider
} from '../exporter-runner';
import type { ExitCode } from '../types';
import { getArg, hasFlag, printJson } from '../command-support';

export async function handleProvidersCommand(): Promise<ExitCode> {
  const providerModulePath = getArg('--provider-module');
  const builtinNames = await getSupportedProviderNames();
  const providers = await Promise.all(
    builtinNames.map(async name => ({
      name,
      extension: await getProviderExtension(name),
      version: await getProviderVersion(name),
      source: 'builtin'
    }))
  );

  if (providerModulePath) {
    const externalProvider = await loadExternalProvider(providerModulePath);
    providers.push({
      name: externalProvider.name,
      extension: externalProvider.extension,
      version: externalProvider.version,
      source: 'external'
    });
    providers.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (hasFlag('--json')) {
    printJson({ providers });
  } else {
    providers.forEach(provider => {
      process.stdout.write(`${provider.name}\t${provider.extension}\t${provider.version}\n`);
    });
  }

  return 0;
}
