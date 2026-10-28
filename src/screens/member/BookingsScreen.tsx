import { useState } from 'react';
import { branchName, profileName } from '../../domain/booking';
import { chargeLabel, displayStatus, historyFor, upcomingFor, type Row } from '../../domain/progress';
import { DAY, fmtTime } from '../../domain/time';
import type { ID } from '../../domain/types';
import { useStore, useT } from '../../state/store';
import { downloadSessions } from '../../ui/download';
import { Button, Pill, Segmented } from '../../ui/kit';

export function BookingsScreen({ openSession }: { openSession: (id: ID) => void }) {
  const { state, now } = useStore();
  const t = useT();
  const bk = t.ui.bookings;
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');
  const ids = state.account.profiles.map((p) => p.id);
  const multi = ids.length > 1;
  const multiBranch = state.branches.length > 1;
  const rows: Row[] = view === 'upcoming' ? upcomingFor(state, ids, now) : historyFor(state, ids, now);
  const booked = upcomingFor(state, ids, now).filter((r) => r.b.status === 'booked');

  const last30 = historyFor(state, ids, now).filter((r) => r.x.start >= now - 30 * DAY && r.x.start <= now);
  const attended = last30.filter((r) => r.b.status === 'booked').length;
  const used = last30.filter((r) => r.b.creditUsed).length;
  const late = last30.filter((r) => r.b.status === 'late-cancelled').length;

  return (
    <div className="stack">
      <h1 className="h1">{bk.title}</h1>
      <Segmented
        label={bk.view}
        options={[
          { value: 'upcoming', label: bk.upcoming },
          { value: 'past', label: bk.history },
        ]}
        value={view}
        onChange={setView}
      />

      {view === 'upcoming' ? (
        booked.length > 0 && (
          <Button variant="secondary" onClick={() => downloadSessions(state, booked.map((r) => r.x), now)}>
            {bk.addAll(booked.length)}
          </Button>
        )
      ) : (
        <section className="card summary" aria-label={bk.note}>
          <div>
            <strong>{attended}</strong>
            <span>{bk.attended}</span>
          </div>
          <div>
            <strong>{used}</strong>
            <span>{bk.used}</span>
          </div>
          <div>
            <strong>{late}</strong>
            <span>{bk.late}</span>
          </div>
          <p className="muted small">{bk.note}</p>
        </section>
      )}

      {rows.length === 0 && <p className="empty">{view === 'upcoming' ? bk.emptyUpcoming : bk.emptyHistory}</p>}

      <ul className="booking-list">
        {rows.map(({ b, x }) => {
          const status = displayStatus(state, b, x, now);
          const meta = [multiBranch ? branchName(state, x.branchId) : '', multi ? profileName(state, b.profileId) : '']
            .filter(Boolean)
            .join(' · ');
          return (
            <li key={b.id}>
              <button type="button" className={`booking-row type-${x.type.toLowerCase()}`} onClick={() => openSession(x.id)}>
                <span className="booking-date">
                  <strong>{t.day(x.start)}</strong>
                  <span>{fmtTime(x.start)}</span>
                </span>
                <span className="booking-main">
                  <span className="class-title">
                    {t.classType[x.type]} <Pill tone={status.tone}>{status.label}</Pill>
                  </span>
                  {meta && <span className="class-meta">{meta}</span>}
                  {view === 'past' && <span className="charge">{chargeLabel(state, b)}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
