import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import { useApp } from '../context/AppContext';
import {
  attachmentSource,
  CLOUD_PHOTOS_ENABLED,
  MAX_ATTACHMENTS,
  saveLocalCopy,
  storagePathFor,
} from '../lib/attachments';
import { newId } from '../lib/firebase';
import type { DesignAttachment } from '../types';
import { Button, Label, Row } from './ui';

type Props = {
  projectId: string;
  attachments: DesignAttachment[];
  onAdd: (a: DesignAttachment) => void;
  onRemove: (a: DesignAttachment) => void;
};

export function DesignPhotos({ projectId, attachments, onAdd, onRemove }: Props) {
  const { uid } = useApp();
  const full = attachments.length >= MAX_ATTACHMENTS;

  const add = async (source: 'camera' | 'library') => {
    if (!uid) return;
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', `Allow ${source === 'camera' ? 'camera' : 'photo'} access in Settings to add pictures.`);
      return;
    }

    // Moderate quality keeps uploads small on slow school connections.
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return;

    const asset = result.assets[0];
    const id = newId();
    try {
      onAdd({
        id,
        localUri: saveLocalCopy(asset.uri, projectId, id),
        storagePath: storagePathFor(uid, projectId, id),
        remoteUrl: null,
        width: asset.width,
        height: asset.height,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      Alert.alert('Could not save photo', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  const confirmRemove = (a: DesignAttachment) =>
    Alert.alert('Remove photo?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onRemove(a) },
    ]);

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Label>
        Photos of your drawings ({attachments.length}/{MAX_ATTACHMENTS})
      </Label>
      <Text style={styles.hint}>Snap your paper sketches, storyboards or diagrams.</Text>

      <View style={styles.grid}>
        {attachments.map((a) => {
          const src = attachmentSource(a);
          return (
            <Pressable key={a.id} onLongPress={() => confirmRemove(a)} style={styles.thumbWrap}>
              {src ? (
                <Image source={{ uri: src }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.missing]}>
                  <Text style={styles.hint}>Not on this device</Text>
                </View>
              )}
              {CLOUD_PHOTOS_ENABLED ? (
                <Text style={[styles.status, { color: a.remoteUrl ? colors.primary : colors.accent }]}>
                  {a.remoteUrl ? 'Saved to cloud' : 'Waiting to upload'}
                </Text>
              ) : (
                <Text style={[styles.status, { color: colors.muted }]}>Saved on this device</Text>
              )}
              <Pressable onPress={() => confirmRemove(a)} hitSlop={8} style={styles.remove}>
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            </Pressable>
          );
        })}
      </View>

      <Row style={{ flexWrap: 'nowrap' }}>
        <Button title="Take photo" variant="secondary" disabled={full} onPress={() => add('camera')} style={{ flex: 1 }} />
        <Button title="From gallery" variant="secondary" disabled={full} onPress={() => add('library')} style={{ flex: 1 }} />
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.muted, fontSize: 13, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  thumbWrap: { width: '31%' },
  thumb: { width: '100%', aspectRatio: 1, borderRadius: radius.sm, backgroundColor: colors.border },
  missing: { alignItems: 'center', justifyContent: 'center', padding: 4 },
  status: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#fff', fontSize: 16, lineHeight: 18, fontWeight: '700' },
});
