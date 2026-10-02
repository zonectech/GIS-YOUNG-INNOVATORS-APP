import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VoiceInputButton } from '../components/VoiceInputButton';
import { AccentProvider } from '../components/ui';
import type { EngineStep } from '../constants/engine';
import { colors, radius, spacing } from '../constants/theme';
import { useTierTheme } from '../hooks/useTierTheme';
import { askMentor, mentorActions, mentorGreeting, type MentorContextInfo } from '../lib/mentor';
import { useApp } from './AppContext';

type MentorApi = { openMentor: (step?: EngineStep | null) => void };

const MentorContext = createContext<MentorApi>({ openMentor: () => {} });

export const useMentor = () => useContext(MentorContext);

type Message = { id: number; from: 'mentor' | 'me'; text: string; offline?: boolean };

export function MentorProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<EngineStep | null>(null);

  const openMentor = useCallback((s?: EngineStep | null) => {
    setStep(s ?? null);
    setVisible(true);
  }, []);

  const api = useMemo(() => ({ openMentor }), [openMentor]);

  return (
    <MentorContext.Provider value={api}>
      {children}
      {visible && <MentorSheet step={step} onClose={() => setVisible(false)} />}
    </MentorContext.Provider>
  );
}

function MentorSheet({ step, onClose }: { step: EngineStep | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const theme = useTierTheme();
  const { project, profile, resources } = useApp();
  const [online, setOnline] = useState<boolean | null>(null);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const ctx: MentorContextInfo = useMemo(
    () => ({ step, project: step ? project : project?.status === 'in-progress' ? project : null, tier: profile.ageTier, resources }),
    [step, project, profile.ageTier, resources],
  );
  const [messages, setMessages] = useState<Message[]>(() => [{ id: 0, from: 'mentor', text: mentorGreeting(ctx) }]);
  const nextId = useRef(1);
  const explorer = profile.ageTier === 'explorer';

  useEffect(
    () => NetInfo.addEventListener((s) => setOnline(!!s.isConnected && s.isInternetReachable !== false)),
    [],
  );

  const send = async (payload: { actionId?: string; text?: string }, shown: string) => {
    // Greeting excluded: history must start with a user turn.
    const history = messages.slice(1).map((m) => ({ role: m.from === 'me' ? ('user' as const) : ('model' as const), text: m.text }));
    setMessages((m) => [...m, { id: nextId.current++, from: 'me', text: shown }]);
    setThinking(true);
    const reply = await askMentor(payload, ctx, history, !!online);
    setThinking(false);
    setMessages((m) => [
      ...m,
      { id: nextId.current++, from: 'mentor', text: reply.text, offline: reply.source === 'offline' },
    ]);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const submit = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    send({ text }, text);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <AccentProvider value={theme}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close mentor" />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={[styles.badge, { backgroundColor: theme.soft }]}>
                <Ionicons name="sparkles" size={14} color={theme.accent} />
                <Text style={[styles.badgeText, { color: theme.accent }]}>INNOVATION MENTOR</Text>
              </View>
              <View style={styles.headerRight}>
                <View style={[styles.net, { backgroundColor: online ? '#DCFCE7' : '#F1F5F9' }]}>
                  <View style={[styles.netDot, { backgroundColor: online ? '#16A34A' : '#94A3B8' }]} />
                  <Text style={styles.netText}>{online ? 'Online' : 'Offline'}</Text>
                </View>
                <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
                  <Ionicons name="close-circle" size={28} color="#64748B" />
                </Pressable>
              </View>
            </View>

            <ScrollView ref={scrollRef} style={styles.chat} contentContainerStyle={{ paddingBottom: spacing.sm }}>
              {messages.map((m) => (
                <View key={m.id} style={[styles.bubbleRow, m.from === 'me' && { justifyContent: 'flex-end' }]}>
                  {m.from === 'mentor' && (
                    <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
                      <Ionicons name="sparkles" size={14} color="#fff" />
                    </View>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      m.from === 'mentor' ? styles.mentorBubble : { backgroundColor: theme.accent },
                    ]}
                  >
                    <Text style={[styles.bubbleText, m.from === 'me' && { color: '#fff' }]}>{m.text}</Text>
                    {m.offline && m.id > 0 && <Text style={styles.offlineTag}>Offline tip</Text>}
                  </View>
                </View>
              ))}
              {thinking && <ActivityIndicator color={theme.accent} style={{ alignSelf: 'flex-start', margin: spacing.sm }} />}
            </ScrollView>

            <View style={styles.actions}>
              {mentorActions(ctx).map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => send({ actionId: a.id }, a.label)}
                  style={({ pressed }) => [
                    styles.action,
                    { backgroundColor: theme.soft, borderColor: theme.accent },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Ionicons name={a.icon as keyof typeof Ionicons.glyphMap} size={18} color={theme.accent} />
                  <Text style={[styles.actionText, { color: theme.accent }]}>{a.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.inputRow}>
              {explorer && <VoiceInputButton size="large" onText={(t) => send({ text: t }, t)} />}
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask me anything about your project…"
                placeholderTextColor={colors.muted}
                style={styles.input}
                onSubmitEditing={submit}
                returnKeyType="send"
              />
              {!explorer && <VoiceInputButton onText={(t) => send({ text: t }, t)} />}
              <Pressable
                onPress={submit}
                disabled={!input.trim()}
                style={[styles.send, { backgroundColor: theme.accent }, !input.trim() && { opacity: 0.4 }]}
                accessibilityLabel="Send"
              >
                <Ionicons name="arrow-up" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </AccentProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: '88%',
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  net: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  netDot: { width: 7, height: 7, borderRadius: 4 },
  netText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  chat: { maxHeight: 280 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: spacing.sm },
  avatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  mentorBubble: { backgroundColor: '#F1F5F9', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21, color: '#0F172A' },
  offlineTag: { fontSize: 10, fontWeight: '700', color: '#64748B', marginTop: 4 },
  actions: { gap: 8, marginVertical: spacing.sm },
  action: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  actionText: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
