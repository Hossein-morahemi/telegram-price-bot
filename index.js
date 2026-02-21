require("dotenv").config();
const WebSocket = require("ws");
const axios = require("axios");

/* ================= CONFIG ================= */

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!BOT_TOKEN || !CHANNEL_ID) {
console.error("❌ Missing BOT_TOKEN or CHANNEL_ID");
process.exit(1);
}

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const WS_URL = "wss://servatmandi.com/WebSocket";

let prices = {};
let reconnectTimer = null;

/* ================= SAFE AXIOS SEND ================= */

async function sendTelegramMessage(text) {
try {
await axios.post(`${TELEGRAM_API}/sendMessage`, {
chat_id: CHANNEL_ID,
text,
}, {
timeout: 15000
});

```
    console.log("✅ Sent to Telegram");

} catch (err) {
    console.error("Telegram Send Error:", err.message);
}
```

}

/* ================= PRICE FORMAT ================= */

function formatPrice(value) {
return Number(value).toLocaleString("en-US");
}

/* ================= BUILD MESSAGE ================= */

function buildMessage() {
return `
💰 قیمت لحظه‌ای بازار

💵 دلار: ${formatPrice(prices.usd)} تومان
💲 تتر: ${formatPrice(prices.usdt)} تومان
₿ بیتکوین: ${formatPrice(prices.btc)} تومان
🥇 طلا 18 عیار: ${formatPrice(prices.gold18)} تومان
`;
}

/* ================= WEB SOCKET CONNECT ================= */

function connectWebSocket() {

```
console.log("🔄 Connecting WebSocket...");

const ws = new WebSocket(WS_URL, {
    headers: { Origin: "https://servatmandi.com" }
});

ws.on("open", () => {
    console.log("✅ WebSocket Connected");

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
        const lastPrice = parts[5];

        if (!id || !lastPrice) return;

        if (id === "100000000001") prices.usd = lastPrice;
        if (id === "5000000000000") prices.usdt = lastPrice;
        if (id === "5000000000001") prices.btc = lastPrice;
        if (id === "5000000000002") prices.eth = lastPrice;
        if (id === "50000000001301") prices.gold18 = lastPrice;

        if (prices.usd && prices.usdt && prices.btc && prices.gold18) {

            await sendTelegramMessage(buildMessage());

            prices = {};
        }

    } catch (err) {
        console.error("Message Handler Error:", err.message);
    }
});

ws.on("close", () => {
    console.warn("⚠ WebSocket Closed — Reconnecting...");

    if (reconnectTimer) clearTimeout(reconnectTimer);

    reconnectTimer = setTimeout(connectWebSocket, 5000);
});

ws.on("error", (err) => {
    console.error("WebSocket Error:", err.message);
    ws.close();
});
```

}

/* ================= START ================= */

connectWebSocket();

/* ================= GLOBAL CRASH HANDLER ================= */

process.on("uncaughtException", err => {
console.error("Uncaught Exception:", err.message);
});

process.on("unhandledRejection", err => {
console.error("Unhandled Rejection:", err.message);
});
