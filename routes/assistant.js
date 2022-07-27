var express = require("express");
var router = express.Router();
var AssistantV2 = require("ibm-watson/assistant/v2"); // watson sdk
var IamAuthenticator = require("ibm-watson/auth").IamAuthenticator;

// Create the service wrapper
var assistant = new AssistantV2({
  version: "2021-11-27",
  authenticator: new IamAuthenticator({
    apikey: process.env.ASSISTANT_IAM_APIKEY,
  }),
  url: process.env.ASSISTANT_URL,
});

router.use((req, res, next) => {
  console.log("Time: ", Date.now());
  next();
});

router.post("/message", async (req, res, next) => {
  console.log(req.body);

  try {
    let waResponse = await assistant.message({
      assistantId: process.env.ASSISTANT_ID,
      sessionId: req.body.session_id,
      input: {
        message_type: "text",
        text: `${req.body.message}`,
      },
    });
    if (waResponse.status === 200 && waResponse.result.output.generic) {
      res.json(waResponse.result);
      console.log(JSON.stringify(waResponse.result));
    } else {
      res.status(500);
      res.send();
      console.log("Watson's response was blank");
      console.log(waResponse);
    }
  } catch (err) {
    console.log(err);
  }
});

router.get("/session", async (req, res) => {
  // Retrieve a session ID
  try {
    session = await assistant.createSession({
      assistantId: process.env.ASSISTANT_ID || "{assistant_id}",
    });
    console.log("Requested session id: " + JSON.stringify(session.result));
    if (session.status >= 200 && session.status < 300) {
        res.json(session.result);
    } else {
      console.log("Watson's response was blank");
      res.status(500);
      res.send();
    } 
  } catch (err) {
    console.log(err);
  }
});

router.get("/delete", async (req, res) => {
  try {
    console.log(`Deleting session id: ${req.query.sessionId}`);
    response = await assistant.deleteSession({
      assistantId: process.env.ASSISTANT_ID,
      sessionId: req.query.sessionId,
    });
    res.json(JSON.stringify(response));
  } catch (err) {
    console.log(err);
  }
});

module.exports = router;
