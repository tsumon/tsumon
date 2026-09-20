import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDirectory = path.dirname(scriptPath);
const repositoryRoot = path.resolve(scriptDirectory, "..");
const defaultReadmePath = path.join(repositoryRoot, "README.md");
const defaultMetadataPath = path.join(scriptDirectory, "contribution-metadata.json");
const defaultLogin = "tsumon";
const statusOrder = { merged: 0, review: 1 };
const statusLabels = {
  merged: ["MERGED", "landed upstream"],
  review: ["IN REVIEW", "awaiting maintainer review"],
};

function repositoryKey(pull) {
  return `${pull.owner}/${pull.repo}#${pull.number}`;
}

export function statusForPull(pull) {
  if (pull.merged_at || pull.mergedAt) return "merged";
  return pull.state === "open" ? "review" : "closed";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function repositorySortKey(name) {
  return name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function sortContributions(entries) {
  return [...entries].sort((a, b) => {
    const statusDifference = statusOrder[a.status] - statusOrder[b.status];
    if (statusDifference !== 0) return statusDifference;

    const repositoryDifference = repositorySortKey(a.repositoryName).localeCompare(repositorySortKey(b.repositoryName));
    if (repositoryDifference !== 0) return repositoryDifference;

    return Number(a.number) - Number(b.number);
  });
}

export function buildContributionEntries(pulls, metadata = {}) {
  const excluded = new Set(metadata.exclude ?? []);

  return sortContributions(
    pulls
      .filter((pull) => !excluded.has(repositoryKey(pull)))
    .map((pull) => {
      const details = metadata.entries?.[repositoryKey(pull)] ?? {};
      const htmlUrl = pull.html_url ?? `https://github.com/${pull.owner}/${pull.repo}/pull/${pull.number}`;

        return {
          ...pull,
          description: details.description ?? escapeHtml(pull.title),
          html_url: htmlUrl,
          repositoryName: details.repositoryName ?? `${pull.owner}/${pull.repo}`,
          status: statusForPull(pull),
        };
      })
      .filter((entry) => entry.status !== "closed"),
  );
}

function badgeFor(entry) {
  const color = entry.status === "merged" ? "2ea44f" : entry.status === "review" ? "d4a72c" : "d73a4a";
  return `<img src="https://img.shields.io/badge/${entry.status}-${entry.number}-${color}?style=flat-square" alt="${entry.status} ${entry.number}"/>`;
}

function repositoryLabel(entry) {
  return `<span>${escapeHtml(entry.owner)}/</span><br><strong>${escapeHtml(entry.repo)}</strong>`;
}

function renderContributionRow(entry) {
  const repositoryUrl = `https://github.com/${entry.owner}/${entry.repo}`;
  return [
    "  <tr>",
    `        <td><a href="${repositoryUrl}">${repositoryLabel(entry)}</a></td>`,
    `        <td>${entry.description}</td>`,
    `        <td><a href="${entry.html_url}">${badgeFor(entry)}</a></td>`,
    "      </tr>",
  ].join("\n");
}

export function renderContributionRows(entries) {
  const output = [];
  let currentStatus = null;

  for (const entry of sortContributions(entries)) {
    if (entry.status !== currentStatus) {
      const [label, description] = statusLabels[entry.status];
      output.push(`  <tr>\n    <td colspan="3" align="center"><strong>${label}</strong> <sub>${description}</sub></td>\n  </tr>`);
      currentStatus = entry.status;
    }
    output.push(renderContributionRow(entry));
  }

  return output.join("\n");
}

async function githubJson(fetchImpl, url, headers) {
  const response = await fetchImpl(url, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status} for ${url}: ${body.slice(0, 200)}`);
  }
  return response.json();
}

function parsePullUrl(url) {
  const match = new URL(url).pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)$/);
  if (!match) return null;
  const [, owner, repo, number] = match;
  return { owner, repo, number: Number(number) };
}

export async function fetchAuthoredPulls({ token, login = defaultLogin, fetchImpl = fetch } = {}) {
  if (!token) throw new Error("GITHUB_TOKEN is required");

  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "tsumon-profile-status-sync",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const pulls = [];
  const query = encodeURIComponent(`author:${login} type:pr`);
  const pageSize = 100;

  for (let page = 1; ; page += 1) {
    const search = await githubJson(
      fetchImpl,
      `https://api.github.com/search/issues?q=${query}&per_page=${pageSize}&page=${page}`,
      headers,
    );

    for (const item of search.items ?? []) {
      const pull = parsePullUrl(item.html_url);
      if (!pull || pull.owner.toLowerCase() === login.toLowerCase()) continue;

      const details = await githubJson(
        fetchImpl,
        `https://api.github.com/repos/${pull.owner}/${pull.repo}/pulls/${pull.number}`,
        headers,
      );
      pulls.push({
        ...pull,
        html_url: item.html_url,
        merged_at: details.merged_at,
        state: details.state,
        title: details.title ?? item.title,
      });
    }

    const fetched = page * pageSize;
    if (!search.items?.length || fetched >= search.total_count) break;
  }

  return pulls;
}

async function readMetadata(metadataPath) {
  return JSON.parse(await fs.readFile(metadataPath, "utf8"));
}

export async function syncReadme({
  readmePath = defaultReadmePath,
  metadataPath = defaultMetadataPath,
  token = process.env.GITHUB_TOKEN,
  login = defaultLogin,
  fetchImpl = fetch,
} = {}) {
  const [readme, metadata] = await Promise.all([fs.readFile(readmePath, "utf8"), readMetadata(metadataPath)]);
  const pulls = await fetchAuthoredPulls({ token, login, fetchImpl });
  const entries = buildContributionEntries(pulls, metadata);
  const startToken = "<!-- contribution-log:rows:start -->";
  const endToken = "<!-- contribution-log:rows:end -->";
  const start = readme.indexOf(startToken);
  const end = readme.indexOf(endToken);

  if (start < 0 || end <= start) throw new Error("Contribution log markers are missing or out of order");

  const contentStart = start + startToken.length;
  const output = readme.slice(0, contentStart) + `\n${renderContributionRows(entries)}\n  ` + readme.slice(end);
  if (output !== readme) await fs.writeFile(readmePath, output);

  return { changed: output !== readme, count: entries.length, entries };
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  syncReadme()
    .then(({ changed, count }) => {
      console.log(`${changed ? "Updated" : "Already up to date"} ${count} contribution entries.`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
