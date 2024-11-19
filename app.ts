import chalk from "chalk";

import { chatClient, apiClient, PrivateMessage } from "./client.js";
import { weeklyBotPrint, broadcast, timeout, me, get_wb_color } from "./util.js";
import { usercommands } from "./usercommands.js";
import { termcommands } from "./termcommands.js";
import { modcommands } from "./modcommands.js";
import { UI } from "./ui.js";
import { addBroadcaster } from "./broadcaster.js";
import { PissStreak } from "./piss.js";

UI.init();

UI.onPromptAvailable(onTextInput);

// Register the message handler.
chatClient.onMessage(onMessageHandler);

// Register the "on registration handler"
chatClient.onRegister(async () => {
    // Set the color.
    await apiClient.chat.setColorForUser(me.id, "spring_green");

    weeklyBotPrint("Weekly Bot has (re)started.");

    //
    // Default channels
    //

    if (!(await addBroadcaster("razstrats"))) {
        weeklyBotPrint("Could not connect to razstrats");
    }

    if (!(await addBroadcaster("naircat"))) {
        weeklyBotPrint("Could not connect to naircat");
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

    if (await usercommands.processInput(text, { channel: target, user: userInfo })) {
        return;
    }

    // Special non-command checks.
    await nonCommandProcessInput(text);
}

// Allow for commandline text input.
async function onTextInput(cmd: string) {
    if (!(await termcommands.processInput(cmd.toString().trim(), undefined))) {
        await broadcast(null, cmd);
        weeklyBotPrint(`${chalk.hex(get_wb_color())("WeeklyBot:")} ${cmd}`);
    }
}

const filteredUsers = ["streamelements", "soundalerts", "nightbot"];

function isFilteredUser(user: string) {
    let lc = user.toLowerCase();
    return filteredUsers.includes(lc);
}

async function nonCommandProcessInput(text: string) {
    const result = await PissStreak.inspectMessageForPisser(text);
    if (result.pissOccurred) {
        await handlePissMessage(result.lastDaysSince);
    }
}

async function handlePissMessage(daysSince: number) {
    const msg = `DAYS WITHOUT CHAT PISSING THEMSELVES: [̶ ̶${daysSince}\u{0336} ̶]̶ [0]`;
    weeklyBotPrint("PISSER DETECTED");
    broadcast(null, msg);
}
