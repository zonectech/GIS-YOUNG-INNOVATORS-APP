import {
  deleteDoc,
  getDocFromServer,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type QueryConstraint,
} from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';

import { useApp } from '../context/AppContext';
import { refs } from '../lib/firebase';
import type {
  Assignment,
  Classroom,
  ClassMember,
  InnovationPortfolio,
  School,
  StaffMember,
  StudentNote,
  TeacherCode,
} from '../types';

const now = () => new Date().toISOString();
const warn = (p: Promise<unknown>) => p.catch((e) => console.warn('[school]', e));

/** Shown everywhere a student's name appears to staff, so same first names stay distinct. */
export const studentLabel = (m: Pick<ClassMember, 'name' | 'lastInitial'>) =>
  m.lastInitial ? `${m.name} ${m.lastInitial}.` : m.name;

export function useSchoolDoc(schoolId: string | null) {
  const [school, setSchool] = useState<School | null>(null);
  useEffect(() => {
    if (!schoolId) return setSchool(null);
    return onSnapshot(
      refs.school(schoolId),
      (s) => setSchool(s.exists() ? ({ ...(s.data() as School), id: s.id }) : null),
      () => setSchool(null),
    );
  }, [schoolId]);
  return school;
}

export function useSchoolClasses(schoolId: string | null) {
  const [classes, setClasses] = useState<Classroom[]>([]);
  useEffect(() => {
    if (!schoolId) return setClasses([]);
    return onSnapshot(
      query(refs.classes(), where('schoolId', '==', schoolId)),
      (s) => setClasses(s.docs.map((d) => d.data() as Classroom).sort((a, b) => a.name.localeCompare(b.name))),
      () => setClasses([]),
    );
  }, [schoolId]);
  return classes;
}

export function useClassMembers(classId: string | undefined) {
  const [members, setMembers] = useState<ClassMember[]>([]);
  useEffect(() => {
    if (!classId) return setMembers([]);
    return onSnapshot(
      refs.members(classId),
      (s) =>
        setMembers(
          s.docs
            .map((d) => d.data() as ClassMember)
            .sort((a, b) => studentLabel(a).localeCompare(studentLabel(b))),
        ),
      () => setMembers([]),
    );
  }, [classId]);
  return members;
}

/** Members of every class in a school, tagged with their class. */
export function useSchoolStudents(classes: Classroom[]) {
  const [byClass, setByClass] = useState<Record<string, ClassMember[]>>({});
  const ids = classes.map((c) => c.id).join(',');
  useEffect(() => {
    const unsubs = classes.map((c) =>
      onSnapshot(
        refs.members(c.id),
        (s) => setByClass((prev) => ({ ...prev, [c.id]: s.docs.map((d) => d.data() as ClassMember) })),
        () => {},
      ),
    );
    return () => unsubs.forEach((u) => u());
    // `ids` captures the class list; the array itself is rebuilt on every snapshot.
  }, [ids]);
  return classes.flatMap((c) => (byClass[c.id] ?? []).map((m) => ({ member: m, classroom: c })));
}

/**
 * A student's portfolios as staff see them. Queries must filter on the field the rules check
 * (teacherId for teachers, schoolId for school admins) or Firestore rejects them.
 */
export function useStudentPortfolios(studentUid: string | undefined) {
  const { uid, profile } = useApp();
  const [items, setItems] = useState<InnovationPortfolio[]>([]);
  const scope: QueryConstraint | null =
    profile.role === 'school-admin' && profile.schoolId
      ? where('schoolId', '==', profile.schoolId)
      : uid
        ? where('teacherId', '==', uid)
        : null;
  const scopeKey = profile.role === 'school-admin' ? profile.schoolId : uid;

  useEffect(() => {
    if (!studentUid || !scope) return setItems([]);
    return onSnapshot(
      query(refs.portfolios(), where('ownerId', '==', studentUid), scope),
      (s) =>
        setItems(
          s.docs
            .map((d) => d.data() as InnovationPortfolio)
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        ),
      () => setItems([]),
    );
    // `scope` is rebuilt every render; `scopeKey` is its stable identity.
  }, [studentUid, scopeKey]);
  return items;
}

export function useStudentNote(classId: string | undefined, studentUid: string | undefined) {
  const [note, setNote] = useState<StudentNote | null>(null);
  useEffect(() => {
    if (!classId || !studentUid) return;
    return onSnapshot(
      refs.note(classId, studentUid),
      (s) => setNote((s.data() as StudentNote | undefined) ?? null),
      () => setNote(null),
    );
  }, [classId, studentUid]);
  const save = (text: string) =>
    classId && studentUid && warn(setDoc(refs.note(classId, studentUid), { text: text.slice(0, 200), updatedAt: now() }));
  return { note, save };
}

/** Removes a student from a class: their roster row now, and their app unlinks itself on next sync. */
export function removeStudentFromClass(classId: string, studentUid: string, staffUid: string) {
  const a: Assignment = { to: null, fromClassId: classId, assignedBy: staffUid, createdAt: now() };
  warn(setDoc(refs.assignment(studentUid), a));
  warn(deleteDoc(refs.member(classId, studentUid)));
}

export function useStaff(schoolId: string | null) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  useEffect(() => {
    if (!schoolId) return setStaff([]);
    return onSnapshot(
      refs.staff(schoolId),
      (s) => setStaff(s.docs.map((d) => d.data() as StaffMember).sort((a, b) => a.name.localeCompare(b.name))),
      () => setStaff([]),
    );
  }, [schoolId]);
  return staff;
}

export function useTeacherCodes(schoolId: string | null) {
  const [codes, setCodes] = useState<TeacherCode[]>([]);
  useEffect(() => {
    if (!schoolId) return setCodes([]);
    return onSnapshot(
      query(refs.teacherCodes(), where('schoolId', '==', schoolId)),
      (s) =>
        setCodes(
          s.docs
            .map((d) => ({ ...(d.data() as TeacherCode), code: d.id }))
            .filter((c) => c.role !== 'school-admin')
            .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
        ),
      () => setCodes([]),
    );
  }, [schoolId]);
  return codes;
}

// Unambiguous characters only (no 0/O, 1/I) so codes are easy to read aloud and type.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode = () => `T-${Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('')}`;

/** Creates a teacher invite code for this school; needs a connection to check the code is free. */
export async function createTeacherCode(schoolId: string, label: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = randomCode();
    const existing = await getDocFromServer(refs.teacherCode(code));
    if (existing.exists()) continue;
    const doc: TeacherCode = { code, active: true, role: 'teacher', schoolId, label: label.trim().slice(0, 60), createdAt: now() };
    await setDoc(refs.teacherCode(code), doc);
    return code;
  }
  throw new Error('Could not create a code. Please try again.');
}

export const setTeacherCodeActive = (code: string, active: boolean) => warn(updateDoc(refs.teacherCode(code), { active }));

/** School admin records (or withdraws) confirmation that parental consent is collected. */
export const setSchoolConsent = (schoolId: string, by: { uid: string; name: string } | null) =>
  warn(
    updateDoc(refs.school(schoolId), {
      consent: by ? { confirmedBy: by.uid, confirmedByName: by.name, confirmedAt: now() } : null,
    }),
  );

/** Moves a student to another class in the school; their app applies it on its next sync. */
export function assignStudent(studentUid: string, fromClassId: string, target: Classroom, adminUid: string) {
  const a: Assignment = {
    to: {
      code: target.joinCode,
      classId: target.id,
      className: target.name,
      teacherId: target.ownerId,
      schoolId: target.schoolId,
    },
    fromClassId,
    assignedBy: adminUid,
    createdAt: now(),
  };
  return warn(setDoc(refs.assignment(studentUid), a));
}
