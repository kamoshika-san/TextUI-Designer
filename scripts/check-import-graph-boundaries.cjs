#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(repoRoot, "src");
const SOURCE_EXTS = [".ts", ".tsx", ".js", ".cjs", ".mjs"];

const ALLOWED_EXPORT_TO_RENDERER = [
    {
        from: "src/exporters/react-static-export.ts",
        to: "src/renderer/preview-diff.ts",
        reason: "Primary static HTML export reuses preview key generation.",
    },
    {
        from: "src/exporters/react-static-export.ts",
        to: "src/renderer/component-map.tsx",
        reason: "Primary static HTML export reuses the registered preview component map.",
    },
    {
        from: "src/exporters/static-html-render-adapter.ts",
        to: "src/renderer/render-context.ts",
        reason: "Primary static HTML export only imports the shared render context type.",
    },
];

const allowedExportToRendererPairs = new Set(
    ALLOWED_EXPORT_TO_RENDERER.map((entry) => `${entry.from}=>${entry.to}`),
);

function toPosix(relativePath) {
    return relativePath.split(path.sep).join("/");
}

function walk(dir, out = []) {
    if (!fs.existsSync(dir)) {
        return out;
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const absPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(absPath, out);
            continue;
        }
        if (entry.isFile() && SOURCE_EXTS.includes(path.extname(entry.name))) {
            out.push(absPath);
        }
    }
    return out;
}

function classifyLane(relPath) {
    if (relPath.startsWith("src/domain/") || relPath.startsWith("src/components/definitions/")) {
        return "shared-domain";
    }
    if (
        relPath === "src/cli/commands/flow-command.ts"
        || relPath === "src/core/diff-normalization/flow-normalizer.ts"
        || relPath === "src/domain/dsl-types/navigation.ts"
        || relPath === "src/exporters/flow-export-route-utils.ts"
        || relPath.startsWith("src/exporters/flow-")
        || relPath.startsWith("src/services/semantic-diff/flow-")
        || relPath === "src/shared/navigation-flow-validator.ts"
    ) {
        return "navigation-lane";
    }
    if (relPath.startsWith("src/renderer/")) {
        return "webview-runtime";
    }
    if (relPath.startsWith("src/exporters/")) {
        return "export-runtime";
    }
    return "other";
}

function extractSpecifiers(text) {
    const specifiers = new Set();
    const patterns = [
        /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\sfrom\s+)?['"]([^'"]+)['"]/g,
        /require\(\s*['"]([^'"]+)['"]\s*\)/g,
        /import\(\s*['"]([^'"]+)['"]\s*\)/g,
    ];
    for (const pattern of patterns) {
        for (const match of text.matchAll(pattern)) {
            specifiers.add(match[1]);
        }
    }
    return [...specifiers];
}

function resolveRelativeImport(fromAbsPath, specifier) {
    if (!specifier.startsWith(".")) {
        return null;
    }
    const base = path.resolve(path.dirname(fromAbsPath), specifier);
    const candidates = [
        base,
        ...SOURCE_EXTS.map((ext) => `${base}${ext}`),
        ...SOURCE_EXTS.map((ext) => path.join(base, `index${ext}`)),
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            return toPosix(path.relative(repoRoot, candidate));
        }
    }
    return null;
}

const files = walk(srcRoot);
const violations = [];
const observedAllowedPairs = [];

for (const absPath of files) {
    const relPath = toPosix(path.relative(repoRoot, absPath));
    const lane = classifyLane(relPath);
    const text = fs.readFileSync(absPath, "utf8");
    const specifiers = extractSpecifiers(text);

    for (const specifier of specifiers) {
        if (lane === "shared-domain" && specifier === "vscode") {
            violations.push({
                file: relPath,
                edge: specifier,
                reason: "Shared domain must not depend on the VS Code API.",
            });
            continue;
        }

        if (lane === "navigation-lane" && specifier === "vscode") {
            violations.push({
                file: relPath,
                edge: specifier,
                reason: "Navigation lane representative modules must stay VS Code agnostic.",
            });
            continue;
        }

        const resolvedRelative = resolveRelativeImport(absPath, specifier);
        if (!resolvedRelative) {
            continue;
        }

        if (lane === "navigation-lane" && resolvedRelative.startsWith("src/renderer/")) {
            violations.push({
                file: relPath,
                edge: `${specifier} -> ${resolvedRelative}`,
                reason: "Navigation lane representative modules must not depend on WebView renderer internals.",
            });
            continue;
        }

        if (lane === "webview-runtime" && resolvedRelative.startsWith("src/exporters/")) {
            violations.push({
                file: relPath,
                edge: `${specifier} -> ${resolvedRelative}`,
                reason: "WebView runtime must not import export runtime directly.",
            });
            continue;
        }

        if (lane === "export-runtime" && resolvedRelative.startsWith("src/renderer/")) {
            const pairKey = `${relPath}=>${resolvedRelative}`;
            if (allowedExportToRendererPairs.has(pairKey)) {
                observedAllowedPairs.push(pairKey);
                continue;
            }
            violations.push({
                file: relPath,
                edge: `${specifier} -> ${resolvedRelative}`,
                reason: "Export runtime may only use the documented allowlisted renderer bridges.",
            });
        }
    }
}

console.log("Import graph boundary check");
console.log(`- checked source files: ${files.length}`);
console.log(`- allowlisted export->renderer edges: ${ALLOWED_EXPORT_TO_RENDERER.length}`);
console.log(`- observed allowlisted edges: ${observedAllowedPairs.length}`);

if (observedAllowedPairs.length > 0) {
    console.log("\nObserved allowlisted export->renderer edges:");
    for (const pairKey of [...new Set(observedAllowedPairs)].sort((a, b) => a.localeCompare(b))) {
        const entry = ALLOWED_EXPORT_TO_RENDERER.find((item) => `${item.from}=>${item.to}` === pairKey);
        if (entry) {
            console.log(`  - ${entry.from} -> ${entry.to}`);
        }
    }
}

if (violations.length > 0) {
    console.error("\nImport graph violation(s) detected:");
    for (const violation of violations) {
        console.error(`  - ${violation.file}: ${violation.edge}`);
        console.error(`    ${violation.reason}`);
    }
    process.exit(1);
}

console.log("\nPASS import graph matches the documented representative boundary shape.");
