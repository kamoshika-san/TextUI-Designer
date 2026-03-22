import { Logger } from '../../utils/logger';

const log = new Logger('PreviewPipeline');

/**
 * Preview 更新の計測点（T-304）。
 * - `preview_*` / `file_change_*`: {@link WebViewUpdateManager} からキューへ投入するとき
 * - `webview_ready` / `theme_switch`: キューを経ず {@link WebViewUpdateManager.sendYamlToWebview} に直入りするとき
 */
export type PreviewPipelineEntry =
  | 'preview_force'
  | 'preview_debounce'
  | 'file_change_high_priority'
  | 'webview_ready'
  | 'theme_switch'
  | 'queued_unknown';

/** キュー投入時・直実行時の追跡コンテキスト（再発時に「意図したファイル」を残す） */
export type PreviewPipelineQueueTrace = {
  entry: PreviewPipelineEntry;
  /** 投入時点で意図していた DSL パス */
  scheduledFile?: string;
};

const traceStack: PreviewPipelineQueueTrace[] = [];

export function getActivePreviewPipelineTrace(): PreviewPipelineQueueTrace | undefined {
  return traceStack[traceStack.length - 1];
}

export async function withPreviewPipelineTrace<T>(
  trace: PreviewPipelineQueueTrace,
  fn: () => Promise<T>
): Promise<T> {
  traceStack.push(trace);
  try {
    return await fn();
  } finally {
    traceStack.pop();
  }
}

export function logPreviewQueueScheduled(meta: {
  taskId: string;
  trace?: PreviewPipelineQueueTrace;
  force: boolean;
  priority: number;
  queueSizeAfter: number;
}): void {
  const t = meta.trace;
  log.info(
    `queue_scheduled taskId=${meta.taskId} entry=${t?.entry ?? 'n/a'} scheduledFile=${quotePath(t?.scheduledFile)} force=${meta.force} priority=${meta.priority} queueSize=${meta.queueSizeAfter}`
  );
}

export function logPreviewQueueCoalescedMinInterval(meta: {
  waitMs: number;
  trace?: PreviewPipelineQueueTrace;
  replacedPending: boolean;
}): void {
  log.info(
    `queue_coalesced reason=min_interval waitMs=${meta.waitMs} replacedPending=${meta.replacedPending} entry=${meta.trace?.entry ?? 'n/a'} scheduledFile=${quotePath(meta.trace?.scheduledFile)}`
  );
}

export function logPreviewQueueCoalescedDebounce(): void {
  log.info('queue_coalesced reason=debounce_timer_reset');
}

export function logPreviewQueueDropped(meta: {
  droppedTaskId: string;
  droppedPriority: number;
  trace?: PreviewPipelineQueueTrace;
}): void {
  const t = meta.trace;
  log.info(
    `queue_dropped taskId=${meta.droppedTaskId} priority=${meta.droppedPriority} entry=${t?.entry ?? 'n/a'} scheduledFile=${quotePath(t?.scheduledFile)}`
  );
}

export function logPreviewDelivered(fileName: string): void {
  log.info(`delivered file=${quotePath(fileName)}`);
}

export function logPreviewPipelineStart(meta: {
  forceUpdate: boolean;
  lastTuiFile?: string;
  entry?: PreviewPipelineEntry;
}): void {
  log.info(
    `pipeline_start force=${meta.forceUpdate} lastTuiFile=${quotePath(meta.lastTuiFile)} entry=${meta.entry ?? 'n/a'}`
  );
}

export function logPreviewPipelineSkip(reason: string, detail?: string): void {
  log.info(`pipeline_skip reason=${reason}${detail ? ` detail=${detail}` : ''}`);
}

export function logPreviewPipelinePhaseSummary(segmentsMs: Record<string, number>, totalMs: number): void {
  const parts = Object.entries(segmentsMs)
    .filter(([, ms]) => ms > 0.05)
    .map(([k, ms]) => `${k}=${ms.toFixed(1)}ms`)
    .join(' ');
  log.info(`phase_durations totalMs=${totalMs.toFixed(1)}${parts ? ` ${parts}` : ''}`);
}

function quotePath(p?: string): string {
  if (p === undefined || p === '') {
    return 'n/a';
  }
  return p;
}
