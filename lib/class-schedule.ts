export const shiftLabels: Record<string, string> = {
  morning: 'Manhã', afternoon: 'Tarde', evening: 'Noite',
}

export function classScheduleLabel(value: { start_time?: string | null; end_time?: string | null; shift?: string | null }) {
  if (value.start_time && value.end_time) return `${value.start_time.slice(0, 5)} – ${value.end_time.slice(0, 5)}`
  return `${shiftLabels[value.shift || ''] || 'Turno a confirmar'} · horário a confirmar`
}

export function shiftFromTime(time: string) {
  const hour = Number(time.slice(0, 2))
  return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
}
