// Contains the logic for interacting with twitch client.

import { RefreshingAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { ChatClient, PrivateMessage } from '@twurple/chat';
import { promises as fs } from 'fs';

export { PrivateMessage } from '@twurple/chat';

const clientInfo = JSON.parse(await fs.readFile('./private/clientinfo.json', { encoding: 'utf-8' }));
const tokenData = JSON.parse(await fs.readFile('./private/token.json', {encoding: 'utf-8'}));
const authProvider = new RefreshingAuthProvider(
    {
        clientId: clientInfo.id,
        clientSecret: clientInfo.secret,
        onRefresh: async newTokenData => await fs.writeFile('./private/token.json', JSON.stringify(newTokenData, null, 4))
	},
	tokenData
);

export const clientChannels = ["razstrats", "naircat"];
export const apiClient = new ApiClient({ authProvider });
export const chatClient = new ChatClient({ authProvider, channels: clientChannels, isAlwaysMod: true, botLevel: 'known' });

