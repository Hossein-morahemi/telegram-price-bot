require("dotenv").config();
const WebSocket = require("ws");
const axios = require("axios");

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!BOT_TOKEN || !CHANNEL_ID) {
console.error("Missing ENV variables");
process.exit(1);
}

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const WS_URL = "wss://servatmandi.com/WebSocket";

let prices = {};
let reconnectTimer = null;

async function sendTelegramMessage(text) {
try {
await axios.post(`${TELEGRAM_API}/sendMessage`, {
chat_id: CHANNEL_ID,
text
}, { timeout: 15000 });

```
    console.log("Sent Telegram");

} catch (err) {
    console.error("Telegram Send Error:", err.message);
}
```

}

function formatPrice(v) {
return Number(v).toLocaleString("en-US");
}

function buildMessage() {
return `
💰 قیمت لحظه‌ای بازار

💵 دلار: ${formatPrice(prices.usd)}
💲 تتر: ${formatPrice(prices.usdt)}
₿ بیتکوین: ${formatPrice(prices.btc)}
🥇 طلا 18: ${formatPrice(prices.gold18)}
`;
}

function connectWS() {

```
const ws = new WebSocket(WS_URL, {
    headers: { Origin: "https://servatmandi.com" }
});

ws.on("open", () => {
    console.log("Connected");

    ws.send("Init|60219;/");
    ws.send("Sync");
    ws.send("SpecialWatch|Home");
});

ws.on("message", async (data) => {
    try {

        const msg = data.toString();
        if (!msg.includes("|")) return;

        const [, payload] = msg.split("|");
        const parts = payload.split(",");

        const id = parts[0];
        const price = parts[5];

        if (!id || !price) return;

        if (id === "100000000001") prices.usd = price;
        if (id === "5000000000000") prices.usdt = price;
        if (id === "5000000000001") prices.btc = price;
        if (id === "5000000000002") prices.eth = price;
        if (id === "50000000001301") prices.gold18 = price;

        if (prices.usd && prices.usdt && prices.btc && prices.gold18) {
            await sendTelegramMessage(buildMessage());
            prices = {};
        }

    } catch (err) {
        console.error("Message Error:", err.message);
    }
});

ws.on("close", () => {
    console.log("WS Closed → Reconnect");

    if (reconnectTimer) clearTimeout(reconnectTimer);

    reconnectTimer = setTimeout(connectWS, 5000);
});

ws.on("error", err => {
    console.error("WS Error:", err.message);
    ws.close();
});
```

}

connectWS();

process.on("uncaughtException", err => {
console.error("Crash:", err.message);
});
