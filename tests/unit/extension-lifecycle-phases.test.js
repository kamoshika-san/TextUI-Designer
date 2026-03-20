const assert = require('assert');

describe('extension-lifecycle-phases', () => {
  it('ACTIVATION_PHASES / DEACTIVATION_PHASES の id 順が安定している', () => {
    const { ACTIVATION_PHASES, DEACTIVATION_PHASES } = require('../../out/services/extension-lifecycle-phases');

    assert.deepStrictEqual(
      ACTIVATION_PHASES.map(p => p.id),
      ['memoryTracker', 'perfStart', 'services', 'events', 'fileWatcher', 'memoryMonitor', 'perfComplete']
    );
    assert.deepStrictEqual(
      DEACTIVATION_PHASES.map(p => p.id),
      ['perfDispose', 'memoryMonitorStop', 'fileWatcherStop', 'eventsDispose', 'servicesCleanup', 'memoryTrackerDispose']
    );
  });
});
