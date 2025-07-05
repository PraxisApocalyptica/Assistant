import { ThemedText } from '@/components/ThemedText';
import eventBus from '@/services/EventBus';
import { useLocalSearchParams } from 'expo-router';
import nodejs from 'nodejs-mobile-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Button,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

export default function PackageManagerScreen() {
    const { projectName } = useLocalSearchParams<{ projectName: string }>();
    const [packageName, setPackageName] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    const handleNodeMessage = useCallback((msg: string) => {
        try {
            const message = JSON.parse(msg);
            switch (message.type) {
                case 'NPM_LOG':
                    setLogs(prev => [...prev, message.payload]);
                    break;
                case 'NPM_INSTALL_SUCCESS':
                    setLogs(prev => [...prev, `✅ SUCCESS: ${message.payload}`]);
                    setIsLoading(false);
                    Alert.alert('Success', message.payload);
                    break;
                case 'NPM_INSTALL_FAILURE':
                    setLogs(prev => [...prev, `❌ ERROR: ${message.payload}`]);
                    setIsLoading(false);
                    Alert.alert('Installation Failed', message.payload);
                    break;
            }
        } catch (error) {
           // ignore
        }
    }, []);

    useEffect(() => {
        // *** THE FIX IS HERE: We only listen to our custom event bus ***
        eventBus.on('nodejs-message', handleNodeMessage);
        
        return () => {
             // And we only clean up the event bus listener.
            eventBus.off('nodejs-message', handleNodeMessage);
        };
    }, [handleNodeMessage]);

    const handleInstall = () => {
        if (!packageName.trim() || !projectName) return;
        setIsLoading(true);
        setLogs([]); // Clear logs for new installation
        nodejs.channel.send(JSON.stringify({ 
            type: 'INSTALL_PACKAGE', 
            payload: { projectName, packageName: packageName.trim() } 
        }));
    };

    return (
        <SafeAreaView style={styles.container}>
            <ThemedText type="title" style={styles.title}>NPM Installer</ThemedText>
            <ThemedText style={styles.subtitle}>for '{projectName}' project</ThemedText>
            
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., lodash or moment@latest"
                    value={packageName}
                    onChangeText={setPackageName}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                />
                <Button title="Install" onPress={handleInstall} disabled={isLoading || !packageName.trim()} />
            </View>

            {isLoading && <ActivityIndicator size="large" style={{ marginVertical: 20 }} />}

            <ScrollView 
                ref={scrollViewRef}
                style={styles.logBox} 
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
                <Text style={styles.logText}>{logs.join('\n')}</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 15, backgroundColor: '#f0f2f5' },
    title: { textAlign: 'center' },
    subtitle: { textAlign: 'center', color: '#666', marginBottom: 20 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 5,
        backgroundColor: '#fff',
        fontSize: 16
    },
    logBox: { 
        flex: 1, 
        marginTop: 20, 
        backgroundColor: '#2b2b2b', 
        borderRadius: 8, 
        padding: 12 
    },
    logText: { 
        color: '#e0e0e0', 
        fontSize: 12, 
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' 
    },
});
