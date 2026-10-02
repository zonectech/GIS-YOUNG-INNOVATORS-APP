import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken,
  signOut,
} from '@react-native-firebase/auth';
import NetInfo from '@react-native-community/netinfo';
import {
  arrayUnion,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocsFromServer,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  waitForPendingWrites,
  where,
  writeBatch,
  type SnapshotListenOptions,
} from '@react-native-firebase/firestore';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { BUNDLED_CHALLENGES, DEFAULT_RESOURCES } from '../constants/content';
import { STEP_TITLES } from '../constants/engine';
import { deleteAttachmentFiles } from '../lib/attachments';
import { earnedBadges } from '../lib/badges';
import { readDevicePrefs, writeDevicePrefs } from '../lib/device';
import { db, newId, refs } from '../lib/firebase';
import * as fn from '../lib/functions';
import type {
  AgeTier,
  Assignment,
  Challenge,
  Classroom,
  ClassMember,
  GroupOutput,
  InnovationPortfolio,
  JoinCode,
  LevelRequest,
  ProjectOrigin,
  Resource,
  ResourceBank,
  SchoolLink,
  StaffMember,
  TeacherCode,
  UserProfile,
} from '../types';

/** `signed-out`: a student logged out of a shared tablet; the class login screen is shown. */
export type AppStatus = 'connecting' | 'needs-connection' | 'signed-out' | 'ready';

/** Why first-time setup could not finish. */
export type SetupProblem = 'offline' | 'server' | null;

type AppContextValue = {
  status: AppStatus;
  setupProblem: SetupProblem;
  uid: string | null;
  profile: UserProfile;
  /** The teacher's own bank, the linked teacher's bank for students, or defaults. */
  resources: Resource[];
  /** The portfolio document currently open in the Innovation Engine. */
  project: InnovationPortfolio | null;
  portfolio: InnovationPortfolio[];
  classes: Classroom[];
  challenges: Challenge[];
  /** True while any local write has not yet been acknowledged by the server. */
  hasPendingWrites: boolean;

  retrySignIn: () => void;
  /** One-time student registration (first name). */
  registerStudent: (name: string, lastInitial: string) => void;
  /** Staff registration (teacher or school admin, decided by the code); online the first time. */
  registerTeacher: (name: string, code: string) => Promise<'teacher' | 'school-admin'>;
  /** Sets the tier the first time only; later changes go through `requestLevelChange`. */
  setAgeTier: (tier: AgeTier) => void;
  /** Asks the linked teacher to approve a move to another tier. */
  requestLevelChange: (to: AgeTier) => Promise<void>;
  levelRequest: LevelRequest | null;
  setDisplayName: (name: string) => void;

  /** Starts a new project, optionally pre-loaded from a Showcase problem or gallery design. */
  startProject: (seed?: ProjectSeed) => void;
  updateProject: (patch: Partial<InnovationPortfolio>) => void;
  /** Updates any owned portfolio (active one included), e.g. the venture canvas on a finished project. */
  updatePortfolio: (id: string, patch: Partial<InnovationPortfolio>) => void;
  deleteProject: (id: string) => void;
  completeProject: () => void;
  /** Records a finished Storage upload on any of the user's portfolios. */
  markAttachmentUploaded: (projectId: string, attachmentId: string, remoteUrl: string) => void;

  addClass: (name: string) => void;
  addGroup: (classId: string, name: string) => void;
  addGroupOutput: (classId: string, output: Omit<GroupOutput, 'id' | 'createdAt'>) => void;
  addResource: (name: string, quantity: string) => void;
  removeResource: (id: string) => void;
  /** Links a student to a teacher's class; requires a connection the first time a code is used. */
  joinClass: (code: string) => Promise<JoinCode>;
  leaveClass: () => void;

  downloadChallenges: () => Promise<number>;
  waitForSync: () => Promise<void>;

  /** Students: sets the 4-digit PIN used to log in on a shared tablet (online). */
  setPin: (pin: string) => Promise<void>;
  /** Students: syncs, then signs out so a classmate can log in. Requires a PIN and a class. */
  switchStudent: () => Promise<void>;
  /** Shared-tablet login with class code + PIN (online). */
  loginWithPin: (joinCode: string, studentUid: string, pin: string) => Promise<void>;
  /** From the class login screen: create a brand-new student on this tablet. */
  startAsNewStudent: () => void;
  /** Permanently deletes this account and all its work (online). */
  deleteAccount: () => Promise<void>;
};

export type ProjectSeed = {
  origin: ProjectOrigin;
  problem: { statement: string; observation: string };
};

const AppContext = createContext<AppContextValue | null>(null);

const now = () => new Date().toISOString();

const DEFAULT_PROFILE: UserProfile = {
  role: null,
  ageTier: null,
  activeProjectId: null,
  school: null,
  displayName: null,
  lastInitial: null,
  teacherCode: null,
  schoolId: null,
};

const firstName = (name: string) => name.trim().split(/\s+/)[0]?.slice(0, 30) || null;

const DEFAULT_RESOURCE_LIST: Resource[] = DEFAULT_RESOURCES.map((name, i) => ({
  id: `default-${i}`,
  name,
  quantity: '',
}));

const generateJoinCode = () => String(Math.floor(100000 + Math.random() * 900000));

/** Returns a code not already taken on the server; offline it can't check, so the commit retry below covers it. */
async function pickFreeJoinCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateJoinCode();
    try {
      if (!(await getDocFromServer(refs.joinCode(code))).exists()) return code;
    } catch {
      return code;
    }
  }
  return generateJoinCode();
}

const MAX_CLASS_CREATE_ATTEMPTS = 3;

const PROJECT_WRITE_DEBOUNCE_MS = 500;

const SIGN_OUT_SYNC_TIMEOUT_MS = 15_000;

async function isOnline() {
  const net = await NetInfo.fetch();
  return !!net.isConnected && net.isInternetReachable !== false;
}

// Writes resolve only on server ack (never while offline), so they are not awaited; failures are logged.
const fireAndForget = (p: Promise<unknown>) => {
  p.catch((e) => console.warn('[firestore] write failed', e));
};

const createPortfolio = (
  id: string,
  ownerId: string,
  ageTier: AgeTier | null,
  link: SchoolLink | null,
  seed?: ProjectSeed,
): InnovationPortfolio => ({
  id,
  ownerId,
  teacherId: link?.teacherId ?? null,
  schoolId: link?.schoolId ?? null,
  owner: { ageTier },
  status: 'in-progress',
  createdAt: now(),
  updatedAt: now(),
  completedAt: null,
  currentStep: 'think-starter',
  thinkStarter: { challenge: null, response: '' },
  problem: { category: null, observation: seed?.problem.observation ?? '', statement: seed?.problem.statement ?? '' },
  research: { fiveWhys: ['', '', '', '', ''] },
  ideas: [],
  scamper: {},
  selectedIdea: null,
  hasMaterials: null,
  prototype: { level: 0, notes: {} },
  design: { format: null, content: '', attachments: [] },
  iterations: [],
  reflection: { discovered: '', surprised: '', didNotWork: '', wouldChange: '', tryNext: '' },
  finalSolution: null,
  origin: seed?.origin ?? null,
  substitutions: [],
  venture: null,
});

// Documents created before a field existed are filled with defaults on read.
const normalizePortfolio = (p: InnovationPortfolio): InnovationPortfolio => ({
  ...p,
  teacherId: p.teacherId ?? null,
  schoolId: p.schoolId ?? null,
  design: { ...p.design, attachments: p.design.attachments ?? [] },
  origin: p.origin ?? null,
  substitutions: p.substitutions ?? [],
  venture: p.venture ?? null,
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AppStatus>('connecting');
  const [setupProblem, setSetupProblem] = useState<SetupProblem>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [resources, setResources] = useState<Resource[]>(DEFAULT_RESOURCE_LIST);
  const [portfolio, setPortfolio] = useState<InnovationPortfolio[]>([]);
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>(BUNDLED_CHALLENGES);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [levelRequest, setLevelRequest] = useState<LevelRequest | null>(null);

  // Local, not-yet-flushed edits to the active project. Keeps typing responsive and
  // prevents in-flight snapshots from overwriting newer keystrokes.
  const [draft, setDraft] = useState<InnovationPortfolio | null>(null);
  const draftRef = useRef<InnovationPortfolio | null>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markPending = useCallback((key: string, value: boolean) => {
    setPending((p) => (p[key] === value ? p : { ...p, [key]: value }));
  }, []);

  const signIn = useCallback(async () => {
    setStatus('connecting');
    // First launch needs a connection once to create the anonymous account; afterwards auth is cached natively.
    if (!(await isOnline())) {
      setSetupProblem('offline');
      setStatus('needs-connection');
      return;
    }
    try {
      await signInAnonymously(getAuth());
      setSetupProblem(null);
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      setSetupProblem(code.includes('network') ? 'offline' : 'server');
      setStatus('needs-connection');
    }
  }, []);

  const authUid = useRef<string | null>(null);
  useEffect(
    () =>
      onAuthStateChanged(getAuth(), (user) => {
        const uid = user?.uid ?? null;
        if (authUid.current !== uid) {
          // A different person on this device: drop everything held for the previous one.
          authUid.current = uid;
          setProfileLoaded(false);
          setProfile(DEFAULT_PROFILE);
          setPortfolio([]);
          setClasses([]);
          setPending({});
          setLevelRequest(null);
          draftRef.current = null;
          setDraft(null);
          memberKey.current = '';
          memberClass.current = null;
        }
        setUserId(uid);
        if (user) return;
        if (readDevicePrefs().signedOut) setStatus('signed-out');
        else signIn();
      }),
    [signIn],
  );

  useEffect(() => {
    if (userId && profileLoaded) setStatus('ready');
  }, [userId, profileLoaded]);

  useEffect(() => {
    if (!userId) return;
    const opts: SnapshotListenOptions = { includeMetadataChanges: true };

    const unsubs = [
      onSnapshot(refs.user(userId), opts, (snap) => {
        setProfile({ ...DEFAULT_PROFILE, ...(snap.data() as Partial<UserProfile> | undefined) });
        markPending('user', snap.metadata.hasPendingWrites);
        setProfileLoaded(true);
      }),
      onSnapshot(query(refs.portfolios(), where('ownerId', '==', userId)), opts, (snap) => {
        const docs = snap.docs.map((d) => normalizePortfolio(d.data() as InnovationPortfolio));
        setPortfolio(docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
        markPending('portfolios', snap.metadata.hasPendingWrites);
      }),
      onSnapshot(query(refs.classes(), where('ownerId', '==', userId)), opts, (snap) => {
        setClasses(snap.docs.map((d) => d.data() as Classroom).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
        markPending('classes', snap.metadata.hasPendingWrites);
      }),
      onSnapshot(refs.challenges(), (snap) => {
        const docs = snap.docs.map((d) => ({ ...(d.data() as Omit<Challenge, 'id'>), id: d.id }));
        setChallenges(docs.length ? docs : BUNDLED_CHALLENGES);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [userId, markPending]);

  const bankOwner = profile.role === 'teacher' ? userId : (profile.school?.teacherId ?? null);

  useEffect(() => {
    if (!bankOwner) return setResources(DEFAULT_RESOURCE_LIST);
    return onSnapshot(
      refs.resourceBank(bankOwner),
      (snap) => setResources((snap.data() as ResourceBank | undefined)?.resources ?? DEFAULT_RESOURCE_LIST),
      () => setResources(DEFAULT_RESOURCE_LIST),
    );
  }, [bankOwner]);

  const remoteProject = portfolio.find((p) => p.id === profile.activeProjectId) ?? null;
  const project = draft && draft.id === profile.activeProjectId ? draft : remoteProject;

  const flushProject = useCallback(() => {
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = null;
    const d = draftRef.current;
    if (d) fireAndForget(setDoc(refs.portfolio(d.id), d));
  }, []);

  // Drop the local draft once the cache has caught up with it.
  useEffect(() => {
    if (draft && remoteProject && !flushTimer.current && remoteProject.updatedAt >= draft.updatedAt) {
      draftRef.current = null;
      setDraft(null);
    }
  }, [draft, remoteProject]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s !== 'active' && flushProject());
    return () => sub.remove();
  }, [flushProject]);

  const setLocalDraft = useCallback((p: InnovationPortfolio) => {
    draftRef.current = p;
    setDraft(p);
  }, []);

  const projectRef = useRef(project);
  projectRef.current = project;
  const portfolioRef = useRef(portfolio);
  portfolioRef.current = portfolio;

  const updateProfile = useCallback(
    (patch: Partial<UserProfile>) => {
      if (!userId) return;
      setProfile((p) => ({ ...p, ...patch }));
      fireAndForget(setDoc(refs.user(userId), patch, { merge: true }));
    },
    [userId],
  );

  const isStudent = profile.role === 'student';
  useEffect(() => {
    if (!userId || !isStudent) return setLevelRequest(null);
    return onSnapshot(
      refs.levelRequest(userId),
      (snap) => setLevelRequest((snap.data() as LevelRequest | undefined) ?? null),
      () => setLevelRequest(null),
    );
  }, [userId, isStudent]);

  // Rules only allow a tier change while an approved request exists, so apply it before deleting the request.
  useEffect(() => {
    if (!userId || levelRequest?.status !== 'approved') return;
    if (profile.ageTier !== levelRequest.to) updateProfile({ ageTier: levelRequest.to });
    fireAndForget(deleteDoc(refs.levelRequest(userId)));
  }, [userId, levelRequest, profile.ageTier, updateProfile]);

  const profileRef = useRef(profile);
  profileRef.current = profile;

  /** Links (or unlinks) the student to a class and shares all their portfolios with that teacher and school. */
  const linkToClass = useCallback(
    (link: SchoolLink | null) => {
      if (!userId) return;
      const prev = profileRef.current.school;
      const access = { teacherId: link?.teacherId ?? null, schoolId: link?.schoolId ?? null };
      const batch = writeBatch(db());
      if (prev && prev.classId !== link?.classId) batch.delete(refs.member(prev.classId, userId));
      portfolioRef.current.forEach((p) => batch.update(refs.portfolio(p.id), access));
      batch.set(refs.user(userId), { school: link }, { merge: true });
      fireAndForget(batch.commit());
      setProfile((p) => ({ ...p, school: link }));
      setPortfolio((list) => list.map((p) => ({ ...p, ...access })));
      if (draftRef.current) setLocalDraft({ ...draftRef.current, ...access });
    },
    [userId, setLocalDraft],
  );

  // A school admin moved this student: follow the assignment, then clear it.
  useEffect(() => {
    if (!userId || !isStudent) return;
    return onSnapshot(
      refs.assignment(userId),
      (snap) => {
        const a = snap.data() as Assignment | undefined;
        if (!a) return;
        const cur = profileRef.current.school;
        const current = cur?.classId ?? null;
        // A class transfer keeps the class but changes its teacher.
        if (a.to && (current !== a.to.classId || cur?.teacherId !== a.to.teacherId)) linkToClass(a.to);
        else if (!a.to && current && current === a.fromClassId) linkToClass(null);
        fireAndForget(deleteDoc(refs.assignment(userId)));
      },
      () => {},
    );
  }, [userId, isStudent, linkToClass]);

  // Portfolios created before the student joined (or before this field existed) get shared with the current class.
  useEffect(() => {
    const link = profile.school;
    if (!userId || !isStudent || !link) return;
    const stale = portfolio.filter((p) => p.teacherId !== link.teacherId || p.schoolId !== (link.schoolId ?? null));
    if (!stale.length) return;
    const batch = writeBatch(db());
    stale.forEach((p) => batch.update(refs.portfolio(p.id), { teacherId: link.teacherId, schoolId: link.schoolId ?? null }));
    fireAndForget(batch.commit());
  }, [userId, isStudent, profile.school, portfolio]);

  // Keep this student's row in the class roster current so teachers see progress.
  const memberKey = useRef('');
  const memberClass = useRef<string | null>(null);
  useEffect(() => {
    const link = profile.school;
    if (!userId || !isStudent || !link || !profile.displayName) return;
    const active = project?.status === 'in-progress' ? project : null;
    const summary: Omit<ClassMember, 'joinedAt' | 'lastActive'> = {
      uid: userId,
      name: profile.displayName,
      lastInitial: profile.lastInitial,
      schoolId: link.schoolId,
      tier: profile.ageTier,
      currentProject: active ? active.problem.statement || 'New project' : null,
      currentStep: active ? STEP_TITLES[active.currentStep] : null,
      completed: portfolio.filter((p) => p.status === 'completed').length,
      badges: earnedBadges({ portfolios: portfolio, profile, approvedShowcase: 0 }).length,
      hasPin: !!profile.hasPin,
    };
    const key = `${link.classId}|${JSON.stringify(summary)}`;
    if (key === memberKey.current) return;
    memberKey.current = key;
    const firstWrite = memberClass.current !== link.classId;
    memberClass.current = link.classId;
    fireAndForget(
      setDoc(
        refs.member(link.classId, userId),
        { ...summary, lastActive: now(), ...(firstWrite ? { joinedAt: now() } : {}) },
        { merge: true },
      ),
    );
  }, [userId, isStudent, profile, project, portfolio]);

  const value = useMemo<AppContextValue>(
    () => ({
      status,
      setupProblem,
      uid: userId,
      profile,
      resources,
      project,
      portfolio,
      classes,
      challenges,
      hasPendingWrites: Object.values(pending).some(Boolean) || !!draft,

      retrySignIn: () => void signIn(),
      registerStudent: (name, lastInitial) =>
        updateProfile({
          role: 'student',
          displayName: firstName(name),
          lastInitial: lastInitial.trim().charAt(0).toUpperCase() || null,
        }),

      registerTeacher: async (name, raw) => {
        if (!userId) throw new Error('Not signed in yet. Please try again.');
        const code = raw.trim().toUpperCase();
        if (!code) throw new Error('Enter the access code from your school administrator.');
        const snap = await getDocFromServer(refs.teacherCode(code)).catch(() => {
          throw new Error('Connect to the internet to verify your access code.');
        });
        const tc = snap.data() as TeacherCode | undefined;
        if (!snap.exists() || !tc?.active) {
          throw new Error('That access code is not valid. Check it with your school administrator.');
        }
        const role = tc.role ?? 'teacher';
        const schoolId = tc.schoolId ?? null;
        const displayName = firstName(name);
        updateProfile({ role, displayName, teacherCode: code, schoolId, ageTier: null, school: null });
        if (schoolId) {
          const staff: StaffMember = { uid: userId, name: displayName ?? 'Teacher', role, joinedAt: now() };
          fireAndForget(setDoc(refs.staffMember(schoolId, userId), staff));
        }
        return role;
      },

      setAgeTier: (ageTier) => {
        if (!profile.ageTier) updateProfile({ ageTier });
      },

      requestLevelChange: async (to) => {
        if (!userId) return;
        if (!profile.school) throw new Error('Join your class first so your teacher can approve the change.');
        const req: LevelRequest = {
          uid: userId,
          teacherId: profile.school.teacherId,
          studentName: `${profile.displayName ?? 'A student'}${profile.lastInitial ? ` ${profile.lastInitial}.` : ''}`,
          className: profile.school.className,
          from: profile.ageTier,
          to,
          status: 'pending',
          createdAt: now(),
          reviewedAt: null,
        };
        // A rejected/old request must be removed first: rules only let students create, not edit, requests.
        if (levelRequest) fireAndForget(deleteDoc(refs.levelRequest(userId)));
        setLevelRequest(req);
        fireAndForget(setDoc(refs.levelRequest(userId), req));
      },

      levelRequest,
      setDisplayName: (name) => updateProfile({ displayName: firstName(name) }),

      startProject: (seed) => {
        if (!userId) return;
        flushProject();
        const p = createPortfolio(newId(), userId, profile.ageTier, profile.school, seed);
        setLocalDraft(p);
        fireAndForget(setDoc(refs.portfolio(p.id), p));
        updateProfile({ activeProjectId: p.id });
      },

      updatePortfolio: (id, patch) => {
        const active = draftRef.current ?? projectRef.current;
        if (active?.id === id) {
          setLocalDraft({ ...active, ...patch, updatedAt: now() });
          if (flushTimer.current) clearTimeout(flushTimer.current);
          flushTimer.current = setTimeout(flushProject, PROJECT_WRITE_DEBOUNCE_MS);
          return;
        }
        fireAndForget(updateDoc(refs.portfolio(id), { ...patch, updatedAt: now() }));
      },

      deleteProject: (id) => {
        const target = (draftRef.current?.id === id ? draftRef.current : null) ?? portfolioRef.current.find((p) => p.id === id);
        target?.design.attachments.forEach(deleteAttachmentFiles);
        if (profile.activeProjectId === id) {
          if (flushTimer.current) clearTimeout(flushTimer.current);
          flushTimer.current = null;
          draftRef.current = null;
          setDraft(null);
          updateProfile({ activeProjectId: null });
        }
        setPortfolio((list) => list.filter((p) => p.id !== id));
        // Its Showcase entry (if any) would otherwise outlive the project; a missing doc deletes as a no-op.
        fireAndForget(deleteDoc(refs.galleryItem(id)));
        fireAndForget(deleteDoc(refs.portfolio(id)));
      },

      updateProject: (patch) => {
        const base = draftRef.current ?? projectRef.current;
        if (!base) return;
        setLocalDraft({ ...base, ...patch, updatedAt: now() });
        if (flushTimer.current) clearTimeout(flushTimer.current);
        flushTimer.current = setTimeout(flushProject, PROJECT_WRITE_DEBOUNCE_MS);
      },

      completeProject: () => {
        const base = draftRef.current ?? projectRef.current;
        if (!base) return;
        const last = base.iterations[base.iterations.length - 1];
        setLocalDraft({
          ...base,
          status: 'completed',
          completedAt: now(),
          updatedAt: now(),
          finalSolution: { idea: base.selectedIdea?.text ?? '', improvements: last?.learnings ?? '' },
        });
        flushProject();
      },

      markAttachmentUploaded: (projectId, attachmentId, remoteUrl) => {
        const withUrl = (p: InnovationPortfolio) =>
          p.design.attachments.map((a) => (a.id === attachmentId ? { ...a, remoteUrl } : a));

        const active = draftRef.current ?? projectRef.current;
        if (active?.id === projectId) {
          setLocalDraft({ ...active, design: { ...active.design, attachments: withUrl(active) }, updatedAt: now() });
          if (flushTimer.current) clearTimeout(flushTimer.current);
          flushTimer.current = setTimeout(flushProject, PROJECT_WRITE_DEBOUNCE_MS);
          return;
        }
        const other = portfolioRef.current.find((p) => p.id === projectId);
        if (other) {
          fireAndForget(
            updateDoc(refs.portfolio(projectId), { 'design.attachments': withUrl(other), updatedAt: now() }),
          );
        }
      },

      addClass: (name) => {
        if (!userId) return;
        const ref = doc(refs.classes());
        const createdAt = now();

        // Rules reject reusing a taken code, which fails the whole batch; retry with a fresh code.
        const attempt = async (n: number): Promise<void> => {
          const joinCode = await pickFreeJoinCode();
          const c: Classroom = {
            id: ref.id,
            ownerId: userId,
            teacherName: profile.displayName ?? undefined,
            schoolId: profile.schoolId,
            name,
            joinCode,
            groups: [],
            createdAt,
          };
          const code: JoinCode = {
            code: joinCode,
            classId: ref.id,
            className: name,
            teacherId: userId,
            schoolId: profile.schoolId,
            createdAt,
          };
          // Batched so a class never exists without its join code (works offline too).
          const batch = writeBatch(db());
          batch.set(ref, c);
          batch.set(refs.joinCode(joinCode), code);
          try {
            await batch.commit();
          } catch (e) {
            const denied = String((e as { code?: string }).code ?? '').includes('permission-denied');
            if (denied && n + 1 < MAX_CLASS_CREATE_ATTEMPTS) return attempt(n + 1);
            throw e;
          }
        };
        fireAndForget(attempt(0));
      },

      addGroup: (classId, name) =>
        fireAndForget(updateDoc(refs.classroom(classId), { groups: arrayUnion({ id: newId(), name }) })),

      addGroupOutput: (classId, output) => {
        const ref = doc(refs.outputs(classId));
        fireAndForget(setDoc(ref, { ...output, id: ref.id, createdAt: now() }));
      },

      addResource: (name, quantity) => {
        if (!userId) return;
        const next = [...resources, { id: newId(), name, quantity }];
        setResources(next);
        const bank: ResourceBank = { ownerId: userId, resources: next, updatedAt: now() };
        fireAndForget(setDoc(refs.resourceBank(userId), bank));
      },

      removeResource: (id) => {
        if (!userId) return;
        const next = resources.filter((r) => r.id !== id);
        setResources(next);
        const bank: ResourceBank = { ownerId: userId, resources: next, updatedAt: now() };
        fireAndForget(setDoc(refs.resourceBank(userId), bank));
      },

      joinClass: async (raw) => {
        const code = raw.replace(/\D/g, '');
        if (code.length !== 6) throw new Error('Class codes have 6 digits.');
        const snap = await getDoc(refs.joinCode(code));
        if (!snap.exists()) {
          throw new Error('That code was not found. Check it with your teacher, and make sure you are online.');
        }
        const jc = snap.data() as JoinCode;
        linkToClass({
          code: jc.code,
          classId: jc.classId,
          className: jc.className,
          teacherId: jc.teacherId,
          schoolId: jc.schoolId ?? null,
        });
        return jc;
      },

      leaveClass: () => linkToClass(null),

      downloadChallenges: async () => (await getDocsFromServer(refs.challenges())).size,

      waitForSync: async () => {
        flushProject();
        await waitForPendingWrites(db());
      },

      setPin: async (pin) => {
        if (!/^\d{4}$/.test(pin)) throw new Error('Choose 4 numbers.');
        await fn.setStudentPin(pin);
        setProfile((p) => ({ ...p, hasPin: true }));
      },

      switchStudent: async () => {
        if (!profile.hasPin || !profile.school) {
          throw new Error('Join your class and set a PIN first, so you can log back in later.');
        }
        if (!(await isOnline())) throw new Error('Connect to the internet so your work is saved before you log out.');
        flushProject();
        // Unsynced writes would be sent with the next student's sign-in and rejected, so wait for them.
        const synced = await Promise.race([
          waitForPendingWrites(db()).then(() => true),
          new Promise<boolean>((r) => setTimeout(() => r(false), SIGN_OUT_SYNC_TIMEOUT_MS)),
        ]);
        if (!synced) throw new Error('Your work is still saving. Check the internet and try again.');
        writeDevicePrefs({ signedOut: true, lastClassCode: profile.school.code });
        setStatus('connecting');
        await signOut(getAuth());
      },

      loginWithPin: async (joinCode, studentUid, pin) => {
        const { token } = await fn.classLogin(joinCode, studentUid, pin);
        writeDevicePrefs({ signedOut: false, lastClassCode: joinCode });
        setStatus('connecting');
        try {
          await signInWithCustomToken(getAuth(), token);
        } catch (e) {
          writeDevicePrefs({ signedOut: true });
          setStatus('signed-out');
          throw e;
        }
      },

      startAsNewStudent: () => {
        writeDevicePrefs({ signedOut: false });
        void signIn();
      },

      deleteAccount: async () => {
        if (!(await isOnline())) throw new Error('Connect to the internet to delete your account.');
        if (flushTimer.current) clearTimeout(flushTimer.current);
        flushTimer.current = null;
        draftRef.current = null;
        portfolioRef.current.forEach((p) => p.design.attachments.forEach(deleteAttachmentFiles));
        await fn.deleteMyAccount();
        writeDevicePrefs({ signedOut: false });
        setStatus('connecting');
        await signOut(getAuth()).catch(() => undefined);
      },
    }),
    [
      status,
      setupProblem,
      userId,
      profile,
      resources,
      project,
      portfolio,
      classes,
      challenges,
      pending,
      draft,
      levelRequest,
      signIn,
      updateProfile,
      linkToClass,
      flushProject,
      setLocalDraft,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export function useGroupOutputs(classId: string | undefined) {
  const [outputs, setOutputs] = useState<GroupOutput[]>([]);
  useEffect(() => {
    if (!classId) return setOutputs([]);
    return onSnapshot(refs.outputs(classId), (snap) =>
      setOutputs(
        snap.docs.map((d) => d.data() as GroupOutput).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      ),
    );
  }, [classId]);
  return outputs;
}
