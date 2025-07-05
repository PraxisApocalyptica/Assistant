import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import eventBus from '@/services/EventBus';
import { useLocalSearchParams } from 'expo-router';
import nodejs from 'nodejs-mobile-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Button,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';

export default function CodeViewerScreen() {
    const { projectName } = useLocalSearchParams<{ projectName: string }>();
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState('Loading code...');

    const handleNodeMessage = useCallback((msg: string) => {
        try {
            const message = JSON.parse(msg);
            switch (message.type) {
                case 'SOURCE_CODE_RESPONSE':
                    setCode(message.payload);
                    setIsLoading(false);
                    setStatus('Code loaded.');
                    break;
                case 'CODE_UPDATE_SUCCESS':
                    setStatus('Code updated, restarting service...');
                    break;
                case 'PROJECT_RELOAD_SUCCESS':
                    setIsLoading(false);
                    setStatus('Service restarted successfully.');
                    Alert.alert('Success', 'Service code updated and reloaded successfully.');
                    break;
                case 'PROJECT_RELOAD_FAILURE':
                    setIsLoading(false);
                    setStatus(`Error: ${message.payload}`);
                    Alert.alert('Error', `Failed to reload service: ${message.payload}`);
                    break;
            }
        } catch (error) {
            console.log("Received raw message:", msg);
        }
    }, []);

    useEffect(() => {
        // *** THE FIX IS HERE: We only listen to our custom event bus ***
        eventBus.on('nodejs-message', handleNodeMessage);

        // Request the source code
        nodejs.channel.send(JSON.stringify({ type: 'GET_SOURCE_CODE', payload: { projectName } }));
        
        return () => {
            // And we only clean up the event bus listener.
            eventBus.off('nodejs-message', handleNodeMessage);
        };
    }, [handleNodeMessage, projectName]);

    const saveCode = () => {
        Alert.alert(
            "Confirm Save & Restart",
            "This will overwrite the running service file and attempt to hot-restart the service. The app will become briefly unresponsive. Are you sure?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Save & Restart",
                    onPress: () => {
                        setIsLoading(true);
                        setStatus('Saving code...');
                        const payload = { 
                            type: 'UPDATE_SOURCE_CODE', 
                            payload: { 
                                projectName,
                                code 
                            } 
                        };
                        nodejs.channel.send(JSON.stringify(payload));
                    },
                    style: "destructive",
                },
            ]
        );
    };

    if (isLoading && !code) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" />
                <ThemedText>{status}</ThemedText>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.buttonContainer}>
                <Button title="Save & Restart Service" onPress={saveCode} disabled={isLoading} />
                {isLoading && <ActivityIndicator style={{ marginLeft: 10 }} />}
                <ThemedText style={styles.statusText}>{status}</ThemedText>
            </View>
            <ScrollView style={styles.scroll}>
                <ThemedView>
                    <TextInput
                        value={code}
                        onChangeText={setCode}
                        multiline
                        style={styles.textInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
                    />
                </ThemedView>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    buttonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderColor: '#ccc',
    },
    statusText: {
        flex: 1,
        textAlign: 'right',
        color: '#666',
        fontSize: 12,
    },
    scroll: { flex: 1, backgroundColor: '#1e1e1e' },
    textInput: {
        flex: 1,
        color: '#d4d4d4',
        backgroundColor: '#1e1e1e',
        padding: 10,
        fontSize: 13,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        minHeight: 800,
    },
});
