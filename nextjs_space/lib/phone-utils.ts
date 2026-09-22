/**
 * Normalize phone to E.164 format.
 * If no country code prefix, assumes Costa Rica (+506).
 */
export function normalizePhone(raw: string): string {
  let cleaned = raw.replace(/[^\d+]/g, '')
  if (!cleaned.startsWith('+')) {
    // If it's 8 digits assume CR
    if (cleaned.length === 8) {
      cleaned = '+506' + cleaned
    } else if (cleaned.startsWith('506') && cleaned.length === 11) {
      cleaned = '+' + cleaned
    } else {
      cleaned = '+' + cleaned
    }
  }
  return cleaned
}

export function formatPhoneDisplay(phone: string): string {
  if (phone?.startsWith('+506') && phone.length === 12) {
    return `+506 ${phone.slice(4, 8)}-${phone.slice(8)}`
  }
  return phone ?? ''
}
