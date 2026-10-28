import { useState, type ReactNode } from 'react';
import {
  checkBooking,
  coachName,
  describeSession,
  expectedOpenings,
  personName,
  profileName,
  sessionById,
  spotsLeft,
  waitlistOdds,
  waitlistPosition,
} from '../../domain/booking';
import {
  nextBooked,
  planUsage,
  quickClasses,
  quickDays,
  streakWeeks,
  usualSession,
  weekProgress,
  type QuickItem,
} from '../../domain/progress';
import { fmtTime } from '../../domain/time';
import type { Booking, ClassSession, ID } from '../../domain/types';
import type { Messages } from '../../i18n';
import { useStore, useT } from '../../state/store';
import { downloadSessions } from '../../ui/download';
import { AvatarStack, Button, Icon, Pill, ProgressRing, UsageBar } from '../../ui/kit';
import type { Tab } from './TabBar';

/** One class in the quick registration row, styled after Arbox's "Book a service" cards. */
function QuickCard({ item, onOpen }: { item: QuickItem; onOpen: (id: ID) => void }) {
  const { state, dispatch } = useStore();
  const t = useT();
  const h = t.ui.home;
  const { x, action } = item;
  const pid = state.account.activeProfileId;
  const what = describeSession(state, x);
  const taken = x.bookedIds.length + x.heldIds.length;
  const tap = (label: string, onClick: () => void, variant: 'primary' | 'secondary' = 'primary') => (
    <Button small block variant={variant} aria-label={t.ui.schedule.actionAria(label, what)} onClick={onClick}>
      {label}
    </Button>
  );

  let footer: ReactNode = null;
  switch (action.kind) {
    case 'book':
      footer = tap(t.ui.common.book, () => dispatch({ type: 'book', sessionId: x.id, profileId: pid }));
      break;
    case 'waitlist':
      footer = tap(t.ui.schedule.waitlist, () => dispatch({ type: 'joinWaitlist', sessionId: x.id, profileId: pid, autoAccept: true }), 'secondary');
      break;
    case 'claim':
      footer = tap(t.ui.schedule.claim, () => dispatch({ type: 'claimOffer', sessionId: x.id, profileId: pid }));
      break;
    case 'sign':
      footer = tap(t.ui.common.signAndBook, () => onOpen(x.id), 'secondary');
      break;
    case 'finish':
      footer = tap(t.ui.common.book, () => onOpen(x.id), 'secondary');
      break;
    case 'booked':
      footer = (
        <span className="qcard-done">
          <Icon name="check" size={16} />
          {t.status.booked}
        </span>
      );
      break;
    case 'waitlisted':
      footer = <span className="qcard-done qcard-waiting">{t.status.waitlist(waitlistPosition(x, pid))}</span>;
      break;
  }

  return (
    <li className={`qcard type-${x.type.toLowerCase()}`}>
      <button type="button" className="qcard-open" onClick={() => onOpen(x.id)} aria-label={t.ui.schedule.actionAria(t.ui.common.details, what)}>
        <span className="qcard-top">
          <span className="qcard-time">{fmtTime(x.start)}</span>
          {x.bookedIds.length > 0 && <AvatarStack names={x.bookedIds.map((id) => personName(state, id))} max={3} size={24} />}
        </span>
        <span className="qcard-title">{t.classType[x.type]}</span>
        <span className="qcard-meta">{coachName(state, x.coachId)}</span>
        <span className="qcard-tags">
          <span className="tag">
            <Icon name="clock" size={13} />
            {t.minutes(x.durationMin)}
          </span>
          {spotsLeft(x) > 0 ? (
            <span className="tag">{h.bookedCount(taken, x.capacity)}</span>
          ) : (
            <span className="tag tag-full">{h.fullTag(x.waitlistIds.length)}</span>
          )}
        </span>
      </button>
      {footer}
    </li>
  );
}

/** Pick a day, then book from a row of class cards in one tap. */
function QuickRegistration({ empty, onOpen, go }: { empty: boolean; onOpen: (id: ID) => void; go: (t: Tab) => void }) {
  const { state, now } = useStore();
  const t = useT();
  const h = t.ui.home;
  const pid = state.account.activeProfileId;
  const days = quickDays(state, pid, now);
  const [picked, setPicked] = useState<number | null>(null);
  const day = picked !== null && days.includes(picked) ? picked : days[0];
  const items = day === undefined ? [] : quickClasses(state, pid, now, day);

  return (
    <section className="quick" aria-labelledby="quick-title">
      <div className="section-bar">
        <div>
          {empty && <div className="eyebrow">{h.quickEyebrow}</div>}
          <h2 id="quick-title" className="h2">
            {h.quickTitle}
          </h2>
        </div>
        <button type="button" className="link" onClick={() => go('schedule')}>
          {h.viewAll}
        </button>
      </div>
      {day === undefined ? (
        <p className="muted">{h.quickEmpty}</p>
      ) : (
        <>
          <div className="day-chips" role="group" aria-label={h.daysLabel}>
            {days.map((d) => (
              <button key={d} type="button" className={`chip${d === day ? ' on' : ''}`} aria-pressed={d === day} onClick={() => setPicked(d)}>
                {t.dayChip(d, now)}
              </button>
            ))}
          </div>
          {/* Keyed by day and profile, so the row starts from the first class again. */}
          <ul key={`${pid}-${day}`} className="quick-cards" aria-label={t.day(day)}>
            {items.map((item) => (
              <QuickCard key={item.x.id} item={item} onOpen={onOpen} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function OfferCard({ b }: { b: Booking }) {
  const { state, now, dispatch } = useStore();
  const h = useT().ui.home;
  const x = sessionById(state, b.sessionId);
  const until = b.offerExpiresAt ?? x.start;
  return (
    <section className="card card-highlight" aria-label={h.offerEyebrow}>
      <div className="eyebrow">{h.offerEyebrow}</div>
      <div className="card-title">{describeSession(state, x)}</div>
      <p className="muted">{h.offerText(until, now)}</p>
      <div className="row">
        <Button onClick={() => dispatch({ type: 'claimOffer', sessionId: x.id, profileId: b.profileId })}>{h.claim}</Button>
        <Button variant="ghost" onClick={() => dispatch({ type: 'declineOffer', sessionId: x.id, profileId: b.profileId })}>
          {h.release}
        </Button>
      </div>
    </section>
  );
}

function WaitCard({ b, onOpen }: { b: Booking; onOpen: (id: ID) => void }) {
  const { state, now } = useStore();
  const t = useT();
  const h = t.ui.home;
  const x = sessionById(state, b.sessionId);
  const pos = waitlistPosition(x, b.profileId);
  const odds = Math.round(waitlistOdds(pos, expectedOpenings(state, x, now)) * 100);
  return (
    <section className="card" aria-label={h.waitEyebrow}>
      <div className="eyebrow">{h.waitEyebrow}</div>
      <div className="card-title">{h.waitTitle(pos, describeSession(state, x))}</div>
      <p className="muted">{h.waitText(odds, !!b.autoAccept, state.policy.offerHoldMinutes)}</p>
      <Button variant="secondary" small onClick={() => onOpen(x.id)}>
        {t.ui.common.details}
      </Button>
    </section>
  );
}

function UsualCard({ x, onOpen }: { x: ClassSession; onOpen: (id: ID) => void }) {
  const { state, now, dispatch } = useStore();
  const t = useT();
  const h = t.ui.home;
  const pid = state.account.activeProfileId;
  const check = checkBooking(state, x.id, pid, now);
  return (
    <section className="card" aria-label={h.usualEyebrow}>
      <div className="eyebrow">{h.usualEyebrow}</div>
      <div className="card-title">{h.usualTitle(x.type, x.start)}</div>
      <p className="muted">{h.usualText(t.day(x.start), coachName(state, x.coachId), spotsLeft(x))}</p>
      {check.ok ? (
        <Button onClick={() => dispatch({ type: 'book', sessionId: x.id, profileId: pid })}>{h.bookOneTap}</Button>
      ) : (
        <Button variant="secondary" onClick={() => onOpen(x.id)}>
          {check.block.code === 'FULL' ? h.fullOdds : t.ui.common.details}
        </Button>
      )}
    </section>
  );
}

/** Plan, what's left, and a usage bar. Shared by Home and Me. */
export function MembershipSummary({ profileId, t }: { profileId: ID; t: Messages }) {
  const { state } = useStore();
  const m = state.memberships[profileId];
  const usage = planUsage(state, profileId);
  const u = t.ui.membership;
  return (
    <>
      <div className="card-title">
        {t.plan[m.planId]} {m.status === 'frozen' ? <Pill tone="warning">{t.ui.common.frozen}</Pill> : <Pill tone="success">{t.ui.common.active}</Pill>}
      </div>
      <UsageBar used={usage.used} total={usage.total} label={u.used(usage.used, usage.total, m.kind)} />
      <p className="muted">
        {m.status === 'frozen' && m.frozenUntil
          ? u.frozenUntil(m.frozenUntil)
          : m.kind === 'monthly'
            ? u.monthly(m.creditsLeft, m.creditsTotal, m.renewsOn, m.price)
            : u.card(m.creditsLeft, m.creditsTotal, m.expiresOn)}
      </p>
    </>
  );
}

export function HomeScreen({ go, openSession }: { go: (t: Tab) => void; openSession: (id: ID) => void }) {
  const { state, now } = useStore();
  const t = useT();
  const h = t.ui.home;
  const pid = state.account.activeProfileId;
  const next = nextBooked(state, pid, now);
  const offers = state.bookings.filter((b) => b.profileId === pid && b.status === 'offered');
  const waits = state.bookings.filter(
    (b) => b.profileId === pid && b.status === 'waitlisted' && sessionById(state, b.sessionId).start > now,
  );
  const usual = usualSession(state, pid, now);
  const week = weekProgress(state, pid, now);
  const goal = state.prefs.weeklyGoal;
  const streak = streakWeeks(state, pid, now, goal);

  return (
    <div className="stack">
      <h1 className="h1">{h.hello(new Date(now).getHours(), profileName(state, pid))}</h1>

      {offers.map((b) => (
        <OfferCard key={b.id} b={b} />
      ))}

      {next && (
        <section className="card card-next" aria-label={h.nextEyebrow(t.relative(next.x.start, now))}>
          <div className="eyebrow">{h.nextEyebrow(t.relative(next.x.start, now))}</div>
          <div className="card-title">{t.classTypeLong[next.x.type]}</div>
          <p className="muted">{h.nextText(t.dayTime(next.x.start), coachName(state, next.x.coachId))}</p>
          <div className="row">
            <Button variant="secondary" small onClick={() => downloadSessions(state, [next.x], now)}>
              {t.ui.common.addToCalendar}
            </Button>
            <button type="button" className="link" onClick={() => openSession(next.x.id)}>
              {h.classDetails}
            </button>
          </div>
        </section>
      )}

      {/* Like Arbox's Home, quick registration stays below the next class; it replaces the empty state when nothing is booked. */}
      <QuickRegistration empty={!next} onOpen={openSession} go={go} />

      <section className="card progress-card" aria-label={h.weekRing(week.attended, goal)}>
        <ProgressRing value={week.attended} max={goal} label={h.weekRing(week.attended, goal)} />
        <div>
          <div className="card-title">{week.attended >= goal ? h.goalReached : h.goalLeft(goal - week.attended)}</div>
          <p className="muted">{h.weekText(week.attended, week.booked)}</p>
          {streak > 0 && <Pill tone="primary">{h.streak(streak)}</Pill>}
        </div>
      </section>

      {usual && <UsualCard x={usual} onOpen={openSession} />}

      {waits.map((b) => (
        <WaitCard key={b.id} b={b} onOpen={openSession} />
      ))}

      <section className="card" aria-label={t.ui.membership.eyebrow}>
        <div className="eyebrow">{t.ui.membership.eyebrow}</div>
        <MembershipSummary profileId={pid} t={t} />
        <button type="button" className="link" onClick={() => go('me')}>
          {t.ui.membership.manage}
        </button>
      </section>
    </div>
  );
}
