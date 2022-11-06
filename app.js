import chalk from 'chalk';

import { weeklyBotPrint, createClient, prompt, send, broadcast } from './util.js';
import { processUserCommand } from './usercommands.js';
import { processTermCommand } from './termcommands.js'

// Define channels to connect to.
const channels = ["razstrats", "naircat"];

const client_id = "djqbdijhq8toqqnlnm1t6d6tu95qhd"

// Define the bot's login info.
const opts = {
    identity: {
        username: "weekly_bot",
        password: "oauth:pv8vf6m4mgsqs378wvup9z4n88vfho"
    }
};

// Define the readline interface
process.stdin.on("data", onTextInput);

// Create the client object.
const client = createClient(opts);
let broadcaster_id_map = {};

// Register the message handler.
client.on("message", onMessageHandler);

// Connect to the twitch server.
client.connect().then(() => {

    // Attempt to join each channel.
    for (const channel of channels) {
        client.join(channel).catch((err) => {
            weeklyBotPrint(`ERROR: ${err}`);
            process.exit(1);
        }).then(() => {
            send(channel, "WeeklyBot initialized!", "chat");
            broadcaster_id_map[channel] = getBroadcasterId(channel);
        });
    }

    // Set the color.
    client.color("SpringGreen");

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
        client.say(target, `Yo ${user["display-name"]}. What the fuck is wrong with you?`);
        if ((user.mod === false) && (user.username !== target.slice(1))) {
            client.timeout(target, user.username, 10, "Bro you can't say that shit here").catch((err) => {
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
        for (const channel of client.getChannels()) {
            client.say(channel, line.toString()).catch((err) => {
                weeklyBotPrint(`ERROR: ${err}`);
            });
        }

        prompt();
    }
}

const filteredUsers = ['streamelements', 'soundalerts']

function isFilteredUser(user) {
    let lc = user["display-name"].toLowerCase();
    return filteredUsers.includes(lc);
}


function getBroadcasterId(channel) {
    fetch(`https://api.twitch.tv/helix/users?login=${channel}`, {credentials: 'include'}).then((response) => {
        console.log(response);
    })
}