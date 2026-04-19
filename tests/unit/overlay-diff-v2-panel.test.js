const assert = require('assert');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
require('ts-node/register/transpile-only');
const { OverlayDiffV2Panel } = require('../../src/renderer/components/OverlayDiffV2Panel.tsx');

describe('OverlayDiffV2Panel', () => {
  it('renders an MVP tree with screen, entity, component, diff details, and evidence', () => {
    const html = renderToStaticMarkup(
      React.createElement(OverlayDiffV2Panel, {
        result: {
          hasChanges: true,
          payload: {
            screens: [
              {
                screenId: 'settings',
                diffs: [],
                entities: [
                  {
                    entityId: 'settings-form',
                    diffs: [
                      {
                        decision: {
                          diffEvent: 'entity_state_changed',
                          targetId: 'settings-form',
                          confidence: 0.9,
                          confidenceBand: 'high',
                        },
                        explanation: {
                          evidence: ['entity state changed'],
                        },
                      },
                    ],
                    components: [
                      {
                        componentId: 'Button:save',
                        diffs: [
                          {
                            decision: {
                              diffEvent: 'component_guard_changed',
                              targetId: 'save',
                              confidence: 0.7,
                              confidenceBand: 'low',
                              reviewStatus: 'needs_review',
                              ambiguityReason: 'guard contains unresolved predicate',
                            },
                            explanation: {
                              evidence: ['guard axis changed with unresolved predicate'],
                            },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      })
    );

    assert.match(html, /Semantic Diff v2/);
    assert.match(html, /settings/);
    assert.match(html, /settings-form/);
    assert.match(html, /Button:save/);
    assert.match(html, /component guard changed/);
    assert.match(html, /needs_review/);
    assert.match(html, /confidence 0\.70/);
    assert.match(html, /evidence: guard axis changed with unresolved predicate/);
  });

  it('renders out-of-scope screens distinctly from in-scope screens', () => {
    const html = renderToStaticMarkup(
      React.createElement(OverlayDiffV2Panel, {
        result: {
          hasChanges: true,
          payload: {
            screens: [
              {
                screenId: 'legacy-screen',
                outOfScope: true,
              },
              {
                screenId: 'profile',
                diffs: [],
                entities: [],
              },
            ],
          },
        },
      })
    );

    assert.match(html, /legacy-screen/);
    assert.match(html, /out of scope/);
    assert.match(html, /profile/);
    assert.match(html, /1 out-of-scope screen/);
    assert.match(html, /1 in-scope screen/);
  });
});
