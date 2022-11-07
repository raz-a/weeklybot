// Contains the logic for interacting with twitch client.

import tmi from 'tmi.js';
import { RefreshingAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { promises as fs } from 'fs';

const client_id = "djqbdijhq8toqqnlnm1t6d6tu95qhd"
const client_secret = "pysjd1ir2fq7bqpcu7dvjqcfkmpu1k";

const tokenData = JSON.parse(await fs.readFile('./tokens.json', 'UTF-8'));
const authProvider = new RefreshingAuthProvider(
    {
        clientId: client_id,
        clientSecret: client_secret,
        onRefresh: async newTokenData => await fs.writeFile('./tokens.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
	},
	tokenData
);

// Define the bot's login info.
const opts = {
    identity: {
        username: "weekly_bot",
        password: "oauth:e28epxkd4grmcqie41n252yjmmpr77"
    }
};

export const apiClient = new ApiClient({ authProvider });
export const tmiClient = new tmi.client(opts);