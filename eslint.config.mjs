import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

/**
 * 方針メモ:
 * - 既存運用に合わせて warn 中心。`npm run lint` は `--max-warnings 0` ではなく観測用途。
 * - `console.*` の統一・例外レベルは既存方針を維持。
 *
 * T-101 / Epic A A3:
 * `renderer/types` は削除済みのため、非 renderer レーンでは
 * 旧互換 import path 自体を禁止する。
 */
const rendererTypesImportRestriction = ["error", {
    patterns: [
        {
            group: ["**/renderer/types"],
            message: "Use `src/domain/dsl-types` for shared DSL types. `renderer/types` has been removed; do not add legacy imports under non-renderer lanes (T-101 / Epic A A3).",
        },
        {
            group: ["**/exporters/internal/**"],
            message: "T-020: do not import `src/exporters/internal/**` from this lane (HtmlExporter fallback lane removed, T-20260420-001).",
        },
    ],
}];

/** T-017 / T-020: exporter internal modules — CLI / MCP / services からの import を禁止 */
const cliMcpServicesHtmlLaneOptionsRestriction = ["error", {
    patterns: [
        {
            group: ["**/renderer/types"],
            message: "Use `src/domain/dsl-types` for shared DSL types. `renderer/types` has been removed; do not add legacy imports under non-renderer lanes (T-101 / Epic A A3).",
        },
        {
            group: ["**/exporters/internal/**"],
            message: "Do not import `src/exporters/internal/**` from CLI, MCP, or services (T-020). See docs/current/theme-export-rendering/t017-html-export-lane-options-internal-api.md.",
        },
        {
            group: ["**/html-export-lane-options"],
            message: "Removed in T-020: do not import deprecated `html-export-lane-options`; use exporter public APIs only.",
        },
    ],
}];

/** T-020: non-internal exporter files must not reach into `internal/` (HtmlExporter is allowlisted). */
const exporterNonInternalToInternalRestriction = ["error", {
    patterns: [
        {
            group: ["**/exporters/internal/**"],
            message: "T-020: do not import `src/exporters/internal/**` from exporter modules other than the allowlisted entrypoints. Use `src/exporters/html-exporter.ts` pattern or keep logic outside `internal/`.",
        },
        {
            group: ["./internal/**"],
            message: "T-020: do not import `./internal/**` except from `src/exporters/html-exporter.ts` (allowlisted).",
        },
        {
            group: ["../internal/**"],
            message: "T-020: do not import `../internal/**` from this exporter module.",
        },
    ],
}];

/** T-020: unit tests must not deep-import exporter internal modules. */
const testsNoDeepInternalExportersRestriction = ["error", {
    patterns: [
        {
            group: ["**/exporters/internal/**"],
            message: "T-020: do not require/import `**/exporters/internal/**` from tests.",
        },
    ],
}];

/** T-110: WebView レーンから Export ランタイムへの逆流を抑止（docs/current/testing-ci/import-boundaries-4-lanes.md）*/
const rendererToExportersImportRestriction = ["warn", {
    patterns: [
        { group: ["**/exporters/**"], message: "WebView runtime must not import export runtime. See docs/current/testing-ci/import-boundaries-4-lanes.md (T-110)." },
        { group: ["**/exporters"], message: "WebView runtime must not import export runtime. See docs/current/testing-ci/import-boundaries-4-lanes.md (T-110)." },
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
        /** `== null` など限定パターンは smart で許容 */
        eqeqeq: ["warn", "smart"],
        "no-throw-literal": "warn",
        semi: "warn",
    },
}, {
    files: [
        "src/cli/**/*.ts",
        "src/cli/**/*.tsx",
        "src/mcp/**/*.ts",
        "src/mcp/**/*.tsx",
        "src/services/**/*.ts",
        "src/services/**/*.tsx",
    ],
    plugins: {
        "@typescript-eslint": typescriptEslint,
    },
    languageOptions: {
        parser: tsParser,
        ecmaVersion: 2022,
        sourceType: "module",
    },
    rules: {
        "no-restricted-imports": cliMcpServicesHtmlLaneOptionsRestriction,
    },
}, {
    files: ["src/exporters/**/*.ts", "src/exporters/**/*.tsx"],
    ignores: ["src/exporters/internal/**", "src/exporters/html-exporter.ts"],
    plugins: {
        "@typescript-eslint": typescriptEslint,
    },
    languageOptions: {
        parser: tsParser,
        ecmaVersion: 2022,
        sourceType: "module",
    },
    rules: {
        "no-restricted-imports": exporterNonInternalToInternalRestriction,
    },
}, {
    files: ["tests/**/*.js", "tests/**/*.ts", "tests/**/*.tsx"],
    plugins: {
        "@typescript-eslint": typescriptEslint,
    },
    languageOptions: {
        parser: tsParser,
        ecmaVersion: 2022,
        sourceType: "module",
    },
    rules: {
        "no-restricted-imports": testsNoDeepInternalExportersRestriction,
    },
}, {
    files: [
        "src/domain/**/*.ts",
        "src/components/**/*.ts",
        "src/core/**/*.ts",
        "src/core/**/*.tsx",
        "src/exporters/**/*.ts",
        "src/exporters/**/*.tsx",
        "src/utils/**/*.ts",
        "src/utils/**/*.tsx",
    ],
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
