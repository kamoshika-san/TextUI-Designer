import { PROMPT_DEFINITIONS, RESOURCE_DEFINITIONS } from './registry';
import { getObject, getObjectValue, requireStringParam } from './params';
import { TOOLS } from './tool-manifest';

const SERVER_INFO = {
  name: 'textui-designer-mcp',
  version: '0.1.0'
} as const;

export type RequestHandler = (params: unknown) => Promise<unknown>;

export function createRequestHandlers(deps: {
  handleToolCall: (params: unknown) => Promise<unknown>;
  readResource: (uri: string) => Promise<unknown>;
  resolvePrompt: (name: string, args: Record<string, unknown>) => unknown;
}): Record<string, RequestHandler> {
  return {
    initialize: async params => handleInitialize(params),
    ping: async () => ({}),
    'tools/list': async () => ({ tools: TOOLS }),
    'tools/call': params => deps.handleToolCall(params),
    'resources/list': async () => ({ resources: RESOURCE_DEFINITIONS }),
    'resources/read': params => handleResourcesRead(params, deps.readResource),
    'prompts/list': async () => ({ prompts: PROMPT_DEFINITIONS }),
    'prompts/get': async params => handlePromptsGet(params, deps.resolvePrompt)
  };
}

async function handleInitialize(params: unknown): Promise<unknown> {
  const protocolVersion = getObjectValue(params, 'protocolVersion') ?? '2024-11-05';
  return {
    protocolVersion,
    capabilities: {
      tools: {
        listChanged: false
      },
      resources: {
        subscribe: false,
        listChanged: false
      },
      prompts: {
        listChanged: false
      }
    },
    serverInfo: SERVER_INFO
  };
}

async function handleResourcesRead(
  params: unknown,
  readResource: (uri: string) => Promise<unknown>
): Promise<unknown> {
  const uri = requireStringParam(params, 'uri', 'resources/read requires uri');
  const payload = await readResource(uri);
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

async function handlePromptsGet(
  params: unknown,
  resolvePrompt: (name: string, args: Record<string, unknown>) => unknown
): Promise<unknown> {
  const name = requireStringParam(params, 'name', 'prompts/get requires name');
  const argumentsValue = getObject(params, 'arguments');
  return resolvePrompt(name, argumentsValue);
}
