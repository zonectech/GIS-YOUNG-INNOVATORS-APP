import { File, Paths } from 'expo-file-system';

/** Per-tablet settings that must survive sign-out (Firestore data belongs to the signed-in user). */
export type DevicePrefs = {
  /** The last student signed out on purpose: show the class login instead of creating a new account. */
  signedOut: boolean;
  /** Pre-fills the class code on the login screen. */
  lastClassCode: string | null;
};

const DEFAULTS: DevicePrefs = { signedOut: false, lastClassCode: null };

const file = () => new File(Paths.document, 'device-prefs.json');

export function readDevicePrefs(): DevicePrefs {
  try {
    const f = file();
    return f.exists ? { ...DEFAULTS, ...(JSON.parse(f.textSync()) as Partial<DevicePrefs>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function writeDevicePrefs(patch: Partial<DevicePrefs>): DevicePrefs {
  const next = { ...readDevicePrefs(), ...patch };
  try {
    const f = file();
    if (!f.exists) f.create();
    f.write(JSON.stringify(next));
  } catch (e) {
    console.warn('[device] could not save prefs', e);
  }
  return next;
}
