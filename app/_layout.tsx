import { useFonts } from 'expo-font';
import { Drawer } from 'expo-router/drawer';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native'; // Import the correct module
import 'react-native-reanimated';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import eventBus from '@/services/EventBus';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import nodejs from 'nodejs-mobile-react-native';
import DrawerContent from './(drawer)/content';

// --- THE FINAL, CORRECTED HOT-RELOAD CLIENT LOGIC ---
function useNodeJsHotReloader() {
  useEffect(() => {
    // 1. Only run this logic in development mode.
    if (!__DEV__) {
      return;
    }

    // 2. Dynamically require the dev loader inside the hook.
    try {
      require('../metro-nodejs-dev-loader.js');
    } catch (error) {
      console.warn('[NODE-HMR] Failed to load the dev loader:', error);
      return; // Stop if the loader itself fails.
    }

    // 3. Define the handler for Metro's 'devMenu' events.
    const handleHotUpdate = (params: any) => {
      // We listen for the specific 'hmr' event sent on a hot update.
      if (params?.name !== 'hmr' || !params.data) {
        return;
      }
      
      const { data } = params;

      // Ensure it's a module update and not the initial bundle.
      if (data.type !== 'update' || data.isInitial) {
        return;
      }

      for (const update of data.modules) {
        const pathFromRoot = update.path as string;

        // Check if the updated file is part of our Node.js backend.
        if (pathFromRoot.startsWith('nodejs-assets/nodejs-project/')) {
          console.log(`[NODE-HMR] Detected change in: ${pathFromRoot}`);
          
          const relativePath = pathFromRoot.replace('nodejs-assets/nodejs-project/', '');
          const newCode = update.code as string;

          // Send the updated file content to the Node.js thread.
          nodejs.channel.send(JSON.stringify({
            type: 'DEV_HOT_RELOAD_UPDATE',
            payload: { path: relativePath, content: newCode }
          }));
        }
      }
    };
    
    // 4. Subscribe to the 'devMenu' event emitter.
    console.log('[NODE-HMR] Subscribing to Metro devMenu events for hot updates.');
    const subscription = DeviceEventEmitter.addListener('devMenu', handleHotUpdate);

    // 5. Return a cleanup function to remove the listener.
    return () => {
      subscription.remove();
    };

  }, []); // Run only once when the component mounts.
}
// --- END OF HOT-RELOAD LOGIC ---

export default function RootLayout() {
  // Activate our custom hot-reloader.
  useNodeJsHotReloader();

  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    console.log("React Native: Starting Node.js mobile runtime...");
    nodejs.start('app.js');
    
    const listener = (msg: any) => {
      console.log("Message from Node.js (in RootLayout):", msg);
      eventBus.emit('nodejs-message', msg); 
    };
    nodejs.channel.addListener('message', listener);

    return () => {
      nodejs.channel.removeListener('message', listener);
    };
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Drawer drawerContent={(props) => <DrawerContent {...props} />} >
        <Drawer.Screen 
            name="(tabs)" 
            options={{ 
                headerShown: false, 
                title: 'AI Assistant',
                drawerIcon: ({ color }) => <IconSymbol name="message.fill" size={20} color={color} />,
            }} 
        />
        <Drawer.Screen 
            name="(drawer)" 
            options={{ 
                headerShown: false,
                drawerItemStyle: { display: 'none' } 
            }}
        />
        <Drawer.Screen 
            name="+not-found" 
            options={{ 
                drawerItemStyle: { display: 'none' } 
            }}
        />
      </Drawer>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
