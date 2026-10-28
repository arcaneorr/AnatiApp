import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { activeBooking, checkBooking } from '../domain/booking';
import { KID_ID, ME_ID, createDemoState } from '../domain/seed';
import type { Lang, State } from '../domain/types';
import { LANGS, messages } from '../i18n';
import { BookingsScreen } from '../screens/member/BookingsScreen';
import { ClassSheet } from '../screens/member/ClassSheet';
import { HomeScreen } from '../screens/member/HomeScreen';
import { MeScreen } from '../screens/member/MeScreen';
import { ScheduleScreen } from '../screens/member/ScheduleScreen';
import { InsightsScreen } from '../screens/owner/InsightsScreen';
import { StoreProvider } from '../state/store';
import { AvatarStack } from './kit';

// Fixed clocks, so results never depend on when the tests run. The Wednesday-evening
// clock is when the old version of this test failed.
const CLOCKS = [
  new Date(2026, 9, 20, 14, 0).getTime(), // Tue afternoon
  new Date(2026, 9, 28, 21, 35).getTime(), // Wed evening
  new Date(2026, 9, 30, 9, 0).getTime(), // Fri morning
];
const NOW = CLOCKS[1];
const noop = () => undefined;
const render = (node: ReactNode, state: State, now = NOW) =>
  renderToString(
    <StoreProvider initial={state} now={now}>
      {node}
    </StoreProvider>,
  );
const asKid = (s: State): State => ({ ...s, account: { ...s.account, activeProfileId: KID_ID } });

describe.each(LANGS)('screens render in %s', (lang: Lang) => {
  const s = createDemoState(NOW, lang);
  const t = messages(lang);

  it('app shell has no check-in tab', () => {
    const html = render(<App />, s);
    expect(html).toContain(t.ui.app.reset);
    expect(html).not.toContain('QR');
  });
  it('home shows quick registration below the next class', () => {
    const html = render(<HomeScreen go={noop} openSession={noop} />, s);
    expect(html).toContain(t.ui.home.usualEyebrow);
    expect(html).toContain(t.ui.home.quickTitle);
    expect(html).toContain(t.ui.home.viewAll);
    expect(html).not.toContain(t.ui.home.quickEyebrow);
  });
  it('home with nothing booked leads with quick registration', () => {
    const html = render(<HomeScreen go={noop} openSession={noop} />, asKid(s));
    expect(html).toContain(t.ui.home.quickEyebrow);
    expect(html).toContain(t.ui.common.signAndBook.replace(/&/g, '&amp;')); // rendered HTML escapes "&"
  });
  it('schedule', () => {
    const html = render(<ScheduleScreen openSession={noop} />, s);
    expect(html).toContain(t.ui.schedule.title);
    expect(html).toContain(t.monthYear(NOW));
  });
  it('bookings', () => expect(render(<BookingsScreen openSession={noop} />, s)).toContain(t.status.booked));
  it('me', () => expect(render(<MeScreen />, s)).toContain(t.ui.me.payments));
  it('owner insights', () => {
    const html = render(<InsightsScreen />, s);
    expect(html).toContain(t.ui.owner.churnTitle);
    expect(html).toContain(t.ui.owner.suggTitle);
  });
});

describe('Hebrew screens have no leftover English', () => {
  const s = createDemoState(NOW, 'he');
  const en = messages('en');
  const english = [
    en.ui.tabs.schedule,
    en.ui.tabs.bookings,
    en.ui.membership.eyebrow,
    en.ui.home.quickTitle,
    en.ui.home.usualEyebrow,
    en.ui.home.viewAll,
    en.ui.me.payments,
    en.ui.owner.churnTitle,
    en.ui.common.addToCalendar,
    en.classType.Reformer,
    en.classType.Barre,
    'spots left',
    'Waitlist',
  ];
  const screens: [string, ReactNode, State][] = [
    ['app', <App key="app" />, s],
    ['home', <HomeScreen key="home" go={noop} openSession={noop} />, s],
    ['home (kid)', <HomeScreen key="kid" go={noop} openSession={noop} />, asKid(s)],
    ['schedule', <ScheduleScreen key="schedule" openSession={noop} />, s],
    ['bookings', <BookingsScreen key="bookings" openSession={noop} />, s],
    ['me', <MeScreen key="me" />, s],
    ['owner', <InsightsScreen key="owner" />, s],
  ];
  it.each(screens)('%s', (_name, node, state) => {
    const html = render(node, state);
    for (const word of english) expect(html).not.toContain(word);
  });
});

describe.each(CLOCKS)('class sheet states at %i', (now) => {
  const s = createDemoState(now, 'en');
  const t = messages('en');
  const future = s.sessions.filter((x) => x.start > now + 3 * 3_600_000);
  const find = (pred: (id: string) => boolean) => future.find((x) => pred(x.id))?.id;

  const cases: [string, string | undefined, string, State?][] = [
    ['booked', find((id) => activeBooking(s, id, ME_ID)?.status === 'booked'), 'Free cancellation'],
    ['waitlisted', find((id) => activeBooking(s, id, ME_ID)?.status === 'waitlisted'), 'chance'],
    ['full', find((id) => { const c = checkBooking(s, id, ME_ID, now); return !c.ok && c.block.code === 'FULL'; }), t.ui.sheet.joinWaitlist],
    ['past', s.sessions.find((x) => x.start < now - 86_400_000)?.id, t.ui.sheet.ended],
    ['needs waiver (child)', find((id) => { const c = checkBooking(s, id, KID_ID, now); return !c.ok && c.block.code === 'NO_WAIVER'; }), t.ui.sheet.signAndBookLong, asKid(s)],
  ];

  it.each(cases)('%s', (_label, id, expected, state) => {
    expect(id).toBeDefined();
    expect(render(<ClassSheet sessionId={id ?? null} onClose={noop} />, state ?? s, now)).toContain(expected);
  });
});

describe('avatars', () => {
  it('build initials from letters only, in both scripts', () => {
    const html = renderToString(<AvatarStack names={['נועה ל׳', 'Maya (you)']} />);
    expect(html).toContain('>נל<');
    expect(html).toContain('>MY<');
  });
});
