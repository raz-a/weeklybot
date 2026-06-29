# WeeklyBot

WeeklyBot is a Twitch Chatbot made for Raz and Naircat's "Weekly Wednesday" stream. It's main purpose to combine chats between multiple twitch channels, allowing for a more seemless chat interaction for all streamers and watchers.

It also contains many other fun features and commands that have evolved from requests from excited Weekly Wednesday watchers.

## How to use locally.

### Prerequisites

To use this bot, you will need [Node.js](https://nodejs.org/) installed on your local machine.

Install the needed dependencies by running:
```bash
npm install
```

### Building

Build the project using `tsc` from the root directory.

The resulting javascript will be located in the created "weeklybot" folder.

### Running

To run weeklybot, simply run via node from the weeklybot folder.
```bash
node app.js
```


### Authentication

In order to actually connect to twitch, you must have your own twitch account's client
information provided.

WeeklyBot expects a folder named "private" to be located in the directory that node is being run
from.

The private folder needs to contain the following files (the first three are required; `dashboard.json` is optional but recommended):

1. `clientinfo.json` : Contains the client id and secret.

```json
{
    "id": "[ID]",
    "secret": "[SECRET]"
}
```

2. `token.json` : Contains a refreshing access token used by the underlying Twurple APIs.
```json
{
    "accessToken": "[accesstoken]",
    "refreshToken": "[refreshtoken]",
    "scope": [
        "chat:edit",
        "chat:read",
        "clips:edit",
        "user:read:email",
        "user:manage:chat_color"
        "moderator:manage:banned_users",
        "moderation:read"
    ],
    "expiresIn": "__",
    "obtainmentTimestamp": "__"
}
```

3. `githubinfo.json` : Contains a GitHub Personal Access Token used for creating feature request issues. The token needs **Issues (Read and write)** permission on the target repository.
```json
{
    "token": "[GITHUB_PAT]",
    "owner": "[REPO_OWNER]",
    "repo": "[REPO_NAME]"
}
```

4. `dashboard.json` : Password that unlocks write controls on the web dashboard. The dashboard is read-only for anyone on the network; entering this password grants control (reboot, channel management, clip, dictionary edits, etc.). If the file is missing, the dashboard stays read-only for everyone.
```json
{
    "password": "[DASHBOARD_PASSWORD]"
}
```

For more information about creating the appropriate Twitch credentials and tokens, see [Twurple's documentation](https://twurple.js.org/docs/auth/) and [Twitch's Documentation](https://dev.twitch.tv/docs/authentication/). For GitHub tokens, see [GitHub's documentation on fine-grained personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token).

## Web Dashboard

WeeklyBot serves a web dashboard on port **3000** (e.g. `http://localhost:3000`). It shows the live combined chat, connected broadcasters and chat groups, cam stats, the piss streak, feature requests, and the meme dictionary. From it you can also send messages/commands, reboot, take clips, manage channels, and edit the dictionary.

Access is split into two tiers:

- **Read-only (no login):** anyone who can reach the page can view chat and stats.
- **Control (login required):** all write actions — sending commands, reboot, clip, adding/removing channels, rate limits, closing requests, dictionary edits — require entering the password from `private/dashboard.json`. Logging in stores a token in the browser so you stay in control across refreshes and devices. If `dashboard.json` is absent, the dashboard is read-only for everyone.

The password protects only LAN viewers from making changes; it is sent over plain HTTP, so put the dashboard behind a TLS reverse proxy if you ever expose it beyond a trusted network.

## License

[MIT](https://choosealicense.com/licenses/mit/)