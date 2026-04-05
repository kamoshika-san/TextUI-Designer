export function getObject(value: unknown, key: string): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const candidate = (value as Record<string, unknown>)[key];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return null;
  }
  return candidate as Record<string, unknown>;
}

export function getObjectArray(value: Record<string, unknown>, key: string): Array<Record<string, unknown>> | undefined {
  const candidate = value[key];
  if (!Array.isArray(candidate)) {
    return undefined;
  }
  return candidate.filter(item => item && typeof item === 'object' && !Array.isArray(item)) as Array<Record<string, unknown>>;
}

export function getObjectValue(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === 'string' ? candidate : undefined;
}

export function getObjectBoolean(value: Record<string, unknown>, key: string): boolean | undefined {
  const candidate = value[key];
  return typeof candidate === 'boolean' ? candidate : undefined;
}

export function getObjectNumber(value: Record<string, unknown>, key: string): number | undefined {
  const candidate = value[key];
  return typeof candidate === 'number' ? candidate : undefined;
}

export function getObjectStringArray(value: Record<string, unknown>, key: string): string[] | undefined {
  const candidate = value[key];
  if (!Array.isArray(candidate)) {
    return undefined;
  }
  if (!candidate.every(item => typeof item === 'string')) {
    return undefined;
  }
  return candidate as string[];
}

export function getObjectUnknown(value: Record<string, unknown>, key: string): unknown {
  return value[key];
}

export function requireStringParam(params: unknown, key: string, message: string): string {
  const value = getObjectValue(params, key);
  if (!value) {
    throw new Error(message);
  }
  return value;
}

export function parseCliResourceUri(uri: string): Record<string, unknown> {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error(`invalid cli resource uri: ${uri}`);
  }

  const argsParam = parsed.searchParams.get('args');
  if (!argsParam) {
    throw new Error('cli resource requires args query param');
  }

  let args: unknown;
  try {
    args = JSON.parse(argsParam);
  } catch {
    throw new Error('cli resource args must be JSON string array');
  }
  if (!Array.isArray(args) || !args.every(item => typeof item === 'string')) {
    throw new Error('cli resource args must be JSON string array');
  }

  const request: Record<string, unknown> = {
    args
  };
  const cwd = parsed.searchParams.get('cwd');
  if (cwd) {
    request.cwd = cwd;
  }
  const timeoutMsRaw = parsed.searchParams.get('timeoutMs');
  if (timeoutMsRaw) {
    const timeoutMs = Number(timeoutMsRaw);
    if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
      throw new Error(`invalid timeoutMs: ${timeoutMsRaw}`);
    }
    request.timeoutMs = timeoutMs;
  }
  const parseJsonRaw = parsed.searchParams.get('parseJson');
  if (parseJsonRaw) {
    request.parseJson = parseJsonRaw !== 'false';
  }
  return request;
}
