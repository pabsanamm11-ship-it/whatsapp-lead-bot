export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { normalizePhone } from '@/lib/phone-utils'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(leads)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const { name, phone, notes } = await req.json()
    if (!name || !phone) {
      return NextResponse.json({ error: 'Nombre y teléfono requeridos' }, { status: 400 })
    }
    const normalized = normalizePhone(phone)
    const existing = await prisma.lead.findUnique({ where: { phone: normalized } })
    if (existing) {
      return NextResponse.json({ error: 'Este número ya existe' }, { status: 409 })
    }
    const lead = await prisma.lead.create({
      data: { name, phone: normalized, notes: notes ?? null },
    })
    return NextResponse.json(lead, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear lead' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const { ids } = await req.json()
    if (!ids?.length) return NextResponse.json({ error: 'IDs requeridos' }, { status: 400 })
    await prisma.lead.deleteMany({ where: { id: { in: ids } } })
    return NextResponse.json({ deleted: ids.length })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
