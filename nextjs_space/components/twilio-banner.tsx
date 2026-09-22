'use client'
import { useEffect, useState } from 'react'
import { AlertTriangle, ExternalLink } from 'lucide-react'

export default function TwilioBanner() {
  const [configured, setConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/twilio-status').then(r => r.json()).then(d => setConfigured(d?.configured ?? false)).catch(() => setConfigured(false))
  }, [])

  if (configured === null || configured) return null

  return (
    <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-amber-900">Twilio no configurado</p>
        <p className="text-xs text-amber-700">
          Para validar números y enviar mensajes por WhatsApp, configure sus credenciales de Twilio 
          en las variables de entorno: <code className="font-mono bg-amber-100 px-1 rounded">TWILIO_ACCOUNT_SID</code>,{' '}
          <code className="font-mono bg-amber-100 px-1 rounded">TWILIO_AUTH_TOKEN</code> y{' '}
          <code className="font-mono bg-amber-100 px-1 rounded">TWILIO_WHATSAPP_NUMBER</code>.
        </p>
        <a href="https://console.twilio.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-amber-800 hover:text-amber-900 font-medium mt-1">
          <ExternalLink className="w-3 h-3" /> Consola de Twilio
        </a>
      </div>
    </div>
  )
}
