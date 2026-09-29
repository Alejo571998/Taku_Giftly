"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname } from "next/navigation";
import type {
  TakuChatMessage,
  TakuLine,
  TakuMood,
  TakuPageContext,
} from "@/lib/taku/types";

interface TakuState {
  mood: TakuMood;
  bubble: (TakuLine & { id: string }) | null;
  history: TakuChatMessage[];
  /** El usuario lo minimizó (persistente). */
  minimized: boolean;
  /** Una pantalla muestra a Taku en grande (loading, ganador): se oculta el dock. */
  hiddenBy: number;
  context: TakuPageContext;
}

interface TakuApi extends TakuState {
  say: (line: TakuLine) => void;
  /** Dice la línea una sola vez por sesión del navegador. */
  sayOnce: (onceKey: string, line: TakuLine) => void;
  react: (mood: TakuMood) => void;
  dismiss: () => void;
  setMinimized: (value: boolean) => void;
  hideDock: () => () => void;
  setContextData: (data: TakuPageContext["data"]) => void;
  addUserMessage: (text: string) => TakuChatMessage[];
}

const TakuContext = createContext<TakuApi | null>(null);

const MINIMIZED_KEY = "giftly:taku:minimized";
const ONCE_PREFIX = "giftly:taku:once:";

function readStorage(storage: "local" | "session", key: string): string | null {
  try {
    return (storage === "local" ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: "local" | "session", key: string, value: string) {
  try {
    (storage === "local" ? window.localStorage : window.sessionStorage).setItem(key, value);
  } catch {
    // almacenamiento bloqueado: seguimos sin persistir
  }
}

const minimizedListeners = new Set<() => void>();

function subscribeMinimized(listener: () => void) {
  minimizedListeners.add(listener);
  return () => minimizedListeners.delete(listener);
}

function durationFor(line: TakuLine): number {
  if (line.duration) return line.duration;
  return Math.min(9000, 2500 + line.text.length * 45);
}

let messageSeq = 0;
function nextId(): string {
  messageSeq += 1;
  return `taku-${Date.now()}-${messageSeq}`;
}

export function TakuProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mood, setMood] = useState<TakuMood>("idle");
  const [bubble, setBubble] = useState<TakuState["bubble"]>(null);
  const [history, setHistory] = useState<TakuChatMessage[]>([]);
  const minimized = useSyncExternalStore(
    subscribeMinimized,
    () => readStorage("local", MINIMIZED_KEY) === "1",
    () => false
  );
  const [hiddenBy, setHiddenBy] = useState(0);
  const [contextData, setContextDataState] = useState<TakuPageContext["data"]>();
  const [lastPathname, setLastPathname] = useState(pathname);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moodTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyRef = useRef<TakuChatMessage[]>([]);

  // Al navegar se limpia lo de la pantalla anterior. Se hace durante el
  // render (no en un effect) para no pisar lo que la nueva pantalla diga
  // en sus propios effects, que corren antes que los del provider.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setBubble(null);
    setMood("idle");
    setContextDataState(undefined);
  }

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(
    () => () => {
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
      if (moodTimer.current) clearTimeout(moodTimer.current);
    },
    []
  );

  const react = useCallback((next: TakuMood) => {
    setMood(next);
    if (moodTimer.current) clearTimeout(moodTimer.current);
    // Las reacciones puntuales vuelven solas al estado de reposo.
    if (next !== "idle" && next !== "thinking" && next !== "sad") {
      moodTimer.current = setTimeout(() => setMood("idle"), 3200);
    }
  }, []);

  const say = useCallback(
    (line: TakuLine) => {
      const id = nextId();
      setBubble({ ...line, id });
      setHistory((prev) =>
        [...prev, { id, role: "taku" as const, text: line.text, createdAt: Date.now() }].slice(-30)
      );
      react(line.mood ?? "idle");
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
      bubbleTimer.current = setTimeout(() => setBubble(null), durationFor(line));
    },
    [react]
  );

  const sayOnce = useCallback(
    (onceKey: string, line: TakuLine) => {
      const key = ONCE_PREFIX + onceKey;
      if (readStorage("session", key)) return;
      writeStorage("session", key, "1");
      say(line);
    },
    [say]
  );

  const dismiss = useCallback(() => {
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    setBubble(null);
  }, []);

  const setMinimized = useCallback((value: boolean) => {
    writeStorage("local", MINIMIZED_KEY, value ? "1" : "0");
    minimizedListeners.forEach((listener) => listener());
    if (value) setBubble(null);
  }, []);

  const hideDock = useCallback(() => {
    setHiddenBy((n) => n + 1);
    return () => setHiddenBy((n) => Math.max(0, n - 1));
  }, []);

  const addUserMessage = useCallback((text: string) => {
    const message: TakuChatMessage = {
      id: nextId(),
      role: "user",
      text,
      createdAt: Date.now(),
    };
    const snapshot = [...historyRef.current, message].slice(-30);
    historyRef.current = snapshot;
    setHistory(snapshot);
    return snapshot;
  }, []);

  const value = useMemo<TakuApi>(
    () => ({
      mood,
      bubble,
      history,
      minimized,
      hiddenBy,
      context: { pathname, data: contextData },
      say,
      sayOnce,
      react,
      dismiss,
      setMinimized,
      hideDock,
      setContextData: setContextDataState,
      addUserMessage,
    }),
    [
      mood,
      bubble,
      history,
      minimized,
      hiddenBy,
      pathname,
      contextData,
      say,
      sayOnce,
      react,
      dismiss,
      setMinimized,
      hideDock,
      addUserMessage,
    ]
  );

  return <TakuContext.Provider value={value}>{children}</TakuContext.Provider>;
}

export function useTaku(): TakuApi {
  const ctx = useContext(TakuContext);
  if (!ctx) throw new Error("useTaku debe usarse dentro de <TakuProvider>");
  return ctx;
}

/** Oculta el dock mientras el componente está montado (Taku aparece en grande). */
export function useHideTakuDock(active = true) {
  const { hideDock } = useTaku();
  useEffect(() => {
    if (!active) return;
    return hideDock();
  }, [active, hideDock]);
}
