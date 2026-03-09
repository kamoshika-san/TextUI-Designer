type KeySuggestion = {
  key: string;
  distance: number;
};

export function suggestSimilarKeys(invalidKey: string, candidateKeys: string[]): string[] {
  if (candidateKeys.length === 0 || !invalidKey) {
    return [];
  }

  const invalidKeyLower = invalidKey.toLowerCase();
  const maxAllowedDistance = Math.max(1, Math.floor(invalidKey.length * 0.4));

  const suggestions: KeySuggestion[] = candidateKeys
    .map(key => {
      const distance = levenshteinDistance(invalidKeyLower, key.toLowerCase());
      return { key, distance };
    })
    .filter(({ key, distance }) => {
      if (distance <= maxAllowedDistance) {
        return true;
      }

      // 先頭一致は入力途中のタイポとして扱う
      return key.toLowerCase().startsWith(invalidKeyLower) || invalidKeyLower.startsWith(key.toLowerCase());
    })
    .sort((a, b) => {
      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }
      return a.key.localeCompare(b.key);
    });

  return suggestions.slice(0, 3).map(item => item.key);
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  if (a.length === 0) {
    return b.length;
  }

  if (b.length === 0) {
    return a.length;
  }

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j < cols; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}
