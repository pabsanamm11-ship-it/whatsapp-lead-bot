import Twilio from 'twilio'

let twilioClient: ReturnType<typeof Twilio> | null = null

export function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token || sid === 'YOUR_TWILIO_ACCOUNT_SID' || token === 'YOUR_TWILIO_AUTH_TOKEN') {
    return null
  }
  if (!twilioClient) {
    twilioClient = Twilio(sid, token)
  }
  return twilioClient
}

export function getTwilioWhatsAppNumber(): string {
  return process.env.TWILIO_WHATSAPP_NUMBER ?? 'whatsapp:+14155238886'
}

export function isTwilioConfigured(): boolean {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  return !!(sid && token && sid !== 'YOUR_TWILIO_ACCOUNT_SID' && token !== 'YOUR_TWILIO_AUTH_TOKEN')
}
