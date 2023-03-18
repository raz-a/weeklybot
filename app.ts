import chalk from "chalk";

import { chatClient, apiClient, PrivateMessage, clientChannels } from "./client.js";
import { weeklyBotPrint, prompt, broadcast, timeout, addNewBroadcasterId, me } from "./util.js";
import { usercommands } from "./usercommands.js";
import { termcommands } from "./termcommands.js";

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
    prompt();

    broadcast(null, "Weekly Bot Connected!");

    for (const channel of clientChannels) {
        let id = await getBroadcasterId(channel);

        if (id) {
            addNewBroadcasterId(channel, id);
        }
    }
});

// Connect to the twitch server.
chatClient.connect();

function onMessageHandler(target: string, user: string, text: string, msg: PrivateMessage) {
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

    if (userInfo.color || userInfo.color === "#000000") {
        weeklyBotPrint(`${chalk.hex(userInfo.color)(user + `:`)} ${text}`);
    } else {
        weeklyBotPrint(`${chalk.hex("#FFFFFF")(user + `:`)} ${text}`);
    }

    // Broadcast to all other channels.
    broadcast(target.slice(1), `【${user}】 ${text}`);

    usercommands.processInput(text, target, userInfo);
}

// Allow for commandline text input.
function onTextInput(line: Buffer) {
    if (!termcommands.processInput(line.toString().trim())) {
        broadcast(null, line.toString());
        prompt();
    }
}

const filteredUsers = ["streamelements", "soundalerts"];

function isFilteredUser(user: string) {
    let lc = user.toLowerCase();
    return filteredUsers.includes(lc);
}

async function getBroadcasterId(channel: string) {
    let user = await apiClient.users.getUserByName(channel);
    if (user) {
        return user.id;
    }

    return null;
}
