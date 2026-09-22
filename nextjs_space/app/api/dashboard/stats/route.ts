export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalLeads, validLeads, invalidLeads, unknownLeads, messagedLeads,
    todayMessages, weekMessages, monthMessages, allTimeMessages,
    sentMessages, failedMessages, activeCampaigns, recentLogs] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { whatsappStatus: 'valid' } }),
    prisma.lead.count({ where: { whatsappStatus: 'invalid' } }),
    prisma.lead.count({ where: { whatsappStatus: 'unknown' } }),
    prisma.lead.count({ where: { whatsappStatus: 'messaged' } }),
    prisma.messageLog.count({ where: { sentAt: { gte: todayStart } } }),
    prisma.messageLog.count({ where: { sentAt: { gte: weekStart } } }),
    prisma.messageLog.count({ where: { sentAt: { gte: monthStart } } }),
    prisma.messageLog.count(),
    prisma.messageLog.count({ where: { status: 'sent' } }),
    prisma.messageLog.count({ where: { status: 'failed' } }),
    prisma.campaign.findMany({
      where: { status: 'active' },
      include: {
        template: true,
        _count: { select: { campaignLeads: true } },
        campaignLeads: { where: { status: 'sent' }, select: { id: true } },
      },
    }),
    prisma.messageLog.findMany({
      take: 20,
      orderBy: { sentAt: 'desc' },
      include: { lead: true, campaign: true },
    }),
  ])

  const successRate = allTimeMessages > 0 ? Math.round((sentMessages / allTimeMessages) * 100) : 0

  return NextResponse.json({
    leads: { total: totalLeads, valid: validLeads, invalid: invalidLeads, unknown: unknownLeads, messaged: messagedLeads },
    messages: { today: todayMessages, week: weekMessages, month: monthMessages, allTime: allTimeMessages, successRate },
    activeCampaigns: activeCampaigns.map((c: any) => ({
      id: c.id,
      name: c.name,
      total: c._count?.campaignLeads ?? 0,
      sent: c.campaignLeads?.length ?? 0,
      templateName: c.template?.name ?? '',
    })),
    recentLogs,
  })
}
