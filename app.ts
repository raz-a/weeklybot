import chalk from "chalk";

import { chatClient, PrivateMessage, initClient } from "./client.js";
import {
    weeklyBotPrint,
    broadcast,
    timeout,
    initBot,
    get_wb_color,
    relay,
    isSharedChatActive,
    isNativeMessage,
    recordSharedChatMessage,
    getChatGroups,
    clipIt,
} from "./util.js";
import { usercommands } from "./usercommands.js";
import { termcommands } from "./termcommands.js";
import { modcommands } from "./modcommands.js";
import { addBroadcaster, broadcastercommands, getBroadcasterChannels, removeBroadcaster } from "./broadcaster.js";
import { PissStreak } from "./piss.js";
import { PoopCam } from "./poopcam.js";
import { PissCam } from "./pisscam.js";
import { FeatureRequestDB } from "./feature_requests.js";
import { MemeDictionary, getUserDefinitionsEnabled, setUserDefinitionsEnabled } from "./dictionary.js";
import { webServer, DashboardCallbacks } from "./webserver.js";
import { loadConfig, getConfig } from "./config.js";
import { economy } from "./economy.js";
import { messageActivity } from "./activity.js";

// Last-resort safety net: a stray rejection or thrown error in a handler should be
// logged, not crash the bot mid-stream. Command/handler errors are caught locally;
// these only fire for anything that slips through.
process.on("unhandledRejection", (reason) => {
    weeklyBotPrint(`Unhandled rejection: ${reason}`);
});
process.on("uncaughtException", (err) => {
    weeklyBotPrint(`Uncaught exception: ${err}`);
});

// Load configuration, then bring up the Twitch client and bot state before wiring up
// handlers or connecting. These were previously import-time side effects; doing them
// explicitly here keeps the underlying modules importable (e.g. in tests) with no I/O.
loadConfig();
await initClient();
await initBot();
webServer.start();

// Register the text input handler.
// TODO: Remove stdin.
process.stdin.on("data", onTextInput);
webServer.onCommand(onTextInput);

// Register dashboard callbacks for the web UI.
const dashboardCallbacks: DashboardCallbacks = {
    getState: async () => ({
        broadcasters: [...getBroadcasterChannels()],
        relayEnabled: !isSharedChatActive(),
        chatGroups: getChatGroups(),
    }),
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
    clip: async () => {
        weeklyBotPrint("Taking a clip via dashboard.");
        await clipIt(false);
    },
    getPoopCam: async () => {
        const poopTotal = await PoopCam.getTotalRequests();
        const poopParticipants = await PoopCam.getTotalParticipants();
        const poopLeaderboard = [];
        for (let i = 0; i < poopParticipants && i < 10; i++) {
            const cammer = await PoopCam.getCammerByRank(i);
            if (cammer) {
                poopLeaderboard.push({ userName: cammer.userName, requestCount: cammer.requestCount, rank: i + 1 });
            }
        }

        const pissTotal = await PissCam.getTotalRequests();
        const pissParticipants = await PissCam.getTotalParticipants();
        const pissLeaderboard = [];
        for (let i = 0; i < pissParticipants && i < 10; i++) {
            const cammer = await PissCam.getCammerByRank(i);
            if (cammer) {
                pissLeaderboard.push({ userName: cammer.userName, requestCount: cammer.requestCount, rank: i + 1 });
            }
        }

        return {
            poopCam: { totalRequests: poopTotal, leaderboard: poopLeaderboard },
            pissCam: { totalRequests: pissTotal, leaderboard: pissLeaderboard },
            rateLimit: 1,
        };
    },
    setRateLimit: (seconds: number) => {
        const poopResult = PoopCam.setRateLimit(seconds);
        const pissResult = PissCam.setRateLimit(seconds);
        if (poopResult && pissResult) weeklyBotPrint(`Cam rate limit set to ${seconds}s via dashboard.`);
        return poopResult && pissResult;
    },
    getPissStreak: async () => ({
        daysSince: await PissStreak.getDaysSince(),
    }),
    getRequests: async () => {
        try {
            const raw = await FeatureRequestDB.GetRequests();
            return {
                requests: raw.map((r) => ({
                    issueNumber: r.issueNumber,
                    requester: r.requester,
                    request: r.request,
                    date: r.date?.toString() ?? "Unknown",
                    url: r.url,
                })),
            };
        } catch {
            return { requests: [] };
        }
    },
    deleteRequest: async (issueNumber: number) => {
        await FeatureRequestDB.CloseRequest(issueNumber);
        weeklyBotPrint(`Closed feature request #${issueNumber} via dashboard.`);
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
    getUserDefinitionsEnabled: () => getUserDefinitionsEnabled(),
    setUserDefinitionsEnabled: (enabled: boolean) => {
        setUserDefinitionsEnabled(enabled);
        weeklyBotPrint(`User meme definitions ${enabled ? "enabled" : "disabled"} via dashboard.`);
    },
    getWeWeCoin: async () => {
        const balances = await economy.ledger.getAllBalances();
        return {
            balances: balances.map((b, index) => ({
                rank: index + 1,
                userName: b.userName,
                balance: b.balance,
            })),
        };
    },
};
webServer.registerCallbacks(dashboardCallbacks);

// Register the message handler.
chatClient.onMessage(onMessageHandler);

// Register the "on registration handler"
chatClient.onRegister(async () => {
    weeklyBotPrint("Weekly Bot has (re)started.");

    // Join the configured default channels.
    for (const channel of getConfig().defaultChannels) {
        if (!(await addBroadcaster(channel))) {
            weeklyBotPrint(`Could not connect to ${channel}`);
        }
    }
});

// Connect to the twitch server.
chatClient.connect();

// Every few minutes, draw a WeWeCoin lottery winner weighted by how many messages each
// viewer sent during the window, award them a coin, announce it, and reset the counts for
// the next window. Runs on a timer (Node's event loop, analogous to a periodic DPC/timer
// callback) rather than reacting to a single message.
const MESSAGE_LOTTERY_INTERVAL_MS = 5 * 60 * 1000;

async function runMessageLottery() {
    const winner = messageActivity.pickWeightedWinner();
    const totalMessages = messageActivity.total();
    messageActivity.clear();

    if (!winner) {
        return;
    }

    const outcome = await economy.record({ type: "messageLotteryWon", user: winner });
    weeklyBotPrint(outcome.description);
    await broadcast(
        `🪙 ${winner} won this round's WeWeCoin lottery out of ${totalMessages} message(s) and earned 1 WeWeCoin! Keep chatting for a shot at the next draw.`
    );
}

setInterval(() => {
    runMessageLottery().catch((err) => weeklyBotPrint(`Message lottery failed: ${err}`));
}, MESSAGE_LOTTERY_INTERVAL_MS);

// Pushes relay state and chat groups to the dashboard, but only when the grouping
// actually changes, to avoid spamming the socket on every message.
let lastChatGroupSignature = "";
function refreshDashboardChatGroups() {
    const groups = getChatGroups();
    const signature = JSON.stringify(groups);
    if (signature === lastChatGroupSignature) {
        return;
    }

    lastChatGroupSignature = signature;
    webServer.emitRelayState(!isSharedChatActive());
    webServer.emitChatGroups(groups);
}

async function onMessageHandler(target: string, user: string, text: string, msg: PrivateMessage) {
    const sourceRoomId = msg.tags.get("source-room-id");

    // Learn the current Shared Chat topology from every copy Twitch delivers, then
    // reflect any change to the relay state / chat groups on the dashboard.
    recordSharedChatMessage(msg.channelId, sourceRoomId);
    refreshDashboardChatGroups();

    // During a Shared Chat session Twitch delivers a mirrored copy of each message to
    // every participating channel. Only process the copy native to its origin channel
    // so commands and relays run exactly once.
    if (!isNativeMessage(msg.channelId, sourceRoomId)) {
        return;
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

    // Count this message toward the current WeWeCoin lottery window. This runs after the
    // moderation timeout checks above so messages that get the user timed out don't earn
    // lottery odds. The more a viewer chats, the better their odds in the periodic draw.
    messageActivity.record(userInfo.displayName);

    if (userInfo.color) {
        console.log(`${chalk.hex(userInfo.color)(userInfo.displayName + `:`)} ${text}`);
    } else {
        console.log(`${chalk.hex("#FFFFFF")(userInfo.displayName + `:`)} ${text}`);
    }

    // Extract emote positions for the web UI.
    const emotes: { id: string; start: number; end: number }[] = [];
    for (const [id, placements] of msg.emoteOffsets) {
        for (const placement of placements) {
            const [start, end] = placement.split("-").map(Number);
            emotes.push({ id, start, end });
        }
    }

    webServer.printChatMessage(userInfo.displayName, userInfo.color ?? "#FFFFFF", text, emotes);

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
    await nonCommandProcessInput(text, userInfo.displayName);
}

// Allow for commandline text input.
async function onTextInput(cmd: string) {
    if (!(await termcommands.processInput(cmd.toString().trim(), undefined))) {
        await broadcast(cmd);
        console.log(`${chalk.hex(get_wb_color())("WeeklyBot:")} ${cmd}`);
        webServer.printChatMessage("WeeklyBot", get_wb_color(), cmd.toString().trim());
    }
}

const filteredUsers = ["streamelements", "soundalerts", "nightbot"];

function isFilteredUser(user: string) {
    let lc = user.toLowerCase();
    return filteredUsers.includes(lc);
}

async function nonCommandProcessInput(text: string, user: string) {
    const result = await PissStreak.inspectMessageForPisser(text);
    if (result.pissOccurred) {
        await handlePissMessage(user, result.lastDaysSince);
    }
}

async function handlePissMessage(user: string, daysSince: number) {
    const msg = `DAYS WITHOUT CHAT PISSING THEMSELVES: [̶ ̶${daysSince}\u{0336} ̶]̶ [0]`;
    weeklyBotPrint("PISSER DETECTED");
    broadcast(msg);

    // Whoever broke the streak pays for it: max(10, streak length in days), saturating at 0.
    const outcome = await economy.record({
        type: "pissStreakRuined",
        user,
        streakSize: daysSince,
    });
    weeklyBotPrint(outcome.description);
}
