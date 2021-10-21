const tmi = require("tmi.js");

var channels = ["naircat", "razstrats"];

const opts = {
    identity: {
        username: "weeklywednesdaybot",
        password: "oauth:pdedycnpfqlxs6dnbyqcsb4lbm195l"
    },
    channels: channels
};


const client = new tmi.client(opts);

client.on("connected", onConnectedHandler);
client.on("message", onMessageHandler);

client.connect();

function onMessageHandler(target, context, msg, self) {
    if (self) {
        return;
    }

    for (const channel of channels) {
        if (channel !== target) {
            client.say(channel, `[${target}'s chat] ${context["display-name"]}: ${msg}`);
        }
    }
}

function onConnectedHandler(addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
}