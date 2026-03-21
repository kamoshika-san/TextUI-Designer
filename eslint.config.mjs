import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

/**
 * 方針（T-20260320-025）:
 * - 命名・表記ゆれは warn（`npm run lint` は `--max-warnings 0` のため実質ゼロ警告維持）
 * - `console.*` の統一・禁止レベルは T-20260320-020 側。ここではルールを足さず、意図のみコメントで明示
 *
 * T-101: `src/domain` / `src/services` / `src/components` では `renderer/types` への新規依存を抑止（緑field レーン）。
 */
const rendererTypesImportRestriction = ["warn", {
    patterns: [{
        group: ["**/renderer/types", "**/renderer/types.ts"],
        message: "Use `src/domain/dsl-types.ts` for shared DSL types. Do not add new imports from `renderer/types` under domain/services/components (T-101).",
    }],
}];

/** T-110: WebView レーンから Export ランタイムへの直接依存を禁止（import-boundaries-4-lanes.md） */
const rendererToExportersImportRestriction = ["warn", {
    patterns: [
        { group: ["**/exporters/**"], message: "WebView runtime must not import export runtime. See docs/import-boundaries-4-lanes.md (T-110)." },
        { group: ["**/exporters"], message: "WebView runtime must not import export runtime. See docs/import-boundaries-4-lanes.md (T-110)." },
    ],
}];

export default [{
    files: ["**/*.ts"],
    plugins: {
        "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 2022,
        sourceType: "module",
    },

    rules: {
        "@typescript-eslint/naming-convention": ["warn",
            {
                selector: "import",
                format: ["camelCase", "PascalCase"],
            },
            {
                selector: "typeLike",
                format: ["PascalCase"],
            },
            {
                selector: "interface",
                format: ["PascalCase"],
            },
            {
                selector: "variable",
                format: ["camelCase", "UPPER_CASE", "PascalCase"],
                leadingUnderscore: "allow",
            },
            {
                selector: "parameter",
                format: ["camelCase"],
                leadingUnderscore: "allow",
            },
            {
                selector: "function",
                format: ["camelCase", "PascalCase"],
            },
        ],

        curly: "warn",
        /** `== null` など意図的なパターンは smart で許容 */
        eqeqeq: ["warn", "smart"],
        "no-throw-literal": "warn",
        semi: "warn",
    },
}, {
    files: ["src/domain/**/*.ts", "src/services/**/*.ts", "src/components/**/*.ts"],
    plugins: {
        "@typescript-eslint": typescriptEslint,
    },
    languageOptions: {
        parser: tsParser,
        ecmaVersion: 2022,
        sourceType: "module",
    },
    rules: {
        "no-restricted-imports": rendererTypesImportRestriction,
    },
}, {
    files: ["src/renderer/**/*.ts", "src/renderer/**/*.tsx"],
    plugins: {
        "@typescript-eslint": typescriptEslint,
    },
    languageOptions: {
        parser: tsParser,
        ecmaVersion: 2022,
        sourceType: "module",
    },
    rules: {
        "no-restricted-imports": rendererToExportersImportRestriction,
    },
}];