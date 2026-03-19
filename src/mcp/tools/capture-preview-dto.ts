export type CapturePreviewRequest = {
  dslFile: string;
  output?: string;
  themePath?: string;
  width?: number;
  height?: number;
  scale?: number;
  waitMs?: number;
  cwd?: string;
  timeoutMs?: number;
};

