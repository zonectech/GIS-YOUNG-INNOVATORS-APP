import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';

initializeApp();
const db = getFirestore();

// Must match FUNCTIONS_REGION in the app (src/lib/functions.ts).
const REGION = 'europe-west1';
// Flip to true once App Check enforcement is on for the app (debug tokens registered for dev builds).
const ENFORCE_APP_CHECK = false;
const opts = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK };

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

type PinDoc = { hash: string; salt: string; failures: number; lockedUntil: number | null };

const hashPin = (pin: string, salt: string) => scryptSync(pin, salt, 32).toString('hex');

function requireAuth(req: CallableRequest): string {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  return req.auth.uid;
}

function validPin(pin: unknown): pin is string {
  return typeof pin === 'string' && /^\d{4}$/.test(pin);
}

async function userDoc(uid: string) {
  return (await db.doc(`users/${uid}`).get()).data() ?? {};
}

async function isStaffOfClass(uid: string, classId: string): Promise<boolean> {
  const cls = (await db.doc(`classes/${classId}`).get()).data();
  if (!cls) return false;
  if (cls.ownerId === uid) return true;
  const me = await userDoc(uid);
  return me.role === 'school-admin' && !!me.schoolId && me.schoolId === cls.schoolId;
}

/** A student sets or changes their 4-digit login PIN. Stored only as a salted scrypt hash. */
export const setStudentPin = onCall(opts, async (req) => {
  const uid = requireAuth(req);
  const { pin } = req.data ?? {};
  if (!validPin(pin)) throw new HttpsError('invalid-argument', 'The PIN must be 4 digits.');
  const me = await userDoc(uid);
  if (me.role !== 'student') throw new HttpsError('permission-denied', 'Only students use login PINs.');

  const salt = randomBytes(16).toString('hex');
  const pinDoc: PinDoc = { hash: hashPin(pin, salt), salt, failures: 0, lockedUntil: null };
  await db.doc(`pins/${uid}`).set(pinDoc);
  await db.doc(`users/${uid}`).set({ hasPin: true }, { merge: true });
  if (me.school?.classId) {
    await db.doc(`classes/${me.school.classId}/members/${uid}`).set({ hasPin: true }, { merge: true });
  }
  return { ok: true };
});

/** Names in a class that can log in with a PIN. Requires the class code, which only the class has. */
export const classRoster = onCall(opts, async (req) => {
  const { joinCode } = req.data ?? {};
  if (typeof joinCode !== 'string' || !/^\d{6}$/.test(joinCode)) {
    throw new HttpsError('invalid-argument', 'Class codes have 6 digits.');
  }
  const code = (await db.doc(`joinCodes/${joinCode}`).get()).data();
  if (!code) throw new HttpsError('not-found', 'That class code was not found.');

  const members = await db.collection(`classes/${code.classId}/members`).where('hasPin', '==', true).get();
  return {
    className: code.className as string,
    students: members.docs
      .map((d) => {
        const m = d.data();
        return { uid: d.id, label: m.lastInitial ? `${m.name} ${m.lastInitial}.` : m.name };
      })
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
});

/** Shared-tablet login: verifies the PIN with lockout, then returns a custom token for that student. */
export const classLogin = onCall(opts, async (req) => {
  const { joinCode, studentUid, pin } = req.data ?? {};
  if (typeof joinCode !== 'string' || typeof studentUid !== 'string' || !validPin(pin)) {
    throw new HttpsError('invalid-argument', 'Missing class code, name or PIN.');
  }
  const code = (await db.doc(`joinCodes/${joinCode}`).get()).data();
  if (!code) throw new HttpsError('not-found', 'That class code was not found.');
  const member = await db.doc(`classes/${code.classId}/members/${studentUid}`).get();
  if (!member.exists) throw new HttpsError('not-found', 'That student is not in this class.');

  const ref = db.doc(`pins/${studentUid}`);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const p = snap.data() as PinDoc | undefined;
    if (!p) return { ok: false as const, reason: 'no-pin' as const };
    if (p.lockedUntil && p.lockedUntil > Date.now()) return { ok: false as const, reason: 'locked' as const };

    const ok = timingSafeEqual(Buffer.from(hashPin(pin, p.salt), 'hex'), Buffer.from(p.hash, 'hex'));
    if (ok) {
      tx.update(ref, { failures: 0, lockedUntil: null });
      return { ok: true as const };
    }
    const failures = p.failures + 1;
    const lock = failures >= MAX_FAILURES;
    tx.update(ref, { failures: lock ? 0 : failures, lockedUntil: lock ? Date.now() + LOCK_MINUTES * 60_000 : null });
    return { ok: false as const, reason: lock ? ('locked' as const) : ('wrong' as const) };
  });

  if (!result.ok) {
    if (result.reason === 'no-pin') throw new HttpsError('failed-precondition', 'This student has not set a PIN yet.');
    if (result.reason === 'locked') {
      throw new HttpsError('resource-exhausted', `Too many wrong PINs. Try again in ${LOCK_MINUTES} minutes or ask your teacher.`);
    }
    throw new HttpsError('permission-denied', 'Wrong PIN. Please try again.');
  }
  return { token: await getAuth().createCustomToken(studentUid) };
});

/** Teacher or school admin replaces a forgotten PIN with a new one they tell the student (and clears any lock). */
export const resetStudentPin = onCall(opts, async (req) => {
  const uid = requireAuth(req);
  const { classId, studentUid, newPin } = req.data ?? {};
  if (typeof classId !== 'string' || typeof studentUid !== 'string') throw new HttpsError('invalid-argument', 'Missing student.');
  if (!validPin(newPin)) throw new HttpsError('invalid-argument', 'The new PIN must be 4 digits.');
  if (!(await isStaffOfClass(uid, classId))) throw new HttpsError('permission-denied', 'Only this class\'s teacher can reset PINs.');
  const member = await db.doc(`classes/${classId}/members/${studentUid}`).get();
  if (!member.exists) throw new HttpsError('not-found', 'That student is not in this class.');

  const salt = randomBytes(16).toString('hex');
  const pinDoc: PinDoc = { hash: hashPin(newPin, salt), salt, failures: 0, lockedUntil: null };
  await db.doc(`pins/${studentUid}`).set(pinDoc);
  await db.doc(`users/${studentUid}`).set({ hasPin: true }, { merge: true });
  await member.ref.set({ hasPin: true }, { merge: true });
  return { ok: true };
});

/** School admin hands a class (and its students' portfolio access) to another teacher at the same school. */
export const transferClass = onCall(opts, async (req) => {
  const uid = requireAuth(req);
  const { classId, toTeacherUid } = req.data ?? {};
  if (typeof classId !== 'string' || typeof toTeacherUid !== 'string') throw new HttpsError('invalid-argument', 'Missing class or teacher.');

  const me = await userDoc(uid);
  const clsRef = db.doc(`classes/${classId}`);
  const cls = (await clsRef.get()).data();
  if (!cls || me.role !== 'school-admin' || !me.schoolId || cls.schoolId !== me.schoolId) {
    throw new HttpsError('permission-denied', 'Only this school\'s admin can transfer classes.');
  }
  const teacher = await userDoc(toTeacherUid);
  if (teacher.role !== 'teacher' || teacher.schoolId !== me.schoolId) {
    throw new HttpsError('failed-precondition', 'The new teacher must be registered at this school.');
  }

  const batch = db.batch();
  batch.update(clsRef, { ownerId: toTeacherUid, teacherName: teacher.displayName ?? 'Teacher' });
  batch.update(db.doc(`joinCodes/${cls.joinCode}`), { teacherId: toTeacherUid });
  // Students' apps follow the assignment, which re-links their portfolios to the new teacher.
  const members = await db.collection(`classes/${classId}/members`).get();
  members.docs.forEach((m) =>
    batch.set(db.doc(`assignments/${m.id}`), {
      to: { code: cls.joinCode, classId, className: cls.name, teacherId: toTeacherUid, schoolId: cls.schoolId ?? null },
      fromClassId: classId,
      assignedBy: uid,
      createdAt: new Date().toISOString(),
    }),
  );
  await batch.commit();
  return { moved: members.size };
});

/** Deletes the caller's account and everything they own (portfolios, showcase entries, roster rows, photos). */
export const deleteMyAccount = onCall(opts, async (req) => {
  const uid = requireAuth(req);
  const me = await userDoc(uid);

  const portfolios = await db.collection('portfolios').where('ownerId', '==', uid).get();
  const gallery = await db.collection('galleryItems').where('ownerId', '==', uid).get();
  const writer = db.bulkWriter();
  for (const g of gallery.docs) await db.recursiveDelete(g.ref, writer);
  portfolios.docs.forEach((p) => writer.delete(p.ref));
  if (me.school?.classId) writer.delete(db.doc(`classes/${me.school.classId}/members/${uid}`));
  if (me.schoolId) writer.delete(db.doc(`schools/${me.schoolId}/staff/${uid}`));
  ['pins', 'levelRequests', 'assignments', 'users'].forEach((c) => writer.delete(db.doc(`${c}/${uid}`)));
  await writer.close();

  await getStorage().bucket().deleteFiles({ prefix: `users/${uid}/` }).catch(() => undefined);
  await getAuth().deleteUser(uid);
  return { ok: true, deletedProjects: portfolios.size };
});
