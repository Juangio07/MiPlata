/**
 * MiPlata Financial Insights & Alerts Engine
 */
import { formatCOP } from './formatters.js';

export function getTimeSlotInfo() {
  const hour = new Date().getHours();
  const isMorning = hour >= 5 && hour < 14;
  return {
    slot: isMorning ? 'morning' : 'evening',
    label: isMorning ? 'Turno Mañana' : 'Turno Tarde/Noche',
    periodBadge: isMorning ? '☀️ Mañana' : '🌙 Tarde/Noche',
    focusText: isMorning ? 'Planeación y presupuesto diario' : 'Ahorro y balance de jornada',
    icon: isMorning ? 'sun' : 'moon',
  };
}

export function getDaysUntilNextQuincena() {
  const now = new Date();
  const day = now.getDate();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

  if (day < 15) {
    const diff = 15 - day;
    return { days: diff, targetDateLabel: 'la quincena del 15' };
  } else if (day < lastDayOfMonth) {
    const diff = lastDayOfMonth - day;
    return { days: diff === 0 ? 1 : diff, targetDateLabel: 'fin de mes / quincena del 30' };
  } else {
    return { days: 15, targetDateLabel: 'la próxima quincena' };
  }
}

export function getObligationUrgency(obligation, todayDay = new Date().getDate()) {
  const due = obligation.dueDay;
  const diff = due - todayDay;

  if (diff < 0) {
    const overdueDays = Math.abs(diff);
    return {
      obligation,
      daysDiff: overdueDays,
      status: 'overdue',
      label: overdueDays === 1 ? `Venció ayer (Día ${due})` : `Venció hace ${overdueDays} días (Día ${due})`,
      badgeColor: 'bg-rose-100 text-rose-700 border-rose-200',
    };
  }

  if (diff === 0) {
    return {
      obligation,
      daysDiff: 0,
      status: 'today',
      label: `¡Vence hoy! (Día ${due})`,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse',
    };
  }

  if (diff <= 3) {
    return {
      obligation,
      daysDiff: diff,
      status: 'upcoming',
      label: diff === 1 ? `Vence mañana (Día ${due})` : `Vence en ${diff} días (Día ${due})`,
      badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
    };
  }

  return {
    obligation,
    daysDiff: diff,
    status: 'far',
    label: `Vence el Día ${due}`,
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
  };
}

export function getSortedPendingObligations(obligations) {
  const todayDay = new Date().getDate();
  const pending = obligations.filter((o) => o.status === 'pending');

  return pending
    .map((o) => getObligationUrgency(o, todayDay))
    .sort((a, b) => {
      const rank = (item) => {
        if (item.status === 'today') return 0;
        if (item.status === 'overdue') return 1;
        if (item.status === 'upcoming') return 2;
        return 3;
      };
      const rankDiff = rank(a) - rank(b);
      if (rankDiff !== 0) return rankDiff;
      return a.daysDiff - b.daysDiff;
    });
}

export function getFinancialAlerts(data) {
  const alerts = [];
  const {
    currentUser = null,
    alert80Percent,
    fixedObligations = [],
    totalIncome = 0,
    totalExpenses = 0,
    availableCash = 0,
    fixedCommitted = 0,
    monthlyBudgetLimit = 0,
    monthlyBudgetSpent = 0,
    monthlyBudgetRemaining = 0,
    monthlyBudgetPercent = 0,
  } = data;
  const budgetAlertEnabled = alert80Percent ?? currentUser?.alert80Percent ?? true;

  // 1. Budget Limit Alerts
  if (monthlyBudgetLimit > 0 && budgetAlertEnabled) {
    if (monthlyBudgetSpent > monthlyBudgetLimit) {
      const overAmount = monthlyBudgetSpent - monthlyBudgetLimit;
      alerts.push({
        id: 'alert_budget_exceeded',
        type: 'danger',
        title: `Presupuesto mensual superado (+${monthlyBudgetPercent}%)`,
        description: `Has gastado ${formatCOP(monthlyBudgetSpent)}, excediendo tu límite por ${formatCOP(overAmount, true)}. Te recomendamos pausar compras no urgentes.`,
        actionLabel: 'Ver gastos',
        actionTab: 'gastos',
      });
    } else if (monthlyBudgetPercent >= 80) {
      alerts.push({
        id: 'alert_budget_80',
        type: 'warning',
        title: `Alerta preventiva: ${monthlyBudgetPercent}% de presupuesto usado`,
        description: `Has consumido ${formatCOP(monthlyBudgetSpent)} de tu presupuesto mensual. Te quedan ${formatCOP(monthlyBudgetRemaining, true)} disponibles.`,
        actionLabel: 'Controlar gastos',
        actionTab: 'gastos',
      });
    }
  }

  // 2. Cashflow / Deficit Alert
  if (totalIncome > 0 && totalExpenses + fixedCommitted > totalIncome) {
    const deficit = totalExpenses + fixedCommitted - totalIncome;
    alerts.push({
      id: 'alert_cashflow_negative',
      type: 'danger',
      title: 'Compromisos superan ingresos del mes',
      description: `Tus gastos acumulados más compromisos fijos (${formatCOP(totalExpenses + fixedCommitted)}) exceden lo recibido por ${formatCOP(deficit, true)}.`,
      actionLabel: 'Ver balance',
      actionTab: 'inicio',
      actionFocus: 'balance',
    });
  } else if (totalIncome === 0 && totalExpenses > 0) {
    alerts.push({
      id: 'alert_no_income_registered',
      type: 'info',
      title: 'Aún no registras ingresos este mes',
      description: `Tienes ${formatCOP(totalExpenses)} en gastos. Registra tus ingresos recibidos para calcular con exactitud tu dinero disponible real.`,
      actionLabel: 'Registrar ingreso',
      actionTab: 'ingresos',
    });
  } else if (totalIncome > 0 && availableCash === 0 && (totalExpenses > 0 || fixedCommitted > 0)) {
    alerts.push({
      id: 'alert_zero_available',
      type: 'warning',
      icon: 'wallet',
      title: 'Dinero disponible en $0 COP',
      description: 'Todos tus ingresos del mes están comprometidos en gastos ya pagados o cuotas pendientes.',
      actionLabel: 'Ver compromisos',
      actionTab: 'obligaciones',
    });
  }

  return alerts;
}

export function getFinancialTips(data) {
  const {
    currentUser,
    transactions = [],
    fixedObligations = [],
    savingsGoals = [],
    totalIncome = 0,
    effectiveMonthlyIncome = 0,
    totalExpenses = 0,
    availableCash = 0,
    fixedTotal = 0,
  } = data;

  const rawTips = [];

  const salary = effectiveMonthlyIncome || currentUser?.monthlySalary || currentUser?.monthlyBudgetLimit || totalIncome || 0;
  const savingsRulePercent = (currentUser?.budgetRule?.savings || 20) / 100;
  const needsRulePercent = (currentUser?.budgetRule?.needs || 50) / 100;
  const wantsRulePercent = (currentUser?.budgetRule?.wants || 30) / 100;

  // The amount recommended for a goal can never be greater than the current
  // available cash. Pending fixed obligations are not deducted until they
  // are actually paid and recorded as expenses.
  const goalCash = Math.max(0, availableCash);
  const realisticMonthlySavingsCap = Math.min(
    goalCash,
    salary > 0 ? Math.round(salary * savingsRulePercent) : Math.round(goalCash * 0.2),
  );
  const realisticQuincenalCap = realisticMonthlySavingsCap > 0
    ? Math.min(goalCash, Math.max(1000, Math.round((realisticMonthlySavingsCap / 2) / 10000) * 10000))
    : 0;

  // PILLAR 1: 50/30/20 Rule
  if (salary > 0) {
    const suggestedNeeds = Math.round(salary * needsRulePercent);
    const suggestedWants = Math.round(salary * wantsRulePercent);
    const suggestedSavings = Math.round(salary * savingsRulePercent);
    const quincenalSavingsIdeal = Math.round((suggestedSavings / 2) / 10000) * 10000;

    if (fixedTotal > 0 && fixedTotal <= suggestedNeeds) {
      const margin = suggestedNeeds - fixedTotal;
      rawTips.push({
        id: 'tip_distrib_healthy',
        tag: 'Distribución 50/30/20',
        title: `Distribución ideal para tus ${formatCOP(salary, true)}/mes`,
        message: `Para tu salario de ${formatCOP(salary)}, la regla ideal sugiere: Necesidades ${formatCOP(suggestedNeeds)} (50%), Gustos ${formatCOP(suggestedWants)} (30%) y Ahorro ${formatCOP(suggestedSavings)} (20% o ${formatCOP(quincenalSavingsIdeal, true)} por quincena). Tus fijos actuales suman ${formatCOP(fixedTotal)}, ¡dejándote ${formatCOP(margin, true)} de margen favorable en necesidades!`,
        actionLabel: 'Ver distribución',
        actionTab: 'perfil',
        iconType: 'budget',
      });
    } else if (fixedTotal > suggestedNeeds) {
      const overNeeds = fixedTotal - suggestedNeeds;
      rawTips.push({
        id: 'tip_distrib_high_fixed',
        tag: 'Distribución 50/30/20',
        title: `Gastos fijos superan el 50% de tus ingresos`,
        message: `Con un salario de ${formatCOP(salary)}, el tope recomendado para fijos es ${formatCOP(suggestedNeeds)}. Actualmente tienes ${formatCOP(fixedTotal)} comprometidos (+${formatCOP(overNeeds, true)} sobre lo ideal). Evaluar suscripciones o renegociar tarifas te devolverá oxígeno mensual.`,
        actionLabel: 'Revisar fijos',
        actionTab: 'obligaciones',
        iconType: 'fixed',
      });
    } else {
      rawTips.push({
        id: 'tip_distrib_overview',
        tag: 'Distribución 50/30/20',
        title: `Tu fórmula mensual con salario de ${formatCOP(salary, true)}`,
        message: `La distribución recomendada para tu ingreso es: ${formatCOP(suggestedNeeds)} en compromisos básicos, ${formatCOP(suggestedWants)} para entretenimiento y estilo de vida, y ${formatCOP(suggestedSavings)} (${formatCOP(quincenalSavingsIdeal, true)} quincenal) para hacer crecer tus ahorros.`,
        actionLabel: 'Configurar regla',
        actionTab: 'perfil',
        iconType: 'budget',
      });
    }
  }

  // PILLAR 2: Top Expense Category
  const expenseTxs = transactions.filter((t) => t.type === 'gasto');
  if (expenseTxs.length > 0) {
    const catTotals = {};
    expenseTxs.forEach((t) => {
      catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });
    let topCat = '';
    let topAmount = 0;
    Object.entries(catTotals).forEach(([cat, amt]) => {
      if (amt > topAmount) {
        topAmount = amt;
        topCat = cat;
      }
    });

    if (topCat && topAmount > 0 && totalExpenses > 0) {
      const pct = Math.round((topAmount / totalExpenses) * 100);
      rawTips.push({
        id: 'tip_category_focus',
        tag: 'Concentración de Gastos',
        title: `${topCat} concentra el ${pct}% de tus gastos`,
        message: `Has destinado ${formatCOP(topAmount, true)} en ${topCat} este mes. Es tu categoría principal de consumo. Monitorear pequeños consumos diarios aquí es el camino más rápido para liberar liquidez.`,
        actionLabel: `Ver ${topCat}`,
        actionTab: 'gastos',
        iconType: 'category',
      });
    }
  }

  // PILLAR 3: Savings Goals Boost
  const incompleteGoal = savingsGoals.find((g) => g.currentAmount < g.targetAmount);
  if (incompleteGoal) {
    const remaining = incompleteGoal.targetAmount - incompleteGoal.currentAmount;
    const suggestedBoost = Math.min(
      remaining,
      goalCash,
      Math.max(1000, Math.round((goalCash * 0.12) / 10000) * 10000),
      realisticQuincenalCap || goalCash,
    );
    if (goalCash >= 50000 && suggestedBoost >= 50000) {
      rawTips.push({
        id: 'tip_goal_boost',
        tag: 'Impulso a Metas',
        title: `Acelera tu meta "${incompleteGoal.name}"`,
        message: `Tienes ${formatCOP(goalCash)} disponibles. Si apartas ${formatCOP(suggestedBoost, true)}, tu meta alcanzará el ${Math.round(((incompleteGoal.currentAmount + suggestedBoost) / incompleteGoal.targetAmount) * 100)}% sin superar tu saldo disponible.`,
        actionLabel: 'Aportar ahora',
        actionTab: 'metas',
        iconType: 'goal',
      });
    }
  }

  // Additional rotating advice keeps the home carousel useful even when the
  // person has few movements recorded. Every message is calculated from the
  // configured salary, budget rule, commitments, cash and savings goals.
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - new Date().getDate() + 1);
  const availableForVariableSpending = Math.max(0, salary - fixedTotal - realisticMonthlySavingsCap);
  const dailyVariableLimit = Math.max(0, Math.round((availableForVariableSpending / daysInMonth) / 1000) * 1000);
  const fixedShare = salary > 0 ? Math.round((fixedTotal / salary) * 100) : 0;
  const emergencyGoal = savingsGoals.find((goal) => /emergencia|emergency/i.test(goal.name || ''));
  const emergencyTarget = salary > 0 ? Math.round((salary * 3) / 100000) * 100000 : 0;
  const emergencySaved = emergencyGoal?.currentAmount || 0;
  const nextGoal = savingsGoals.find((goal) => goal.currentAmount < goal.targetAmount);
  const nextGoalRemaining = nextGoal ? Math.max(0, nextGoal.targetAmount - nextGoal.currentAmount) : 0;
  const nextGoalMonthly = nextGoal
    ? Math.min(goalCash, Math.max(1000, Math.ceil((nextGoalRemaining / 6) / 10000) * 10000))
    : realisticMonthlySavingsCap;

  const additionalTips = [
    {
      id: 'tip_daily_limit',
      tag: 'Control diario',
      title: dailyVariableLimit > 0 ? `Tu ritmo diario ideal es ${formatCOP(dailyVariableLimit, true)}` : 'Protege tu dinero disponible',
      message: dailyVariableLimit > 0
        ? `Después de separar ${formatCOP(fixedTotal, true)} para compromisos y ${formatCOP(realisticMonthlySavingsCap, true)} para ahorro, puedes usar hasta ${formatCOP(dailyVariableLimit, true)} por día en gastos variables durante este mes.`
        : `Tu salario de ${formatCOP(salary, true)} ya está muy comprometido. Antes de realizar compras no esenciales, revisa cuánto dinero queda disponible y prioriza tus pagos pendientes.`,
      actionLabel: 'Ver gastos',
      actionTab: 'gastos',
      iconType: 'daily',
    },
    {
      id: 'tip_fixed_ratio',
      tag: 'Compromisos fijos',
      title: fixedShare <= 50 ? 'Tus compromisos fijos están en una zona saludable' : 'Tus compromisos fijos necesitan atención',
      message: salary > 0
        ? `Tus gastos fijos representan aproximadamente el ${fixedShare}% de tu sueldo mensual (${formatCOP(fixedTotal, true)} de ${formatCOP(salary, true)}). ${fixedShare <= 50 ? 'Mantenerlos por debajo del 50% te deja espacio para vivir y ahorrar.' : 'Busca reducir suscripciones o renegociar servicios para recuperar margen.'}`
        : 'Registra tu sueldo mensual para calcular qué proporción de tus ingresos está comprometida en gastos fijos.',
      actionLabel: 'Revisar fijos',
      actionTab: 'obligaciones',
      iconType: 'fixed',
    },
    {
      id: 'tip_emergency_buffer',
      tag: 'Fondo de emergencia',
      title: emergencyGoal ? `Haz crecer tu fondo de emergencia` : 'Construye un fondo de emergencia',
      message: salary > 0
        ? `${emergencyGoal ? `Ya tienes ${formatCOP(emergencySaved, true)} protegidos. ` : ''}Una meta inicial razonable es reunir cerca de ${formatCOP(emergencyTarget, true)}, equivalente a tres meses de tu sueldo. Separar ${formatCOP(realisticMonthlySavingsCap, true)} cada mes te acercará sin descuidar tus gastos.`
        : 'Un fondo de emergencia te ayuda a cubrir imprevistos sin endeudarte. Empieza con un aporte pequeño y constante.',
      actionLabel: emergencyGoal ? 'Aportar ahora' : 'Crear fondo',
      actionTab: 'metas',
      iconType: 'safety',
    },
    {
      id: 'tip_goal_schedule',
      tag: 'Plan de ahorro',
      title: nextGoal ? `Programa tu próxima meta: "${nextGoal.name}"` : 'Convierte tu ahorro en una meta',
      message: nextGoal
        ? nextGoalMonthly > 0
          ? `Te faltan ${formatCOP(nextGoalRemaining, true)}. Si separas alrededor de ${formatCOP(nextGoalMonthly, true)} al mes, avanzarás de forma constante sin superar tu saldo disponible.`
          : `Te faltan ${formatCOP(nextGoalRemaining, true)}, pero ahora no tienes saldo disponible para aportar.`
        : `Con un sueldo de ${formatCOP(salary, true)}, apartar ${formatCOP(realisticMonthlySavingsCap, true)} al mes puede convertirse en una meta concreta y medible.`,
      actionLabel: 'Ver metas',
      actionTab: 'metas',
      iconType: 'goal',
    },
    {
      id: 'tip_monthly_review',
      tag: 'Cierre mensual',
      title: totalExpenses > 0 ? `Ya llevas ${formatCOP(totalExpenses, true)} en gastos este mes` : 'Registra tus movimientos del mes',
      message: totalExpenses > 0
        ? `Te quedan aproximadamente ${formatCOP(Math.max(0, salary - totalExpenses), true)} de tu ingreso mensual antes de separar compromisos y ahorro. Revisar tus movimientos hoy evita sorpresas al cierre.`
        : `Registrar cada gasto te permite comparar tu comportamiento con el sueldo de ${formatCOP(salary, true)} y tomar decisiones antes de que el dinero se disperse.`,
      actionLabel: 'Ver historial',
      actionTab: 'gastos',
      iconType: 'review',
    },
    {
      id: 'tip_income_visibility',
      tag: 'Ingresos y balance',
      title: totalIncome > 0 ? 'Tu balance se ve mejor cuando registras todo' : 'Registra tu ingreso mensual',
      message: totalIncome > 0
        ? `Has registrado ${formatCOP(totalIncome, true)} este mes y tienes ${formatCOP(availableCash, true)} disponibles. Mantén tus ingresos al día para que las recomendaciones se ajusten a tu realidad.`
        : `Conocer tu sueldo real de ${formatCOP(salary, true)} es el primer paso para distribuirlo entre necesidades, gustos, ahorro y metas.`,
      actionLabel: totalIncome > 0 ? 'Ver balance' : 'Registrar ingreso',
      actionTab: totalIncome > 0 ? 'inicio' : 'ingresos',
      iconType: 'income',
    },
  ];

  additionalTips.forEach((tip) => {
    if (!rawTips.some((existingTip) => existingTip.id === tip.id)) rawTips.push(tip);
  });

  while (rawTips.length < 7) {
    rawTips.push({
      id: `tip_balance_${rawTips.length}`,
      tag: 'Bienestar financiero',
      title: 'Haz que tu dinero trabaje para ti',
      message: `Con un ingreso mensual de ${formatCOP(salary, true)}, cada decisión pequeña cuenta. Separa primero tus compromisos y luego define un aporte automático para tus metas.`,
      actionLabel: 'Ver metas',
      actionTab: 'metas',
      iconType: 'goal',
    });
  }

  const goalBoost = rawTips.find((tip) => tip.id === 'tip_goal_boost');
  const orderedTips = goalBoost
    ? [goalBoost, ...rawTips.filter((tip) => tip.id !== 'tip_goal_boost')]
    : rawTips;

  return orderedTips.slice(0, 7);
}

export function getDynamicGreetingStatus(data) {
  const { currentUser, availableCash = 0, fixedCommitted = 0, totalIncome = 0 } = data;
  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Hola';

  const hour = new Date().getHours();
  let greeting = 'Hola';
  if (hour >= 5 && hour < 12) greeting = 'Buenos días';
  else if (hour >= 12 && hour < 19) greeting = 'Buenas tardes';
  else greeting = 'Buenas noches';

  let subtitle = 'Saludable y bajo control';
  let statusColor = 'text-[#006c49]';

  if (availableCash > 0 && fixedCommitted === 0) {
    subtitle = '¡Al día! Todo cubierto este mes';
    statusColor = 'text-[#006c49]';
  } else if (availableCash > 0 && fixedCommitted > 0) {
    subtitle = 'Equilibrado • Compromisos cubiertos';
    statusColor = 'text-[#0058bc]';
  } else if (totalIncome > 0 && availableCash <= 0) {
    subtitle = 'Atención: Saldo disponible ajustado';
    statusColor = 'text-amber-700';
  } else if (totalIncome === 0) {
    subtitle = 'Listo para registrar tus finanzas';
    statusColor = 'text-slate-500';
  }

  return {
    title: `${greeting}, ${firstName}`,
    subtitle,
    statusColor,
  };
}
