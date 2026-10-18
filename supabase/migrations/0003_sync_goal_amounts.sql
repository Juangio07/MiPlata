-- El valor aportado de cada meta debe ser la suma de sus registros de aporte.
update public.savings_goals as goals
set current_amount = coalesce((
  select sum(contributions.amount)
  from public.goal_contributions as contributions
  where contributions.goal_id = goals.id
    and contributions.user_id = goals.user_id
), 0);
