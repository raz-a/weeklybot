// One-time migration script: converts existing feature requests from the local
// JSON database into GitHub Issues.
//
// Usage:  node weeklybot/migrate_requests.js
//
// Requires private/githubinfo.json to be present.

import { readFileSync } from "fs";
import { Octokit } from "@octokit/rest";

type OldRequest = {
    requester: string;
    request: string;
    date: string;
};

type GitHubInfo = {
    token: string;
    owner: string;
    repo: string;
};

const LABEL = "feature-request";

async function migrate() {
    const githubInfo: GitHubInfo = JSON.parse(
        readFileSync("./private/githubinfo.json", "utf-8")
    );
    const octokit = new Octokit({
        auth: githubInfo.token,
        headers: { "X-GitHub-Api-Version": "2022-11-28" },
    });

    // Ensure the label exists.
    try {
        await octokit.rest.issues.getLabel({
            owner: githubInfo.owner,
            repo: githubInfo.repo,
            name: LABEL,
        });
    } catch {
        await octokit.rest.issues.createLabel({
            owner: githubInfo.owner,
            repo: githubInfo.repo,
            name: LABEL,
            color: "a2eeef",
            description: "Feature requests from Twitch chat",
        });
        console.log(`Created label "${LABEL}".`);
    }

    // Read the old requests.
    const raw = readFileSync("./save/feature_requests.json", "utf-8");
    const data: { requests: OldRequest[] } = JSON.parse(raw);

    if (!data.requests || data.requests.length === 0) {
        console.log("No requests to migrate.");
        return;
    }

    console.log(`Migrating ${data.requests.length} request(s)...\n`);

    for (const req of data.requests) {
        const date = new Date(req.date);
        const dateStr = date.toISOString().split("T")[0];

        const { data: issue } = await octokit.rest.issues.create({
            owner: githubInfo.owner,
            repo: githubInfo.repo,
            title: req.request,
            body: `Requested by: ${req.requester}\n\n*Migrated from local database. Originally requested on ${dateStr}.*`,
            labels: [LABEL],
        });

        console.log(`  ✓ #${issue.number}: ${req.request} (by ${req.requester})`);
    }

    console.log("\nMigration complete!");
}

migrate().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
