import { useState } from 'react';
import { freezeImpact, profileName } from '../../domain/booking';
import { PLANS, TOP_UP_PLAN } from '../../domain/plans';
import type { ID } from '../../domain/types';
import { loc } from '../../i18n';
import { useStore, useT } from '../../state/store';
import { Button, Segmented, Sheet, Switch } from '../../ui/kit';
import { MembershipSummary } from './HomeScreen';
import { WaiverForm } from './WaiverForm';

const FREEZE_OPTIONS = ['7', '14', '30'] as const;
type FreezeDays = (typeof FREEZE_OPTIONS)[number];

export function MeScreen() {
  const { state, now, dispatch } = useStore();
  const t = useT();
  const me = t.ui.me;
  const pid = state.account.activeProfileId;
  const m = state.memberships[pid];
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [freezeDays, setFreezeDays] = useState<FreezeDays>('14');
  const [waiverFor, setWaiverFor] = useState<ID | null>(null);
  const [removing, setRemoving] = useState<ID | null>(null);
  const impact = freezeImpact(state, pid, Number(freezeDays), now);
  const currentDate = m.kind === 'monthly' ? m.renewsOn : m.expiresOn;
  const waiverProfile = state.account.profiles.find((p) => p.id === waiverFor);
  const card = PLANS[TOP_UP_PLAN];

  return (
    <div className="stack">
      <h1 className="h1">{profileName(state, pid)}</h1>

      <section className="card" aria-label={t.ui.membership.eyebrow}>
        <div className="eyebrow">{t.ui.membership.eyebrow}</div>
        <MembershipSummary profileId={pid} t={t} />
        <div className="row">
          {m.status === 'frozen' ? (
            <Button onClick={() => dispatch({ type: 'unfreeze', profileId: pid })}>{me.unfreeze}</Button>
          ) : (
            <Button variant="secondary" onClick={() => setFreezeOpen(true)}>
              {me.freeze}
            </Button>
          )}
          {m.kind === 'card' && (
            <Button variant="secondary" onClick={() => dispatch({ type: 'buyCredits', profileId: pid })}>
              {me.buyCard(card.classes)}
            </Button>
          )}
        </div>
      </section>

      <section className="card" aria-label={me.family}>
        <div className="eyebrow">{me.family}</div>
        <ul className="plain-list">
          {state.account.profiles.map((p) => {
            const w = state.waivers[p.id];
            return (
              <li key={p.id} className="list-row">
                <div>
                  <strong>{loc(state, p.name)}</strong>{' '}
                  <span className="muted small">{p.relation === 'child' ? me.relChild : me.relSelf}</span>
                  <div className="muted small">{w ? me.waiverSigned(w.signedAt) : me.waiverMissing}</div>
                </div>
                {!w && (
                  <Button variant="secondary" small onClick={() => setWaiverFor(p.id)}>
                    {me.signNow}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card" aria-label={me.payments}>
        <div className="eyebrow">{me.payments}</div>
        {state.account.paymentMethods.length === 0 && <p className="muted">{me.noCards}</p>}
        <ul className="plain-list">
          {state.account.paymentMethods.map((pm) => {
            const label = me.cardLabel(pm.brand, pm.last4);
            return (
              <li key={pm.id} className="list-row">
                <span>{label}</span>
                {removing === pm.id ? (
                  <span className="row">
                    <Button
                      variant="danger"
                      small
                      onClick={() => {
                        dispatch({ type: 'removeCard', id: pm.id });
                        setRemoving(null);
                      }}
                    >
                      {me.remove}
                    </Button>
                    <Button variant="ghost" small onClick={() => setRemoving(null)}>
                      {me.keep}
                    </Button>
                  </span>
                ) : (
                  <Button variant="ghost" small onClick={() => setRemoving(pm.id)} aria-label={me.removeAria(label)}>
                    {me.remove}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card" aria-label={me.display}>
        <div className="eyebrow">{me.display}</div>
        <span className="field-label">{me.textSize}</span>
        <Segmented
          label={me.textSize}
          options={[
            { value: '1', label: me.sizeDefault },
            { value: '1.15', label: me.sizeLarge },
            { value: '1.3', label: me.sizeLarger },
          ]}
          value={String(state.prefs.textScale) as '1' | '1.15' | '1.3'}
          onChange={(v) => dispatch({ type: 'setPrefs', prefs: { textScale: Number(v) } })}
        />
        <Switch
          checked={state.prefs.highContrast}
          onChange={(v) => dispatch({ type: 'setPrefs', prefs: { highContrast: v } })}
          label={me.contrast}
          hint={me.contrastHint}
        />
        <span className="field-label">{me.goal}</span>
        <Segmented
          label={me.goal}
          options={['2', '3', '4', '5'].map((v) => ({ value: v, label: me.goalOption(Number(v)) }))}
          value={String(state.prefs.weeklyGoal)}
          onChange={(v) => dispatch({ type: 'setPrefs', prefs: { weeklyGoal: Number(v) } })}
        />
      </section>

      <p className="fineprint">{me.fineprint}</p>

      <Sheet open={freezeOpen} title={me.freeze} onClose={() => setFreezeOpen(false)}>
        <div className="stack">
          <p className="muted">{me.freezeIntro}</p>
          <Segmented
            label={me.freeze}
            options={FREEZE_OPTIONS.map((d) => ({ value: d, label: me.freezeDays(Number(d)) }))}
            value={freezeDays}
            onChange={setFreezeDays}
          />
          <dl className="facts">
            <div>
              <dt>{me.frozenUntil}</dt>
              <dd>{t.day(impact.until)}</dd>
            </div>
            <div>
              <dt>{m.kind === 'monthly' ? me.renewal : me.cardExpiry}</dt>
              <dd>
                {currentDate ? t.date(currentDate) : '—'} {me.arrow} <strong>{impact.newDate ? t.date(impact.newDate) : '—'}</strong>
              </dd>
            </div>
            <div>
              <dt>{me.affected}</dt>
              <dd>{impact.affected.length ? me.affectedCount(impact.affected.length) : me.none}</dd>
            </div>
          </dl>
          <Button
            block
            onClick={() => {
              dispatch({ type: 'freeze', profileId: pid, days: Number(freezeDays) });
              setFreezeOpen(false);
            }}
          >
            {me.freezeFor(Number(freezeDays))}
          </Button>
        </div>
      </Sheet>

      <Sheet open={waiverFor !== null} title={t.ui.waiver.title} onClose={() => setWaiverFor(null)}>
        {waiverProfile && (
          <WaiverForm
            forName={loc(state, waiverProfile.name)}
            isChild={waiverProfile.relation === 'child'}
            submitLabel={t.ui.waiver.sign}
            onSubmit={(signature) => {
              dispatch({ type: 'signWaiver', profileId: waiverProfile.id, signature });
              setWaiverFor(null);
            }}
          />
        )}
      </Sheet>
    </div>
  );
}
