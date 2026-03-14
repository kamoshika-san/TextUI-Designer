import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

type JsonArray = unknown[];
type JsonObject = Record<string, unknown>;

type ResolveImageSourcesInDslParams = {
  dslFileDir: string;
  mapResolvedSrc: (absolutePath: string, originalSrc: string) => string;
  fileExists?: (absolutePath: string) => boolean;
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasProtocol(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value);
}

function isWindowsDrivePath(value: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(value);
}

function toFilePathFromFileUri(uri: string): string | null {
  try {
    return fileURLToPath(uri);
  } catch {
    return null;
  }
}

export function resolveLocalImagePath(src: string, dslFileDir: string): string | null {
  if (!src) {
    return null;
  }

  if (/^https?:\/\//i.test(src) || /^data:/i.test(src)) {
    return null;
  }

  if (/^file:\/\//i.test(src)) {
    return toFilePathFromFileUri(src);
  }

  if (isWindowsDrivePath(src) || path.isAbsolute(src)) {
    return path.normalize(src);
  }

  if (hasProtocol(src)) {
    return null;
  }

  return path.resolve(dslFileDir, src);
}

export function resolveImageSourcesInDsl<T>(dsl: T, params: ResolveImageSourcesInDslParams): T {
  const exists = params.fileExists ?? ((absolutePath: string) => fs.existsSync(absolutePath));

  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      return node.map(walk) as JsonArray;
    }

    if (!isObject(node)) {
      return node;
    }

    const cloned: JsonObject = {};

    for (const [key, value] of Object.entries(node)) {
      if (key === 'Image' && isObject(value)) {
        const imageComponent: JsonObject = { ...value };
        const src = imageComponent.src;

        if (typeof src === 'string') {
          const resolvedPath = resolveLocalImagePath(src, params.dslFileDir);
          if (resolvedPath && exists(resolvedPath)) {
            imageComponent.src = params.mapResolvedSrc(resolvedPath, src);
          }
        }

        cloned[key] = walk(imageComponent);
        continue;
      }

      cloned[key] = walk(value);
    }

    return cloned;
  };

  return walk(dsl) as T;
}
