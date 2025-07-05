import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import BackgroundActions from 'react-native-background-actions';
import BackgroundFetch from 'react-native-background-fetch';

const STORAGE_KEY = '@attendance_background_service_status';
const sleep = (time: number) => new Promise((resolve) => setTimeout(resolve, time));

// This is the task that will run in the background on Android.
// Its primary job is simply to exist, which keeps the app process alive,
// allowing our Node.js thread and its cron jobs to continue running.
const backgroundTask = async (taskData: any) => {
    if (Platform.OS === 'android') {
        const { delay } = taskData;
        await new Promise(async (resolve) => {
            for (let i = 0; BackgroundActions.isRunning(); i++) {
                console.log('Background service is running...');
                await sleep(delay);
            }
        });
    }
};

const options = {
    taskName: 'Attendance Service',
    taskTitle: 'Attendance Service Active',
    taskDesc: 'The service is running to ensure automatic clock-in/out.',
    taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
    },
    color: '#007AFF',
    linkingURI: 'assistant://(drawer)/attendance',
    parameters: {
        delay: 5 * 60 * 1000, // run every 5 minutes
    },
};

/**
 * Starts the appropriate background execution mechanism for the platform.
 */
export const startBackgroundTask = async () => {
    if (Platform.OS === 'android') {
        try {
            console.log('Starting Android Foreground Service...');
            await BackgroundActions.start(backgroundTask, options);
            console.log('Android Foreground Service started successfully.');
        } catch (e) {
            console.error('Error starting Android background task', e);
        }
    } else {
        // iOS Background Fetch configuration
        try {
            console.log('Configuring iOS Background Fetch...');
            await BackgroundFetch.configure({
                minimumFetchInterval: 15, // <-- Fetch interval in minutes (iOS will schedule this)
                stopOnTerminate: false,
                enableHeadless: true,
                startOnBoot: true,
            }, async (taskId) => {
                console.log('[BackgroundFetch] taskId: ', taskId);
                // The existence of this callback keeps the app alive long enough
                // for Node.js timers to potentially fire if they are close.
                // It's less reliable than Android's Foreground Service.
                BackgroundFetch.finish(taskId);
            }, (taskId) => {
                console.log('[BackgroundFetch] TIMEOUT taskId: ', taskId);
                BackgroundFetch.finish(taskId);
            });
            console.log('iOS Background Fetch configured.');
            await BackgroundFetch.start();
        } catch (e) {
            console.error('Error configuring iOS Background Fetch', e);
        }
    }
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
};

/**
 * Stops the background execution task.
 */
export const stopBackgroundTask = async () => {
    if (Platform.OS === 'android') {
        console.log('Stopping Android Foreground Service...');
        await BackgroundActions.stop();
        console.log('Android Foreground Service stopped.');
    } else {
        console.log('Stopping iOS Background Fetch...');
        await BackgroundFetch.stop();
        console.log('iOS Background Fetch stopped.');
    }
    await AsyncStorage.setItem(STORAGE_KEY, 'false');
};

/**
 * Checks storage and starts the service if it was previously enabled.
 * To be called on app startup.
 */
export const checkAndStartBackgroundService = async () => {
    const isEnabled = await AsyncStorage.getItem(STORAGE_KEY);
    if (isEnabled === 'true') {
        console.log('Background service was previously enabled. Restarting...');
        await startBackgroundTask();
    }
};
