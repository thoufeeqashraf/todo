import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildSnapshot, formatDelta, incidentSeverity, relativeDelta } from './aggregate.ts';
import { analyticsToCsv } from './csv.ts';
import { addDays, resolveRange } from './range.ts';

const now = new Date('2026-10-30T12:00:00.000Z');

describe('analytics range', () => {
  it('defaults to the last 30 UTC days and the matching previous window', () => {
    const range = resolveRange({ now });
    assert.equal(range.to, '2026-10-30');
    assert.equal(range.from, '2026-10-01');
    assert.equal(range.previousTo, '2026-09-30');
    assert.equal(range.previousFrom, '2026-09-01');
  });

  it('swaps an inverted range and caps a span at 365 days', () => {
    const swapped = resolveRange({ from: '2026-10-10', to: '2026-10-02', now });
    assert.equal(swapped.from, '2026-10-02');
    assert.equal(swapped.to, '2026-10-10');

    const wide = resolveRange({ from: '2020-01-01', to: '2026-10-30', now });
    assert.equal(wide.to, '2026-10-30');
    assert.equal(wide.from, addDays('2026-10-30', -365));
  });
});

describe('analytics snapshot', () => {
  const range = {
    from: '2026-10-01',
    to: '2026-10-07',
    previousFrom: '2026-09-24',
    previousTo: '2026-09-30',
  };

  const snapshot = buildSnapshot({
    range,
    scope: 'company',
    truncated: false,
    people: [
      { id: 'user-1', name: 'Ada Lovelace' },
      { id: 'user-2', name: 'Grace Hopper' },
    ],
    tasks: [
      { id: 'a', title: 'A', status: 'completed', due_date: null, assigned_to_id: 'user-1', created_at: '2026-09-01T00:00:00.000Z', completed_at: '2026-10-03T08:00:00.000Z' },
      { id: 'b', title: 'B', status: 'completed', due_date: null, assigned_to_id: 'user-1', created_at: '2026-09-01T00:00:00.000Z', completed_at: '2026-10-04T08:00:00.000Z' },
      { id: 'c', title: 'C', status: 'completed', due_date: null, assigned_to_id: 'user-1', created_at: '2026-09-01T00:00:00.000Z', completed_at: '2026-10-05T08:00:00.000Z' },
      { id: 'd', title: 'D', status: 'completed', due_date: null, assigned_to_id: 'user-1', created_at: '2026-09-01T00:00:00.000Z', completed_at: '2026-09-28T08:00:00.000Z' },
      { id: 'e', title: 'E', status: 'completed', due_date: null, assigned_to_id: 'user-1', created_at: '2026-09-01T00:00:00.000Z', completed_at: '2026-09-29T08:00:00.000Z' },
      { id: 'f', title: '=cmd', status: 'todo', due_date: '2026-10-02T00:00:00.000Z', assigned_to_id: null, created_at: '2026-10-01T00:00:00.000Z', completed_at: null },
      { id: 'g', title: 'Fix door, north', status: 'todo', due_date: '2026-09-20T00:00:00.000Z', assigned_to_id: 'user-2', created_at: '2026-09-01T00:00:00.000Z', completed_at: null },
      { id: 'h', title: 'H', status: 'overdue', due_date: null, assigned_to_id: 'user-1', created_at: '2026-10-06T00:00:00.000Z', completed_at: null },
      { id: 'i', title: 'I', status: 'in_progress', due_date: '2026-10-20T00:00:00.000Z', assigned_to_id: 'user-1', created_at: '2026-10-01T00:00:00.000Z', completed_at: null },
    ],
    attendance: [
      { user_id: 'user-1', status: 'clocked_out', clock_in: '2026-09-26T08:00:00.000Z', created_at: '2026-09-26T08:00:00.000Z' },
      { user_id: 'user-1', status: 'clocked_out', clock_in: '2026-09-27T08:00:00.000Z', created_at: '2026-09-27T08:00:00.000Z' },
      { user_id: 'user-1', status: 'absent', clock_in: null, created_at: '2026-09-28T08:00:00.000Z' },
      { user_id: 'user-1', status: 'absent', clock_in: null, created_at: '2026-09-29T08:00:00.000Z' },
      { user_id: 'user-1', status: 'late', clock_in: '2026-10-03T09:00:00.000Z', created_at: '2026-09-01T00:00:00.000Z' },
      { user_id: 'user-1', status: 'late', clock_in: '2026-10-04T09:00:00.000Z', created_at: '2026-10-04T09:00:00.000Z' },
      { user_id: 'user-1', status: 'late', clock_in: '2026-10-05T09:00:00.000Z', created_at: '2026-10-05T09:00:00.000Z' },
      { user_id: 'user-1', status: 'absent', clock_in: null, created_at: '2026-10-06T08:00:00.000Z' },
      { user_id: 'user-1', status: 'pending', clock_in: null, created_at: '2026-10-07T08:00:00.000Z' },
    ],
    incidents: [
      { status: 'open', created_at: '2026-10-02T00:00:00.000Z' },
      { status: 'Critical', created_at: '2026-10-04T00:00:00.000Z' },
      { status: 'high', created_at: '2026-09-25T00:00:00.000Z' },
    ],
  });

  it('computes completion, overdue, attendance, and incident deltas', () => {
    const byId = Object.fromEntries(snapshot.kpis.map((kpi) => [kpi.id, kpi]));
    assert.equal(byId.completed.value, '3');
    assert.equal(byId.completed.deltaLabel, '+50%');
    assert.equal(byId.completed.tone, 'good');
    assert.equal(byId.overdue.value, '3');
    assert.equal(byId.overdue.deltaLabel, '+200%');
    assert.equal(byId.overdue.tone, 'bad');
    assert.equal(byId.attendance.value, '75%');
    assert.equal(byId.attendance.deltaLabel, '+25 pts');
    assert.equal(byId.incidents.value, '2');
    assert.equal(byId.incidents.deltaLabel, '+100%');
    assert.equal(byId.incidents.tone, 'bad');
  });

  it('keeps pending attendance out of the rate and classifies severity from status', () => {
    const recorded = snapshot.attendance.reduce((sum, point) => sum + point.recorded, 0);
    assert.equal(recorded, 4);
    assert.deepEqual(
      snapshot.severity.map((point) => [point.severity, point.count]),
      [['Critical', 1], ['High', 0], ['Medium', 0], ['Low', 0], ['Unspecified', 1]],
    );
    assert.equal(incidentSeverity('sev-2'), 'high');
    assert.equal(incidentSeverity('open'), 'unspecified');
  });

  it('ranks open workload and exports a formula-safe csv', () => {
    assert.deepEqual(snapshot.workload, [
      { name: 'Ada Lovelace', open: 2 },
      { name: 'Grace Hopper', open: 1 },
      { name: 'Unassigned', open: 1 },
    ]);
    const csv = analyticsToCsv(snapshot);
    assert.match(csv, /overdue_task,'=cmd,Unassigned,2026-10-02/);
    assert.match(csv, /"Fix door, north"/);
    assert.equal(relativeDelta(4, 0), null);
    assert.equal(formatDelta(null, 'percent'), 'No prior baseline');
  });

  it('folds assignees past the first eight into Others', () => {
    const people = Array.from({ length: 9 }, (_, index) => ({ id: `p${index}`, name: `Person ${index}` }));
    const tasks = people.map((person) => ({
      id: person.id,
      title: person.name,
      status: 'todo' as const,
      due_date: '2026-11-01T00:00:00.000Z',
      assigned_to_id: person.id,
      created_at: '2026-10-01T00:00:00.000Z',
      completed_at: null,
    }));
    const folded = buildSnapshot({
      range,
      scope: 'company',
      truncated: false,
      people,
      tasks,
      attendance: [],
      incidents: [],
    });
    assert.equal(folded.workload.length, 9);
    assert.equal(folded.workload.at(-1)?.name, 'Others');
    assert.equal(folded.workload.at(-1)?.open, 1);
  });
});
