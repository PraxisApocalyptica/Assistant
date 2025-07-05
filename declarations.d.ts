declare module 'expo-router/entry';
declare module 'react-native/Libraries/Utilities/HMRClient' {
    interface HMRMessage {
      body: {
        type: 'update';
        isInitial: boolean;
        modules: Array<{
          path: string;
          code: string;
        }>;
      };
    }
  
    const HMRClient: {
      addMessageListener(callback: (message: HMRMessage) => void): void;
      removeMessageListener(callback: (message: HMRMessage) => void): void;
    };
  
    export default HMRClient;
}
