const WebSocket = require("ws");
const axios = require("axios");

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!BOT_TOKEN || !CHANNEL_ID) {
  console.error("❌ BOT_TOKEN or CHANNEL_ID is not set");
  process.exit(1);
}

const WS_URL = "wss://servatmandi.com/WebSocket";

let prices = {};
let lastSent = 0;
const SEND_INTERVAL = 30000; // 30 seconds

function connect() {
  const ws = new WebSocket(WS_URL, {
    headers: { Origin: "https://servatmandi.com" }
  });

  ws.on("open", () => {
    console.log("Connected ✅");

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

      if (!lastPrice) return;

      if (id === "100000000001") prices.usd = lastPrice;
      if (id === "5000000000000") prices.usdt = lastPrice;
      if (id === "5000000000001") prices.btc = lastPrice;
      if (id === "5000000000002") prices.eth = lastPrice;
      if (id === "50000000001301") prices.gold18 = lastPrice;

      const now = Date.now();

      if (
        prices.usd &&
        prices.usdt &&
        prices.btc &&
        prices.gold18 &&
        now - lastSent > SEND_INTERVAL
      ) {
        lastSent = now;

        const message = `
💰 قیمت لحظه‌ای بازار

💵 دلار: ${Number(prices.usd).toLocaleString()} تومان
💲 تتر: ${Number(prices.usdt).toLocaleString()} تومان
₿ بیتکوین: ${Number(prices.btc).toLocaleString()} تومان
🥇 طلا 18 عیار: ${Number(prices.gold18).toLocaleString()} تومان
`;

        await axios.post(
          `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
          {
            chat_id: CHANNEL_ID,
            text: message
          }
        );

        console.log("Sent to Telegram 🚀");
        prices = {};
      }
    } catch (err) {
      console.error("Message handling error:", err.message);
    }
  });

  ws.on("close", () => {
    console.log("Connection closed ❌ Reconnecting in 5s...");
    setTimeout(connect, 5000);
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err.message);
    ws.close();
  });
}

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

connect();
