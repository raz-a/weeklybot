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

The private folder needs to contain the following two files:

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
        "user:read:email"
    ],
    "expiresIn": "__",
    "obtainmentTimestamp": "__"
}
```

For more information about creating the appropriate credentials and tokens, see [Twurple's documentation](https://twurple.js.org/docs/auth/) and [Twitch's Documentation](https://dev.twitch.tv/docs/authentication/).

## License

[MIT](https://choosealicense.com/licenses/mit/)