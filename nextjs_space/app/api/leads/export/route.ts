export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' } })
  const header = 'Nombre,Teléfono,Estado WhatsApp,Último Contacto,Notas'
  const rows = leads.map((l: any) =>
    `"${l.name}","${l.phone}","${l.whatsappStatus}","${l.lastContactedAt ?? ''}","${(l.notes ?? '').replace(/"/g, '""')}"`
  )
  const csv = [header, ...rows].join('\n')
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="leads.csv"',
    },
  })
}
