export function isGoalCompleted(goal) {
  const targetAmount = Number(goal?.targetAmount) || 0;
  return targetAmount > 0 && (Number(goal?.currentAmount) || 0) >= targetAmount;
}

export function getGoalCompletionDate(goal, contributions = []) {
  const targetAmount = Number(goal?.targetAmount) || 0;
  if (targetAmount <= 0) return null;

  let accumulatedAmount = 0;
  const goalContributions = contributions
    .filter((contribution) => String(contribution?.goalId || '') === String(goal?.id || ''))
    .sort((left, right) => (Number(left?.timestamp) || 0) - (Number(right?.timestamp) || 0));

  for (const contribution of goalContributions) {
    accumulatedAmount += Number(contribution?.amount) || 0;
    if (accumulatedAmount >= targetAmount) return contribution.date || null;
  }

  return null;
}
