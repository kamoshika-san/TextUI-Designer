#!/usr/bin/env node
/**
 * Collect repository line-count metrics and SSoT regression metrics into
 * metrics/code-metrics.{json,md}.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "metrics");
const SSOT_IMPORT_THRESHOLD = Number(process.env.SSOT_IMPORT_THRESHOLD || 0);
const CSS_SSOT_BASELINES = {
    todoPartialCount: 0,
    nonExemptInlineUtilityClassOccurrences: 6,
    fallbackCompatibilitySelectorCount: 31,
};
const INLINE_UTILITY_TARGET_COMPONENTS = new Set([
    "Checkbox.tsx",
    "Form.tsx",
    "Input.tsx",
    "Radio.tsx",
]);
const INLINE_UTILITY_TOKEN_PATTERN =
    /^(?:text-|border-|px-|py-|mb-|space-|flex$|items-|block$|font-|ml-)/;

/** @typedef {{ files: number, totalLines: number, nonEmptyLines: number }} Bucket */

/** @type {{ name: string, baseDir: string, exts: string[] }[]} */
const PATTERNS = [
    { name: "src/typescript", baseDir: "src", exts: [".ts"] },
    { name: "src/tsx", baseDir: "src", exts: [".tsx"] },
    { name: "tests", baseDir: "tests", exts: [".js", ".ts"] },
    { name: "scripts", baseDir: "scripts", exts: [".cjs"] },
];

const IGNORED_SEGMENTS = new Set([
    "node_modules",
    "out",
    "dist",
    "media",
    "metrics",
    "coverage",
    ".tmp-plan",
]);

function topSegment(relPosix) {
    const parts = relPosix.split("/");
    if (parts[0] === "src" && parts.length >= 2) {
        return `src/${parts[1]}`;
    }
    return parts[0] || "root";
}

function analyzeFile(absPath) {
    const text = fs.readFileSync(absPath, "utf8");
    const lines = text.split(/\r?\n/);
    const total = lines.length;
    const nonEmpty = lines.filter((line) => line.trim().length > 0).length;
    return { total, nonEmpty };
}

function runClocJson() {
    const result = spawnSync(
        "cloc",
        ["src", "tests", "scripts", "--json", "--quiet"],
        { cwd: root, encoding: "utf8" },
    );
    if (result.error || result.status !== 0 || !result.stdout) {
        return null;
    }
    try {
        return JSON.parse(result.stdout);
    } catch {
        return null;
    }
}

function formatSegmentTable(bySegment) {
    const rows = Object.entries(bySegment)
        .sort((a, b) => b[1].nonEmptyLines - a[1].nonEmptyLines)
        .map(
            ([segment, bucket]) =>
                `| ${segment} | ${bucket.files} | ${bucket.totalLines} | ${bucket.nonEmptyLines} |`,
        );
    return [
        "| Segment | Files | Total lines | Non-empty lines |",
        "| --- | ---: | ---: | ---: |",
        ...rows,
    ].join("\n");
}

function formatClocSection(cloc) {
    if (!cloc || typeof cloc !== "object") {
        return [
            "## cloc",
            "",
            "_cloc output unavailable in this environment._",
            "",
        ].join("\n");
    }
    const langKeys = Object.keys(cloc).filter((key) => {
        if (key === "header" || key === "SUM") {
            return false;
        }
        const value = cloc[key];
        return value !== null && typeof value === "object" && "code" in value;
    });
    const rows = langKeys
        .sort((a, b) => a.localeCompare(b))
        .map((lang) => {
            const value = cloc[lang];
            const code = Number(value.code) || 0;
            const comment = Number(value.comment) || 0;
            const blank = Number(value.blank) || 0;
            return `| ${lang} | ${code} | ${comment} | ${blank} | ${code + comment + blank} |`;
        });
    const lines = [
        "## cloc",
        "",
        "| Language | Code | Comment | Blank | Total |",
        "| --- | ---: | ---: | ---: | ---: |",
        ...rows,
    ];
    if (cloc.SUM && typeof cloc.SUM === "object") {
        const code = Number(cloc.SUM.code) || 0;
        const comment = Number(cloc.SUM.comment) || 0;
        const blank = Number(cloc.SUM.blank) || 0;
        lines.push("", `| **SUM** | ${code} | ${comment} | ${blank} | ${code + comment + blank} |`);
    }
    lines.push("");
    return lines.join("\n");
}

function isSourceLikeFile(relPosix) {
    return /\.(ts|tsx|js|cjs|mjs)$/.test(relPosix);
}

function collectFilesUnder(baseDir, exts) {
    const startDir = path.join(root, baseDir);
    if (!fs.existsSync(startDir)) {
        return [];
    }

    /** @type {string[]} */
    const files = [];

    function walk(absDir) {
        let dirEntries;
        try {
            dirEntries = fs.readdirSync(absDir, { withFileTypes: true });
        } catch (error) {
            // Transient race when a temp directory is removed while walking
            if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
                return;
            }
            throw error;
        }

        for (const entry of dirEntries) {
            if (IGNORED_SEGMENTS.has(entry.name)) {
                continue;
            }
            const absPath = path.join(absDir, entry.name);
            if (entry.isDirectory()) {
                walk(absPath);
                continue;
            }
            if (!entry.isFile()) {
                continue;
            }
            if (!exts.includes(path.extname(entry.name))) {
                continue;
            }
            files.push(path.relative(root, absPath).split(path.sep).join("/"));
        }
    }

    walk(startDir);
    files.sort((a, b) => a.localeCompare(b));
    return files;
}

function extractClassNameTokens(line) {
    const match = line.match(/className\s*=\s*"([^"]+)"/);
    if (!match) {
        return [];
    }
    return match[1]
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean);
}

function collectTodoPartialCount(lines) {
    /** @type {string[]} */
    const matches = [];
    for (let i = 0; i < lines.length; i += 1) {
        if (/TODO partial/i.test(lines[i])) {
            matches.push(`line ${i + 1}: ${lines[i].trim()}`);
        }
    }
    return { count: matches.length, matches };
}

function collectInlineUtilityClassOccurrences() {
    const files = collectFilesUnder("src/renderer/components", [".tsx"]);
    /** @type {string[]} */
    const matches = [];

    for (const relPosix of files) {
        const baseName = path.posix.basename(relPosix);
        if (!INLINE_UTILITY_TARGET_COMPONENTS.has(baseName)) {
            continue;
        }

        const lines = fs.readFileSync(path.join(root, relPosix), "utf8").split(/\r?\n/);
        for (let i = 0; i < lines.length; i += 1) {
            const tokens = extractClassNameTokens(lines[i]);
            if (tokens.length === 0) {
                continue;
            }
            const utilityTokens = tokens.filter((token) =>
                INLINE_UTILITY_TOKEN_PATTERN.test(token),
            );
            const spacingOnlyUtilityLine =
                utilityTokens.length > 0 &&
                utilityTokens.every((token) => /^mb-\d+$/.test(token));
            const allTokensAllowed = tokens.every(
                (token) =>
                    token.startsWith("textui-") ||
                    INLINE_UTILITY_TOKEN_PATTERN.test(token),
            );
            if (
                utilityTokens.length === 0 ||
                spacingOnlyUtilityLine ||
                !allTokensAllowed
            ) {
                continue;
            }
            matches.push(`${relPosix}:${i + 1}: ${lines[i].trim()}`);
        }
    }

    return { count: matches.length, matches };
}

function collectFallbackCompatibilitySelectorCount() {
    const relPosix = "src/exporters/html-template-builder.ts";
    const text = fs.readFileSync(path.join(root, relPosix), "utf8");
    const blockMatch = text.match(
        /function getFallbackCompatibilityStyleBlock\(\): string \{\s+return `([\s\S]*?)`;\s+\}/,
    );
    if (!blockMatch) {
        return { count: 0, matches: [] };
    }

    const matches = [...blockMatch[1].matchAll(/(\.textui-[^{]+)\{/g)].map(
        (match) => match[1].trim(),
    );
    return { count: matches.length, matches };
}

function collectSsotMetrics() {
    const candidates = collectFilesUnder(".", [".ts", ".tsx", ".js", ".cjs", ".mjs"]);
    const violatingFiles = [];
    const importPattern =
        /(?:from\s+['"][^'"]*renderer\/types['"]|require\(\s*['"][^'"]*renderer\/types['"]\s*\))/g;

    for (const relPosix of candidates) {
        if (!isSourceLikeFile(relPosix)) {
            continue;
        }
        if (relPosix === "src/renderer/types.ts" || relPosix.startsWith("out/")) {
            continue;
        }
        const text = fs.readFileSync(path.join(root, relPosix), "utf8");
        if (importPattern.test(text)) {
            violatingFiles.push(relPosix);
        }
    }
    violatingFiles.sort((a, b) => a.localeCompare(b));

    const todoPartialFiles = [
        ...collectFilesUnder("src/renderer/components/styles", [".css"]),
        ...collectFilesUnder("src/renderer/components", [".tsx"]),
    ];
    /** @type {string[]} */
    const todoPartialMatches = [];
    for (const relPosix of todoPartialFiles) {
        const lines = fs.readFileSync(path.join(root, relPosix), "utf8").split(/\r?\n/);
        const result = collectTodoPartialCount(lines);
        for (const match of result.matches) {
            todoPartialMatches.push(`${relPosix}:${match}`);
        }
    }

    const inlineUtility = collectInlineUtilityClassOccurrences();
    const fallbackSelectors = collectFallbackCompatibilitySelectorCount();
    const cssMetrics = {
        todoPartialCount: todoPartialMatches.length,
        nonExemptInlineUtilityClassOccurrences: inlineUtility.count,
        fallbackCompatibilitySelectorCount: fallbackSelectors.count,
    };
    const importPass = violatingFiles.length <= SSOT_IMPORT_THRESHOLD;
    const cssPass =
        cssMetrics.todoPartialCount <= CSS_SSOT_BASELINES.todoPartialCount &&
        cssMetrics.nonExemptInlineUtilityClassOccurrences <=
            CSS_SSOT_BASELINES.nonExemptInlineUtilityClassOccurrences &&
        cssMetrics.fallbackCompatibilitySelectorCount <=
            CSS_SSOT_BASELINES.fallbackCompatibilitySelectorCount;

    return {
        threshold: SSOT_IMPORT_THRESHOLD,
        rendererTypesImports: violatingFiles.length,
        violatingFiles,
        cssThresholds: { ...CSS_SSOT_BASELINES },
        cssMetrics,
        cssViolations: {
            todoPartialCount: todoPartialMatches,
            nonExemptInlineUtilityClassOccurrences: inlineUtility.matches,
            fallbackCompatibilitySelectorCount: fallbackSelectors.matches,
        },
        status: importPass && cssPass ? "pass" : "fail",
    };
}

function main() {
    fs.mkdirSync(outDir, { recursive: true });

    /** @type {Record<string, Bucket>} */
    const byPattern = {};
    /** @type {Record<string, Bucket>} */
    const bySegment = {};
    const grand = { files: 0, totalLines: 0, nonEmptyLines: 0 };

    for (const { name, baseDir, exts } of PATTERNS) {
        byPattern[name] = { files: 0, totalLines: 0, nonEmptyLines: 0 };
        const files = collectFilesUnder(baseDir, exts);
        for (const relPosix of files) {
            const absPath = path.join(root, relPosix);
            const { total, nonEmpty } = analyzeFile(absPath);
            byPattern[name].files += 1;
            byPattern[name].totalLines += total;
            byPattern[name].nonEmptyLines += nonEmpty;
            grand.files += 1;
            grand.totalLines += total;
            grand.nonEmptyLines += nonEmpty;
            const segment = topSegment(relPosix);
            if (!bySegment[segment]) {
                bySegment[segment] = { files: 0, totalLines: 0, nonEmptyLines: 0 };
            }
            bySegment[segment].files += 1;
            bySegment[segment].totalLines += total;
            bySegment[segment].nonEmptyLines += nonEmpty;
        }
    }

    const cloc = runClocJson();
    const ssot = collectSsotMetrics();
    const payload = {
        generatedAt: new Date().toISOString(),
        summary: grand,
        byPattern,
        bySegment,
        ssot,
        cloc: cloc || undefined,
    };

    fs.writeFileSync(
        path.join(outDir, "code-metrics.json"),
        `${JSON.stringify(payload, null, 2)}\n`,
        "utf8",
    );

    const md = [
        "# Code Metrics",
        "",
        `_Generated: ${payload.generatedAt}_`,
        "",
        "## Summary",
        "",
        "| Metric | Value |",
        "| --- | ---: |",
        `| Files | ${grand.files} |`,
        `| Total lines | ${grand.totalLines} |`,
        `| Non-empty lines | ${grand.nonEmptyLines} |`,
        "",
        "## By Pattern",
        "",
        "| Pattern | Files | Total lines | Non-empty lines |",
        "| --- | ---: | ---: | ---: |",
        ...Object.entries(byPattern).map(
            ([name, bucket]) =>
                `| ${name} | ${bucket.files} | ${bucket.totalLines} | ${bucket.nonEmptyLines} |`,
        ),
        "",
        "## By Segment",
        "",
        formatSegmentTable(bySegment),
        "",
        "## SSoT Import Metrics",
        "",
        "| Metric | Value |",
        "| --- | ---: |",
        `| renderer/types threshold | ${ssot.threshold} |`,
        `| renderer/types imports | ${ssot.rendererTypesImports} |`,
        `| status | ${ssot.status === "pass" ? "PASS" : "FAIL"} |`,
        "",
        ssot.violatingFiles.length > 0
            ? [
                  "### renderer/types violating files",
                  "",
                  ...ssot.violatingFiles.map((file) => `- \`${file}\``),
                  "",
              ].join("\n")
            : "_No renderer/types violations._",
        "",
        "## CSS SSoT Metrics",
        "",
        "| Metric | Baseline | Current |",
        "| --- | ---: | ---: |",
        `| TODO partial count | ${ssot.cssThresholds.todoPartialCount} | ${ssot.cssMetrics.todoPartialCount} |`,
        `| Non-exempt inline utility class occurrences | ${ssot.cssThresholds.nonExemptInlineUtilityClassOccurrences} | ${ssot.cssMetrics.nonExemptInlineUtilityClassOccurrences} |`,
        `| Fallback compatibility selector count | ${ssot.cssThresholds.fallbackCompatibilitySelectorCount} | ${ssot.cssMetrics.fallbackCompatibilitySelectorCount} |`,
        "",
        formatClocSection(cloc),
    ].join("\n");

    fs.writeFileSync(path.join(outDir, "code-metrics.md"), md, "utf8");
    process.stdout.write(`${md}\n`);
}

module.exports = {
    collectSsotMetrics,
    collectTodoPartialCount,
    collectInlineUtilityClassOccurrences,
    collectFallbackCompatibilitySelectorCount,
};

if (require.main === module) {
    main();
}
