import App from 'expo-router/entry';
import { AppRegistry, LogBox } from 'react-native';
import 'react-native-gesture-handler';
const appName = require('./app.json').expo.name;

// The 'expo-router/entry' module may have some warnings that are not relevant for our purpose here.
// This is optional but can help keep your console clean.
LogBox.ignoreLogs([
  "The `redirect` prop on <Screen /> is deprecated and will be removed. Please use `router.redirect` instead.",
]);

// 1. Register the app with its original name from app.json ("Assistant")
// This is what Expo Router and other Expo tools expect.
if (AppRegistry.getAppKeys().indexOf(appName) === -1) {
  AppRegistry.registerComponent(appName, () => App);
}

// 2. Register the app with the name "app"
// This is what nodejs-mobile-react-native expects MainActivity to find.
// By registering the same App component under a different name, we satisfy both.
if (AppRegistry.getAppKeys().indexOf('app') === -1) {
  AppRegistry.registerComponent('app', () => App);
}
