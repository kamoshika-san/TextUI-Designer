const assert = require('assert');
const {
  JUMP_TO_DSL_ONBOARDING_DISMISSED_KEY,
  shouldShowJumpToDslOnboarding,
  persistJumpToDslOnboardingDismissed
} = require('../../out/renderer/jump-to-dsl-onboarding');

function createStorage(initialValue = null) {
  const values = new Map();
  if (initialValue !== null) {
    values.set(JUMP_TO_DSL_ONBOARDING_DISMISSED_KEY, initialValue);
  }
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    }
  };
}

describe('jump-to-dsl onboarding persistence (T-618 / T-619)', () => {
  it('shows onboarding by default and hides it after persisted dismissal', () => {
    const storage = createStorage();

    assert.strictEqual(shouldShowJumpToDslOnboarding(storage), true);

    persistJumpToDslOnboardingDismissed(storage, true);

    assert.strictEqual(shouldShowJumpToDslOnboarding(storage), false);
    assert.strictEqual(storage.getItem(JUMP_TO_DSL_ONBOARDING_DISMISSED_KEY), 'true');
  });

  it('does not write dismissal when the opt-out toggle is not selected', () => {
    const storage = createStorage();

    persistJumpToDslOnboardingDismissed(storage, false);

    assert.strictEqual(shouldShowJumpToDslOnboarding(storage), true);
    assert.strictEqual(storage.getItem(JUMP_TO_DSL_ONBOARDING_DISMISSED_KEY), null);
  });
});
