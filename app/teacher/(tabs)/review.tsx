import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button, Card, Field, Row, Screen, Subtitle, Title } from '../../../src/components/ui';
import { colors, radius, spacing } from '../../../src/constants/theme';
import { useApp } from '../../../src/context/AppContext';
import {
  deleteSchoolProblem,
  postSchoolProblem,
  reviewGalleryItem,
  reviewLevelRequest,
  useCommunityProblems,
  useLevelRequestQueue,
  useReviewQueue,
} from '../../../src/hooks/useShowcase';
import { AGE_TIERS } from '../../../src/constants/content';
import type { GalleryItem } from '../../../src/types';

function ReviewCard({ item }: { item: GalleryItem }) {
  const s = item.snapshot;
  return (
    <Card>
      <Text style={styles.status(item.status)}>{item.status.toUpperCase()}</Text>
      <Text style={styles.title}>{s.title || 'Untitled'}</Text>
      <Text style={styles.meta}>
        {item.authorName} · {item.className} · {s.tier ?? '—'}
      </Text>
      <Text style={styles.body}>Observed: {s.observation || '—'}</Text>
      <Text style={styles.body}>Solution: {s.finalSolution || s.selectedIdea || '—'}</Text>
      <Text style={styles.meta}>
        {s.ideasCount} ideas · {s.scamperCount} SCAMPER · {s.iterationsCount} test(s)
      </Text>
      <Text style={styles.check}>Check there are no full names, faces or private details before approving.</Text>
      <Row style={{ flexWrap: 'nowrap', marginTop: spacing.sm }}>
        {item.status !== 'approved' && (
          <Button title="Approve" onPress={() => reviewGalleryItem(item.id, 'approved')} style={{ flex: 1 }} />
        )}
        {item.status !== 'rejected' && (
          <Button
            title={item.status === 'approved' ? 'Unpublish' : 'Reject'}
            variant="ghost"
            onPress={() => reviewGalleryItem(item.id, 'rejected')}
            style={{ flex: 1 }}
          />
        )}
      </Row>
    </Card>
  );
}

export default function ShowcaseReviewScreen() {
  const { uid } = useApp();
  const queue = useReviewQueue();
  const levelRequests = useLevelRequestQueue();
  const tierLabel = (t: string | null) => AGE_TIERS.find((x) => x.id === t)?.label ?? '—';
  const problems = useCommunityProblems().filter((p) => p.scope === 'school');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [postedBy, setPostedBy] = useState('');

  const pending = queue.filter((i) => i.status === 'pending');
  const reviewed = queue.filter((i) => i.status !== 'pending');

  const post = () => {
    if (!uid) return;
    postSchoolProblem(uid, {
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      postedBy: postedBy.trim() || 'Community member',
    });
    setTitle('');
    setDescription('');
    setLocation('');
    setPostedBy('');
  };

  return (
    <Screen tabScreen>
      <Title>Showcase review</Title>
      <Subtitle>Nothing your students submit is public until you approve it.</Subtitle>

      {levelRequests.length > 0 && (
        <>
          <Text style={styles.section}>Level change requests ({levelRequests.length})</Text>
          {levelRequests.map((r) => (
            <Card key={r.uid}>
              <Text style={styles.title}>{r.studentName}</Text>
              <Text style={styles.meta}>
                {r.className} · {tierLabel(r.from)} → {tierLabel(r.to)}
              </Text>
              <Row style={{ flexWrap: 'nowrap', marginTop: spacing.sm }}>
                <Button title="Approve" onPress={() => reviewLevelRequest(r.uid, 'approved')} style={{ flex: 1 }} />
                <Button title="Decline" variant="ghost" onPress={() => reviewLevelRequest(r.uid, 'rejected')} style={{ flex: 1 }} />
              </Row>
            </Card>
          ))}
        </>
      )}

      <Text style={styles.section}>Waiting for approval ({pending.length})</Text>
      {pending.length ? pending.map((i) => <ReviewCard key={i.id} item={i} />) : <Text style={styles.empty}>No submissions waiting.</Text>}

      <Text style={styles.section}>Post a community problem</Text>
      <Card>
        <Subtitle>Share a real challenge from a farmer, shop owner or the school. Your students can adopt it.</Subtitle>
        <Field label="Problem title" value={title} onChangeText={setTitle} maxLength={120} placeholder="e.g. Grain loss during storage" />
        <Field label="Details" value={description} onChangeText={setDescription} maxLength={600} multiline />
        <Field label="Location" value={location} onChangeText={setLocation} maxLength={80} placeholder="e.g. Lapai market" />
        <Field label="Shared by" value={postedBy} onChangeText={setPostedBy} maxLength={60} placeholder="e.g. Local farmers' group" />
        <Button title="Post to my students" disabled={!title.trim() || !description.trim()} onPress={post} />
      </Card>

      {problems.map((p) => (
        <Card key={p.id}>
          <Text style={styles.title}>{p.title}</Text>
          <Text style={styles.meta}>
            {p.location || '—'} · {p.postedBy}
          </Text>
          <Button
            title="Remove"
            variant="ghost"
            onPress={() =>
              Alert.alert('Remove problem?', p.title, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => uid && deleteSchoolProblem(uid, p.id) },
              ])
            }
          />
        </Card>
      ))}

      {reviewed.length > 0 && <Text style={styles.section}>Reviewed</Text>}
      {reviewed.map((i) => (
        <ReviewCard key={i.id} item={i} />
      ))}
    </Screen>
  );
}

const STATUS_COLOR = { pending: colors.accent, approved: colors.primary, rejected: colors.danger } as const;

const styles = {
  ...StyleSheet.create({
    section: { fontSize: 13, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginVertical: spacing.sm },
    title: { fontSize: 17, fontWeight: '700', color: colors.text },
    meta: { color: colors.muted, fontSize: 13, marginVertical: 2 },
    body: { color: colors.text, marginTop: 4 },
    check: { backgroundColor: '#FEF3C7', color: '#92400E', fontSize: 12, padding: spacing.sm, borderRadius: radius.sm, marginTop: spacing.sm },
    empty: { color: colors.muted, marginBottom: spacing.md },
  }),
  status: (s: GalleryItem['status']) => ({ color: STATUS_COLOR[s], fontSize: 11, fontWeight: '800' as const, letterSpacing: 0.6 }),
};
