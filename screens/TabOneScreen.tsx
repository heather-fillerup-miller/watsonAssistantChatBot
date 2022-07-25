import React, { useContext, useEffect, useLayoutEffect, useState } from "react";
import { Avatar } from "react-native-elements";
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Text, View } from "../components/Themed";
import { RootTabScreenProps } from "../types";
import { GiftedChat } from "react-native-gifted-chat";

export default function TabOneScreen({
  navigation,
}: RootTabScreenProps<"TabOne">) {
  const [loading, setLoading] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState<number>(0); // Session timeout is currently set to 5 min
  const [session, setSession] = useState<object | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  type sessionKey = keyof typeof session;
  const session_id = "session_id" as sessionKey;

  type messageKey = keyof typeof messages;
  const text = "text" as messageKey;

  useLayoutEffect(() => {
    console.log("useEffect layout: " + JSON.stringify(session));
    navigation.setOptions({
      headerRight: () => (
        <View style={{ marginLeft: 20 }}>
          <Avatar
            rounded
            source={require("../assets/images/member1.png")}
          ></Avatar>
        </View>
      ),
      headerLeft: () => (
        <View>
          <TouchableOpacity
            style={{
              marginRight: 10,
            }}
            onPress={deleteSession}
          >
            {!session && <Text>Session Not Active</Text>}
            {session && <Text>Delete SessionID</Text>}
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, session]);

  useEffect(() => {
    console.log("useEffect creation");
    fetchSession();
  }, []);

  // Get watson assistant session
  async function fetchSession() {
    if (session === null) {
      try {
        const sessionRes = await fetch(
          "http://localhost:9000/assistant/session"
        );
        if (sessionRes.status === 200) {
          const sessionResult = await sessionRes.json();
          //console.log("Result after call: " + JSON.stringify(sessionResult));
          setSession(sessionResult);
          let currentTime = Date.now();
          setSessionTimeout(currentTime);
          fetchWatsonResponse(currentTime, sessionResult.session_id, "");
        } else {
          console.log("Failed to receive session id");
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  }

  // delete the watson session
  const deleteSession = async () => {
    if (session != null) {
      type ObjectKey = keyof typeof session;
      const session_id = "session_id" as ObjectKey;
      if (session[session_id]) {
        try {
          await fetch(
            `http://localhost:9000/assistant/delete?sessionId=${session[session_id]}`
          );
        } catch (error) {
          console.error(error);
        }
        setSession(null);
        setMessages([]);
      }
    }
  };

  // convert watson response into a message
  const convertWatsonResponse = (watsonOutput: any) => {
    console.log("Watson Generic" + JSON.stringify(watsonOutput["generic"]));
    // Display each response_type and options
    if (watsonOutput["generic"]) {
      watsonOutput["generic"].forEach((response: any) => {
        if (response["response_type"] === "text") {
          let message = [
            {
              _id: Math.round(Math.random() * 1000000),
              text: `${response["text"]}`,
              createdAt: new Date(),
              user: {
                _id: 2,
                name: "Watson Assistant",
                avatar: require("../assets/images/watson.png"),
              },
            },
          ];
          setMessages((previousMessages) =>
            GiftedChat.append(previousMessages, message)
          );
        }
        if (response["response_type"] === "option") {
          let options = response["options"].map((option: any) => ({
            title: option["label"],
            value: option["value"].input.text,
          }));
          console.log("Looking in Options" + JSON.stringify(options));
          let message = [
            {
              _id: Math.round(Math.random() * 1000000),
              text: `${response["title"]}`,
              createdAt: new Date(),
              quickReplies: {
                type: "radio",
                values: options,
              },
              user: {
                _id: 2,
                name: "Watson Assistant",
                avatar: require("../assets/images/watson.png"),
              },
            },
          ];
          setMessages((previousMessages) =>
            GiftedChat.append(previousMessages, message)
          );
        }
      });
    }
  };

  // Get watson assistant reply
  async function fetchWatsonResponse(
    sessionTime: number,
    sessionId: any,
    message: string
  ) {
    const timeout = Math.floor((Date.now() - sessionTime) / (1000 * 60));
    console.log("Session Timeout: " + timeout);
    if (timeout < 5) {
      try {
        const requestOptions = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: message,
            session_id: sessionId,
          }),
        };
        const watsonRes = await fetch(
          "http://localhost:9000/assistant/message",
          requestOptions
        );
        if (watsonRes.status === 200) {
          const watsonResult = await watsonRes.json();
          type ObjectKey = keyof typeof watsonResult;
          const output = "output" as ObjectKey;
          let watsonOutput = watsonResult[output];
          if (watsonOutput) {
            convertWatsonResponse(watsonOutput);
          }
        }
      } catch (error) {
        console.error(error);
      }
    } else {
      let message = [
        {
          _id: Math.round(Math.random() * 1000000),
          text: "Sorry, your session expired... Creating a new session",
          createdAt: new Date(),
          user: {
            _id: 2,
            name: "Watson Assistant",
            avatar: require("../assets/images/watson.png"),
          },
        },
      ];
      setMessages(message);
      setSession(null);
      setLoading(true);
    }
  }

  const sendMessage = (messages: any) => {
    console.log(`sendMessage() messages: ${JSON.stringify(messages)}`);
    setMessages((previousMessages) =>
      GiftedChat.append(previousMessages, messages)
    );
    if (session != null) {
      fetchWatsonResponse(
        sessionTimeout,
        session[session_id],
        `${messages[0].text}`
      );
    }
  };

  const sendQuickReply = (quickReply: any) => {
    console.log("Inside sendQuickReply value: " + JSON.stringify(quickReply));
    if (quickReply[0]["value"]) {
      let messages = [
        {
          _id: Math.round(Math.random() * 1000000),
          text: quickReply[0]["value"],
          createdAt: new Date(),
          user: {
            _id: 1,
            name: "user",
          },
        },
      ];
      setMessages((previousMessages) =>
        GiftedChat.append(previousMessages, messages)
      );
      if (session != null) {
        fetchWatsonResponse(
          sessionTimeout,
          session[session_id],
          `${quickReply[0]["value"]}`
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      <GiftedChat
        placeholder="Send your message to Watson..."
        messages={messages}
        onSend={(messages) => sendMessage(messages)}
        onQuickReply={(quickReply) => sendQuickReply(quickReply)}
        user={{ _id: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
  },
});
