import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useId, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import { useAccent } from './ui';

// Recognition events are global; only the button that started listening may consume them.
let activeOwner: string | null = null;

const ERROR_TEXT: Record<string, string> = {
  network: 'Voice typing needs internet on this phone. Try the microphone on your keyboard instead.',
  'not-allowed': 'Allow microphone access in Settings to talk instead of typing.',
  'service-not-allowed': 'Voice recognition is not available on this phone. Try the keyboard microphone.',
  'language-not-supported': 'This language is not available for voice typing on this phone.',
};

type Props = {
  /** Called with the final transcript. */
  onText: (text: string) => void;
  size?: 'regular' | 'large';
  label?: string;
};

export function VoiceInputButton({ onText, size = 'regular', label }: Props) {
  const id = useId();
  const { accent, soft } = useAccent();
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');
  const onTextRef = useRef(onText);
  onTextRef.current = onText;
  const mine = () => activeOwner === id;

  useSpeechRecognitionEvent('start', () => mine() && setListening(true));
  useSpeechRecognitionEvent('end', () => {
    if (!mine()) return;
    activeOwner = null;
    setListening(false);
    setPartial('');
  });
  useSpeechRecognitionEvent('result', (e) => {
    if (!mine()) return;
    const transcript = e.results[0]?.transcript ?? '';
    if (e.isFinal) {
      if (transcript.trim()) onTextRef.current(transcript.trim());
      setPartial('');
    } else setPartial(transcript);
  });
  useSpeechRecognitionEvent('error', (e) => {
    if (!mine() || e.error === 'aborted' || e.error === 'no-speech') return;
    Alert.alert('Voice typing', ERROR_TEXT[e.error] ?? 'Could not hear that. Please try again.');
  });

  const toggle = async () => {
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      Alert.alert('Voice typing', ERROR_TEXT['service-not-allowed']);
      return;
    }
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Voice typing', ERROR_TEXT['not-allowed']);
      return;
    }
    const net = await NetInfo.fetch();
    const offline = !net.isConnected || net.isInternetReachable === false;
    if (activeOwner) ExpoSpeechRecognitionModule.abort();
    activeOwner = id;
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: false,
      // Prefer on-device recognition so it keeps working in classrooms without internet.
      requiresOnDeviceRecognition: offline && ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(),
      androidIntentOptions: { EXTRA_MASK_OFFENSIVE_WORDS: true },
    });
  };

  const large = size === 'large';
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? 'Stop voice typing' : 'Speak your answer'}
        onPress={toggle}
        style={({ pressed }) => [
          large ? styles.large : styles.regular,
          { backgroundColor: listening ? colors.danger : large ? accent : soft },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Ionicons
          name={listening ? 'stop' : 'mic'}
          size={large ? 28 : 18}
          color={listening || large ? '#fff' : accent}
        />
        {label && !large ? <Text style={[styles.label, { color: listening ? '#fff' : accent }]}>{listening ? 'Listening… tap to stop' : label}</Text> : null}
      </Pressable>
      {partial ? <Text style={styles.partial}>“{partial}”</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  regular: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  large: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  label: { fontWeight: '700', fontSize: 13 },
  partial: { color: colors.muted, fontStyle: 'italic', marginTop: 4, borderRadius: radius.sm },
});
