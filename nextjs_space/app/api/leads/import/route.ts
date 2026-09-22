export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { normalizePhone } from '@/lib/phone-utils'

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Archivo CSV requerido' }, { status: 400 })
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter((l: string) => l.trim())
    if (lines.length < 2) return NextResponse.json({ error: 'CSV vacío o sin datos' }, { status: 400 })

    const header = lines[0].toLowerCase()
    const cols = header.split(/[,;\t]/)
    const nameIdx = cols.findIndex((c: string) => c.trim().includes('nombre') || c.trim().includes('name'))
    const phoneIdx = cols.findIndex((c: string) => c.trim().includes('tel') || c.trim().includes('phone') || c.trim().includes('número') || c.trim().includes('numero'))
    const notesIdx = cols.findIndex((c: string) => c.trim().includes('nota') || c.trim().includes('notes') || c.trim().includes('observ'))

    if (nameIdx === -1 || phoneIdx === -1) {
      return NextResponse.json({ error: 'CSV debe tener columnas de nombre y teléfono' }, { status: 400 })
    }

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(/[,;\t]/)
      const name = vals[nameIdx]?.trim()
      const phone = vals[phoneIdx]?.trim()
      const notes = notesIdx >= 0 ? vals[notesIdx]?.trim() : null
      if (!name || !phone) { skipped++; continue }
      try {
        const normalized = normalizePhone(phone)
        await prisma.lead.upsert({
          where: { phone: normalized },
          update: { name, notes: notes ?? undefined },
          create: { name, phone: normalized, notes },
        })
        imported++
      } catch {
        skipped++
        errors.push(`Fila ${i + 1}: error con ${phone}`)
      }
    }

    return NextResponse.json({ imported, skipped, errors })
  } catch {
    return NextResponse.json({ error: 'Error al procesar CSV' }, { status: 500 })
  }
}
