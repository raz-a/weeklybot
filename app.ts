import chalk from 'chalk';

import { chatClient, apiClient, PrivateMessage } from './client.js';
import { weeklyBotPrint, prompt, broadcast, timeout } from './util.js';
import { processUserCommand } from './usercommands.js';
import { processTermCommand } from './termcommands.js'

// Define channels to connect to.
const channels = ["razstrats", "naircat"];

// Define the readline interface
process.stdin.on("data", onTextInput);

// Register the message handler.
chatClient.onMessage(onMessageHandler);

// Connect to the twitch server.
chatClient.connect().then(() => {

    // Set the color.
    chatClient.changeColor("SpringGreen");

    // Set the command line prompt.
    console.clear();
    prompt();

}).catch((err) => {
    weeklyBotPrint(`ERROR: ${err}`);
    process.exit(1);
});

function onMessageHandler(target: string, user: string, text: string, msg: PrivateMessage) {
    var userinfo = msg.userInfo;

    if (isFilteredUser(user)) {
        return;
    }

    // Check for benis....
    if (text.toLowerCase().includes("benis")) {
        weeklyBotPrint("b*nis detected");
        chatClient.say(target, `Yo ${user}. What the fuck is wrong with you?`);
        if ((userinfo.isMod === false) && (user !== target.slice(1))) {
            timeout(null, user, 10, "Bro you can't say that shit here");
        }

        return;
    }

    if (processUserCommand(target, user, text)) {
        return;
    }

    if (userinfo.color) {
        weeklyBotPrint(`${chalk.hex(userinfo.color)(user + `:`)} ${text}`);

    } else {
        weeklyBotPrint(`${chalk.hex('#FFFFFF')(user + `:`)} ${text}`);
    }

    // Broadcast to all other channels.
    broadcast(target.slice(1), `【${user}】 ${text}`);
}

// Allow for commandline text input.
function onTextInput(line: Buffer) {
    if (!processTermCommand(line.toString().trim())) {
        broadcast(null, line.toString());
        prompt();
    }
}

const filteredUsers = ['streamelements', 'soundalerts']

function isFilteredUser(user: string) {
    let lc = user.toLowerCase();
    return filteredUsers.includes(lc);
}

function getBroadcasterId(channel : string) {
    return apiClient.users.getUserByName(channel).then((user) => {
        if (user) {
            return user.id;
        }

        return null;
    });
}