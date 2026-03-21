#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const metricsJsonPath = path.join(root, "metrics", "code-metrics.json");

if (!fs.existsSync(metricsJsonPath)) {
    process.stderr.write(
        "[ssot-metrics] metrics/code-metrics.json が見つかりません。先に npm run metrics:collect を実行してください。\n",
    );
    process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(metricsJsonPath, "utf8"));
const ssot = payload && typeof payload === "object" ? payload.ssot : null;

if (!ssot || typeof ssot !== "object") {
    process.stderr.write(
        "[ssot-metrics] ssot メトリクスがありません。collect-code-metrics.cjs を更新してください。\n",
    );
    process.exit(1);
}

const threshold = Number(ssot.threshold) || 0;
const imports = Number(ssot.rendererTypesImports) || 0;
const violatingFiles = Array.isArray(ssot.violatingFiles)
    ? ssot.violatingFiles
    : [];
const pass = imports <= threshold;

process.stdout.write(
    `[ssot-metrics] threshold=${threshold}, renderer/types imports=${imports}, status=${pass ? "PASS" : "FAIL"}\n`,
);
if (violatingFiles.length > 0) {
    process.stdout.write("[ssot-metrics] violating files:\n");
    for (const f of violatingFiles) {
        process.stdout.write(`  - ${f}\n`);
    }
}

if (!pass) {
    process.exit(1);
}
