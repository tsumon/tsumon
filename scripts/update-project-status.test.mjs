import assert from "node:assert/strict";
import test from "node:test";

import { buildContributionEntries, fetchAuthoredPulls, renderContributionRows } from "./update-project-status.mjs";

const metadata = {
  entries: {
    "alpha/project#10": {
      repositoryName: "Alpha Project",
      description: "修复 Alpha 问题。",
    },
  },
  exclude: ["ignored/project#9"],
};

test("new external pull requests are included and ignored pull requests stay excluded", () => {
  const entries = buildContributionEntries(
    [
      {
        owner: "zeta",
        repo: "project",
        number: 3,
        title: "add zeta support",
        state: "open",
        merged_at: null,
        html_url: "https://github.com/zeta/project/pull/3",
      },
      {
        owner: "alpha",
        repo: "project",
        number: 10,
        title: "fallback title should not replace metadata",
        state: "closed",
        merged_at: "2026-09-18T00:00:00Z",
        html_url: "https://github.com/alpha/project/pull/10",
      },
      {
        owner: "ignored",
        repo: "project",
        number: 9,
        title: "obsolete duplicate",
        state: "closed",
        merged_at: null,
        html_url: "https://github.com/ignored/project/pull/9",
      },
    ],
    metadata,
  );

  assert.deepEqual(
    entries.map(({ repositoryName, number, status }) => ({ repositoryName, number, status })),
    [
      { repositoryName: "Alpha Project", number: 10, status: "merged" },
        { repositoryName: "zeta/project", number: 3, status: "review" },
    ],
  );
  assert.equal(entries[0].description, "修复 Alpha 问题。");
  assert.equal(entries[1].description, "add zeta support");
});

test("rows are grouped by outcome and sorted by repository name", () => {
  const html = renderContributionRows([
    {
      owner: "zeta",
      repo: "project",
      number: 3,
      repositoryName: "Zeta",
      description: "zeta",
      status: "review",
      html_url: "https://github.com/zeta/project/pull/3",
    },
    {
      owner: "alpha",
      repo: "project",
      number: 10,
      repositoryName: "Alpha",
      description: "alpha",
      status: "review",
      html_url: "https://github.com/alpha/project/pull/10",
    },
    {
      owner: "beta",
      repo: "project",
      number: 2,
      repositoryName: "Beta",
      description: "beta",
      status: "merged",
      html_url: "https://github.com/beta/project/pull/2",
    },
  ]);

  assert.ok(html.indexOf("MERGED") < html.indexOf("IN REVIEW"));
  assert.match(html, /<td colspan="3" align="center"><strong>MERGED<\/strong>/);
  assert.ok(html.indexOf("Beta") < html.indexOf("Alpha"));
  assert.ok(html.indexOf("Alpha") < html.indexOf("Zeta"));
});

test("pull discovery searches authored PRs and skips PRs in the profile owner's repositories", async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url.includes("/search/issues")) {
      return {
        ok: true,
        json: async () => ({
          total_count: 2,
          items: [
            { html_url: "https://github.com/anthropics/sandbox-runtime/pull/567" },
            { html_url: "https://github.com/tsumon/own-repo/pull/1" },
          ],
        }),
      };
    }

    return {
      ok: true,
      json: async () => ({ merged_at: null, state: "open", title: "timeout fix" }),
    };
  };

  const pulls = await fetchAuthoredPulls({ token: "test-token", fetchImpl });

  assert.deepEqual(pulls, [
    {
      owner: "anthropics",
      repo: "sandbox-runtime",
      number: 567,
      html_url: "https://github.com/anthropics/sandbox-runtime/pull/567",
      merged_at: null,
      state: "open",
      title: "timeout fix",
    },
  ]);
  assert.equal(calls.filter((url) => url.includes("/pull/1")).length, 0);
});
