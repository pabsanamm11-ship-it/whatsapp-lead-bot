export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const campaignId = url.searchParams.get('campaignId')
  const leadId = url.searchParams.get('leadId')
  const status = url.searchParams.get('status')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const limit = parseInt(url.searchParams.get('limit') ?? '50')
  const page = parseInt(url.searchParams.get('page') ?? '1')

  const where: any = {}
  if (campaignId) where.campaignId = campaignId
  if (leadId) where.leadId = leadId
  if (status) where.status = status
  if (from || to) {
    where.sentAt = {}
    if (from) where.sentAt.gte = new Date(from)
    if (to) where.sentAt.lte = new Date(to)
  }

  const [logs, total] = await Promise.all([
    prisma.messageLog.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { lead: true, campaign: true },
    }),
    prisma.messageLog.count({ where }),
  ])

  return NextResponse.json({ logs, total, page, pages: Math.ceil(total / limit) })
}
