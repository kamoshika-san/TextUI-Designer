import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import type { TextUIDSL } from '../renderer/types';
import { HtmlExporter } from '../exporters/html-exporter';
import { ReactExporter } from '../exporters/react-exporter';
import { PugExporter } from '../exporters/pug-exporter';

export interface CliProviderDefinition {
  name: string;
  extension: string;
  version: string;
  source: 'builtin' | 'external';
  render: (dsl: TextUIDSL) => Promise<string>;
}

interface ExternalProviderConfig {
  name: string;
  extension: string;
  version?: string;
  command: string;
}

interface ProviderConfigFile {
  providers?: ExternalProviderConfig[];
}

const DEFAULT_CONFIG_PATH = path.resolve('.textui/providers.json');

const BUILTIN_PROVIDERS: CliProviderDefinition[] = [
  {
    name: 'html',
    extension: '.html',
    version: '1.0.0',
    source: 'builtin',
    render: (dsl: TextUIDSL) => new HtmlExporter().export(dsl, { format: 'html' })
  },
  {
    name: 'react',
    extension: '.tsx',
    version: '1.0.0',
    source: 'builtin',
    render: (dsl: TextUIDSL) => new ReactExporter().export(dsl, { format: 'react' })
  },
  {
    name: 'pug',
    extension: '.pug',
    version: '1.0.0',
    source: 'builtin',
    render: (dsl: TextUIDSL) => new PugExporter().export(dsl, { format: 'pug' })
  }
];

function getConfigPath(): string {
  return path.resolve(process.env.TEXTUI_PROVIDER_CONFIG ?? DEFAULT_CONFIG_PATH);
}

function validateExternalProvider(input: unknown): ExternalProviderConfig | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const provider = input as Record<string, unknown>;
  if (typeof provider.name !== 'string' || provider.name.trim().length === 0) {
    return null;
  }
  if (typeof provider.extension !== 'string' || !provider.extension.startsWith('.')) {
    return null;
  }
  if (typeof provider.command !== 'string' || provider.command.trim().length === 0) {
    return null;
  }

  return {
    name: provider.name.trim(),
    extension: provider.extension,
    version: typeof provider.version === 'string' && provider.version.trim().length > 0
      ? provider.version
      : '0.1.0',
    command: provider.command
  };
}

function runExternalProvider(command: string, dsl: TextUIDSL): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.on('error', error => {
      reject(error);
    });

    child.on('close', code => {
      if (code !== 0) {
        const details = stderr.trim() || `exit code ${code}`;
        reject(new Error(`external provider command failed: ${details}`));
        return;
      }

      resolve(stdout);
    });

    child.stdin.write(`${JSON.stringify(dsl)}\n`);
    child.stdin.end();
  });
}

function loadExternalProviders(): CliProviderDefinition[] {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return [];
  }

  const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as ProviderConfigFile;
  const providers = Array.isArray(parsed.providers) ? parsed.providers : [];

  return providers
    .map(validateExternalProvider)
    .filter((provider): provider is ExternalProviderConfig => provider !== null)
    .map(provider => ({
      name: provider.name,
      extension: provider.extension,
      version: provider.version ?? '0.1.0',
      source: 'external' as const,
      render: (dsl: TextUIDSL) => runExternalProvider(provider.command, dsl)
    }));
}

function buildRegistry(): Map<string, CliProviderDefinition> {
  const registry = new Map<string, CliProviderDefinition>();

  [...BUILTIN_PROVIDERS, ...loadExternalProviders()].forEach(provider => {
    registry.set(provider.name, provider);
  });

  return registry;
}

export function listProviders(): CliProviderDefinition[] {
  return Array.from(buildRegistry().values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getProvider(name: string): CliProviderDefinition | null {
  return buildRegistry().get(name) ?? null;
}
