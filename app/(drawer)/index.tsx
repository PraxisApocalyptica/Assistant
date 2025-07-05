import { Link } from 'expo-router';
import { Button, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function DrawerHomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Services Dashboard</ThemedText>
      <ThemedText style={styles.subtitle}>
        Welcome to the developer tools section.
      </ThemedText>
      <ThemedText style={styles.description}>
        You can access specific Node.js services and other tools from the side drawer. 
        Swipe from the left edge or tap the menu icon in the header to open it.
      </ThemedText>

      {/* Example of linking directly to a service screen */}
      <Link href={{ pathname: '/(drawer)/attendance' }} asChild>
        <Button title="Go to Attendance Service" />
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  subtitle: {
    fontSize: 18,
    color: '#888',
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    maxWidth: '90%',
    lineHeight: 22,
  },
});
