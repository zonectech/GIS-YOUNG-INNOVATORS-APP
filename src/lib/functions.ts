import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

// Must match REGION in functions/src/index.ts.
export const FUNCTIONS_REGION = 'europe-west1';

const fns = () => getFunctions(getApp(), FUNCTIONS_REGION);

async function call<Req, Res>(name: string, data: Req): Promise<Res> {
  try {
    return (await httpsCallable<Req, Res>(fns(), name)(data)).data;
  } catch (e) {
    const { code = '', message = '' } = e as { code?: string; message?: string };
    if (code.includes('unavailable') || code.includes('internal') || /network/i.test(message)) {
      throw new Error('Connect to the internet and try again.');
    }
    if (code.includes('not-found') && /function/i.test(message)) {
      throw new Error('This feature is not set up on the server yet. Ask your school administrator.');
    }
    throw new Error(message || 'Something went wrong. Please try again.');
  }
}

export type RosterEntry = { uid: string; label: string };

export const setStudentPin = (pin: string) => call<{ pin: string }, { ok: true }>('setStudentPin', { pin });

export const classRoster = (joinCode: string) =>
  call<{ joinCode: string }, { className: string; students: RosterEntry[] }>('classRoster', { joinCode });

export const classLogin = (joinCode: string, studentUid: string, pin: string) =>
  call<{ joinCode: string; studentUid: string; pin: string }, { token: string }>('classLogin', {
    joinCode,
    studentUid,
    pin,
  });

export const resetStudentPin = (classId: string, studentUid: string, newPin: string) =>
  call<{ classId: string; studentUid: string; newPin: string }, { ok: true }>('resetStudentPin', {
    classId,
    studentUid,
    newPin,
  });

export const transferClass = (classId: string, toTeacherUid: string) =>
  call<{ classId: string; toTeacherUid: string }, { moved: number }>('transferClass', { classId, toTeacherUid });

export const deleteMyAccount = () => call<Record<string, never>, { ok: true }>('deleteMyAccount', {});
