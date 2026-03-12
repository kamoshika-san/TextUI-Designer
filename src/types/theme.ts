export interface ThemeTokenValue {
  value: string;
  description?: string;
}

export type ThemeTokenEntry =
  | string
  | ThemeTokenValue
  | { [key: string]: ThemeTokenEntry };

export interface ThemeTokens {
  colors?: Record<string, ThemeTokenEntry>;
  spacing?: Record<string, ThemeTokenEntry>;
  typography?: Record<string, ThemeTokenEntry>;
  borderRadius?: Record<string, ThemeTokenEntry>;
  shadows?: Record<string, ThemeTokenEntry>;
  transition?: Record<string, ThemeTokenEntry>;
  [key: string]: unknown;
}

export interface ThemeComponents {
  button?: Record<string, Record<string, string>>;
  input?: Record<string, Record<string, string>>;
  datepicker?: Record<string, Record<string, string>>;
  select?: Record<string, Record<string, string>>;
  checkbox?: Record<string, Record<string, string>>;
  radio?: Record<string, Record<string, string>>;
  divider?: Record<string, Record<string, string>>;
  spacer?: Record<string, Record<string, string>>;
  treeview?: Record<string, Record<string, string>>;
  alert?: Record<string, Record<string, string>>;
  text?: Record<string, Record<string, string>>;
  container?: Record<string, Record<string, string>>;
  form?: Record<string, Record<string, string>>;
  [key: string]: unknown;
}

export interface ThemeDefinition {
  theme: {
    name: string;
    description?: string;
    extends?: string;
    tokens?: ThemeTokens;
    components?: ThemeComponents;
  };
}

export function isThemeDefinition(obj: unknown): obj is ThemeDefinition {
  return typeof obj === 'object' && obj !== null && 'theme' in obj;
}
