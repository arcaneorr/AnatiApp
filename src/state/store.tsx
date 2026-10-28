import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { applyAction, type Action } from '../domain/actions';
import { createDemoState } from '../domain/seed';
import { DAY } from '../domain/time';
import type { Notice, State } from '../domain/types';
import { messages, type Messages } from '../i18n';

const STORAGE_KEY = 'pulse-anati-v2';
/** The demo data is relative to the day it was made, so older saves are replaced. */
const MAX_AGE_MS = 2 * DAY;

export interface Toast extends Notice {
  id: number;
}

interface StoreValue {
  state: State;
  now: number;
  dispatch: (a: Action) => void;
  notify: (n: Notice) => void;
  reset: () => void;
  toasts: Toast[];
  dismiss: (id: number) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function load(): State | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as State;
    if (parsed.version !== 2 || Date.now() - parsed.generatedAt > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** `initial` and `now` let tests render a fixed world at a fixed time. */
export function StoreProvider({ children, initial, now: fixedNow }: { children: ReactNode; initial?: State; now?: number }) {
  const [state, setState] = useState<State>(() => initial ?? load() ?? createDemoState(Date.now()));
  const [now, setNow] = useState(() => fixedNow ?? Date.now());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const stateRef = useRef(state);
  const seq = useRef(0);

  const push = useCallback((notices: Notice[]) => {
    if (!notices.length) return;
    setToasts((prev) => [...prev, ...notices.map((n) => ({ ...n, id: ++seq.current }))].slice(-3));
  }, []);

  // Actions run against a ref so event handlers can chain dispatches safely.
  const dispatch = useCallback(
    (a: Action) => {
      const t = Date.now();
      const out = applyAction(stateRef.current, a, t);
      stateRef.current = out.state;
      setState(out.state);
      setNow(t);
      push(out.notices);
    },
    [push],
  );

  const reset = useCallback(() => {
    const t = Date.now();
    const prefs = stateRef.current.prefs;
    const fresh = { ...createDemoState(t, prefs.lang), prefs };
    stateRef.current = fresh;
    setState(fresh);
    setNow(t);
    push([{ kind: 'info', text: messages(prefs.lang).notice.demoReset }]);
  }, [push]);

  const notify = useCallback((n: Notice) => push([n]), [push]);
  const dismiss = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked: the demo still works in memory.
    }
  }, [state]);

  useEffect(() => {
    const id = window.setInterval(() => dispatch({ type: 'tick' }), 15_000);
    return () => window.clearInterval(id);
  }, [dispatch]);

  useEffect(() => {
    if (!toasts.length) return;
    const id = window.setTimeout(() => setToasts((prev) => prev.slice(1)), 5000);
    return () => window.clearTimeout(id);
  }, [toasts]);

  const value = useMemo(
    () => ({ state, now, dispatch, notify, reset, toasts, dismiss }),
    [state, now, dispatch, notify, reset, toasts, dismiss],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside StoreProvider');
  return value;
}

/** The message pack for the current language. */
export function useT(): Messages {
  return messages(useStore().state.prefs.lang);
}
