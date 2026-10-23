import assert from 'node:assert/strict';
import { getGoalCompletionDate, isGoalCompleted } from '../frontend/js/goal-history.js';

const goal = { id: 'goal-1', targetAmount: 300000, currentAmount: 300000 };
assert.equal(isGoalCompleted(goal), true);
assert.equal(isGoalCompleted({ ...goal, currentAmount: 299999 }), false);
assert.equal(isGoalCompleted({ ...goal, targetAmount: 0 }), false);

const contributions = [
  { goalId: 'goal-1', amount: 200000, date: '2026-10-20', timestamp: 2 },
  { goalId: 'goal-1', amount: 100000, date: '2026-10-18', timestamp: 1 },
  { goalId: 'other', amount: 500000, date: '2026-10-19', timestamp: 3 },
];
assert.equal(getGoalCompletionDate(goal, contributions), '2026-10-20');
assert.equal(getGoalCompletionDate({ ...goal, id: 'missing' }, contributions), null);

console.log('Goal history checks passed.');
