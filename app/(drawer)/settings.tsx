import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { startBackgroundTask, stopBackgroundTask } from '@/services/BackgroundService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import nodejs from 'nodejs-mobile-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Switch, View } from 'react-native';

const BG_SERVICE_KEY = '@attendance_background_service_status';
const LOGGING_KEY = '@nodejs_file_logging_status';

export default function SettingsScreen() {
    const [isBgServiceEnabled, setIsBgServiceEnabled] = useState(false);
    const [isFileLoggingEnabled, setIsFileLoggingEnabled] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadSettings = async () => {
            setIsLoading(true);
            const bgStatus = await AsyncStorage.getItem(BG_SERVICE_KEY);
            const logStatus = await AsyncStorage.getItem(LOGGING_KEY);
            setIsBgServiceEnabled(bgStatus === 'true');
            // Default logging to true if no setting is saved yet
            setIsFileLoggingEnabled(logStatus !== 'false');
            // Inform node.js of the initial logging status on load
            if (logStatus !== null) {
                nodejs.channel.send(JSON.stringify({ type: 'SET_LOGGING_CONFIG', payload: { enabled: logStatus !== 'false' } }));
            }
            setIsLoading(false);
        };
        loadSettings();
    }, []);
    
    const toggleFileLogging = (enabled: boolean) => {
        setIsFileLoggingEnabled(enabled);
        nodejs.channel.send(JSON.stringify({ type: 'SET_LOGGING_CONFIG', payload: { enabled } }));
        AsyncStorage.setItem(LOGGING_KEY, enabled ? 'true' : 'false');
    };

    const handleBgToggle = async (newValue: boolean) => {
        setIsBgServiceEnabled(newValue);
        setIsLoading(true);
        try {
            if (newValue) {
                const alertTitle = "Enable Background Service";
                const alertMessage = Platform.OS === 'android'
                    ? "This will show a persistent notification to keep services running reliably when the app is closed."
                    : "On iOS, background tasks are less reliable. The app will attempt to run tasks periodically, but execution is not guaranteed by the OS.";
                
                Alert.alert(alertTitle, alertMessage, [{ text: "OK", onPress: () => startBackgroundTask() }]);
            } else {
                await stopBackgroundTask();
            }
        } catch (error) {
            console.error("Failed to toggle background service", error);
            setIsBgServiceEnabled(!newValue); // Revert on failure
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title">Settings</ThemedText>
            
            <View style={styles.settingItem}>
                <View style={styles.settingTextContainer}>
                    <ThemedText style={styles.settingTitle}>Enable Node.js File Logging</ThemedText>
                    <ThemedText style={styles.settingDescription}>
                        Saves all console output from Node.js services to separate files for debugging.
                    </ThemedText>
                </View>
                 {isLoading ? <ActivityIndicator/> : (
                    <Switch
                        value={isFileLoggingEnabled}
                        onValueChange={toggleFileLogging}
                        trackColor={{ false: '#767577', true: '#81b0ff' }}
                        thumbColor={isFileLoggingEnabled ? '#007AFF' : '#f4f3f4'}
                    />
                 )}
            </View>

            <View style={styles.settingItem}>
                <View style={styles.settingTextContainer}>
                    <ThemedText style={styles.settingTitle}>Attendance Background Service</ThemedText>
                    <ThemedText style={styles.settingDescription}>
                        Enable persistent execution for automatic clock-in and clock-out.
                    </ThemedText>
                </View>
                {isLoading ? <ActivityIndicator /> : (
                    <Switch
                        value={isBgServiceEnabled}
                        onValueChange={handleBgToggle}
                        trackColor={{ false: '#767577', true: '#81b0ff' }}
                        thumbColor={isBgServiceEnabled ? '#007AFF' : '#f4f3f4'}
                    />
                )}
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, gap: 15 },
    settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    settingTextContainer: { flex: 1, marginRight: 15 },
    settingTitle: { fontSize: 18, fontWeight: '500' },
    settingDescription: { fontSize: 14, color: '#666', marginTop: 4 }
});
