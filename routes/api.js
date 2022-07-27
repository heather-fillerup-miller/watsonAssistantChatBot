// The Api module is designed to handle all interactions with the server
var express = require("express");
var router = express.Router();

var Api = (function () {
  var requestPayload;
  var responsePayload;

  var messageEndpoint = "/assistant/message";

  var sessionEndpoint = "/assistant/session";

  var sessionId = null;

  // Publicly accessible methods defined
  return {
    sendRequest: sendRequest,
    getSessionId: getSessionId,

    // The request/response getters/setters are defined here to prevent internal methods
    // from calling the methods without any of the callbacks that are added elsewhere.
    getRequestPayload: function () {
      return requestPayload;
    },
    setRequestPayload: function (newPayloadStr) {
      requestPayload = JSON.parse(newPayloadStr);
    },
    getResponsePayload: function () {
      return responsePayload;
    },
    setResponsePayload: function (newPayloadStr) {
      responsePayload = JSON.parse(newPayloadStr);
    },
    setErrorPayload: function () {},
  };

  async function getSessionId() {
    try {
      var res = JSON.parse(await fetch(sessionEndpoint));
      sessionId = await res.result.session_id;
    } catch (err) {
      console.log(err);
    }
    res.send();
  }

  // Send a message request to the server
  function sendRequest(text, isFirstCall) {
    // Build request payload
    var payloadToWatson = {
      session_id: sessionId,
      firstCall: isFirstCall,
    };

    payloadToWatson.input = {
      message_type: "text",
      text: text,
    };

    // Built http request
    var http = new XMLHttpRequest();
    http.open("POST", messageEndpoint, true);
    http.setRequestHeader("Content-type", "application/json");
    http.onreadystatechange = function () {
      if (
        http.readyState === XMLHttpRequest.DONE &&
        http.status === 200 &&
        http.responseText
      ) {
        Api.setResponsePayload(http.responseText);
      } else if (
        http.readyState === XMLHttpRequest.DONE &&
        http.status !== 200
      ) {
        Api.setErrorPayload({
          output: {
            generic: [
              {
                response_type: "text",
                text: "I'm having trouble connecting to the server, please refresh the page",
              },
            ],
          },
        });
      }
    };

    var params = JSON.stringify(payloadToWatson);
    // Stored in variable (publicly visible through Api.getRequestPayload)
    // to be used throughout the application
    if (Object.getOwnPropertyNames(payloadToWatson).length !== 0) {
      Api.setRequestPayload(params);
    }

    // Send request
    http.send(params);
  }
})();

module.exports = router;
