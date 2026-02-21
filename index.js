require('dotenv').config();
const WebSocket = require("ws");
const axios = require("axios");

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

const ws = new WebSocket("wss://servatmandi.com/WebSocket", {
  headers: { Origin: "https://servatmandi.com" }
});

let prices = {};

ws.on("open", () => {
  console.log("Connected ✅");

  ws.send("Init|60219;/");
  ws.send("Sync");
  ws.send("SpecialWatch|Home");
});

ws.on("message", async (data) => {
  const msg = data.toString();

  if (!msg.includes("|")) return;

  const [type, payload] = msg.split("|");
  const parts = payload.split(",");

  const id = parts[0];
  const lastPrice = parts[5];

  // مپ کردن ID ها
  if (id === "100000000001") prices.usd = lastPrice;
  if (id === "5000000000000") prices.usdt = lastPrice;
  if (id === "5000000000001") prices.btc = lastPrice;
  if (id === "5000000000002") prices.eth = lastPrice;
  if (id === "50000000001301") prices.gold18 = lastPrice;

  // وقتی همه مقدار گرفتن
  if (prices.usd && prices.usdt && prices.btc && prices.gold18) {
    const message = `
💰 قیمت لحظه‌ای بازار

💵 دلار: ${Number(prices.usd).toLocaleString()} تومان
💲 تتر: ${Number(prices.usdt).toLocaleString()} تومان
₿ بیتکوین: ${Number(prices.btc).toLocaleString()} تومان
🥇 طلا 18 عیار: ${Number(prices.gold18).toLocaleString()} تومان
`;

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHANNEL_ID,
      text: message
    });

    console.log("Sent to Telegram 🚀");

    prices = {}; // ریست برای دور بعد
  }
});
