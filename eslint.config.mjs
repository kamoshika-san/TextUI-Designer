import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

/**
 * 方針（T-20260320-025）:
 * - 命名・表記ゆれは warn（`npm run lint` は `--max-warnings 0` のため実質ゼロ警告維持）
 * - `console.*` の統一・禁止レベルは T-20260320-020 側。ここではルールを足さず、意図のみコメントで明示
 */
export default [{
    files: ["**/*.ts"],
}, {
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
}];