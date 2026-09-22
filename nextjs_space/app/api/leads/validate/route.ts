export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getTwilioClient, getTwilioWhatsAppNumber, isTwilioConfigured } from '@/lib/twilio'

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!isTwilioConfigured()) {
    return NextResponse.json({ error: 'Twilio no configurado. Configure las credenciales en el panel.' }, { status: 400 })
  }
  try {
    const { leadIds } = await req.json()
    if (!leadIds?.length) return NextResponse.json({ error: 'IDs requeridos' }, { status: 400 })

    const client = getTwilioClient()
    if (!client) return NextResponse.json({ error: 'Error de cliente Twilio' }, { status: 500 })

    const from = getTwilioWhatsAppNumber()
    const results: { id: string; status: string; error?: string }[] = []

    for (const id of leadIds) {
      const lead = await prisma.lead.findUnique({ where: { id } })
      if (!lead) { results.push({ id, status: 'not_found' }); continue }

      try {
        // Attempt to send a silent validation message
        await client.messages.create({
          from,
          to: `whatsapp:${lead.phone}`,
          body: '\u200B', // Zero-width space as minimal message
        })
        // If success, the number is on WhatsApp
        await prisma.lead.update({ where: { id }, data: { whatsappStatus: 'valid' } })
        results.push({ id, status: 'valid' })
      } catch (err: any) {
        const code = err?.code ?? err?.status
        if (code === 63003) {
          await prisma.lead.update({ where: { id }, data: { whatsappStatus: 'invalid' } })
          results.push({ id, status: 'invalid' })
        } else {
          results.push({ id, status: 'error', error: err?.message ?? 'Error desconocido' })
        }
      }

      // Rate limit: 1 per second
      await new Promise((r) => setTimeout(r, 1000))
    }

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ error: 'Error al validar' }, { status: 500 })
  }
}
