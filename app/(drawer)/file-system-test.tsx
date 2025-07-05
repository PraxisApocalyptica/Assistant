import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import nodejs from 'nodejs-mobile-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Button, SafeAreaView, StyleSheet, Text, View } from 'react-native';

interface FileResponse {
    directory: string;
    contents: string[];
    error: string | null;
}

export default function FileSystemTestScreen() {
    const [response, setResponse] = useState<FileResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleMessage = useCallback((msg: string) => {
        console.log(`[FileSystemTest] Received message: ${msg}`);
        try {
            const message = JSON.parse(msg);
            if (message.type === 'LIST_FILES_RESPONSE') {
                console.log('[FileSystemTest] Correct response type received!');
                setResponse(message.payload);
                setIsLoading(false);
            }
        } catch(e) {
            console.error(`[FileSystemTest] Error parsing message`, e);
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        console.log('[FileSystemTest] Adding direct listener to nodejs.channel');
        nodejs.channel.addListener('message', handleMessage);

        // Auto-run the test on screen load
        handleRunTest();

        return () => {
            console.log('[FileSystemTest] Removing direct listener from nodejs.channel');
            nodejs.channel.removeListener('message', handleMessage);
        };
    }, [handleMessage]);

    const handleRunTest = () => {
        console.log('[FileSystemTest] Sending LIST_FILES command to Node.js');
        setIsLoading(true);
        setResponse(null);
        nodejs.channel.send(JSON.stringify({ type: 'LIST_FILES' }));
    };

    const renderResult = () => {
        if (isLoading) {
            return <ActivityIndicator size="large" />;
        }
        if (!response) {
            return <ThemedText>Press the button to run the test.</ThemedText>;
        }
        if (response.error) {
            return <Text style={styles.errorText}>Test Failed! Error: {response.error}</Text>
        }
        const hasProjectsFolder = response.contents.includes('projects');
        return (
            <View>
                <Text style={styles.directoryText}>Node.js is running in: {response.directory}</Text>
                <Text style={hasProjectsFolder ? styles.successText : styles.errorText}>
                    'projects' folder found: {hasProjectsFolder ? 'YES' : 'NO - THIS IS THE PROBLEM!'}
                </Text>
                <ThemedText style={{marginTop: 15, fontWeight: 'bold'}}>Directory Contents:</ThemedText>
                <Text style={styles.fileListText}>
                    {response.contents.length > 0 ? `[ ${response.contents.join(', ')} ]` : '[ EMPTY DIRECTORY ]'}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ThemedView style={styles.content}>
                <ThemedText type="title">File System Test</ThemedText>
                <ThemedText style={styles.description}>
                    This test checks if the Node.js backend can see its own project files. This is the most common point of failure.
                </ThemedText>
                
                <View style={styles.buttonContainer}>
                    <Button title="Re-run Test" onPress={handleRunTest} disabled={isLoading} />
                </View>

                <View style={styles.responseBox}>
                    {renderResult()}
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
    responseBox: { width: '100%', padding: 15, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, backgroundColor: '#fff', minHeight: 150 },
    directoryText: { fontFamily: 'monospace', marginBottom: 10 },
    successText: { fontSize: 18, fontWeight: 'bold', color: 'green', textAlign: 'center' },
    errorText: { fontSize: 18, fontWeight: 'bold', color: 'red', textAlign: 'center' },
    fileListText: { fontFamily: 'monospace', color: '#333' }
});