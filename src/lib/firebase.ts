import { getApp } from '@react-native-firebase/app';
import {
  CACHE_SIZE_UNLIMITED,
  collection,
  doc,
  getFirestore,
  initializeFirestore,
} from '@react-native-firebase/firestore';

let instance: ReturnType<typeof getFirestore> | null = null;

/** Firestore with on-device persistence: reads are served from cache offline and writes queue until reconnect. */
export function db() {
  if (instance) return instance;
  try {
    instance = initializeFirestore(getApp(), {
      persistence: true,
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    });
  } catch {
    // Already initialized (e.g. after a Fast Refresh).
    instance = getFirestore();
  }
  return instance;
}

export const refs = {
  user: (uid: string) => doc(db(), 'users', uid),
  portfolios: () => collection(db(), 'portfolios'),
  portfolio: (id: string) => doc(db(), 'portfolios', id),
  classes: () => collection(db(), 'classes'),
  classroom: (id: string) => doc(db(), 'classes', id),
  outputs: (classId: string) => collection(db(), 'classes', classId, 'outputs'),
  challenges: () => collection(db(), 'challenges'),
  joinCode: (code: string) => doc(db(), 'joinCodes', code),
  resourceBank: (ownerId: string) => doc(db(), 'resourceBanks', ownerId),
  communityProblems: () => collection(db(), 'communityProblems'),
  schoolProblems: (teacherId: string) => collection(db(), 'schoolProblems', teacherId, 'problems'),
  schoolProblem: (teacherId: string, id: string) => doc(db(), 'schoolProblems', teacherId, 'problems', id),
  galleryItems: () => collection(db(), 'galleryItems'),
  galleryItem: (id: string) => doc(db(), 'galleryItems', id),
  reactions: (itemId: string) => collection(db(), 'galleryItems', itemId, 'reactions'),
  reaction: (itemId: string, uid: string) => doc(db(), 'galleryItems', itemId, 'reactions', uid),
  teacherCode: (code: string) => doc(db(), 'teacherCodes', code),
  teacherCodes: () => collection(db(), 'teacherCodes'),
  levelRequests: () => collection(db(), 'levelRequests'),
  levelRequest: (uid: string) => doc(db(), 'levelRequests', uid),
  school: (id: string) => doc(db(), 'schools', id),
  staff: (schoolId: string) => collection(db(), 'schools', schoolId, 'staff'),
  staffMember: (schoolId: string, uid: string) => doc(db(), 'schools', schoolId, 'staff', uid),
  members: (classId: string) => collection(db(), 'classes', classId, 'members'),
  member: (classId: string, uid: string) => doc(db(), 'classes', classId, 'members', uid),
  note: (classId: string, uid: string) => doc(db(), 'classes', classId, 'notes', uid),
  assignment: (uid: string) => doc(db(), 'assignments', uid),
};

export const newId = () => doc(refs.portfolios()).id;
