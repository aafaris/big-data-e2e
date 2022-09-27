const redis = require("redis");

const client = redis.createClient({
    retry_strategy: function (options) {
        if (options.error && options.error.code === 'ECONNREFUSED') {
            // End reconnecting on a specific error and flush all commands with a individual error
            return new Error('The server refused the connection');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
            // End reconnecting after a specific timeout and flush all commands with a individual error
            return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
            // End reconnecting with built in error
            return undefined;
        }
        // reconnect after
        return Math.min(options.attempt * 100, 3000);
    }
});

client.on("connect", () => {
	console.log("Client connected to redis...");
});

client.on("ready", () => {
	console.log("Client connected to redis and ready to use...");
});

client.on("error", (err) => {
	console.log(err.message);
});

client.on("end", () => {
	console.log("Client disconnected from redis!");
});

// STOP REDIS onPress CTRL + C
client.on("SIGINT", () => {
	client.quit();
});


module.exports = client;
