#!/usr/bin/env node
/**
 * リポジトリ内のソース規模を集計し、JSON / Markdown を metrics/ に出力する。
 * CI（Linux）では PATH に cloc がある場合、言語別行数も取り込む。
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { globSync } = require("glob");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "metrics");

/** @typedef {{ files: number, totalLines: number, nonEmptyLines: number }} Bucket */

/** @type {{ name: string, pattern: string }[]} */
const PATTERNS = [
    { name: "src/typescript", pattern: "src/**/*.ts" },
    { name: "src/tsx", pattern: "src/**/*.tsx" },
    { name: "tests", pattern: "tests/**/*.{js,ts}" },
    { name: "scripts", pattern: "scripts/**/*.cjs" },
];

const IGNORE = ["**/node_modules/**", "**/out/**", "**/dist/**"];

/**
 * @param {string} relPosix
 */
function topSegment(relPosix) {
    const parts = relPosix.split("/");
    if (parts[0] === "src" && parts.length >= 2) {
        return `src/${parts[1]}`;
    }
    return parts[0] || "root";
}

/**
 * @param {string} absPath
 * @returns {{ total: number, nonEmpty: number }}
 */
function analyzeFile(absPath) {
    const text = fs.readFileSync(absPath, "utf8");
    const lines = text.split(/\r?\n/);
    const total = lines.length;
    const nonEmpty = lines.filter((l) => l.trim().length > 0).length;
    return { total, nonEmpty };
}

/**
 * @returns {Record<string, unknown> | null}
 */
function runClocJson() {
    const r = spawnSync(
        "cloc",
        ["src", "tests", "scripts", "--json", "--quiet"],
        { cwd: root, encoding: "utf8" },
    );
    if (r.error || r.status !== 0 || !r.stdout) {
        return null;
    }
    try {
        return JSON.parse(r.stdout);
    } catch {
        return null;
    }
}

/**
 * @param {Record<string, Bucket>} bySegment
 * @returns {string}
 */
function formatSegmentTable(bySegment) {
    const rows = Object.entries(bySegment)
        .sort((a, b) => b[1].nonEmptyLines - a[1].nonEmptyLines)
        .map(
            ([seg, b]) =>
                `| ${seg} | ${b.files} | ${b.totalLines} | ${b.nonEmptyLines} |`,
        );
    return [
        "| 区分 | ファイル数 | 行数（全行） | 行数（空行除く） |",
        "| --- | ---: | ---: | ---: |",
        ...rows,
    ].join("\n");
}

/**
 * @param {Record<string, unknown> | null} cloc
 * @returns {string}
 */
function formatClocSection(cloc) {
    if (!cloc || typeof cloc !== "object") {
        return [
            "## cloc（言語別）",
            "",
            "_cloc が利用できませんでした（ローカルでは未インストールの場合があります）。CI では Linux ランナーに cloc を入れて実行します。_",
            "",
        ].join("\n");
    }
    const langKeys = Object.keys(cloc).filter((k) => {
        if (k === "header" || k === "SUM") {
            return false;
        }
        const o = cloc[k];
        return (
            o !== null &&
            typeof o === "object" &&
            "code" in /** @type {object} */ (o)
        );
    });
    const header = "| 言語 | code | comment | blank | 合計 |";
    const sep = "| --- | ---: | ---: | ---: | ---: |";
    const body = langKeys
        .sort((a, b) => a.localeCompare(b))
        .map((lang) => {
            const o = /** @type {{ code?: number, comment?: number, blank?: number }} */ (
                cloc[lang]
            );
            const code = Number(o.code) || 0;
            const comment = Number(o.comment) || 0;
            const blank = Number(o.blank) || 0;
            const sum = code + comment + blank;
            return `| ${lang} | ${code} | ${comment} | ${blank} | ${sum} |`;
        });
    const sumObj = cloc.SUM;
    let footer = "";
    if (sumObj && typeof sumObj === "object" && "code" in sumObj) {
        const s = /** @type {{ code?: number, comment?: number, blank?: number }} */ (
            sumObj
        );
        const code = Number(s.code) || 0;
        const comment = Number(s.comment) || 0;
        const blank = Number(s.blank) || 0;
        const total = code + comment + blank;
        footer = `| **SUM** | ${code} | ${comment} | ${blank} | ${total} |`;
    }
    const lines = ["## cloc（言語別）", "", header, sep, ...body];
    if (footer) {
        lines.push("", footer);
    }
    lines.push("");
    return lines.join("\n");
}

function main() {
    fs.mkdirSync(outDir, { recursive: true });

    /** @type {Record<string, Bucket>} */
    const byPattern = {};
    /** @type {Record<string, Bucket>} */
    const bySegment = {};
    /** @type {Bucket} */
    const grand = { files: 0, totalLines: 0, nonEmptyLines: 0 };

    for (const { name, pattern } of PATTERNS) {
        byPattern[name] = { files: 0, totalLines: 0, nonEmptyLines: 0 };
        const files = globSync(pattern, {
            cwd: root,
            nodir: true,
            ignore: IGNORE,
        });
        for (const f of files) {
            const abs = path.join(root, f);
            const { total, nonEmpty } = analyzeFile(abs);
            const relPosix = f.split(path.sep).join("/");
            byPattern[name].files += 1;
            byPattern[name].totalLines += total;
            byPattern[name].nonEmptyLines += nonEmpty;
            grand.files += 1;
            grand.totalLines += total;
            grand.nonEmptyLines += nonEmpty;
            const seg = topSegment(relPosix);
            if (!bySegment[seg]) {
                bySegment[seg] = { files: 0, totalLines: 0, nonEmptyLines: 0 };
            }
            bySegment[seg].files += 1;
            bySegment[seg].totalLines += total;
            bySegment[seg].nonEmptyLines += nonEmpty;
        }
    }

    const cloc = runClocJson();

    const payload = {
        generatedAt: new Date().toISOString(),
        summary: grand,
        byPattern,
        bySegment,
        cloc: cloc || undefined,
    };

    fs.writeFileSync(
        path.join(outDir, "code-metrics.json"),
        `${JSON.stringify(payload, null, 2)}\n`,
        "utf8",
    );

    const md = [
        "# コードメトリクス",
        "",
        `_生成: ${payload.generatedAt}_`,
        "",
        "## サマリー",
        "",
        "| 指標 | 値 |",
        "| --- | ---: |",
        `| 対象ファイル数 | ${grand.files} |`,
        `| 行数（全行） | ${grand.totalLines} |`,
        `| 行数（空行除く） | ${grand.nonEmptyLines} |`,
        "",
        "## パターン別",
        "",
        "| パターン | ファイル数 | 行数（全行） | 行数（空行除く） |",
        "| --- | ---: | ---: | ---: |",
        ...Object.entries(byPattern).map(
            ([n, b]) =>
                `| ${n} | ${b.files} | ${b.totalLines} | ${b.nonEmptyLines} |`,
        ),
        "",
        "## ディレクトリ区分（src の第1階層ほか）",
        "",
        formatSegmentTable(bySegment),
        "",
        formatClocSection(cloc),
    ].join("\n");

    fs.writeFileSync(path.join(outDir, "code-metrics.md"), md, "utf8");

    // CI などからそのままサマリーに追記しやすいよう stdout にも Markdown を出す
    process.stdout.write(`${md}\n`);
}

main();
