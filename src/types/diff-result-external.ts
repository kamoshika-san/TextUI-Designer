/**
 * External diff result schema.
 */

export interface ExternalChange {
  changeId: string;
  type: string;
  componentId: string;
  layer: string;
  impact: 'low' | 'medium' | 'high';
  humanReadable: {
    title: string;
    description: string;
  };
}

export interface DiffResultExternal {
  schemaVersion: 'diff-result-external/v1';
  metadata: {
    baseRef: string;
    headRef: string;
    filePath: string;
    comparedAt: string;
  };
  summary: {
    added: number;
    removed: number;
    modified: number;
    moved: number;
    confidence: 'high' | 'medium' | 'low';
  };
  changes: ExternalChange[];
}
