import { Octokit } from "@octokit/rest";
import { readFileSync } from "fs";

type GitHubInfo = {
    token: string;
    owner: string;
    repo: string;
};

export type FeatureRequest = {
    issueNumber: number;
    requester: string;
    request: string;
    date: Date;
    url: string;
};

const LABEL = "feature-request";

function loadGitHubInfo(): GitHubInfo {
    const raw = readFileSync("./private/githubinfo.json", "utf-8");
    return JSON.parse(raw);
}

const githubInfo = loadGitHubInfo();
const octokit = new Octokit({
    auth: githubInfo.token,
    headers: { "X-GitHub-Api-Version": "2022-11-28" },
});

export abstract class FeatureRequestDB {
    static #labelEnsured = false;

    static async #ensureLabel(): Promise<void> {
        if (this.#labelEnsured) return;
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
        }
        this.#labelEnsured = true;
    }

    static async AddNewRequest(requester: string, request: string): Promise<string> {
        await this.#ensureLabel();
        const { data: issue } = await octokit.rest.issues.create({
            owner: githubInfo.owner,
            repo: githubInfo.repo,
            title: request,
            body: `Requested by: ${requester}`,
            labels: [LABEL],
        });
        return issue.html_url;
    }

    static async CloseRequest(issueNumber: number): Promise<void> {
        await octokit.rest.issues.update({
            owner: githubInfo.owner,
            repo: githubInfo.repo,
            issue_number: issueNumber,
            state: "closed",
        });
    }

    static async GetRequests(): Promise<FeatureRequest[]> {
        await this.#ensureLabel();
        const { data } = await octokit.rest.issues.listForRepo({
            owner: githubInfo.owner,
            repo: githubInfo.repo,
            labels: LABEL,
            state: "open",
            sort: "created",
            direction: "asc",
        });

        return data.map((issue) => {
            const requesterMatch = issue.body?.match(/^Requested by: (.+)$/m);
            return {
                issueNumber: issue.number,
                requester: requesterMatch?.[1] ?? "Unknown",
                request: issue.title,
                date: new Date(issue.created_at),
                url: issue.html_url,
            };
        });
    }
}
