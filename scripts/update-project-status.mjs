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
  if (!match) return row;

  const [, owner, repo, number] = match;
  const pull = await getPullRequest(owner, repo, number);
  const badgePattern = /<img src="https:\/\/img\.shields\.io\/badge\/(?:review|merged|closed)-\d+-(?:2ea44f|d4a72c|d73a4a)\?style=flat-square" alt="[^"]*"\/>/;
  return row.replace(badgePattern, badgeFor(pull, number));
}

const readme = await fs.readFile(readmePath, "utf8");
const rows = [...readme.matchAll(/<tr>[\s\S]*?<\/tr>/g)];
let output = "";
let cursor = 0;
for (const row of rows) {
  output += readme.slice(cursor, row.index);
  output += await updateRow(row[0]);
  cursor = row.index + row[0].length;
}
output += readme.slice(cursor);

if (output !== readme) await fs.writeFile(readmePath, output);
