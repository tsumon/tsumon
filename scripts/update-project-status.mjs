import fs from "node:fs/promises";
import path from "node:path";

const readmePath = path.join(process.cwd(), "README.md");
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error("GITHUB_TOKEN is required");

const headers = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "User-Agent": "tsumon-profile-status-sync",
  "X-GitHub-Api-Version": "2022-11-28",
};

const pullCache = new Map();

async function getPullRequest(owner, repo, number) {
  const key = `${owner}/${repo}#${number}`;
  if (!pullCache.has(key)) {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}`, {
      headers,
    });
    if (!response.ok) {
      throw new Error(`GitHub API ${response.status} for ${key}`);
    }
    pullCache.set(key, response.json());
  }
  return pullCache.get(key);
}

function badgeFor(pull, number) {
  const status = pull.merged_at ? "merged" : pull.state === "open" ? "review" : "closed";
  const color = status === "merged" ? "2ea44f" : status === "review" ? "d4a72c" : "d73a4a";
  return `<img src="https://img.shields.io/badge/${status}-${number}-${color}?style=flat-square" alt="${status} ${number}"/>`;
}

async function updateRow(row) {
  const match = row.match(/https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return { row, status: null };

  const [, owner, repo, number] = match;
  const pull = await getPullRequest(owner, repo, number);
  const status = pull.merged_at ? "merged" : pull.state === "open" ? "review" : "closed";
  const badgePattern = /<img src="https:\/\/img\.shields\.io\/badge\/(?:review|merged|closed)-\d+-(?:2ea44f|d4a72c|d73a4a)\?style=flat-square" alt="[^"]*"\s*\/>/;
  return { row: row.replace(badgePattern, badgeFor(pull, number)), status };
}

const readme = await fs.readFile(readmePath, "utf8");
const statusOrder = { merged: 0, review: 1, closed: 2 };
const statusLabels = {
  merged: ["MERGED", "landed upstream"],
  review: ["IN REVIEW", "awaiting maintainer review"],
  closed: ["CLOSED", "not merged"],
};

function renderGroupedRows(entries) {
  const grouped = [...entries].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  let currentStatus = null;
  const output = [];

  for (const entry of grouped) {
    if (entry.status !== currentStatus) {
      const [label, description] = statusLabels[entry.status];
      output.push(`  <tr>\n    <td colspan="3"><strong>${label}</strong> <sub>${description}</sub></td>\n  </tr>`);
      currentStatus = entry.status;
    }
    output.push(entry.row.replace(/^/gm, "  "));
  }

  return output.join("\n");
}

const startToken = "<!-- contribution-log:rows:start -->";
const endToken = "<!-- contribution-log:rows:end -->";
const start = readme.indexOf(startToken);
const end = readme.indexOf(endToken);
let output = readme;

if (start >= 0 && end > start) {
  const contentStart = start + startToken.length;
  const content = readme.slice(contentStart, end);
  const rows = [...content.matchAll(/<tr>[\s\S]*?<\/tr>/g)].map((match) => match[0]);
  const entries = [];
  for (const row of rows) {
    if (!row.includes("/pull/")) continue;
    entries.push(await updateRow(row));
  }

  const groupedRows = renderGroupedRows(entries);
  output = readme.slice(0, contentStart) + `\n${groupedRows}\n  ` + readme.slice(end);
} else {
  const rows = [...readme.matchAll(/<tr>[\s\S]*?<\/tr>/g)];
  let cursor = 0;
  output = "";
  for (const row of rows) {
    output += readme.slice(cursor, row.index);
    output += (await updateRow(row[0])).row;
    cursor = row.index + row[0].length;
  }
  output += readme.slice(cursor);
}

if (output !== readme) await fs.writeFile(readmePath, output);
