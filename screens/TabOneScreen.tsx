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
  const [session, setSession] = useState<object | null>(null);
  const [messages, setMessages] = useState<any []>([]);
  const [watsonChat, setWatsonChat] = useState<any[] | null>(null);

  // Get watson assistant session
  async function fetchSession () {
    try {
      setLoading(true);
      const sessionRes = await fetch("http://localhost:9000/assistant/session");
      if (sessionRes.status === 200) {
        const sessionResult = await sessionRes.json();
        console.log("Result after call: " + JSON.stringify(sessionResult));
        setSession(sessionResult);
        fetchWatsonMessage(sessionResult.session_id, '');
      } else {
        console.log("Failed to receive session id");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // Get watson assistant reply
  async function fetchWatsonMessage(sessionId: any, message: string) {
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
        setWatsonChat(watsonResult[output]);
      }
    } catch (error) {
      console.error(error);
    }
  }

  useLayoutEffect(() => {
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
          {session === null && <Text>Session Not Active</Text>}
          {session != null && <Text>Delete SessionID</Text>}
        </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, session]);

  // Call custom Watson API to get session ID
  useEffect(() => {
    if (session === null) {
      fetchSession();
    }
  }, []);

  // // when session id is updated, get welcome message
  // useEffect(() => {
  //   console.log("useEffect Welcome Message");
  //   if (loading && session != null) {
  //     // get welcome message
  //     const fetchWelcomeMessage = async function () {
  //       if (session != null) {
  //         try {
  //           type ObjectKey = keyof typeof session;
  //           const session_id = "session_id" as ObjectKey;
  //           const requestOptions = {
  //             method: "POST",
  //             headers: { "Content-Type": "application/json" },
  //             body: JSON.stringify({
  //               message: "",
  //               session_id: session[session_id],
  //             }),
  //           };
  //           const watsonRes = await fetch(
  //             "http://localhost:9000/assistant/message",
  //             requestOptions
  //           );
  //           if (watsonRes.status === 200) {
  //             const watsonResult = await watsonRes.json();
  //             type ObjectKey = keyof typeof watsonResult;
  //             const output = "output" as ObjectKey;
  //             setWatsonChat(watsonResult[output]);
  //           }
  //         } catch (err) {
  //           console.error(err);
  //         } finally {
  //           setLoading(false);
  //         }
  //       }
  //     }
  //     fetchWelcomeMessage();
  //   }
  // },[session]);

  // When watsonChat upates, update message
  useEffect(() => {
    console.log('useEffect watsonChat');
    console.log("Watson Chat: " + JSON.stringify(watsonChat));
    if (watsonChat != null) {
      type ObjectKey = keyof typeof watsonChat;
      const generic = "generic" as ObjectKey;
      console.log('Watson Generic' + JSON.stringify(watsonChat[generic]));
      if (watsonChat[generic]) {
        var genericText = watsonChat[generic].find((item: any) => item.text != null)
        console.log("Generic Text: " + JSON.stringify(genericText.text));
        let message = [{
          _id: Math.round(Math.random() * 1000000),
          text: `${genericText.text}`,
          createdAt: new Date(),
          user: {
            _id: 2,
            name: "Watson Assistant",
            avatar: require("../assets/images/watson.png"),
          },
      }];
        setMessages((previousMessages) => GiftedChat.append(previousMessages, message));

      }
    }
  }, [watsonChat]);

  // When watsonChat upates, update message
  useEffect(() => {
    console.log("useEffect Messages");
    console.log(JSON.stringify(messages));
  }, [messages]);

  const deleteSession = async () => {
    // delete the watson session
    if (session != null) {
      type ObjectKey = keyof typeof session;
      const session_id = "session_id" as ObjectKey;
      if (session[session_id]) {
        try {
          await fetch(
            `http://localhost:9000/assistant/delete?sessionId=${session[session_id]}`
          );
          setSession(null);
        } catch (error) {
          console.error(error);
        }
      }
    }
  };

  // const sendMessage = async (messages = []) => {
  //   setMessages(previousMessages => GiftedChat.append(previousMessages, messages));
  //   if (session.session_id != 0) {
  //     try {
  //       const requestOptions = {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify({message: messages.text, session_id: session.session_id})
  //       };
  //       const watsonResponse = await (await fetch('http://localhost:9000/assistant/message', requestOptions)).json();
  //       if (watsonResponse.result.length != 0) {
  //         console.log("Watson Response for session: " + session.session_id + ' ' + JSON.stringify(watsonResponse.result) + '\n');
  //         setWatsonChat(watsonResponse.result);
  //         console.log('Watson chat: ' + session.session_id + ' ' + JSON.stringify(watsonChat) + '\n');
  //         console.log('Watson text: ' + session.session_id + ' ' + watsonChat[0].text + '\n');
  //         messages =  {
  //           _id: Math.round(Math.random() * 1000000),
  //           text: watsonChat[0].text,
  //           createdAt: new Date(),
  //           user: {
  //             _id: 2,
  //             name: 'Watson Assistant',
  //             avatar: require('../assets/images/watson.png')
  //           },
  //         }
  //       }
  //       else {
  //         console.log("No response from Watson");
  //       }
  //     } catch (error) {
  //       console.error(error);
  //     }
  //   }
  //   else {
  //     console.log('Cannot make request to Watson, session Id is null');
  //   }
  // };

  return (
    <View style={styles.container}>
      <GiftedChat
        placeholder="Send your message to Watson..."
        messages={messages}
        //onSend={messages => sendMessage(messages)}
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