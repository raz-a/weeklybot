import chalk from "chalk";

import { chatClient, apiClient, PrivateMessage } from "./client.js";
import {
    weeklyBotPrint,
    broadcast,
    timeout,
    me,
    get_wb_color,
    relay,
    getRelayMode,
    setRelayMode,
} from "./util.js";
import { usercommands } from "./usercommands.js";
import { termcommands } from "./termcommands.js";
import { modcommands } from "./modcommands.js";
import { addBroadcaster, broadcastercommands, getBroadcasterChannels, getFirstBroadcasterChannel, removeBroadcaster } from "./broadcaster.js";
import { PissStreak } from "./piss.js";
import { PoopCam } from "./poopcam.js";
import { FeatureRequestDB } from "./feature_requests.js";
import { MemeDictionary } from "./dictionary.js";
import { webServer, DashboardCallbacks } from "./webserver.js";

// Register the text input handler.
// TODO: Remove stdin.
process.stdin.on("data", onTextInput);
webServer.onCommand(onTextInput);

// Register dashboard callbacks for the web UI.
const dashboardCallbacks: DashboardCallbacks = {
    getState: async () => ({
        broadcasters: [...getBroadcasterChannels()],
        relayEnabled: getRelayMode(),
    }),
    toggleRelay: (enabled: boolean) => {
        setRelayMode(enabled);
        weeklyBotPrint(`Relay mode ${enabled ? "enabled" : "disabled"} via dashboard.`);
    },
    addBroadcaster: async (channel: string) => {
        const result = await addBroadcaster(channel);
        if (result) weeklyBotPrint(`Added ${channel} via dashboard.`);
        return result;
    },
    removeBroadcaster: (channel: string) => {
        const result = removeBroadcaster(channel);
        if (result) weeklyBotPrint(`Removed ${channel} via dashboard.`);
        return result;
    },
    reboot: async () => {
        await broadcast("WeeklyBot is rebooting (via dashboard)...");
        process.exit(0);
    },
    getPoopCam: async () => {
        const totalRequests = await PoopCam.getTotalRequests();
        const totalParticipants = await PoopCam.getTotalParticipants();
        const leaderboard = [];
        for (let i = 0; i < totalParticipants && i < 10; i++) {
            const cammer = await PoopCam.getCammerByRank(i);
            if (cammer) {
                leaderboard.push({ userName: cammer.userName, requestCount: cammer.requestCount, rank: i + 1 });
            }
        }
        return { totalRequests, rateLimit: 1, leaderboard };
    },
    setRateLimit: (seconds: number) => {
        const result = PoopCam.setRateLimit(seconds);
        if (result) weeklyBotPrint(`Rate limit set to ${seconds}s via dashboard.`);
        return result;
    },
    getPissStreak: async () => ({
        daysSince: await PissStreak.getDaysSince(),
    }),
    getRequests: async () => {
        try {
            const raw = await FeatureRequestDB.GetRequests();
            return {
                requests: raw.map((r, i) => ({
                    index: i,
                    requester: r.requester,
                    request: r.request,
                    date: r.date?.toString() ?? "Unknown",
                })),
            };
        } catch {
            return { requests: [] };
        }
    },
    deleteRequest: async (index: number) => {
        await FeatureRequestDB.RemoveRequestByIndex(index);
        weeklyBotPrint(`Deleted feature request #${index} via dashboard.`);
    },
    getDictionary: async () => ({
        words: await MemeDictionary.getAllWords(),
    }),
    getWord: async (word: string) => ({
        word,
        definitions: await MemeDictionary.getDefinitions(word),
    }),
    addDefinition: async (word: string, definition: string) => {
        await MemeDictionary.addDefinition(word, definition);
        weeklyBotPrint(`Added meme definition for "${word}" via dashboard.`);
    },
    deleteDefinition: async (word: string, index?: number) => {
        const result = await MemeDictionary.removeDefinition(word, index);
        if (result) weeklyBotPrint(`Removed meme definition for "${word}" via dashboard.`);
        return result;
    },
};
webServer.registerCallbacks(dashboardCallbacks);

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
    if (!getRelayMode()) {
        if (target.slice(1).toLowerCase() != getFirstBroadcasterChannel()) {
            return;
        }
    }

    var userInfo = msg.userInfo;

    if (isFilteredUser(user)) {
        return;
    }

    let lowercase = text.toLowerCase();

    // Check for benis....
    if (lowercase.includes("benis")) {
        weeklyBotPrint("b*nis detected");
        broadcast(`Yo ${user}. What the fuck is wrong with you?`);
        timeout(null, userInfo, 10, "Bro you can't say that shit here");

        return;
    }

    if (lowercase.includes("taco bell") || lowercase.includes("tacobell")) {
        weeklyBotPrint("taco bell detected");
        broadcast(`Yo ${user}. We don't support any discussion of Taco Bell here.`);
        timeout(null, userInfo, 5, "No Taco Bell discussion allowed");

        return;
    }

    if (userInfo.color) {
        weeklyBotPrint(`${chalk.hex(userInfo.color)(userInfo.displayName + `:`)} ${text}`);
    } else {
        weeklyBotPrint(`${chalk.hex("#FFFFFF")(userInfo.displayName + `:`)} ${text}`);
    }

    // Relay  to all other channels.
    relay(target.slice(1), `【${userInfo.displayName}】 ${text}`);

    if (await broadcastercommands.processInput(text, userInfo)) {
        return;
    }

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
        await broadcast(cmd);
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
    broadcast(msg);
}
