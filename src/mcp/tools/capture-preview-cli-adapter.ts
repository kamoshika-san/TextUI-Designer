import type { CapturePreviewRequest } from './capture-preview-dto';

export function toCapturePreviewCliArgs(request: CapturePreviewRequest): Record<string, unknown> {
  const args: string[] = ['capture', '--file', request.dslFile, '--json'];

  if (request.output) {
    args.push('--output', request.output);
  }
  if (request.themePath) {
    args.push('--theme', request.themePath);
  }
  if (request.width !== undefined) {
    args.push('--width', String(request.width));
  }
  if (request.height !== undefined) {
    args.push('--height', String(request.height));
  }
  if (request.scale !== undefined) {
    args.push('--scale', String(request.scale));
  }
  if (request.waitMs !== undefined) {
    args.push('--wait-ms', String(request.waitMs));
  }

  return {
    args,
    cwd: request.cwd,
    timeoutMs: request.timeoutMs,
    parseJson: true
  };
}

