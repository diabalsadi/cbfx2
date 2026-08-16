import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cbfx.app',
  appName: 'CBFX',
  webDir: 'www',
  server: {
    url: 'https://cbfx2.vercel.app/',
    cleartext: false
  }
};

export default config;
