import { useEffect, useMemo, useState } from 'react';
import { deleteDoc, limit, onSnapshot, query, setDoc, updateDoc, where } from '@react-native-firebase/firestore';

import { useApp } from '../context/AppContext';
import { newId, refs } from '../lib/firebase';
import type { CommunityProblem, GalleryItem, GalleryStatus, InnovationPortfolio, LevelRequest, ReactionKey } from '../types';

const now = () => new Date().toISOString();
const warn = (p: Promise<unknown>) => p.catch((e) => console.warn('[showcase]', e));

export const REACTIONS: { key: ReactionKey; label: string; icon: string }[] = [
  { key: 'great-idea', label: 'Great idea', icon: 'bulb' },
  { key: 'love-prototype', label: 'Love the prototype', icon: 'hammer' },
  { key: 'brave-testing', label: 'Brave testing', icon: 'flask' },
  { key: 'want-to-try', label: 'I want to try this', icon: 'rocket' },
];

/** Global curated problems plus those posted by the student's (or this teacher's) school. */
export function useCommunityProblems() {
  const { uid, profile } = useApp();
  const schoolTeacher = profile.role === 'teacher' ? uid : (profile.school?.teacherId ?? null);
  const [global, setGlobal] = useState<CommunityProblem[]>([]);
  const [school, setSchool] = useState<CommunityProblem[]>([]);

  useEffect(
    () =>
      onSnapshot(
        query(refs.communityProblems(), limit(50)),
        (s) => setGlobal(s.docs.map((d) => ({ ...(d.data() as CommunityProblem), id: d.id, scope: 'global' }))),
        () => setGlobal([]),
      ),
    [],
  );

  useEffect(() => {
    if (!schoolTeacher) return setSchool([]);
    return onSnapshot(
      refs.schoolProblems(schoolTeacher),
      (s) => setSchool(s.docs.map((d) => ({ ...(d.data() as CommunityProblem), id: d.id }))),
      () => setSchool([]),
    );
  }, [schoolTeacher]);

  return useMemo(
    () => [...school, ...global].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [school, global],
  );
}

export function postSchoolProblem(teacherId: string, input: Pick<CommunityProblem, 'title' | 'description' | 'location' | 'postedBy'>) {
  const id = newId();
  const p: CommunityProblem = { ...input, id, scope: 'school', teacherId, createdAt: now() };
  warn(setDoc(refs.schoolProblem(teacherId, id), p));
}

export const deleteSchoolProblem = (teacherId: string, id: string) => warn(deleteDoc(refs.schoolProblem(teacherId, id)));

/** Approved items for everyone. */
export function useApprovedGallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  useEffect(
    () =>
      onSnapshot(
        query(refs.galleryItems(), where('status', '==', 'approved'), limit(50)),
        (s) =>
          setItems(
            s.docs
              .map((d) => d.data() as GalleryItem)
              .sort((a, b) => (b.reviewedAt ?? '').localeCompare(a.reviewedAt ?? '')),
          ),
        () => setItems([]),
      ),
    [],
  );
  return items;
}

/** A student's own submissions, keyed by portfolio id. */
export function useMyGallery() {
  const { uid } = useApp();
  const [items, setItems] = useState<Record<string, GalleryItem>>({});
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(refs.galleryItems(), where('ownerId', '==', uid)),
      (s) => setItems(Object.fromEntries(s.docs.map((d) => [d.id, d.data() as GalleryItem]))),
      () => setItems({}),
    );
  }, [uid]);
  return items;
}

/** Items awaiting this teacher's review. */
export function useReviewQueue() {
  const { uid } = useApp();
  const [items, setItems] = useState<GalleryItem[]>([]);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(refs.galleryItems(), where('teacherId', '==', uid)),
      (s) => setItems(s.docs.map((d) => d.data() as GalleryItem).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
      () => setItems([]),
    );
  }, [uid]);
  return items;
}

/** Copies only summary text and counts: no photos, reflections or full test logs are made public. */
export function submitToGallery(p: InnovationPortfolio, authorName: string, school: { teacherId: string; className: string }) {
  const item: GalleryItem = {
    id: p.id,
    ownerId: p.ownerId,
    teacherId: school.teacherId,
    authorName,
    className: school.className,
    status: 'pending',
    createdAt: now(),
    reviewedAt: null,
    snapshot: {
      title: p.problem.statement,
      observation: p.problem.observation,
      selectedIdea: p.selectedIdea?.text ?? '',
      ideasCount: p.ideas.length,
      scamperCount: Object.values(p.scamper).filter((v) => v?.trim()).length,
      hasMaterials: p.hasMaterials,
      prototypeLevel: p.prototype.level,
      designFormat: p.design.format,
      iterationsCount: p.iterations.length,
      finalSolution: p.finalSolution?.idea ?? p.selectedIdea?.text ?? '',
      tier: p.owner.ageTier,
    },
  };
  warn(setDoc(refs.galleryItem(p.id), item));
}

export const withdrawFromGallery = (id: string) => warn(deleteDoc(refs.galleryItem(id)));

/** Pending tier-change requests from this teacher's students. */
export function useLevelRequestQueue() {
  const { uid } = useApp();
  const [items, setItems] = useState<LevelRequest[]>([]);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(refs.levelRequests(), where('teacherId', '==', uid)),
      (s) => setItems(s.docs.map((d) => d.data() as LevelRequest).filter((r) => r.status === 'pending')),
      () => setItems([]),
    );
  }, [uid]);
  return items;
}

export const reviewLevelRequest = (studentUid: string, status: 'approved' | 'rejected') =>
  warn(updateDoc(refs.levelRequest(studentUid), { status, reviewedAt: now() }));

export const reviewGalleryItem = (id: string, status: Exclude<GalleryStatus, 'pending'>) =>
  warn(updateDoc(refs.galleryItem(id), { status, reviewedAt: now() }));

export function useReactions(itemId: string) {
  const { uid } = useApp();
  const [counts, setCounts] = useState<Partial<Record<ReactionKey, number>>>({});
  const [mine, setMine] = useState<ReactionKey | null>(null);
  useEffect(
    () =>
      onSnapshot(
        refs.reactions(itemId),
        (s) => {
          const c: Partial<Record<ReactionKey, number>> = {};
          let m: ReactionKey | null = null;
          s.docs.forEach((d) => {
            const r = d.data().reaction as ReactionKey;
            c[r] = (c[r] ?? 0) + 1;
            if (d.id === uid) m = r;
          });
          setCounts(c);
          setMine(m);
        },
        () => {},
      ),
    [itemId, uid],
  );
  const react = (reaction: ReactionKey) => {
    if (!uid) return;
    if (mine === reaction) warn(deleteDoc(refs.reaction(itemId, uid)));
    else warn(setDoc(refs.reaction(itemId, uid), { reaction, createdAt: now() }));
  };
  return { counts, mine, react };
}
