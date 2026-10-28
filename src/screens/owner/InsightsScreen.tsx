import { useMemo, useState } from 'react';
import { personName } from '../../domain/booking';
import { atRisk, fillHeatmap, kpis, scheduleSuggestions, suggestionText, winBackMessage, type ChurnSignal } from '../../domain/insights';
import { loc } from '../../i18n';
import { useStore, useT } from '../../state/store';
import { Button, Pill, Segmented, Sheet } from '../../ui/kit';

const DAYS = [0, 1, 2, 3, 4, 5]; // Sun-Fri, closed Saturday

function heatClass(fill: number): string {
  if (fill >= 0.95) return 'heat-4';
  if (fill >= 0.8) return 'heat-3';
  if (fill >= 0.6) return 'heat-2';
  if (fill >= 0.4) return 'heat-1';
  return 'heat-0';
}

export function InsightsScreen() {
  const { state, now, dispatch, notify } = useStore();
  const t = useT();
  const o = t.ui.owner;
  const [branch, setBranch] = useState<string>('all');
  const [draft, setDraft] = useState<{ c: ChurnSignal; text: string } | null>(null);
  const [showAll, setShowAll] = useState(false);

  const k = useMemo(() => kpis(state, now), [state, now]);
  const risks = useMemo(() => atRisk(state.members, now), [state.members, now]);
  const heat = useMemo(
    () => fillHeatmap(state.sessions, now, 28, branch === 'all' ? undefined : branch),
    [state.sessions, now, branch],
  );
  const suggestions = useMemo(() => scheduleSuggestions(state, now), [state, now]);

  const hours = [...new Set(heat.map((c) => c.hour))].sort((a, b) => a - b);
  const cell = (d: number, h: number) => heat.find((c) => c.weekday === d && c.hour === h);
  const delta = k.visitsPrev7 ? Math.round(((k.visits7 - k.visitsPrev7) / k.visitsPrev7) * 100) : 0;
  const ordered = [...risks].sort((a, b) => Number(!!state.contacted[a.memberId]) - Number(!!state.contacted[b.memberId]));
  const shown = showAll ? ordered : ordered.slice(0, 6);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify({ kind: 'success', text: t.notice.copied });
    } catch {
      notify({ kind: 'error', text: t.notice.copyFailed });
    }
  };

  return (
    <div className="owner">
      <div className="owner-head">
        <div>
          <h1 className="h1">{o.title}</h1>
          <p className="muted">{o.sub(loc(state, state.studioName), t.day(now))}</p>
        </div>
        {state.branches.length > 1 && (
          <Segmented
            label={o.branch}
            options={[
              { value: 'all', label: t.ui.schedule.allBranches },
              ...state.branches.map((b) => ({ value: b.id, label: loc(state, b.name) })),
            ]}
            value={branch}
            onChange={setBranch}
          />
        )}
      </div>

      <div className="kpis">
        <section className="kpi">
          <span className="kpi-label">{o.members}</span>
          <strong className="kpi-value">{k.members}</strong>
          <span className="muted small">{o.joined(k.newThisMonth)}</span>
        </section>
        <section className="kpi">
          <span className="kpi-label">{o.visits}</span>
          <strong className="kpi-value">{k.visits7}</strong>
          <span className={`small ${delta >= 0 ? 'up' : 'down'}`}>
            {delta >= 0 ? '▲' : '▼'} {o.vsPrev(Math.abs(delta))}
          </span>
        </section>
        <section className="kpi">
          <span className="kpi-label">{o.fill}</span>
          <strong className="kpi-value">{Math.round(k.avgFill * 100)}%</strong>
          <span className="muted small">{o.acrossAll}</span>
        </section>
        <section className="kpi kpi-alert">
          <span className="kpi-label">{o.risk}</span>
          <strong className="kpi-value">{o.perMonth(k.revenueAtRisk)}</strong>
          <span className="muted small">{o.riskSub(k.atRiskHigh, k.atRiskTotal)}</span>
        </section>
      </div>

      <div className="owner-grid">
        <section className="panel" aria-labelledby="churn-title">
          <div className="section-head">
            <h2 id="churn-title" className="h2">
              {o.churnTitle}
            </h2>
            <span className="muted small">{o.churnSub}</span>
          </div>
          <ul className="risk-list">
            {shown.map((c) => {
              const contacted = state.contacted[c.memberId];
              return (
                <li key={c.memberId} className={`risk-row${contacted ? ' done' : ''}`}>
                  <div className="risk-main">
                    <div className="class-title">
                      {personName(state, c.memberId)}{' '}
                      <Pill tone={c.level === 'high' ? 'danger' : 'warning'}>{c.level === 'high' ? o.high : o.medium}</Pill>
                      {contacted && <Pill tone="success">{o.contacted}</Pill>}
                    </div>
                    <div className="class-meta">{o.planPrice(t.plan[c.plan], c.monthlyPrice)}</div>
                    <div className="muted small">{t.churnReason(c)}</div>
                  </div>
                  <Button
                    small
                    variant={contacted ? 'ghost' : 'secondary'}
                    onClick={() => setDraft({ c, text: winBackMessage(state, c, now) })}
                  >
                    {contacted ? o.messageAgain : o.winBack}
                  </Button>
                </li>
              );
            })}
          </ul>
          {ordered.length > 6 && (
            <button type="button" className="link" onClick={() => setShowAll((v) => !v)}>
              {showAll ? o.showFewer : o.showAll(ordered.length)}
            </button>
          )}
        </section>

        <div className="stack">
          <section className="panel" aria-labelledby="heat-title">
            <div className="section-head">
              <h2 id="heat-title" className="h2">
                {o.heatTitle}
              </h2>
              <span className="muted small">{o.heatSub}</span>
            </div>
            <div className="heat-scroll">
              <table className="heat">
                <caption className="sr-only">{o.heatCaption}</caption>
                <thead>
                  <tr>
                    <th scope="col">{o.hour}</th>
                    {DAYS.map((d) => (
                      <th key={d} scope="col">
                        {t.weekdayShort[d]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hours.map((h) => (
                    <tr key={h}>
                      <th scope="row">{String(h).padStart(2, '0')}:00</th>
                      {DAYS.map((d) => {
                        const c = cell(d, h);
                        if (!c)
                          return (
                            <td key={d} className="heat-none" aria-label={o.noClass}>
                              –
                            </td>
                          );
                        const pct = Math.round(c.avgFill * 100);
                        return (
                          <td key={d} className={heatClass(c.avgFill)} title={o.cellTitle(t.weekdayShort[d], h, pct, c.avgWaitlist)}>
                            {pct}%{c.avgWaitlist >= 1 && <span className="heat-wait">+{c.avgWaitlist.toFixed(0)}</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted small">{o.heatNote}</p>
          </section>

          <section className="panel" aria-labelledby="sugg-title">
            <h2 id="sugg-title" className="h2">
              {o.suggTitle}
            </h2>
            <ul className="sugg-list">
              {suggestions.map((sg) => {
                const text = suggestionText(state, sg);
                return (
                  <li key={sg.id} className={`sugg sugg-${sg.kind}`}>
                    <Pill tone={sg.kind === 'add' ? 'success' : 'warning'}>{sg.kind === 'add' ? o.addPill : o.lowPill}</Pill>
                    <strong>{text.title}</strong>
                    <span className="muted small">{text.detail}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>

      <Sheet open={draft !== null} title={draft ? o.winBackTitle(personName(state, draft.c.memberId)) : o.winBack} onClose={() => setDraft(null)}>
        {draft && (
          <div className="stack">
            <p className="muted small">{t.churnReason(draft.c)}.</p>
            <label className="field-label" htmlFor="winback-text">
              {o.message}
            </label>
            <textarea
              id="winback-text"
              className="input"
              rows={5}
              value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            />
            <div className="row">
              <Button onClick={() => void copy(draft.text)}>{o.copy}</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  dispatch({ type: 'markContacted', memberId: draft.c.memberId });
                  setDraft(null);
                }}
              >
                {o.markContacted}
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
