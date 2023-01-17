// Contains the logic for interacting with twitch client.

import { RefreshingAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { ChatClient, PrivateMessage } from '@twurple/chat';
import { promises as fs } from 'fs';

export { PrivateMessage } from '@twurple/chat';

const client_id = "djqbdijhq8toqqnlnm1t6d6tu95qhd"
const client_secret = "pysjd1ir2fq7bqpcu7dvjqcfkmpu1k";

const tokenData = JSON.parse(await fs.readFile('./private/tokens.json', {encoding: 'utf-8'}));
const authProvider = new RefreshingAuthProvider(
    {
        clientId: client_id,
        clientSecret: client_secret,
        onRefresh: async newTokenData => await fs.writeFile('./tokens.json', JSON.stringify(newTokenData, null, 4))
	},
	tokenData
);

export const clientChannels = ["razstrats", "naircat"];
export const apiClient = new ApiClient({ authProvider });
export const chatClient = new ChatClient({ authProvider, channels: clientChannels });

