import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import eventBus from '@/services/EventBus';
import { router } from 'expo-router';
import nodejs from 'nodejs-mobile-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Button, Platform, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

type ServiceStatus = 'running' | 'stopped' | 'restarting' | 'unknown';

export default function AttendanceScreen() {
    const [logs, setLogs] = useState<string>('Connecting to Node.js service...');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [serviceStatus, setServiceStatus] = useState<ServiceStatus>('unknown');

    const handleNodeMessage = useCallback((msg: any) => {
        try {
            const message = JSON.parse(msg);
            
            // Listen for service status updates for THIS project
            if (message.type === 'SERVICE_STATUS' && message.payload.service === 'attendance') {
                setServiceStatus(message.payload.status);
            } 
            // Listen for log updates specifically for THIS project
            else if (message.type === 'LOGS_UPDATE' && message.projectName === 'attendance') {
                setLogs(message.payload || 'No logs yet. Pull down to refresh.');
            }
        } catch (error) {
            // Raw string messages like pings can be ignored in the UI
        }
        
        setIsLoading(false);
        setRefreshing(false);
    }, []);

    const requestData = () => {
        // Request logs specifically for the 'attendance' project
        nodejs.channel.send(JSON.stringify({ type: 'GET_LOGS', payload: { projectName: 'attendance' } }));
        // Request a status update from the attendance project
        nodejs.channel.send(JSON.stringify({ type: 'GET_FRESH_DATA', payload: { projectName: 'attendance' } }));
    };
    
    useEffect(() => {
        // *** THE FIX IS HERE: We only listen to our custom event bus ***
        eventBus.on('nodejs-message', handleNodeMessage);
        
        requestData(); // Initial data load
        
        return () => {
            // And we only clean up the event bus listener.
            eventBus.off('nodejs-message', handleNodeMessage);
        };
    }, [handleNodeMessage]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        requestData();
    }, []);
    
    const sendServiceCommand = (command: 'START' | 'STOP' | 'RESTART') => {
        const type = `${command}_SERVICE`;
        nodejs.channel.send(JSON.stringify({ type, payload: { projectName: 'attendance' } }));
        if (command === 'RESTART') {
            setServiceStatus('restarting');
            setLogs('Restarting service...');
        }
    };
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <ThemedView style={styles.content}>
                    <ThemedView style={styles.devToolsContainer}>
                        <ThemedText style={styles.devToolsHeader}>Developer Tools</ThemedText>
                        <View style={styles.devToolsRow}>
                            <Button 
                                title="View/Edit Service Code" 
                                onPress={() => router.push({ 
                                    pathname: '/(drawer)/code-viewer', 
                                    params: { projectName: 'attendance' } 
                                })}
                            />
                            <Button 
                                title="View/Edit package.json" 
                                onPress={() => router.push({ 
                                    pathname: '/(drawer)/package-json-viewer', 
                                    params: { projectName: 'attendance' } 
                                })}
                            />
                        </View>
                        <View style={styles.devToolsFullWidth}>
                            <Button 
                                title="Manage Dependencies (NPM)"
                                color="#1E90FF"
                                onPress={() => router.push({ 
                                    pathname: '/(drawer)/package-manager', 
                                    params: { projectName: 'attendance' } 
                                })}
                            />
                        </View>
                    </ThemedView>
                    <ThemedView style={styles.controlsContainer}>
                        <ThemedText style={styles.statusText}>
                            Service Status: <Text style={styles[serviceStatus]}>{serviceStatus.toUpperCase()}</Text>
                        </ThemedText>
                        <View style={styles.buttonRow}>
                           <Button title="Start" onPress={() => sendServiceCommand('START')} disabled={serviceStatus === 'running' || serviceStatus === 'restarting'} />
                           <Button title="Stop" onPress={() => sendServiceCommand('STOP')} disabled={serviceStatus === 'stopped' || serviceStatus === 'restarting'} color="orange" />
                           <Button title="Restart" onPress={() => sendServiceCommand('RESTART')} disabled={serviceStatus === 'restarting'} color="red" />
                        </View>
                    </ThemedView>

                    <ThemedText style={styles.header}>Service Logs (attendance.log)</ThemedText>
                    {isLoading ? (
                        <ActivityIndicator size="large" />
                    ) : (
                        <ThemedView style={styles.logBox}>
                            <Text style={styles.logText}>{logs}</Text>
                        </ThemedView>
                    )}
                </ThemedView>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    devToolsContainer: {
        marginBottom: 20,
        padding: 15,
        borderWidth: 1,
        borderColor: '#007AFF',
        borderRadius: 8,
        backgroundColor: '#f0f8ff'
    },
    devToolsHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15,
    },
    devToolsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    devToolsFullWidth: {
    },
    scrollContent: { flexGrow: 1 },
    content: { padding: 15, flex: 1 },
    controlsContainer: { marginVertical: 15, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
    statusText: { textAlign: 'center', marginBottom: 10, fontSize: 16, fontWeight: 'bold' },
    buttonRow: { flexDirection: 'row', justifyContent: 'space-around' },
    header: { fontSize: 22, fontWeight: 'bold', marginVertical: 15, color: '#333' },
    logBox: { flex: 1, minHeight: 400, backgroundColor: '#2b2b2b', borderRadius: 8, padding: 12 },
    logText: { color: '#e0e0e0', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    running: { color: 'green' },
    stopped: { color: 'red' },
    restarting: { color: 'orange' },
    unknown: { color: 'gray' },
});
