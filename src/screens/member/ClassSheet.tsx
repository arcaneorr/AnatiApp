import { useEffect, useState, type ReactNode } from 'react';
import {
  activeBooking,
  blockMessage,
  cancelTerms,
  checkBooking,
  coachName,
  describeTerms,
  expectedOpenings,
  personName,
  profileName,
  sessionById,
  sessionEnd,
  waitlistOdds,
  waitlistPosition,
} from '../../domain/booking';
import { PLANS, TOP_UP_PLAN } from '../../domain/plans';
import { displayStatus } from '../../domain/progress';
import { HOUR, fmtTime } from '../../domain/time';
import type { ClassSession, ID } from '../../domain/types';
import { loc } from '../../i18n';
import { useStore, useT } from '../../state/store';
import { downloadSessions } from '../../ui/download';
import { AvatarStack, Button, Capacity, Pill, Sheet, Switch } from '../../ui/kit';
import { WaiverForm } from './WaiverForm';

function OddsLine({ x, position }: { x: ClassSession; position: number }) {
  const { state, now } = useStore();
  const sh = useT().ui.sheet;
  const lambda = expectedOpenings(state, x, now);
  const odds = Math.round(waitlistOdds(position, lambda) * 100);
  return (
    <div className="odds">
      <div className="odds-bar" aria-hidden="true">
        <span style={{ width: `${odds}%` }} />
      </div>
      <p>
        <strong>{sh.oddsStrong(odds)}</strong>
        {sh.oddsRest(position, lambda)}
      </p>
    </div>
  );
}

export function ClassSheet({ sessionId, onClose }: { sessionId: ID | null; onClose: () => void }) {
  const { state, now, dispatch } = useStore();
  const t = useT();
  const sh = t.ui.sheet;
  const [profileId, setProfileId] = useState(state.account.activeProfileId);
  const [autoAccept, setAutoAccept] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [signing, setSigning] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    setProfileId(state.account.activeProfileId);
    setShowAll(false);
    setSigning(false);
    setConfirmCancel(false);
    // Reset only when a different class is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (!sessionId) return null;
  const x = sessionById(state, sessionId);
  const branch = state.branches.find((b) => b.id === x.branchId);
  const started = now >= x.start;
  const ended = now >= sessionEnd(x);
  const mine = activeBooking(state, x.id, profileId);
  const multi = state.account.profiles.length > 1;
  const who = profileName(state, profileId);
  const whoIfMulti = multi ? who : undefined;
  const isChild = state.account.profiles.find((p) => p.id === profileId)?.relation === 'child';
  const roster = x.bookedIds.map((id) => {
    const ours = state.account.profiles.find((p) => p.id === id);
    if (!ours) {
      const name = personName(state, id);
      return { name, label: name };
    }
    const name = loc(state, ours.name);
    return { name, label: `${name} (${ours.relation === 'self' ? sh.youTag : sh.familyTag})` };
  });
  const hasOthers = x.bookedIds.some((id) => !state.account.profiles.some((p) => p.id === id));

  let action: ReactNode;
  if (started) {
    const last = [...state.bookings].reverse().find((b) => b.sessionId === x.id && b.profileId === profileId);
    const status = last ? displayStatus(state, last, x, now) : null;
    action = (
      <div className="notice">
        {ended ? sh.ended : sh.live}{' '}
        {status && (
          <>
            {who}: <Pill tone={status.tone}>{status.label}</Pill>
          </>
        )}
      </div>
    );
  } else if (mine?.status === 'booked') {
    const terms = cancelTerms(state, x.id, profileId, now);
    action = confirmCancel ? (
      <div className="stack-sm">
        <p className={`notice${terms.late ? ' notice-danger' : ''}`}>{describeTerms(state, terms, now)}</p>
        <div className="row">
          <Button
            variant="danger"
            onClick={() => {
              dispatch({ type: 'cancel', sessionId: x.id, profileId });
              setConfirmCancel(false);
            }}
          >
            {sh.yesCancel}
          </Button>
          <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
            {sh.keepSpot}
          </Button>
        </div>
      </div>
    ) : (
      <div className="stack-sm">
        <p className="notice notice-success">
          <strong>{multi ? sh.bookedFor(who) : sh.bookedSelf}</strong> {describeTerms(state, terms, now)}
        </p>
        <div className="row">
          <Button variant="secondary" onClick={() => downloadSessions(state, [x], now)}>
            {t.ui.common.addToCalendar}
          </Button>
          <Button variant="ghost" onClick={() => setConfirmCancel(true)}>
            {sh.cancelBooking}
          </Button>
        </div>
      </div>
    );
  } else if (mine?.status === 'waitlisted') {
    const pos = waitlistPosition(x, profileId);
    action = (
      <div className="stack-sm">
        <p className="notice notice-warning">
          <strong>{sh.onWaitlist(pos, whoIfMulti)}</strong>{' '}
          {mine.autoAccept
            ? sh.autoUntil(fmtTime(x.start - state.policy.autoAcceptCutoffHours * HOUR))
            : sh.holdInfo(state.policy.offerHoldMinutes)}
        </p>
        <OddsLine x={x} position={pos} />
        <Button variant="ghost" onClick={() => dispatch({ type: 'leaveWaitlist', sessionId: x.id, profileId })}>
          {sh.leaveWaitlist}
        </Button>
      </div>
    );
  } else if (mine?.status === 'offered') {
    const until = mine.offerExpiresAt ?? x.start;
    action = (
      <div className="stack-sm">
        <p className="notice notice-primary">
          <strong>{sh.heldStrong(whoIfMulti)}</strong>
          {sh.heldUntil(until, now)}
        </p>
        <div className="row">
          <Button onClick={() => dispatch({ type: 'claimOffer', sessionId: x.id, profileId })}>{t.ui.home.claim}</Button>
          <Button variant="ghost" onClick={() => dispatch({ type: 'declineOffer', sessionId: x.id, profileId })}>
            {t.ui.home.release}
          </Button>
        </div>
      </div>
    );
  } else {
    const check = checkBooking(state, x.id, profileId, now);
    if (check.ok) {
      const m = state.memberships[profileId];
      action = (
        <div className="stack-sm">
          {check.warnings.map((w) => (
            <p key={w} className="notice notice-warning">
              {w}
            </p>
          ))}
          <Button block onClick={() => dispatch({ type: 'book', sessionId: x.id, profileId })}>
            {sh.bookFor(whoIfMulti)}
          </Button>
          {m && <p className="muted small centered">{sh.usesClass(m.kind, m.creditsLeft - 1)}</p>}
        </div>
      );
    } else {
      switch (check.block.code) {
        case 'NO_WAIVER':
          action = signing ? (
            <WaiverForm
              forName={who}
              isChild={isChild}
              submitLabel={t.ui.common.signAndBook}
              onSubmit={(signature) =>
                dispatch({ type: 'signWaiverAndBook', sessionId: x.id, profileId, signature, autoAccept: true })
              }
            />
          ) : (
            <div className="stack-sm">
              <p className="notice">{sh.waiverNeeded(who)}</p>
              <Button block onClick={() => setSigning(true)}>
                {sh.signAndBookLong}
              </Button>
            </div>
          );
          break;
        case 'FULL':
          action = (
            <div className="stack-sm">
              <p className="notice notice-warning">
                <strong>{sh.fullStrong}</strong> {sh.inLine(x.waitlistIds.length + 1, whoIfMulti)}
              </p>
              <OddsLine x={x} position={x.waitlistIds.length + 1} />
              <Switch
                checked={autoAccept}
                onChange={setAutoAccept}
                label={sh.autoLabel}
                hint={sh.autoHint(state.policy.autoAcceptCutoffHours, state.policy.offerHoldMinutes)}
              />
              <Button block onClick={() => dispatch({ type: 'joinWaitlist', sessionId: x.id, profileId, autoAccept })}>
                {sh.joinWaitlist}
              </Button>
            </div>
          );
          break;
        case 'FROZEN':
          action = (
            <div className="stack-sm">
              <p className="notice">{blockMessage(state, check.block)}</p>
              <Button block onClick={() => dispatch({ type: 'unfreezeAndBook', sessionId: x.id, profileId, autoAccept: true })}>
                {sh.unfreezeAndBook}
              </Button>
            </div>
          );
          break;
        case 'NO_CREDITS': {
          const card = PLANS[TOP_UP_PLAN];
          action = (
            <div className="stack-sm">
              <p className="notice">{blockMessage(state, check.block)}</p>
              {check.block.kind === 'card' && (
                <Button block onClick={() => dispatch({ type: 'buyCredits', profileId })}>
                  {sh.buyCard(card.classes, card.price)}
                </Button>
              )}
            </div>
          );
          break;
        }
        default:
          action = <p className="notice">{blockMessage(state, check.block)}</p>;
      }
    }
  }

  return (
    <Sheet open title={t.classTypeLong[x.type]} onClose={onClose}>
      <div className="stack">
        <p className="muted small">{t.classBlurb[x.type]}</p>
        <dl className="facts">
          <div>
            <dt>{sh.when}</dt>
            <dd>
              {t.day(x.start)}, <span dir="ltr">{fmtTime(x.start)}–{fmtTime(sessionEnd(x))}</span>
            </dd>
          </div>
          <div>
            <dt>{sh.coach}</dt>
            <dd>{coachName(state, x.coachId)}</dd>
          </div>
          <div>
            <dt>{sh.where}</dt>
            <dd>
              {branch ? loc(state, branch.name) : ''}
              {branch && <span className="muted small"> · {loc(state, branch.address)}</span>}
            </dd>
          </div>
          <div>
            <dt>{sh.level}</dt>
            <dd>{t.level[x.level]}</dd>
          </div>
        </dl>

        {!ended && <Capacity x={x} />}

        {multi && !started && (
          <div className="booking-for">
            <span className="field-label">{sh.bookingFor}</span>
            <div className="chips" role="radiogroup" aria-label={sh.bookingFor}>
              {state.account.profiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={p.id === profileId}
                  className={`chip${p.id === profileId ? ' on' : ''}`}
                  onClick={() => {
                    setProfileId(p.id);
                    setSigning(false);
                    setConfirmCancel(false);
                  }}
                >
                  {loc(state, p.name)}
                </button>
              ))}
            </div>
          </div>
        )}

        {action}

        <section aria-label={ended ? sh.whoCame(roster.length) : sh.whoComing(roster.length)}>
          <div className="section-head">
            <h3 className="h3">{ended ? sh.whoCame(roster.length) : sh.whoComing(roster.length)}</h3>
            {roster.length > 0 && (
              <button type="button" className="link" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
                {showAll ? sh.hideList : sh.seeAll}
              </button>
            )}
          </div>
          {showAll ? (
            <ul className="roster">
              {roster.map((r, i) => (
                <li key={`${r.label}-${i}`}>{r.label}</li>
              ))}
            </ul>
          ) : (
            <AvatarStack names={roster.map((r) => r.name)} />
          )}
        </section>

        {!started && hasOthers && (x.waitlistIds.length > 0 || mine?.status === 'waitlisted') && (
          <details className="demo-tools">
            <summary>{sh.demoTools}</summary>
            <p className="muted small">{sh.demoHint}</p>
            <Button variant="secondary" onClick={() => dispatch({ type: 'simulateCancellation', sessionId: x.id })}>
              {sh.simulate}
            </Button>
          </details>
        )}
      </div>
    </Sheet>
  );
}
