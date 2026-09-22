export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const templates = await prisma.template.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(templates)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const { name, content } = await req.json()
    if (!name || !content) return NextResponse.json({ error: 'Nombre y contenido requeridos' }, { status: 400 })
    const template = await prisma.template.create({ data: { name, content } })
    return NextResponse.json(template, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear plantilla' }, { status: 500 })
  }
}
