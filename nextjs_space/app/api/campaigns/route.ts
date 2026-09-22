export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      template: true,
      _count: { select: { campaignLeads: true } },
    },
  })
  return NextResponse.json(campaigns)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const { name, templateId, dailyLimit, startDate, leadIds } = await req.json()
    if (!name || !templateId) return NextResponse.json({ error: 'Nombre y plantilla requeridos' }, { status: 400 })
    if (!leadIds?.length) return NextResponse.json({ error: 'Seleccione al menos un lead' }, { status: 400 })

    const campaign = await prisma.campaign.create({
      data: {
        name,
        templateId,
        dailyLimit: Math.min(dailyLimit ?? 100, 100),
        startDate: startDate ? new Date(startDate) : new Date(),
        status: 'draft',
        campaignLeads: {
          create: leadIds.map((leadId: string) => ({ leadId })),
        },
      },
      include: { template: true, _count: { select: { campaignLeads: true } } },
    })
    return NextResponse.json(campaign, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Error al crear campaña' }, { status: 500 })
  }
}
