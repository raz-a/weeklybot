import chalk from 'chalk';

import { tmiClient, apiClient } from './client.js';
import { weeklyBotPrint, prompt, send, broadcast, addNewBroadcasterId } from './util.js';
import { processUserCommand } from './usercommands.js';
import { processTermCommand } from './termcommands.js'

// Define channels to connect to.
const channels = ["razstrats", "naircat"];

// Define the readline interface
process.stdin.on("data", onTextInput);

// Register the message handler.
tmiClient.on("message", onMessageHandler);

// Connect to the twitch server.
tmiClient.connect().then(() => {

    // Attempt to join each channel.
    for (const channel of channels) {
        tmiClient.join(channel).catch((err) => {
            weeklyBotPrint(`ERROR: ${err}`);
            process.exit(1);
        }).then(() => {
            send(channel, "WeeklyBot initialized!", "chat");
            getBroadcasterId(channel).then((id) => {
                addNewBroadcasterId(channel, id);
            });
        });
    }

    // Set the color.
    tmiClient.color("SpringGreen");

    // Set the command line prompt.
    console.clear();
    prompt();

}).catch((err) => {
    weeklyBotPrint(`ERROR: ${err}`);
    process.exit(1);
});

function onMessageHandler(target, user, msg, self) {
    // Ignore messages from self.
    if (self) {
        return;
    }

    if (isFilteredUser(user)) {
        return;
    }

    // Check for benis....
    if (msg.toLowerCase().includes("benis")) {
        weeklyBotPrint("b*nis detected");
        tmiClient.say(target, `Yo ${user["display-name"]}. What the fuck is wrong with you?`);
        if ((user.mod === false) && (user.username !== target.slice(1))) {
            tmiClient.timeout(target, user.username, 10, "Bro you can't say that shit here").catch((err) => {
                weeklyBotPrint(`ERROR: ${err}`)
            });
        }

        return;
    }

    if (processUserCommand(target, user, msg)) {
        return;
    }

    if (user.color) {
        weeklyBotPrint(`${chalk.hex(user.color)(user["display-name"] + `:`)} ${msg}`);

    } else {
        weeklyBotPrint(`${chalk.hex('#FFFFFF')(user["display-name"] + `:`)} ${msg}`);
    }

    // Broadcast to all other channels.
    broadcast(target, `【${user["display-name"]}】 ${msg}`, user["message-type"]);
}

// Allow for commandline text input.
function onTextInput(line) {
    if (!processTermCommand(line.toString().trim())) {
        broadcast(null, line.toString(), "chat");
        prompt();
    }
}

const filteredUsers = ['streamelements', 'soundalerts']

function isFilteredUser(user) {
    let lc = user["display-name"].toLowerCase();
    return filteredUsers.includes(lc);
}

function getBroadcasterId(channel) {
    return apiClient.users.getUserByName(channel).then((user) => {
        return user.id;
    });
}