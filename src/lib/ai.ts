import { getApp } from '@react-native-firebase/app';
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  HarmBlockThreshold,
  HarmCategory,
  type GenerativeModel,
} from '@react-native-firebase/ai';
import { getAuth } from '@react-native-firebase/auth';

import type { AgeTier } from '../types';
import { ensureAppCheck } from './appCheck';

// Fast, low-cost model suited to short tutoring replies; update as Google retires models.
const MODEL = 'gemini-3.1-flash-lite';

const TIER_STYLE: Record<AgeTier, string> = {
  explorer: 'The student is in primary school (about 6-11). Use very simple words, short sentences and playful, concrete examples.',
  creator: 'The student is in junior secondary school (about 11-14). Be clear, practical and encouraging, with step-by-step guidance.',
  innovator: 'The student is in senior secondary school (about 15-18). Use analytical, root-cause and entrepreneurial thinking.',
};

const SYSTEM = `You are the Innovation Mentor inside "GIS Young Innovators", an educational app for school students in Nigeria.
Guide students through: problem spotting, 5 Whys, idea generation, SCAMPER, idea selection, prototyping with low-cost local materials
(cardboard, bottles, maize cobs, sawdust, string, soil), design without materials, testing and reflection.
Rules:
- Coach, don't do the work: ask a guiding question or give a hint plus one concrete example. Never write their whole answer.
- Keep replies under 80 words.
- Only discuss the student's innovation project and learning. Politely redirect anything else.
- Never ask for or repeat personal information (full names, addresses, phone numbers, photos of people, locations of home).
- Always put safety first: no fire, sharp tools, electricity or chemicals without a teacher. Suggest asking a teacher when unsure.
- If a student seems upset or in danger, kindly tell them to speak to their teacher or a trusted adult.`;

const SAFETY = [
  HarmCategory.HARM_CATEGORY_HARASSMENT,
  HarmCategory.HARM_CATEGORY_HATE_SPEECH,
  HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
  HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
].map((category) => ({ category, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE }));

const models = new Map<AgeTier | 'default', Promise<GenerativeModel>>();

function getModel(tier: AgeTier | null): Promise<GenerativeModel> {
  const key = tier ?? 'default';
  let m = models.get(key);
  if (!m) {
    m = (async () => {
      const app = getApp();
      const ai = getAI(app, { appCheck: await ensureAppCheck(), auth: getAuth(app), backend: new GoogleAIBackend() });
      return getGenerativeModel(ai, {
        model: MODEL,
        systemInstruction: `${SYSTEM}\n${TIER_STYLE[tier ?? 'creator']}`,
        safetySettings: SAFETY,
        generationConfig: { maxOutputTokens: 220, temperature: 0.6 },
      });
    })();
    m.catch(() => models.delete(key));
    models.set(key, m);
  }
  return m;
}

export type ChatTurn = { role: 'user' | 'model'; text: string };

const TIMEOUT_MS = 12000;

/** Returns Gemini's reply, or null so the caller can fall back to offline guidance. */
export async function askGemini(prompt: string, history: ChatTurn[], tier: AgeTier | null): Promise<string | null> {
  try {
    const model = await getModel(tier);
    const contents = [
      ...history.slice(-6).map((t) => ({ role: t.role, parts: [{ text: t.text.slice(0, 800) }] })),
      { role: 'user' as const, parts: [{ text: prompt.slice(0, 1500) }] },
    ];
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS));
    const result = await Promise.race([model.generateContent({ contents }), timeout]);
    const text = result?.response.text().trim();
    return text || null;
  } catch (e) {
    console.warn('[mentor] Gemini unavailable, using offline guidance', e);
    return null;
  }
}
