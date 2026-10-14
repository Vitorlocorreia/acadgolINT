export function extractMatchFee(notes: string | null): number {
  if (!notes) return 0
  try {
    const parsed = JSON.parse(notes)
    if (typeof parsed?.fee === 'number') return parsed.fee
    if (typeof parsed?.registration_fee === 'number') return parsed.registration_fee
  } catch {
    const match = notes.match(/taxa:\s*r?\$?\s*([0-9]+([.,][0-9]+)?)/i)
    if (match && match[1]) {
      return parseFloat(match[1].replace(',', '.')) || 0
    }
  }
  return 0
}
