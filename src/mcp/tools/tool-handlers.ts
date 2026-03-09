import type { ComponentBlueprint, TextUICoreEngine } from '../../core/textui-core-engine';

type GetObjectValue = (obj: Record<string, unknown>, key: string) => string | undefined;
type GetObjectUnknown = (obj: Record<string, unknown>, key: string) => unknown;
type GetObjectBoolean = (obj: Record<string, unknown>, key: string) => boolean | undefined;
type GetObjectArray = (obj: Record<string, unknown>, key: string) => unknown[] | undefined;

export type ToolHandler = () => Promise<unknown>;
export type ToolHandlers = Record<string, ToolHandler>;

export type ToolHandlerContext = {
  engine: TextUICoreEngine;
  args: Record<string, unknown>;
  getObjectValue: GetObjectValue;
  getObjectUnknown: GetObjectUnknown;
  getObjectBoolean: GetObjectBoolean;
  getObjectArray: GetObjectArray;
  runCli: (args: Record<string, unknown>) => Promise<unknown>;
  capturePreview: (args: Record<string, unknown>) => Promise<unknown>;
};

export function createToolHandlers(context: ToolHandlerContext): ToolHandlers {
  const {
    engine,
    args,
    getObjectValue,
    getObjectUnknown,
    getObjectBoolean,
    getObjectArray,
    runCli,
    capturePreview
  } = context;

  return {
    generate_ui: async () => engine.generateUi({
      title: getObjectValue(args, 'title') ?? '',
      pageId: getObjectValue(args, 'pageId'),
      layout: getObjectValue(args, 'layout'),
      components: getObjectArray(args, 'components') as unknown as ComponentBlueprint[] | undefined,
      format: getObjectValue(args, 'format'),
      providerModulePath: getObjectValue(args, 'providerModulePath'),
      themePath: getObjectValue(args, 'themePath')
    }),
    validate_ui: async () => {
      const rawDsl = getObjectUnknown(args, 'dsl');
      if (rawDsl === undefined) {
        throw new Error('validate_ui requires dsl');
      }
      return engine.validateUi({
        dsl: rawDsl as string | Record<string, unknown>,
        sourcePath: getObjectValue(args, 'sourcePath'),
        skipTokenValidation: getObjectBoolean(args, 'skipTokenValidation')
      });
    },
    explain_error: async () => {
      const diagnostics = getObjectUnknown(args, 'diagnostics');
      if (!Array.isArray(diagnostics)) {
        throw new Error('explain_error requires diagnostics');
      }
      return engine.explainError({
        diagnostics: diagnostics
          .filter(item => item && typeof item === 'object')
          .map(item => {
            const value = item as Record<string, unknown>;
            return {
              message: typeof value.message === 'string' ? value.message : 'unknown error',
              path: typeof value.path === 'string' ? value.path : '/',
              level: value.level === 'warning' ? 'warning' : 'error'
            };
          })
      });
    },
    preview_schema: async () => engine.previewSchema({
      schema: getObjectValue(args, 'schema') as 'main' | 'template' | 'theme' | undefined,
      jsonPointer: getObjectValue(args, 'jsonPointer')
    }),
    list_components: async () => engine.listComponents(),
    run_cli: async () => runCli(args),
    capture_preview: async () => capturePreview(args)
  };
}
