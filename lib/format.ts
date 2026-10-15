export const SCHOOL_TIME_ZONE = "America/Recife";

export function schoolClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHOOL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (name: string) =>
    parts.find((part) => part.type === name)?.value || "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
  };
}

export function formatDate(
  date: string,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" },
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Data não informada";
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: SCHOOL_TIME_ZONE,
    ...options,
  }).format(parsed);
}

export function formatMoney(value: number | string) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatMonth(month: string) {
  return formatDate(`${month}-01`, { month: "long", year: "numeric" });
}

export function calculateAge(birthDate: string, today = schoolClock().date) {
  if (!birthDate || birthDate > today) return null;
  const [year, month, day] = birthDate.split("-").map(Number);
  const [thisYear, thisMonth, thisDay] = today.split("-").map(Number);
  if (!year || !month || !day) return null;
  return (
    thisYear -
    year -
    (thisMonth < month || (thisMonth === month && thisDay < day) ? 1 : 0)
  );
}

export const weekDays = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

export function normalizeWeekDay(day: string) {
  const value = day.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  return weekDays.find(short => value.startsWith(short)) ?? value;
}

export function weekDayLabel(day: string) {
  const labels: Record<string, string> = { dom: 'Domingo', seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado' };
  return labels[normalizeWeekDay(day)] || day;
}

export function nextTraining(
  days: string[] | null | undefined,
  startTime: string | null | undefined,
  now = new Date(),
) {
  if (!days?.length || !startTime) return null;
  const clock = schoolClock(now);
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(`${clock.date}T12:00:00Z`);
    candidate.setUTCDate(candidate.getUTCDate() + offset);
    if (
      days.some(day => normalizeWeekDay(day) === weekDays[candidate.getUTCDay()]) &&
      (offset > 0 || startTime.slice(0, 5) > clock.time)
    ) {
      return {
        date: candidate.toISOString().slice(0, 10),
        time: startTime.slice(0, 5),
      };
    }
  }
  return null;
}
