import React, { useEffect, useLayoutEffect, useState } from "react";
import { Avatar } from "react-native-elements";
import {
  Image,
  StyleSheet,
} from "react-native";
import { View } from "../components/Themed";
import { RootTabScreenProps } from "../types";
import { GiftedChat } from "react-native-gifted-chat";

export default function TabOneScreen({
  navigation,
}: RootTabScreenProps<"TabOne">) {
  const [sessionTimeout, setSessionTimeout] = useState<number>(0); // Session timeout default is 5 min
  const [session, setSession] = useState<object | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  type sessionKey = keyof typeof session;
  const session_id = "session_id" as sessionKey;

  type messageKey = keyof typeof messages;
  const text = "text" as messageKey;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ marginLeft: 20 }}>
          <Avatar
            size="small"
            rounded
            source={require("../assets/images/member1.png")}
          ></Avatar>
        </View>
      ),
      headerLeft: () => (
        <View
          style={{
            marginRight: 10,
          }}
        >
          <Image
            style={{ width: 150, height: 44 }}
            source={require("../assets/images/highmarkHealth.png")}
          ></Image>
        </View>
      ),
    });
  }, [navigation, session]);

  useEffect(() => {
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

          setSession(sessionResult);
          let currentTime = Date.now();
          setSessionTimeout(currentTime);
          fetchWatsonResponse(currentTime, sessionResult.session_id, "");
        } else {
          console.log("Failed to receive session id");
        }
      } catch (error) {
        console.error(error);
      } 
    }
  }

  // Get watson assistant reply
  async function fetchWatsonResponse(
    sessionTime: number,
    sessionId: any,
    message: string
  ) {
    const timeout = Math.floor((Date.now() - sessionTime) / (1000 * 60));
    // Session timeout default is 5 min
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
            convertWatsonResponse(watsonOutput["generic"]);
          }
        }
      } catch (error) {
        console.error(error);
      }
    } else {
      let message = buildWatsonMessage("Sorry, your session expired... Creating a new session", null);
      setMessages(message);
      setSession(null);
      fetchSession();
    }
  }

  // convert watson responses into messages one response type at a time
  const convertWatsonResponse = (responseArray: any) => {
    if (responseArray.length >= 1) {
      var responseType = responseArray[0]['response_type'];
  
      if (responseType) {
          switch (responseType) {
            case "text":
              setIsTyping(true);
              let textMessage = buildWatsonMessage(`${responseArray[0]["text"]}`, null);
              setTimeout(() => {
                setIsTyping(false);
                setMessages((previousMessages) =>
                  GiftedChat.append(previousMessages, textMessage)
                );
                convertWatsonResponse(responseArray.slice(1));
              }, 1500);
              break;
            case "option":
              setIsTyping(true);
              let options = responseArray[0]["options"].map((option: any) => ({
                title: option["label"],
                value: option["value"].input.text,
              }));
              let messageOptions = buildWatsonMessage(`${responseArray[0]["title"]}`, options)
              setTimeout(() => {
                setIsTyping(false);
                setMessages((previousMessages) =>
                  GiftedChat.append(previousMessages, messageOptions)
                );
                convertWatsonResponse(responseArray.slice(1));
              }, 1500);
              break;
            case "pause":
              setIsTyping(true);
              setTimeout(() => {
                setIsTyping(false);
                convertWatsonResponse(responseArray.slice(1));
              }, responseArray[0]["time"]);
              break;
            default:
              console.log("No Response Types");
              break;
          }
        }
    }
  };

  const buildWatsonMessage = (text: string, options: any ) => {
    let message = [
      {
        _id: Math.round(Math.random() * 1000000),
        text: text,
        createdAt: new Date(),
        user: {
          _id: 2,
          name: "Watson Assistant",
          avatar: require("../assets/images/watson.png"),
        },
      },
    ];
    if (options) {
      let quickReplyMessage = message.map((item) => {
        return {
          ...item,
          quickReplies: {
            type: "radio",
            values: options,
          },
        }
      });
      return quickReplyMessage;
    } else {
      return message;
    }

  }

  const sendMessage = (messages: any) => {
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
        isTyping={isTyping}
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
