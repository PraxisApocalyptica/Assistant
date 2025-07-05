import { ThemedText } from '@/components/ThemedText';
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

export default function PackageJsonViewerScreen() {
    const { projectName } = useLocalSearchParams<{ projectName: string }>();
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState('Loading package.json...');

    const handleNodeMessage = useCallback((msg: string) => {
        try {
            const message = JSON.parse(msg);
            switch (message.type) {
                case 'PACKAGE_JSON_RESPONSE':
                    setCode(message.payload);
                    setIsLoading(false);
                    setStatus('package.json loaded.');
                    break;
                case 'CODE_UPDATE_SUCCESS':
                    setStatus('package.json updated, service restarted.');
                    setIsLoading(false);
                    Alert.alert('Success', 'package.json saved and service was restarted.');
                    break;
                case 'PROJECT_RELOAD_FAILURE':
                    setIsLoading(false);
                    setStatus(`Error: ${message.payload}`);
                    Alert.alert('Error', `Failed to save or restart: ${message.payload}`);
                    break;
            }
        } catch (error) {
            // Ignore non-json messages
        }
    }, []);

    useEffect(() => {
        // *** THE FIX IS HERE: We only listen to our custom event bus ***
        eventBus.on('nodejs-message', handleNodeMessage);
        nodejs.channel.send(JSON.stringify({ type: 'GET_PACKAGE_JSON', payload: { projectName } }));
        
        return () => { 
            // And we only clean up the event bus listener.
            eventBus.off('nodejs-message', handleNodeMessage);
        };
    }, [handleNodeMessage, projectName]);

    const saveCode = () => {
        Alert.alert(
            "Save & Restart Service",
            "This will save package.json and restart the service. Are you sure?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Save & Restart",
                    onPress: () => {
                        setIsLoading(true);
                        setStatus('Saving package.json...');
                        nodejs.channel.send(JSON.stringify({ 
                            type: 'UPDATE_PACKAGE_JSON', 
                            payload: { projectName, code } 
                        }));
                    },
                    style: "destructive",
                },
            ]
        );
    };

    if (isLoading && !code) {
        return <View style={styles.centered}><ActivityIndicator size="large" /><ThemedText>{status}</ThemedText></View>;
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.buttonContainer}>
                <Button title="Save & Restart" onPress={saveCode} disabled={isLoading} />
                {isLoading && <ActivityIndicator style={{ marginLeft: 10 }} />}
            </View>
            <ScrollView style={styles.scroll}>
                <TextInput
                    value={code}
                    onChangeText={setCode}
                    multiline
                    style={styles.textInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                />
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
        backgroundColor: '#f5f5f5'
    },
    scroll: { flex: 1, backgroundColor: '#1e1e1e' },
    textInput: {
        flex: 1,
        color: '#d4d4d4',
        backgroundColor: '#1e1e1e',
        padding: 10,
        fontSize: 14,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        minHeight: 800,
    },
});
