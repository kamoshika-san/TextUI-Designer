#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const metricsJsonPath = path.join(root, "metrics", "code-metrics.json");

if (!fs.existsSync(metricsJsonPath)) {
    process.stderr.write(
        "[ssot-metrics] metrics/code-metrics.json was not found. Run npm run metrics:collect first.\n",
    );
    process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(metricsJsonPath, "utf8"));
const ssot = payload && typeof payload === "object" ? payload.ssot : null;

if (!ssot || typeof ssot !== "object") {
    process.stderr.write(
        "[ssot-metrics] ssot metrics block is missing. Update collect-code-metrics.cjs.\n",
    );
    process.exit(1);
}

const threshold = Number(ssot.threshold) || 0;
const imports = Number(ssot.rendererTypesImports) || 0;
const violatingFiles = Array.isArray(ssot.violatingFiles) ? ssot.violatingFiles : [];
const cssThresholds =
    ssot.cssThresholds && typeof ssot.cssThresholds === "object"
        ? ssot.cssThresholds
        : {};
const cssMetrics =
    ssot.cssMetrics && typeof ssot.cssMetrics === "object" ? ssot.cssMetrics : {};
const cssViolations =
    ssot.cssViolations && typeof ssot.cssViolations === "object"
        ? ssot.cssViolations
        : {};

const importPass = imports <= threshold;
const cssChecks = [
    {
        label: "css TODO partial count",
        baseline: Number(cssThresholds.todoPartialCount) || 0,
        current: Number(cssMetrics.todoPartialCount) || 0,
        details: Array.isArray(cssViolations.todoPartialCount)
            ? cssViolations.todoPartialCount
            : [],
    },
    {
        label: "css inline utility class occurrences",
        baseline: Number(cssThresholds.nonExemptInlineUtilityClassOccurrences) || 0,
        current: Number(cssMetrics.nonExemptInlineUtilityClassOccurrences) || 0,
        details: Array.isArray(cssViolations.nonExemptInlineUtilityClassOccurrences)
            ? cssViolations.nonExemptInlineUtilityClassOccurrences
            : [],
    },
    {
        label: "css fallback compatibility selector count",
        baseline: Number(cssThresholds.fallbackCompatibilitySelectorCount) || 0,
        current: Number(cssMetrics.fallbackCompatibilitySelectorCount) || 0,
        details: Array.isArray(cssViolations.fallbackCompatibilitySelectorCount)
            ? cssViolations.fallbackCompatibilitySelectorCount
            : [],
    },
];
const cssPass = cssChecks.every((check) => check.current <= check.baseline);
const pass = importPass && cssPass;

process.stdout.write(
    `[ssot-metrics] renderer/types imports: threshold=${threshold}, current=${imports}, status=${importPass ? "PASS" : "FAIL"}\n`,
);
if (violatingFiles.length > 0) {
    process.stdout.write("[ssot-metrics] violating files:\n");
    for (const file of violatingFiles) {
        process.stdout.write(`  - ${file}\n`);
    }
}

for (const check of cssChecks) {
    const status = check.current <= check.baseline ? "PASS" : "FAIL";
    process.stdout.write(
        `[ssot-metrics] ${check.label}: baseline=${check.baseline}, current=${check.current}, status=${status}\n`,
    );
    if (status === "FAIL" && check.details.length > 0) {
        process.stdout.write(`[ssot-metrics] ${check.label} details:\n`);
        for (const detail of check.details) {
            process.stdout.write(`  - ${detail}\n`);
        }
    }
}

process.stdout.write(`[ssot-metrics] overall status=${pass ? "PASS" : "FAIL"}\n`);

if (!pass) {
    process.exit(1);
}
