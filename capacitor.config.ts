import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nyxkn.meditation',
  appName: 'Meditation',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#8C9EFF',
      sound: 'bell_burma.ogg',
    },
  },
};

export default config;
