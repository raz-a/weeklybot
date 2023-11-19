import chalk from "chalk";

import { chatClient, apiClient, PrivateMessage, clientChannels } from "./client.js";
import {
    weeklyBotPrint,
    prompt,
    broadcast,
    timeout,
    addNewBroadcaster,
    me,
    getBroadcasterId,
} from "./util.js";
import { usercommands } from "./usercommands.js";
import { termcommands } from "./termcommands.js";
import { modcommands } from "./modcommands.js";

// Define the readline interface
process.stdin.on("data", onTextInput);

// Register the message handler.
chatClient.onMessage(onMessageHandler);

// Register the "on registration handler"
chatClient.onRegister(async () => {
    // Set the color.
    await apiClient.chat.setColorForUser(me.id, "spring_green");

    // Set the command line prompt.
    console.clear();
    await prompt();

    broadcast(null, "Weekly Bot has been updated!");

    for (const channel of clientChannels) {
        let user = await getBroadcasterId(channel);

        if (user) {
            addNewBroadcaster(channel, user);
        }
    }
});

// Connect to the twitch server.
chatClient.connect();

async function onMessageHandler(target: string, user: string, text: string, msg: PrivateMessage) {
    var userInfo = msg.userInfo;

    if (isFilteredUser(user)) {
        return;
    }

    // Check for benis....
    if (text.toLowerCase().includes("benis")) {
        weeklyBotPrint("b*nis detected");
        chatClient.say(target, `Yo ${user}. What the fuck is wrong with you?`);
        if (userInfo.isMod === false && user !== target.slice(1)) {
            timeout(null, user, 10, "Bro you can't say that shit here");
        }

        return;
    }

    if (userInfo.color) {
        weeklyBotPrint(`${chalk.hex(userInfo.color)(user + `:`)} ${text}`);
    } else {
        weeklyBotPrint(`${chalk.hex("#FFFFFF")(user + `:`)} ${text}`);
    }

    // Broadcast to all other channels.
    broadcast(target.slice(1), `【${user}】 ${text}`);

    if (await modcommands.processInput(text, userInfo)) {
        return;
    }

    usercommands.processInput(text, { channel: target, user: userInfo });
}

// Allow for commandline text input.
async function onTextInput(line: Buffer) {
    if (!(await termcommands.processInput(line.toString().trim(), undefined))) {
        broadcast(null, line.toString());
        await prompt();
    }
}

const filteredUsers = ["streamelements", "soundalerts"];

function isFilteredUser(user: string) {
    let lc = user.toLowerCase();
    return filteredUsers.includes(lc);
}
