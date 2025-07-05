import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import nodejs from 'nodejs-mobile-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Button, SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function DirectTestScreen() {
    const [nodeResponse, setNodeResponse] = useState<string>('No response yet.');
    const [testStatus, setTestStatus] = useState<string>('Ready to test.');

    // This listener connects DIRECTLY to the nodejs channel. No eventBus.
    const handleDirectMessage = useCallback((msg: string) => {
        console.log(`[DEBUG] [DirectTestScreen] Direct listener received message: ${msg}`);
        try {
            const message = JSON.parse(msg);
            if (message.type === 'PONG') {
                setNodeResponse(`SUCCESS! Got PONG with payload: "${message.payload}"`);
                setTestStatus('Test successful!');
            }
        } catch(e) {
            setNodeResponse(`Error parsing message: ${e.message}`);
        }
    }, []);

    useEffect(() => {
        console.log('[DEBUG] [DirectTestScreen] Component Mounted. Adding direct listener.');
        nodejs.channel.addListener('message', handleDirectMessage);

        return () => {
            console.log('[DEBUG] [DirectTestScreen] Component Unmounted. Removing direct listener.');
            nodejs.channel.removeListener('message', handleDirectMessage);
        };
    }, [handleDirectMessage]);

    const handlePingPress = () => {
        console.log('[DEBUG] [DirectTestScreen] "Send PING" button pressed.');
        setTestStatus('PING sent. Waiting for PONG...');
        setNodeResponse('---');
        nodejs.channel.send(JSON.stringify({ type: 'PING' }));
    };

    return (
        <SafeAreaView style={styles.container}>
            <ThemedView style={styles.content}>
                <ThemedText type="title">Direct Bridge Test</ThemedText>
                <ThemedText style={styles.description}>
                    This screen tests the most basic communication layer. Pressing "Send PING" sends a message directly to Node.js. If the bridge is working, a "PONG" response should appear below.
                </ThemedText>
                
                <View style={styles.buttonContainer}>
                    <Button title="Send PING to Node.js" onPress={handlePingPress} />
                </View>

                <View style={styles.responseBox}>
                    <ThemedText style={styles.label}>Status:</ThemedText>
                    <Text style={styles.statusText}>{testStatus}</Text>

                    <ThemedText style={styles.label}>Response from Node.js:</ThemedText>
                    <Text style={styles.responseText}>{nodeResponse}</Text>
                </View>

            </ThemedView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    content: { padding: 20, gap: 15, alignItems: 'center' },
    description: { textAlign: 'center', color: '#666' },
    buttonContainer: { marginVertical: 20 },
    responseBox: {
        width: '100%',
        padding: 15,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        backgroundColor: '#fff',
        gap: 10,
    },
    label: { fontWeight: 'bold' },
    statusText: { fontFamily: 'monospace', color: 'blue' },
    responseText: { fontFamily: 'monospace', fontSize: 16, color: 'green' },
});