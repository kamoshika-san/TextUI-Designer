import React from 'react';
import { renderRegisteredComponent } from '../component-map';
import type {
  ComponentIndexPair,
  SemanticSummaryLine
} from '../../core/textui-semantic-diff-summary';
import {
  type ComponentGroup,
  COLOR,
  groupSummaryLines,
  SummaryBadge,
  AccordionItem,
} from './OverlayDiffItem';

// ---- DiffToolbar -----------------------------------------------------------

interface DiffToolbarProps {
  fileNameA: string;
  fileNameB: string;
  labelA: string;
  labelB: string;
  opacityA: number;
  opacityB: number;
  slider: number;
  stepIndex: number;
  onStepChange: (index: number) => void;
}

export function DiffToolbar({
  fileNameA,
  fileNameB,
  labelA,
  labelB,
  opacityA,
  opacityB,
  slider,
  stepIndex,
  onStepChange,
}: DiffToolbarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        background: 'rgba(15, 23, 42, 0.72)',
        color: '#dbeafe',
        flexWrap: 'wrap',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: '0.82rem',
          fontWeight: 600,
          opacity: opacityA < 0.15 ? 0.4 : 1,
          transition: 'opacity 0.2s',
          whiteSpace: 'nowrap',
        }}
        title={fileNameA}
      >
        Before: {labelA}
      </span>

      <div style={{ flex: 1, minWidth: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <input
          type="range"
          min={0}
          max={3}
          step={1}
          value={stepIndex}
          onChange={event => onStepChange(Number(event.target.value))}
          style={{ width: '100%', cursor: 'pointer' }}
          aria-label="Opacity slider (switch between Before and After)"
        />
        <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>
          {slider === 0 ? 'Before only' : slider === 100 ? 'After only' : `After ${slider}%`}
        </span>
      </div>

      <span
        style={{
          fontSize: '0.82rem',
          fontWeight: 600,
          opacity: opacityB < 0.15 ? 0.4 : 1,
          transition: 'opacity 0.2s',
          whiteSpace: 'nowrap',
        }}
        title={fileNameB}
      >
        After: {labelB}
      </span>

      <span style={{ fontSize: '0.75rem', opacity: 0.55, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
        Overlay Diff &nbsp;·&nbsp; ←→ blend &nbsp;·&nbsp; ↑↓ navigate changes
      </span>
    </div>
  );
}

// ---- DiffOverlayPanel ------------------------------------------------------

interface DiffOverlayPanelProps {
  componentsA: unknown[];
  componentsB: unknown[];
  maxCount: number;
  opacityA: number;
  opacityB: number;
  slider: number;
  highlightIndexA: Map<number, string>;
  highlightIndexB: Map<number, string>;
  highlightedGroupKey: string | null;
}

export function DiffOverlayPanel({
  componentsA,
  componentsB,
  maxCount,
  opacityA,
  opacityB,
  slider,
  highlightIndexA,
  highlightIndexB,
  highlightedGroupKey,
}: DiffOverlayPanelProps) {
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 16, position: 'relative' }}>
      <div style={{ position: 'relative', minHeight: maxCount > 0 ? maxCount * 60 : 200 }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            opacity: opacityA,
            transition: 'opacity 0.05s',
            pointerEvents: slider >= 100 ? 'none' : 'auto',
          }}
        >
          {componentsA.map((component, index) => {
            const isHighlighted =
              highlightIndexA.get(index) === highlightedGroupKey && highlightedGroupKey !== null;
            return (
              <div key={`overlay-a-${index}`} style={{ position: 'relative' }}>
                {renderRegisteredComponent(component, `overlay-a-${index}`)}
                {isHighlighted && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      border: '2px solid #60a5fa',
                      boxShadow: '0 0 8px 2px rgba(96,165,250,0.5)',
                      pointerEvents: 'none',
                      borderRadius: 2,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            opacity: opacityB,
            transition: 'opacity 0.05s',
            pointerEvents: 'none',
          }}
        >
          {componentsB.map((component, index) => {
            const isHighlighted =
              highlightIndexB.get(index) === highlightedGroupKey && highlightedGroupKey !== null;
            return (
              <div key={`overlay-b-${index}`} style={{ position: 'relative' }}>
                {renderRegisteredComponent(component, `overlay-b-${index}`)}
                {isHighlighted && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      border: '2px solid #60a5fa',
                      boxShadow: '0 0 8px 2px rgba(96,165,250,0.5)',
                      pointerEvents: 'none',
                      borderRadius: 2,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---- SemanticSummaryPane ---------------------------------------------------

interface SemanticSummaryPaneProps {
  lines: SemanticSummaryLine[];
  pairings: ComponentIndexPair[];
  highlightedGroupKey: string | null;
  onGroupClick: (groupKey: string) => void;
}

export function SemanticSummaryPane({
  lines,
  pairings,
  highlightedGroupKey,
  onGroupClick,
}: SemanticSummaryPaneProps) {
  const groups: ComponentGroup[] = groupSummaryLines(lines, pairings);
  const addCount = lines.filter(line => line.prefix === '+').length;
  const updateCount = lines.filter(line => line.prefix === '~').length;
  const removeCount = lines.filter(line => line.prefix === '-').length;
  const ambigCount = lines.filter(line => line.prefix === '?').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid rgba(148,163,184,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          background: 'rgba(15, 23, 42, 0.6)',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '0.80rem', color: '#dbeafe' }}>変更サマリー</span>
        <span style={{ display: 'flex', gap: 8 }}>
          <SummaryBadge count={addCount} color={COLOR.add} symbol="+" />
          <SummaryBadge count={updateCount} color={COLOR.update} symbol="~" />
          <SummaryBadge count={removeCount} color={COLOR.remove} symbol="-" />
          <SummaryBadge count={ambigCount} color={COLOR.ambiguous} symbol="?" />
        </span>
      </div>

      <ul style={{ margin: 0, padding: 0, listStyle: 'none', overflowY: 'auto', flex: 1 }}>
        {groups.map(group => (
          <AccordionItem
            key={group.groupKey}
            group={group}
            isHighlighted={highlightedGroupKey === group.groupKey}
            onToggleHighlight={() => onGroupClick(group.groupKey)}
          />
        ))}
      </ul>
    </div>
  );
}

// ---- NoSummaryPane ---------------------------------------------------------

export function NoSummaryPane() {
  return (
    <div
      style={{
        width: 200,
        minWidth: 160,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.3)',
        borderLeft: '1px solid rgba(148,163,184,0.1)',
        color: 'rgba(148,163,184,0.5)',
        fontSize: '0.75rem',
        textAlign: 'center',
        padding: '0 16px',
      }}
    >
      変更サマリーを
      <br />
      生成できませんでした
    </div>
  );
}
