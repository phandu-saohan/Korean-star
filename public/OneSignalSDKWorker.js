// Register empty message handler synchronously on initial evaluation to satisfy Chrome 120+ SW requirements
self.addEventListener('message', () => {});

importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
