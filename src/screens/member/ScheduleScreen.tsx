import { useState, type ReactNode } from 'react';
import { activeBooking, branchName, coachName, describeSession, sessionEnd } from '../../domain/booking';
import { displayStatus, rowAction } from '../../domain/progress';
import { addDays, fmtTime, startOfDay, startOfWeek, weekdayOf } from '../../domain/time';
import type { ClassSession, ClassType, ID } from '../../domain/types';
import { useStore, useT } from '../../state/store';
import { Button, Capacity, Icon, Pill, Segmented } from '../../ui/kit';

type BranchFilter = 'mine' | 'all';

/** Arbox-style week view: pick a day, then book straight from the class row. */
export function ScheduleScreen({ openSession }: { openSession: (id: ID) => void }) {
  const { state, now, dispatch } = useStore();
  const t = useT();
  const sch = t.ui.schedule;
  const today = startOfDay(now);
  const [day, setDay] = useState(today);
  const [type, setType] = useState<ClassType | 'All'>('All');
  const [branch, setBranch] = useState<BranchFilter>('mine');
  const pid = state.account.activeProfileId;
  const ourIds = state.account.profiles.map((p) => p.id);
  const multiBranch = state.branches.length > 1;

  const weekStart = startOfWeek(day);
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const firstWeek = startOfWeek(state.sessions[0]?.start ?? now);
  const lastWeek = startOfWeek(state.sessions.at(-1)?.start ?? now);

  const inBranch = (branchId: ID) => !multiBranch || branch === 'all' || branchId === state.account.preferredBranchId;
  const types = [...new Set(state.sessions.filter((x) => inBranch(x.branchId)).map((x) => x.type))];
  const ofDay = state.sessions.filter((x) => startOfDay(x.start) === day && inBranch(x.branchId));
  const list = ofDay.filter((x) => type === 'All' || x.type === type).sort((a, b) => a.start - b.start);
  const bookedDays = new Set(
    state.bookings
      .filter((b) => ourIds.includes(b.profileId) && (b.status === 'booked' || b.status === 'waitlisted' || b.status === 'offered'))
      .map((b) => startOfDay(state.sessions.find((x) => x.id === b.sessionId)?.start ?? 0)),
  );

  const action = (x: ClassSession): ReactNode => {
    const a = rowAction(state, x, pid, now);
    const what = describeSession(state, x);
    const tap = (label: string, onClick: () => void, variant: 'primary' | 'secondary' = 'primary') => (
      <Button small variant={variant} aria-label={sch.actionAria(label, what)} onClick={onClick}>
        {label}
      </Button>
    );
    switch (a.kind) {
      case 'book':
        return tap(t.ui.common.book, () => dispatch({ type: 'book', sessionId: x.id, profileId: pid }));
      case 'waitlist':
        return tap(sch.waitlist, () => dispatch({ type: 'joinWaitlist', sessionId: x.id, profileId: pid, autoAccept: true }), 'secondary');
      case 'claim':
        return tap(sch.claim, () => dispatch({ type: 'claimOffer', sessionId: x.id, profileId: pid }));
      case 'sign':
        return tap(t.ui.common.signAndBook, () => openSession(x.id), 'secondary');
      case 'finish':
        return tap(t.ui.common.book, () => openSession(x.id), 'secondary');
      case 'ended':
        return <span className="slot-note">{sch.ended}</span>;
      case 'live':
        return <span className="slot-note slot-live">{sch.live}</span>;
      case 'opens':
        return <span className="slot-note">{sch.opens(a.at)}</span>;
      case 'overlaps':
        return <span className="slot-note">{sch.overlaps}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="stack">
      <div className="screen-head">
        <h1 className="h1">{sch.title}</h1>
        {day !== today && (
          <Button variant="ghost" small onClick={() => setDay(today)}>
            {sch.today}
          </Button>
        )}
      </div>

      <div className="week">
        <div className="week-nav">
          <button
            type="button"
            className="icon-btn"
            aria-label={sch.prevWeek}
            disabled={weekStart <= firstWeek}
            onClick={() => setDay((d) => addDays(d, -7))}
          >
            <Icon name="prev" size={20} />
          </button>
          <span className="week-month">{t.monthYear(day)}</span>
          <button
            type="button"
            className="icon-btn"
            aria-label={sch.nextWeek}
            disabled={weekStart >= lastWeek}
            onClick={() => setDay((d) => addDays(d, 7))}
          >
            <Icon name="next" size={20} />
          </button>
        </div>
        <div className="week-days" role="group" aria-label={t.monthYear(day)}>
          {week.map((d) => (
            <button
              key={d}
              type="button"
              className={`wday${d === day ? ' on' : ''}${d === today ? ' today' : ''}${d < today ? ' past' : ''}`}
              aria-pressed={d === day}
              aria-label={sch.dayAria(t.day(d), d === today, bookedDays.has(d))}
              onClick={() => setDay(d)}
            >
              <span className="wday-name">{t.weekdayShort[weekdayOf(d)]}</span>
              <span className="wday-num">{new Date(d).getDate()}</span>
              <span className={`wday-dot${bookedDays.has(d) ? ' show' : ''}`} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      <div className="filters">
        {multiBranch && (
          <Segmented
            label={sch.branches}
            options={[
              { value: 'mine', label: branchName(state, state.account.preferredBranchId) },
              { value: 'all', label: sch.allBranches },
            ]}
            value={branch}
            onChange={setBranch}
          />
        )}
        <div className="chips" role="group" aria-label={sch.typeLabel}>
          {(['All', ...types] as (ClassType | 'All')[]).map((ct) => (
            <button key={ct} type="button" className={`chip${ct === type ? ' on' : ''}`} aria-pressed={ct === type} onClick={() => setType(ct)}>
              {ct === 'All' ? sch.all : t.classType[ct]}
            </button>
          ))}
        </div>
      </div>

      <h2 className="h2 day-title">
        {t.day(day)}
        {day < today && <span className="muted small"> · {sch.pastDay}</span>}
      </h2>

      {list.length === 0 && (
        <p className="empty">{weekdayOf(day) === 6 ? sch.closedSaturday : ofDay.length ? sch.noMatch : sch.noClasses}</p>
      )}

      <ul className="slots">
        {list.map((x) => {
          const mine =
            activeBooking(state, x.id, pid) ?? [...state.bookings].reverse().find((b) => b.sessionId === x.id && b.profileId === pid);
          const status = mine ? displayStatus(state, mine, x, now) : null;
          const ended = now >= sessionEnd(x);
          return (
            <li key={x.id} className="slot">
              <div className="slot-time">
                <strong>{fmtTime(x.start)}</strong>
                <span>{t.minutes(x.durationMin)}</span>
              </div>
              <div className={`slot-card type-${x.type.toLowerCase()}${ended ? ' ended' : ''}`}>
                <button type="button" className="slot-open" onClick={() => openSession(x.id)}>
                  <span className="slot-title">
                    {t.classType[x.type]}
                    {status && <Pill tone={status.tone}>{status.label}</Pill>}
                  </span>
                  <span className="slot-meta">
                    {coachName(state, x.coachId)} · {t.level[x.level]}
                    {multiBranch && branch === 'all' && ` · ${branchName(state, x.branchId)}`}
                  </span>
                  {!ended && <Capacity x={x} />}
                </button>
                <div className="slot-action">{action(x)}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
