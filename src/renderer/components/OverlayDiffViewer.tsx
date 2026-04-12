import React, { useEffect, useState } from 'react';
import type { OverlayDiffState } from '../../domain/diff/overlay-diff-types';
import { groupSummaryLines } from './OverlayDiffItem';
import { DiffToolbar, DiffOverlayPanel, SemanticSummaryPane, NoSummaryPane } from './DiffContentView';

function basename(filePath: string): string {
  return filePath.split(/[/\\]/).pop() || filePath;
}

interface OverlayDiffViewerProps {
  state: OverlayDiffState;
}

const STEPS = [0, 33, 67, 100] as const;

export const OverlayDiffViewer: React.FC<OverlayDiffViewerProps> = ({ state }) => {
  const [stepIndex, setStepIndex] = useState(1);
  const [highlightedGroupKey, setHighlightedGroupKey] = useState<string | null>(null);
  const slider = STEPS[stepIndex];

  const opacityA = 1 - slider / 100;
  const opacityB = slider / 100;
  const labelA = basename(state.fileNameA);
  const labelB = basename(state.fileNameB);
  const componentsA = state.dslA.page?.components ?? [];
  const componentsB = state.dslB.page?.components ?? [];
  const maxCount = Math.max(componentsA.length, componentsB.length);
  const summaryLines = state.semanticSummary?.lines ?? null;
  const summaryPairings = state.semanticSummary?.componentPairings ?? [];
  const groups = summaryLines ? groupSummaryLines(summaryLines, summaryPairings) : [];

  const highlightIndexA = new Map<number, string>();
  const highlightIndexB = new Map<number, string>();
  for (const group of groups) {
    if (group.componentIndexA !== undefined) {
      highlightIndexA.set(group.componentIndexA, group.groupKey);
    }
    if (group.componentIndexB !== undefined) {
      highlightIndexB.set(group.componentIndexB, group.groupKey);
    }
  }

  const sortedGroupKeys = groups.map(group => group.groupKey);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).tagName === 'INPUT') {
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setStepIndex(index => Math.max(0, index - 1));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setStepIndex(index => Math.min(3, index + 1));
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        if (sortedGroupKeys.length === 0) {
          return;
        }
        event.preventDefault();
        const currentIndex = sortedGroupKeys.indexOf(highlightedGroupKey ?? '');
        if (event.key === 'ArrowDown') {
          setHighlightedGroupKey(sortedGroupKeys[(currentIndex + 1) % sortedGroupKeys.length]);
        } else {
          setHighlightedGroupKey(sortedGroupKeys[(currentIndex - 1 + sortedGroupKeys.length) % sortedGroupKeys.length]);
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [highlightedGroupKey, sortedGroupKeys]);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <DiffToolbar
          fileNameA={state.fileNameA}
          fileNameB={state.fileNameB}
          labelA={labelA}
          labelB={labelB}
          opacityA={opacityA}
          opacityB={opacityB}
          slider={slider}
          stepIndex={stepIndex}
          onStepChange={setStepIndex}
        />
        <DiffOverlayPanel
          componentsA={componentsA}
          componentsB={componentsB}
          maxCount={maxCount}
          opacityA={opacityA}
          opacityB={opacityB}
          slider={slider}
          highlightIndexA={highlightIndexA}
          highlightIndexB={highlightIndexB}
          highlightedGroupKey={highlightedGroupKey}
        />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 280,
          minWidth: 240,
          maxWidth: 320,
          flexShrink: 0,
          background: 'rgba(15, 23, 42, 0.55)',
          borderLeft: '1px solid rgba(148,163,184,0.15)',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {summaryLines !== null && summaryLines.length > 0 ? (
          <SemanticSummaryPane
            lines={summaryLines}
            pairings={summaryPairings}
            highlightedGroupKey={highlightedGroupKey}
            onGroupClick={groupKey => setHighlightedGroupKey(current => (current === groupKey ? null : groupKey))}
          />
        ) : (
          <NoSummaryPane />
        )}
      </div>
    </div>
  );
};
