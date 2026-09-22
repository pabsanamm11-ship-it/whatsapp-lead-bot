export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        template: true,
        campaignLeads: {
          include: { lead: true },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { campaignLeads: true, messageLogs: true } },
      },
    })
    if (!campaign) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(campaign)
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  try {
    const body = await req.json()
    const data: any = {}
    if (body.name) data.name = body.name
    if (body.status) data.status = body.status
    if (body.dailyLimit) data.dailyLimit = Math.min(body.dailyLimit, 100)
    const campaign = await prisma.campaign.update({ where: { id }, data })
    return NextResponse.json(campaign)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  try {
    await prisma.campaign.delete({ where: { id } })
    return NextResponse.json({ deleted: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
