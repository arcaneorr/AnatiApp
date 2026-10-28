import { useEffect, useRef, useState } from 'react';
import type { Lang } from './domain/types';
import { loc } from './i18n';
import { InsightsScreen } from './screens/owner/InsightsScreen';
import { BookingsScreen } from './screens/member/BookingsScreen';
import { ClassSheet } from './screens/member/ClassSheet';
import { HomeScreen } from './screens/member/HomeScreen';
import { MeScreen } from './screens/member/MeScreen';
import { ScheduleScreen } from './screens/member/ScheduleScreen';
import { TabBar, type Tab } from './screens/member/TabBar';
import { useStore, useT } from './state/store';
import { Avatar, Button, Segmented, Toasts } from './ui/kit';

const LANG_OPTIONS: { value: Lang; label: string; lang: string }[] = [
  { value: 'he', label: 'עברית', lang: 'he' },
  { value: 'en', label: 'English', lang: 'en' },
];

function MemberHeader() {
  const { state, dispatch } = useStore();
  const t = useT().ui.app;
  const activeId = state.account.activeProfileId;
  return (
    <div className="app-header">
      <div className="app-brand">
        <span className="wordmark" lang="en">
          {state.wordmark}
        </span>
        <span className="app-tagline">{loc(state, state.tagline)}</span>
        {state.branches.length > 1 && (
          <label className="branch-select">
            <span className="sr-only">{t.branch}</span>
            <select value={state.account.preferredBranchId} onChange={(e) => dispatch({ type: 'setBranch', branchId: e.target.value })}>
              {state.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {loc(state, b.name)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="profile-switch" role="radiogroup" aria-label={t.profiles}>
        {state.account.profiles.map((p) => {
          const name = loc(state, p.name);
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={p.id === activeId}
              className={p.id === activeId ? 'on' : ''}
              onClick={() => dispatch({ type: 'switchProfile', profileId: p.id })}
            >
              <Avatar name={name} size={30} />
              <span>{name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function App() {
  const { state, dispatch, reset } = useStore();
  const t = useT();
  const [tab, setTab] = useState<Tab>('home');
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);
  const screenRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = t.lang;
    root.dir = t.dir;
    root.style.setProperty('--text-scale', String(state.prefs.textScale));
    root.dataset.contrast = state.prefs.highContrast ? 'high' : 'normal';
    document.title = `${loc(state, state.studioName)} · Pulse`;
  }, [state, t]);

  useEffect(() => {
    screenRef.current?.scrollTo({ top: 0 });
  }, [tab]);

  return (
    <div className="stage">
      <header className="demo-bar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ◆
          </span>
          <strong lang="en">Pulse</strong>
          <span className="muted small">{t.ui.app.tagline}</span>
        </div>
        <div className="demo-controls">
          <Segmented
            label={t.ui.app.view}
            options={[
              { value: 'member', label: t.ui.app.member },
              { value: 'owner', label: t.ui.app.owner },
            ]}
            value={state.role}
            onChange={(role) => dispatch({ type: 'setRole', role })}
          />
          <Segmented
            label={t.ui.app.language}
            options={LANG_OPTIONS}
            value={state.prefs.lang}
            onChange={(lang) => dispatch({ type: 'setPrefs', prefs: { lang } })}
          />
          <Button variant="ghost" small onClick={reset}>
            {t.ui.app.reset}
          </Button>
        </div>
      </header>

      {state.role === 'member' ? (
        <div className="device">
          <MemberHeader />
          <main className="screen" ref={screenRef}>
            {tab === 'home' && <HomeScreen go={setTab} openSession={setOpenSessionId} />}
            {tab === 'schedule' && <ScheduleScreen openSession={setOpenSessionId} />}
            {tab === 'bookings' && <BookingsScreen openSession={setOpenSessionId} />}
            {tab === 'me' && <MeScreen />}
          </main>
          <TabBar tab={tab} onChange={setTab} />
          <ClassSheet sessionId={openSessionId} onClose={() => setOpenSessionId(null)} />
          <Toasts />
        </div>
      ) : (
        <div className="owner-page">
          <InsightsScreen />
          <Toasts />
        </div>
      )}
    </div>
  );
}
