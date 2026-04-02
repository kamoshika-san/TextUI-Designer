export const JUMP_TO_DSL_ONBOARDING_DISMISSED_KEY = 'textui-jump-to-dsl-onboarding-dismissed';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function shouldShowJumpToDslOnboarding(storage?: StorageLike): boolean {
  if (!storage) {
    return true;
  }
  return storage.getItem(JUMP_TO_DSL_ONBOARDING_DISMISSED_KEY) !== 'true';
}

export function persistJumpToDslOnboardingDismissed(
  storage: StorageLike | undefined,
  dismissed: boolean
): void {
  if (!storage || !dismissed) {
    return;
  }
  storage.setItem(JUMP_TO_DSL_ONBOARDING_DISMISSED_KEY, 'true');
}
