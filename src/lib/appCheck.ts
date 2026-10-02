import { getApp } from '@react-native-firebase/app';
import { initializeAppCheck, type AppCheck } from '@react-native-firebase/app-check';

let ready: Promise<AppCheck> | null = null;

// Dev only: a token registered in Firebase Console → App Check → Manage debug tokens, kept in .env.local (git-ignored).
const DEBUG_TOKEN = __DEV__ ? process.env.EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN : undefined;

/**
 * Initializes App Check once. Development builds use the debug provider (Play Integrity only works for
 * Play-installed apps).
 */
export function ensureAppCheck(): Promise<AppCheck> {
  if (!ready) {
    // Typed as sync but resolves asynchronously on React Native; normalize to a promise.
    const p = Promise.resolve().then(() =>
      initializeAppCheck(getApp(), {
        provider: {
          providerOptions: {
            android: __DEV__ ? { provider: 'debug', debugToken: DEBUG_TOKEN } : { provider: 'playIntegrity' },
            apple: __DEV__
              ? { provider: 'debug', debugToken: DEBUG_TOKEN }
              : { provider: 'appAttestWithDeviceCheckFallback' },
            web: { provider: 'reCaptchaV3', siteKey: 'unused' },
          },
        },
        isTokenAutoRefreshEnabled: true,
      }),
    );
    p.catch(() => {
      ready = null;
    });
    ready = p;
  }
  return ready;
}
