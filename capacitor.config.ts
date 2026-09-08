import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl=process.env.MKPOS_SERVER_URL||'';
const config: CapacitorConfig={
  appId:'pk.mkpizza.pos',
  appName:'MK Pizza & Ice Bar POS',
  webDir:'public',
  bundledWebRuntime:false,
  server:serverUrl?{url:serverUrl,cleartext:false}:undefined,
  android:{allowMixedContent:false}
};
export default config;
