import Dexie, { type Table } from 'dexie';
import type {
  AttemptRow,
  CardRow,
  EssayAttemptRow,
  EssayRow,
  LogRow,
  MistakeRow,
  QuestionRow,
  Settings,
  SrsRow,
} from '../types';

export class Kaoyan408Db extends Dexie {
  cards!: Table<CardRow, string>;
  srs!: Table<SrsRow, string>;
  logs!: Table<LogRow, number>;
  questions!: Table<QuestionRow, string>;
  attempts!: Table<AttemptRow, number>;
  mistakes!: Table<MistakeRow, string>;
  essays!: Table<EssayRow, string>;
  essayAttempts!: Table<EssayAttemptRow, number>;

  constructor() {
    super('kaoyan408');
    this.version(1).stores({
      cards: 'id, subject, chapter, importance',
      srs: 'cardId, due, state',
      logs: '++id, cardId, ts',
    });
    // v2：加入题库（题目 / 作答记录 / 错题本）
    this.version(2).stores({
      cards: 'id, subject, chapter, importance',
      srs: 'cardId, due, state',
      logs: '++id, cardId, ts',
      questions: 'id, subject, chapter, type',
      attempts: '++id, questionId, ts',
      mistakes: 'questionId, lastWrongAt',
    });
    // v3：加入综合应用题（大题 + 自评记录）
    this.version(3).stores({
      cards: 'id, subject, chapter, importance',
      srs: 'cardId, due, state',
      logs: '++id, cardId, ts',
      questions: 'id, subject, chapter, type',
      attempts: '++id, questionId, ts',
      mistakes: 'questionId, lastWrongAt',
      essays: 'id, subject, chapter, difficulty',
      essayAttempts: '++id, essayId, ts',
    });
  }
}

export const db = new Kaoyan408Db();

const SETTINGS_KEY = 'kaoyan408.settings';

export const DEFAULT_SETTINGS: Settings = {
  examDate: '2026-12-19',
  newPerDay: 20,
  reviewPerDay: 300,
  // 冲刺场景默认 95%：间隔推进更密（1→4→8→22 天），避免 90% 下 2→13→56 天过于稀疏。
  requestRetention: 0.95,
  theme: 'auto',
  fontSize: 15.5,
  seedVersion: 0,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* 隐私模式下 localStorage 可能不可用，忽略即可。 */
  }
}

/** 浏览器禁用 IndexedDB 时的兜底提示。 */
export async function storageAvailable(): Promise<boolean> {
  try {
    await db.cards.count();
    return true;
  } catch {
    return false;
  }
}
