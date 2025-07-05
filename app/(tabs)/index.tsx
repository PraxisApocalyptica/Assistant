import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
};

export default function HomeScreen() {
  const [inputText, setInputText] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const flatListRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    setMessages([
      {
        id: '1',
        text: 'Hello! How can I assist you today?',
        sender: 'assistant',
      },
    ]);
  }, []);

  const getDummyAIResponse = (userInput: string): Promise<string> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const responses = [
          `You said: "${userInput}". That's interesting!`,
          `I'm just a dummy AI for now, but I received your message: "${userInput}"`,
          `Thanks for your input! I'm processing "${userInput}".`,
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        resolve(randomResponse);
      }, 1500);
    });
  };

  const handleSendMessage = async () => {
    const trimmedInput = inputText.trim();
    if (trimmedInput.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: trimmedInput,
      sender: 'user',
    };
    setMessages(prevMessages => [userMessage, ...prevMessages]);
    setInputText('');
    Keyboard.dismiss();

    setIsLoading(true);
    const aiText = await getDummyAIResponse(trimmedInput);

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: aiText,
      sender: 'assistant',
    };
    setMessages(prevMessages => [aiMessage, ...prevMessages]);
    setIsLoading(false);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUserMessage = item.sender === 'user';
    return (
      <View style={[ styles.messageRow, { justifyContent: isUserMessage ? 'flex-end' : 'flex-start' } ]}>
        <View style={[ styles.messageBubble, isUserMessage ? styles.userBubble : styles.assistantBubble ]}>
          <Text style={isUserMessage ? styles.userMessageText : styles.assistantMessageText}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flexContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* The header is now part of this screen, not the layout */}
        {/* <Text style={styles.header}>AI Assistant</Text> */}
        
        <FlatList<Message>
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.chatContainer}
          inverted
          contentContainerStyle={{ paddingTop: 10 }}
        />
        
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#888" />
            <Text style={styles.loadingText}>Assistant is thinking...</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, { opacity: inputText.trim().length > 0 ? 1 : 0.5 }]} 
            onPress={handleSendMessage}
            disabled={inputText.trim().length === 0}
          >
            <Ionicons name="send" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0' },
  flexContainer: { flex: 1 },
  // header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', paddingVertical: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  chatContainer: { flex: 1, paddingHorizontal: 10 },
  messageRow: { marginVertical: 5, width: '100%' },
  messageBubble: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, maxWidth: '80%' },
  userBubble: { backgroundColor: '#007AFF', alignSelf: 'flex-end' },
  assistantBubble: { backgroundColor: '#E5E5EA', alignSelf: 'flex-start' },
  userMessageText: { fontSize: 16, color: '#fff' },
  assistantMessageText: { fontSize: 16, color: '#000' },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10 },
  loadingText: { marginLeft: 10, color: '#888' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, borderTopColor: '#ddd', backgroundColor: '#fff' },
  input: { flex: 1, minHeight: 40, maxHeight: 120, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, fontSize: 16 },
  sendButton: { backgroundColor: '#007AFF', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
});
