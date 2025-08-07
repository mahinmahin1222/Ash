const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs");

require("dotenv").config();
const app = express();
const PORT = process.env.PORT || 3000;

// Language files
const bn = JSON.parse(fs.readFileSync("./lang/bn.json"));
const en = JSON.parse(fs.readFileSync("./lang/en.json")); // optional
const lang = {
  bn,
  en
};

// Default language
const getLang = (userId = null) => lang["bn"]; // future: user-based lang

// Messenger Webhook Verification
app.get("/webhook", (req, res) => {
  let VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// Receiving Messages
app.post("/webhook", (req, res) => {
  let body = req.body;

  if (body.object === "page") {
    body.entry.forEach(function(entry) {
      let webhook_event = entry.messaging[0];
      let sender_psid = webhook_event.sender.id;

      if (webhook_event.message && webhook_event.message.text) {
        handleMessage(sender_psid, webhook_event.message.text);
      }
    });

    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// Handle Message
function handleMessage(sender_psid, received_text) {
  const t = getLang(sender_psid); // Use Bangla

  let response = t.unknown_command;

  if (received_text === "/start") {
    response = t.greeting;
  } else if (received_text === "/help") {
    response = t.help;
  } else if (received_text === "/joke") {
    response = t.joke;
  } else if (received_text === "/bye") {
    response = t.bye;
  } else if (received_text === "/love") {
    response = t.love;
  }

  callSendAPI(sender_psid, { text: response });
}

// Send Message to Messenger
function callSendAPI(sender_psid, response) {
  let request_body = {
    recipient: {
      id: sender_psid
    },
    message: response
  };

  axios.post(
    `https://graph.facebook.com/v17.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}`,
    request_body
  ).then(() => {
    console.log("Message sent!");
  }).catch((error) => {
    console.error("Unable to send message:", error.response?.data || error.message);
  });
}

app.use(bodyParser.json());
app.listen(PORT, () => console.log(`Messenger Bot running on port ${PORT}`));
