import tmi from 'tmi.js';
import chalk from 'chalk';

// Define channels to connect to.
const channels = ["razstrats", "naircat"];

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
const client = new tmi.client(opts);

// Register the message handler.
client.on("message", onMessageHandler);

// Connect to the twitch server.
client.connect().then(() => {

    // Attempt to join each channel.
    for (const channel of channels) {
        client.join(channel).catch((err) => {
            weeklyBotPrint(`ERROR: ${err}`);
            process.exit(1);
        });
    }

    // Set the color.
    client.color("SpringGreen");

    // Set the command line prompt.
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

    if (user.color) {
        weeklyBotPrint(`${chalk.hex(user.color)(user["display-name"] + `:`)} ${msg}`);

    } else {
        weeklyBotPrint(`${chalk.hex('#FFFFFF')(user["display-name"] + `:`)} ${msg}`);
    }


    // Broadcast to all other channels.
    for (const channel of client.getChannels()) {
        if (channel !== target) {
            //weeklyBotPrint(`Sending message from ${target} to ${channel}`);
            switch (user["message-type"]) {
                case "action":
                    client.action(channel, `【${user["display-name"]}】 ${msg}`).catch((err) => {
                        weeklyBotPrint(`ERROR: ${err}`);
                    });

                    break;

                case "chat":
                    client.say(channel, `【${user["display-name"]}】 ${msg}`).catch((err) => {
                        weeklyBotPrint(`ERROR: ${err}`);
                    });

                    break;
            }
        }
    }
}

// Allow for commandline text input.
function onTextInput(line) {
    for (const channel of client.getChannels()) {
        client.say(channel, line.toString()).catch((err) => {
            weeklyBotPrint(`ERROR: ${err}`);
        });
    }

    prompt();
}

// Function to keep weekly bot text on the bottom.
function weeklyBotPrint(message) {
    process.stdout.cursorTo(0);
    process.stdout.clearLine();
    process.stdout.write(message + `\n`);
    prompt();
}

function prompt() {
    process.stdout.write(chalk.green(client.getUsername() + `:`));
}