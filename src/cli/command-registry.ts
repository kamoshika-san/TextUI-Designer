import type { ExitCode } from './types';
import { getArg } from './command-support';
import type { FileTargetArgs } from './commands/types';

type CommandHandler = () => Promise<ExitCode>;

/**
 * CLI コマンドのレジストリ。
 * - トップレベルは handler（dynamic import + handleXCommand 呼び出し）だけを持つ
 * - lazy-load 維持のため、ここでは top-level import を行わない
 */
export function getCommandRegistry(): Record<string, CommandHandler> {
  const fileAndDir = (): FileTargetArgs => ({
    fileArg: getArg('--file'),
    dirArg: getArg('--dir')
  });

  return {
    import: async () => {
      const { handleImportCommand } = await import('./commands/import-command');
      return handleImportCommand();
    },
    providers: async () => {
      const { handleProvidersCommand } = await import('./commands/providers-command');
      return handleProvidersCommand();
    },
    state: async () => {
      const { handleStateCommand } = await import('./commands/state-command');
      return handleStateCommand();
    },
    capture: async () => {
      const { handleCaptureCommand } = await import('./commands/capture-command');
      return handleCaptureCommand(fileAndDir());
    },
    validate: async () => {
      const { handleValidateCommand } = await import('./commands/validate-command');
      return handleValidateCommand(fileAndDir());
    },
    export: async () => {
      const { handleExportCommand } = await import('./commands/export-command');
      return handleExportCommand(getArg('--file'));
    },
    compare: async () => {
      const { handleCompareCommand } = await import('./commands/compare-command');
      return handleCompareCommand();
    },
    plan: async () => {
      const { handlePlanCommand } = await import('./commands/plan-command');
      return handlePlanCommand(fileAndDir());
    },
    apply: async () => {
      const { handleApplyCommand } = await import('./commands/apply-command');
      return handleApplyCommand(fileAndDir());
    }
  };
}

