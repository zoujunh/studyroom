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
import { DEFAULT_SETTINGS, db, loadSettings, saveSettings, storageAvailable } from '../db/db';
import { essayRows } from '../data/essay-seed';
import { questionRows } from '../data/question-seed';
import { SEED_VERSION, seedRows } from '../data/seed';
import { maxIntervalDays } from '../lib/date';
import { essayFullScore } from '../lib/essay';
import { applyFocus } from '../lib/focus';
import { applyMistake, isCorrect } from '../lib/quiz';
import { applyGrade } from '../srs/fsrs';
import type {
  AttemptRow,
  CardFocusRow,
  CardRow,
  ErrorType,
  EssayAttemptRow,
  EssayMode,
  EssayRow,
  Grade,
  LogRow,
  MistakeRow,
  QuestionRow,
  QuizMode,
  SessionMode,
  Settings,
  SrsRow,
} from '../types';

interface AnswerResult {
  correct: boolean;
  /** 是否因为连续答对而刚刚移出错题本 */
  removedFromMistakes: boolean;
}

interface StoreValue {
  ready: boolean;
  storageOk: boolean;
  settings: Settings;
  cards: CardRow[];
  cardMap: Map<string, CardRow>;
  srs: Map<string, SrsRow>;
  logs: LogRow[];
  lastLog: LogRow | null;
  questions: QuestionRow[];
  questionMap: Map<string, QuestionRow>;
  attempts: AttemptRow[];
  mistakes: Map<string, MistakeRow>;
  essays: EssayRow[];
  essayMap: Map<string, EssayRow>;
  essayAttempts: EssayAttemptRow[];
  /** 复习专项：刷卡时评「不会 / 模糊」的卡片 */
  cardFocus: Map<string, CardFocusRow>;
  updateSettings: (patch: Partial<Settings>) => void;
  gradeCard: (
    cardId: string,
    grade: Grade,
    mode: SessionMode,
  ) => Promise<{ requeue: boolean; next: SrsRow; focusAdded: boolean; focusRemoved: boolean }>;
  undo: () => Promise<LogRow | null>;
  refresh: () => Promise<void>;
  resetProgress: () => Promise<void>;
  clearAll: () => Promise<void>;
  exportJSON: () => string;
  importJSON: (text: string) => Promise<{ cards: number; srs: number; logs: number; error?: string }>;
  addCard: (card: Omit<CardRow, 'seedVersion'>) => Promise<void>;
  answerQuestion: (
    questionId: string,
    chosen: number[],
    mode: QuizMode,
    ms: number,
    errorType?: ErrorType,
  ) => Promise<AnswerResult>;
  tagErrorType: (questionId: string, errorType: ErrorType) => Promise<void>;
  dropMistake: (questionId: string) => Promise<void>;
  /** 手动把一张卡移出复习专项 */
  dropFocus: (cardId: string) => Promise<void>;
  recordEssay: (
    essayId: string,
    checked: number[],
    ms: number,
    mode: EssayMode,
  ) => Promise<{ score: number; fullScore: number }>;
}

const StoreContext = createContext<StoreValue | null>(null);

const LOG_WINDOW = 8000;
const ATTEMPT_WINDOW = 5000;

async function ensureSeedContent(settings: Settings): Promise<Settings> {
  const count = await db.cards.count();
  if (count === 0 || settings.seedVersion !== SEED_VERSION) {
    await db.cards.bulkPut(seedRows());
    await db.questions.bulkPut(questionRows());
    await db.essays.bulkPut(essayRows());
    const next = { ...settings, seedVersion: SEED_VERSION };
    saveSettings(next);
    return next;
  }
  return settings;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [cards, setCards] = useState<CardRow[]>([]);
  const [srs, setSrs] = useState<Map<string, SrsRow>>(new Map());
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [mistakes, setMistakes] = useState<Map<string, MistakeRow>>(new Map());
  const [essays, setEssays] = useState<EssayRow[]>([]);
  const [essayAttempts, setEssayAttempts] = useState<EssayAttemptRow[]>([]);
  const [cardFocus, setCardFocus] = useState<Map<string, CardFocusRow>>(new Map());
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  // 供事件回调读取最新数据，避免把整个 map 塞进依赖数组
  const questionMapRef = useRef<Map<string, QuestionRow>>(new Map());
  const essayMapRef = useRef<Map<string, EssayRow>>(new Map());
  const mistakesRef = useRef<Map<string, MistakeRow>>(new Map());
  const attemptsRef = useRef<AttemptRow[]>([]);
  const focusRef = useRef<Map<string, CardFocusRow>>(new Map());

  const load = useCallback(async () => {
    const [
      allCards,
      allSrs,
      allLogs,
      allQuestions,
      allAttempts,
      allMistakes,
      allEssays,
      allEssayAttempts,
      allFocus,
    ] = await Promise.all([
      db.cards.toArray(),
      db.srs.toArray(),
      db.logs.orderBy('ts').reverse().limit(LOG_WINDOW).toArray(),
      db.questions.toArray(),
      db.attempts.orderBy('ts').reverse().limit(ATTEMPT_WINDOW).toArray(),
      db.mistakes.toArray(),
      db.essays.toArray(),
      db.essayAttempts.orderBy('ts').reverse().limit(ATTEMPT_WINDOW).toArray(),
      db.cardFocus.toArray(),
    ]);
    setCards(allCards);
    setSrs(new Map(allSrs.map((row) => [row.cardId, row])));
    setLogs(allLogs.reverse());
    setQuestions(allQuestions);
    setAttempts(allAttempts.reverse());
    setMistakes(new Map(allMistakes.map((row) => [row.questionId, row])));
    setEssays(allEssays);
    setEssayAttempts(allEssayAttempts.reverse());
    setCardFocus(new Map(allFocus.map((row) => [row.cardId, row])));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await storageAvailable();
      if (cancelled) return;
      if (!ok) {
        setStorageOk(false);
        setReady(true);
        return;
      }
      const merged = await ensureSeedContent(loadSettings());
      if (cancelled) return;
      setSettings(merged);
      await load();
      if (!cancelled) setReady(true);
    })().catch(() => {
      if (!cancelled) {
        setStorageOk(false);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  /** 主题：auto 跟随系统。 */
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'auto' && media.matches);
      root.classList.toggle('dark', dark);
      root.style.colorScheme = dark ? 'dark' : 'light';
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-size', `${settings.fontSize}px`);
  }, [settings.fontSize]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const gradeCard = useCallback(
    async (cardId: string, grade: Grade, mode: SessionMode) => {
      const now = new Date();
      const prev = srs.get(cardId) ?? null;
      const config = settingsRef.current;
      const outcome = applyGrade(
        cardId,
        prev,
        grade,
        config.requestRetention,
        now,
        maxIntervalDays(config.examDate, now),
      );
      const previousFocus = focusRef.current.get(cardId) ?? null;
      const log: LogRow = {
        cardId,
        ts: now.getTime(),
        grade,
        rating: outcome.rating,
        prevState: prev,
        nextState: outcome.next,
        prevFocus: previousFocus,
        mode,
      };
      const id = await db.logs.add(log);
      await db.srs.put(outcome.next);
      setSrs((current) => {
        const next = new Map(current);
        next.set(cardId, outcome.next);
        return next;
      });
      setLogs((current) => [...current, { ...log, id }]);

      // 评「不会 / 模糊」→ 进复习专项；连续 2 次「会了」→ 自动移出
      const prevFocus = previousFocus ?? undefined;
      const focusUpdate = applyFocus(cardId, prevFocus, grade, now.getTime());
      if (focusUpdate.next) await db.cardFocus.put(focusUpdate.next);
      else if (prevFocus) await db.cardFocus.delete(cardId);
      setCardFocus((current) => {
        const next = new Map(current);
        if (focusUpdate.next) next.set(cardId, focusUpdate.next);
        else next.delete(cardId);
        return next;
      });

      return {
        requeue: outcome.requeue,
        next: outcome.next,
        focusAdded: focusUpdate.added,
        focusRemoved: focusUpdate.removed,
      };
    },
    [srs],
  );

  const undo = useCallback(async () => {
    const last = logs[logs.length - 1];
    if (!last) return null;
    if (last.id != null) await db.logs.delete(last.id);
    if (last.prevState) await db.srs.put(last.prevState);
    else await db.srs.delete(last.cardId);
    setSrs((current) => {
      const next = new Map(current);
      if (last.prevState) next.set(last.cardId, last.prevState);
      else next.delete(last.cardId);
      return next;
    });
    // 回滚复习专项
    if (last.prevFocus) await db.cardFocus.put(last.prevFocus);
    else await db.cardFocus.delete(last.cardId);
    setCardFocus((current) => {
      const next = new Map(current);
      if (last.prevFocus) next.set(last.cardId, last.prevFocus);
      else next.delete(last.cardId);
      return next;
    });
    setLogs((current) => current.slice(0, -1));
    return last;
  }, [logs]);

  const resetProgress = useCallback(async () => {
    await Promise.all([
      db.srs.clear(),
      db.logs.clear(),
      db.attempts.clear(),
      db.mistakes.clear(),
      db.essayAttempts.clear(),
      db.cardFocus.clear(),
    ]);
    setSrs(new Map());
    setLogs([]);
    setAttempts([]);
    setMistakes(new Map());
    setEssayAttempts([]);
    setCardFocus(new Map());
  }, []);

  const clearAll = useCallback(async () => {
    await db.delete();
    try {
      localStorage.removeItem('kaoyan408.settings');
    } catch {
      /* ignore */
    }
    window.location.reload();
  }, []);

  const exportJSON = useCallback(() => {
    return JSON.stringify(
      {
        app: 'kaoyan408',
        version: 3,
        exportedAt: new Date().toISOString(),
        settings,
        cards,
        srs: [...srs.values()],
        logs: logs.slice(-LOG_WINDOW),
        questions,
        attempts: attempts.slice(-ATTEMPT_WINDOW),
        mistakes: [...mistakes.values()],
        essays,
        essayAttempts: essayAttempts.slice(-ATTEMPT_WINDOW),
        cardFocus: [...cardFocus.values()],
      },
      null,
      2,
    );
  }, [attempts, cardFocus, cards, essayAttempts, essays, logs, mistakes, questions, settings, srs]);

  const importJSON = useCallback(
    async (text: string) => {
      let parsed: {
        app?: string;
        cards?: CardRow[];
        srs?: SrsRow[];
        logs?: LogRow[];
        questions?: QuestionRow[];
        attempts?: AttemptRow[];
        mistakes?: MistakeRow[];
        essays?: EssayRow[];
        essayAttempts?: EssayAttemptRow[];
        cardFocus?: CardFocusRow[];
        settings?: Partial<Settings>;
      };
      try {
        parsed = JSON.parse(text) as typeof parsed;
      } catch {
        return { cards: 0, srs: 0, logs: 0, error: '不是合法的 JSON 文件' };
      }
      if (!parsed || (!Array.isArray(parsed.cards) && !Array.isArray(parsed.srs))) {
        return { cards: 0, srs: 0, logs: 0, error: '缺少 cards / srs 字段，可能不是本应用的导出文件' };
      }
      const incomingCards = (parsed.cards ?? []).map((c) => ({ ...c, seedVersion: c.seedVersion ?? -1 }));
      const incomingSrs = parsed.srs ?? [];
      const incomingLogs = (parsed.logs ?? []).map(({ id: _id, ...rest }) => rest as LogRow);
      const incomingAttempts = (parsed.attempts ?? []).map(({ id: _id, ...rest }) => rest as AttemptRow);
      if (incomingCards.length) await db.cards.bulkPut(incomingCards);
      if (incomingSrs.length) await db.srs.bulkPut(incomingSrs);
      if (incomingLogs.length) await db.logs.bulkAdd(incomingLogs);
      if (parsed.questions?.length) await db.questions.bulkPut(parsed.questions);
      if (incomingAttempts.length) await db.attempts.bulkAdd(incomingAttempts);
      if (parsed.mistakes?.length) await db.mistakes.bulkPut(parsed.mistakes);
      if (parsed.essays?.length) await db.essays.bulkPut(parsed.essays);
      if (parsed.cardFocus?.length) await db.cardFocus.bulkPut(parsed.cardFocus);
      if (parsed.essayAttempts?.length) {
        await db.essayAttempts.bulkAdd(
          parsed.essayAttempts.map(({ id: _id, ...rest }) => rest as EssayAttemptRow),
        );
      }
      if (parsed.settings) updateSettings(parsed.settings);
      await load();
      return { cards: incomingCards.length, srs: incomingSrs.length, logs: incomingLogs.length };
    },
    [load, updateSettings],
  );

  const addCard = useCallback(
    async (card: Omit<CardRow, 'seedVersion'>) => {
      await db.cards.put({ ...card, seedVersion: -1 });
      await load();
    },
    [load],
  );

  const answerQuestion = useCallback(
    async (questionId: string, chosen: number[], mode: QuizMode, ms: number, errorType?: ErrorType) => {
      const question = questionMapRef.current.get(questionId);
      if (!question) return { correct: false, removedFromMistakes: false };
      const correct = isCorrect(question, chosen);
      const now = Date.now();
      const attempt: AttemptRow = { questionId, ts: now, chosen, correct, mode, ms, errorType };
      const id = await db.attempts.add(attempt);
      setAttempts((current) => [...current, { ...attempt, id }]);

      const prev = mistakesRef.current.get(questionId);
      const update = applyMistake(questionId, prev, correct, now, errorType);
      if (update.next) await db.mistakes.put(update.next);
      else if (prev) await db.mistakes.delete(questionId);
      setMistakes((current) => {
        const next = new Map(current);
        if (update.next) next.set(questionId, update.next);
        else next.delete(questionId);
        return next;
      });
      return { correct, removedFromMistakes: update.removed };
    },
    [],
  );

  const tagErrorType = useCallback(async (questionId: string, errorType: ErrorType) => {
    // 同步更新错题条目与最近一次作答记录
    const prev = mistakesRef.current.get(questionId);
    if (prev) {
      const next = { ...prev, lastErrorType: errorType };
      await db.mistakes.put(next);
      setMistakes((current) => {
        const map = new Map(current);
        map.set(questionId, next);
        return map;
      });
    }
    const latest = [...attemptsRef.current].reverse().find((item) => item.questionId === questionId);
    if (latest?.id != null) {
      const next = { ...latest, errorType };
      await db.attempts.put(next);
      setAttempts((current) => current.map((item) => (item.id === latest.id ? next : item)));
    }
  }, []);

  const dropMistake = useCallback(async (questionId: string) => {
    await db.mistakes.delete(questionId);
    setMistakes((current) => {
      const next = new Map(current);
      next.delete(questionId);
      return next;
    });
  }, []);

  const dropFocus = useCallback(async (cardId: string) => {
    await db.cardFocus.delete(cardId);
    setCardFocus((current) => {
      const next = new Map(current);
      next.delete(cardId);
      return next;
    });
  }, []);

  const recordEssay = useCallback(
    async (essayId: string, checked: number[], ms: number, mode: EssayMode) => {
      const essay = essayMapRef.current.get(essayId);
      if (!essay) return { score: 0, fullScore: 0 };
      const fullScore = essayFullScore(essay);
      const score = essay.points.reduce(
        (sum, point, index) => (checked.includes(index) ? sum + point.score : sum),
        0,
      );
      const attempt: EssayAttemptRow = {
        essayId,
        ts: Date.now(),
        checked: [...checked],
        score,
        fullScore,
        ms,
        mode,
      };
      const id = await db.essayAttempts.add(attempt);
      setEssayAttempts((current) => [...current, { ...attempt, id }]);
      return { score, fullScore };
    },
    [],
  );

  const cardMap = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const questionMap = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const essayMap = useMemo(() => new Map(essays.map((e) => [e.id, e])), [essays]);  questionMapRef.current = questionMap;
  essayMapRef.current = essayMap;
  mistakesRef.current = mistakes;
  attemptsRef.current = attempts;
  focusRef.current = cardFocus;

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      storageOk,
      settings,
      cards,
      cardMap,
      srs,
      logs,
      lastLog: logs.length ? logs[logs.length - 1] : null,
      questions,
      questionMap,
      attempts,
      mistakes,
      essays,
      essayMap,
      essayAttempts,
      cardFocus,
      updateSettings,
      gradeCard,
      undo,
      refresh: load,
      resetProgress,
      clearAll,
      exportJSON,
      importJSON,
      addCard,
      answerQuestion,
      tagErrorType,
      dropMistake,
      dropFocus,
      recordEssay,
    }),
    [
      ready,
      storageOk,
      settings,
      cards,
      cardMap,
      srs,
      logs,
      questions,
      questionMap,
      attempts,
      mistakes,
      essays,
      essayMap,
      essayAttempts,
      cardFocus,
      updateSettings,
      gradeCard,
      undo,
      load,
      resetProgress,
      clearAll,
      exportJSON,
      importJSON,
      addCard,
      answerQuestion,
      tagErrorType,
      dropMistake,
      dropFocus,
      recordEssay,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore 必须在 <StoreProvider> 内使用');
  return ctx;
}

export { DEFAULT_SETTINGS };
