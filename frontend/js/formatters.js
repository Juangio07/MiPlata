/**
 * MiPlata Financial Formatters & Date Utilities
 */

export const SPANISH_MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Formats a number to Colombian Peso format (dots as thousands separators)
 * e.g. 3500000 -> "$3.500.000" or "$3.500.000 COP"
 */
export function formatCOP(value, includeCOP = false) {
  const numeric = typeof value === 'string' ? parseInt(value.replace(/\D/g, '') || '0', 10) : Math.round(value || 0);
  const formatted = numeric.toLocaleString('es-CO');
  if (includeCOP) {
    return `$${formatted} COP`;
  }
  return `$${formatted}`;
}

export function formatCompactCOP(value) {
  const num = Math.round(value || 0);
  if (num >= 1000000) {
    const millions = (num / 1000000).toFixed(1).replace('.0', '');
    return `$${millions}M`;
  }
  if (num >= 1000) {
    const thousands = (num / 1000).toFixed(0);
    return `$${thousands}k`;
  }
  return `$${num}`;
}

export function parseRawNumber(val) {
  if (!val) return 0;
  const cleaned = String(val).replace(/\D/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

export function getCurrentDateFormatted() {
  const now = new Date();
  const day = now.getDate();
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const month = months[now.getMonth()];
  return `Hoy, ${day} ${month} (Automática)`;
}

export function getCurrentTimeString() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesFormatted = minutes < 10 ? `0${minutes}` : minutes;
  return `${hours}:${minutesFormatted} ${ampm}`;
}

export function getTodayISODate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getInitials(name) {
  if (!name || !name.trim()) return 'MP';
  const clean = name.trim().replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'MP';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatMonthKeyToLabel(monthKey) {
  if (!monthKey || !monthKey.includes('-')) {
    const now = new Date();
    return `${SPANISH_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  }
  const [yearStr, monthStr] = monthKey.split('-');
  const monthNum = parseInt(monthStr, 10) - 1;
  const monthName = SPANISH_MONTHS[monthNum] || monthStr;
  return `${monthName} ${yearStr}`;
}

export function getAvailableMonthsList(count = 6) {
  const list = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const key = `${year}-${month}`;
    const label = `${SPANISH_MONTHS[d.getMonth()]} ${year}`;
    list.push({ key, label });
  }
  return list;
}
