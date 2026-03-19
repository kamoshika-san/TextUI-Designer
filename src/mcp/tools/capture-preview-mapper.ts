import { getObjectNumber, getObjectValue } from '../params';
import type { CapturePreviewRequest } from './capture-preview-dto';

function assertNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`capture_preview ${name} must be a non-negative number`);
  }
}

function assertPositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`capture_preview ${name} must be a positive number`);
  }
}

export function mapCapturePreviewRequest(args: Record<string, unknown>): CapturePreviewRequest {
  const dslFile = getObjectValue(args, 'dslFile');
  if (!dslFile) {
    throw new Error('capture_preview requires dslFile');
  }

  const width = getObjectNumber(args, 'width');
  const height = getObjectNumber(args, 'height');
  const scale = getObjectNumber(args, 'scale');
  const waitMs = getObjectNumber(args, 'waitMs');
  const timeoutMs = getObjectNumber(args, 'timeoutMs');

  if (width !== undefined) {
    assertPositive(width, 'width');
  }
  if (height !== undefined) {
    assertPositive(height, 'height');
  }
  if (scale !== undefined) {
    assertPositive(scale, 'scale');
  }
  if (waitMs !== undefined) {
    assertNonNegative(waitMs, 'waitMs');
  }
  if (timeoutMs !== undefined) {
    assertNonNegative(timeoutMs, 'timeoutMs');
  }

  return {
    dslFile,
    output: getObjectValue(args, 'output'),
    themePath: getObjectValue(args, 'themePath'),
    width,
    height,
    scale,
    waitMs,
    cwd: getObjectValue(args, 'cwd'),
    timeoutMs
  };
}

