import { describe, expect, it } from 'vitest';
import { messages } from '../i18n';
import { atRisk, churnSignal, fillHeatmap } from './insights';
import { NOW, member, session } from './testkit';
import { DAY } from './time';

const weekly = (perWeek: number, fromDay: number, toDay: number) => {
  const visits: number[] = [];
  for (let d = fromDay; d < toDay; d += 7 / perWeek) visits.push(NOW - d * DAY);
  return visits.sort((a, b) => a - b);
};

describe('churn signal', () => {
  it('rates a steady member as low risk', () => {
    expect(churnSignal(member('a', weekly(3, 1, 42)), NOW).level).toBe('low');
  });

  it('flags a member who stopped coming, and explains why in both languages', () => {
    const c = churnSignal(member('b', weekly(3, 17, 42)), NOW);
    expect(c.level).toBe('high');
    expect(c.recentVisits).toBe(0);
    expect(c.reason).toBe('drop');
    expect(messages('en').churnReason(c)).toContain('last seen');
    expect(messages('he').churnReason(c)).toContain('ביקור אחרון');
  });

  it('does not flag brand-new members', () => {
    const c = churnSignal(member('c', [NOW - 2 * DAY], NOW - 10 * DAY), NOW);
    expect(c.level).toBe('low');
    expect(c.reason).toBe('new');
  });

  it('sorts the riskiest first', () => {
    const list = atRisk([member('a', weekly(3, 1, 42)), member('b', weekly(3, 17, 42)), member('d', weekly(4, 9, 42))], NOW);
    expect(list.map((c) => c.memberId)[0]).toBe('b');
  });
});

describe('fill heatmap', () => {
  it('averages fill per weekday and hour', () => {
    const t = NOW - 7 * DAY;
    const cells = fillHeatmap([session('x', t, 10, ['1', '2', '3', '4', '5']), session('y', t - 7 * DAY, 10, ['1'])], NOW);
    expect(cells).toHaveLength(1);
    expect(cells[0].avgFill).toBeCloseTo(0.3, 6);
  });
});
