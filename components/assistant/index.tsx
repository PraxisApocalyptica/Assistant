import { Ionicons } from '@expo/vector-icons';
import React, { FC, useRef, useState } from 'react';
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
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

// Define a type for our message objects
type Message = {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
};

// Updated props interface
interface AssistantProps {
  messages: Message[];
  onSend: (message: Message) => void;
  isLoading?: boolean;
}

const Assistant: FC<AssistantProps> = ({ messages, onSend, isLoading = false }) => {
  const [inputText, setInputText] = useState<string>('');
  const flatListRef = useRef<FlatList<Message>>(null);

  // Function to handle sending a message
  const handleSendMessage = () => {
    const trimmedInput = inputText.trim();
    if (trimmedInput.length === 0) return;

    // Create the user's message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: trimmedInput,
      sender: 'user',
    };

    // Call the parent's onSend function
    onSend(userMessage);
    setInputText('');
    Keyboard.dismiss();
  };

  // Renders each message bubble in the list
  const renderMessage = ({ item }: { item: Message }) => {
    const isUserMessage = item.sender === 'user';
    return (
      <View style={[
        styles.messageRow,
        { justifyContent: isUserMessage ? 'flex-end' : 'flex-start' }
      ]}>
        <View style={[
          styles.messageBubble,
          isUserMessage ? styles.userBubble : styles.assistantBubble
        ]}>
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
        <Text style={styles.header}>AI Assistant</Text>
        
        <FlatList<Message>
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.chatContainer}
          inverted
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
            maxLength={1000}
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
};

// Define style interfaces for better TypeScript support
interface Styles {
  container: ViewStyle;
  flexContainer: ViewStyle;
  header: TextStyle;
  chatContainer: ViewStyle;
  messageRow: ViewStyle;
  messageBubble: ViewStyle;
  userBubble: ViewStyle;
  assistantBubble: ViewStyle;
  userMessageText: TextStyle;
  assistantMessageText: TextStyle;
  loadingContainer: ViewStyle;
  loadingText: TextStyle;
  inputContainer: ViewStyle;
  input: TextStyle;
  sendButton: ViewStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flexContainer: {
    flex: 1,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  messageRow: {
    marginVertical: 5,
    width: '100%',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    backgroundColor: '#E5E5EA',
    alignSelf: 'flex-start',
  },
  userMessageText: {
    fontSize: 16,
    color: '#fff',
  },
  assistantMessageText: {
    fontSize: 16,
    color: '#000',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  loadingText: {
    marginLeft: 10,
    color: '#888',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    borderColor: '#ccc',
    borderWidth: 1,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Assistant;
