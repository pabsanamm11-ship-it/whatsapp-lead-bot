export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTwilioClient, getTwilioWhatsAppNumber, isTwilioConfigured } from '@/lib/twilio'

function substituteVars(template: string, lead: { name: string; phone: string; notes: string | null }): string {
  return template
    .replace(/\{\{name\}\}/gi, lead?.name ?? '')
    .replace(/\{\{phone\}\}/gi, lead?.phone ?? '')
    .replace(/\{\{notes\}\}/gi, lead?.notes ?? '')
}

export async function POST() {
  if (!isTwilioConfigured()) {
    return NextResponse.json({ error: 'Twilio no configurado' }, { status: 400 })
  }
  const client = getTwilioClient()
  if (!client) return NextResponse.json({ error: 'Error Twilio' }, { status: 500 })
  const from = getTwilioWhatsAppNumber()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  // Find active campaigns
  const campaigns = await prisma.campaign.findMany({
    where: { status: 'active', startDate: { lte: new Date() } },
    include: { template: true },
  })

  const results: any[] = []

  for (const campaign of campaigns) {
    // Count today's sent for this campaign
    const todaySent = await prisma.messageLog.count({
      where: {
        campaignId: campaign.id,
        sentAt: { gte: todayStart, lte: todayEnd },
        status: 'sent',
      },
    })

    const remaining = campaign.dailyLimit - todaySent
    if (remaining <= 0) {
      results.push({ campaignId: campaign.id, sent: 0, reason: 'Límite diario alcanzado' })
      continue
    }

    // Get pending leads for this campaign
    const pendingLeads = await prisma.campaignLead.findMany({
      where: { campaignId: campaign.id, status: 'pending' },
      include: { lead: true },
      take: remaining,
    })

    if (pendingLeads.length === 0) {
      // Mark campaign completed if all leads processed
      const totalPending = await prisma.campaignLead.count({
        where: { campaignId: campaign.id, status: 'pending' },
      })
      if (totalPending === 0) {
        await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'completed' } })
      }
      results.push({ campaignId: campaign.id, sent: 0, reason: 'Sin leads pendientes' })
      continue
    }

    let sentCount = 0
    for (const cl of pendingLeads) {
      const lead = cl?.lead
      if (!lead) continue
      const messageContent = substituteVars(campaign?.template?.content ?? '', lead)
      try {
        await client.messages.create({
          from,
          to: `whatsapp:${lead.phone}`,
          body: messageContent,
        })
        await prisma.campaignLead.update({
          where: { id: cl.id },
          data: { status: 'sent', sentAt: new Date() },
        })
        await prisma.lead.update({
          where: { id: lead.id },
          data: { whatsappStatus: 'messaged', lastContactedAt: new Date() },
        })
        await prisma.messageLog.create({
          data: {
            campaignId: campaign.id,
            leadId: lead.id,
            phone: lead.phone,
            messageContent,
            status: 'sent',
            sentAt: new Date(),
          },
        })
        sentCount++
      } catch (err: any) {
        const errorCode = String(err?.code ?? '')
        const errorMessage = err?.message ?? 'Error desconocido'
        await prisma.campaignLead.update({
          where: { id: cl.id },
          data: { status: 'failed', error: errorMessage },
        })
        await prisma.lead.update({
          where: { id: lead.id },
          data: { whatsappStatus: errorCode === '63003' ? 'invalid' : 'failed' },
        })
        await prisma.messageLog.create({
          data: {
            campaignId: campaign.id,
            leadId: lead.id,
            phone: lead.phone,
            messageContent,
            status: 'failed',
            errorCode,
            errorMessage,
            sentAt: new Date(),
          },
        })
      }
      // Rate limit
      await new Promise((r) => setTimeout(r, 1000))
    }
    results.push({ campaignId: campaign.id, sent: sentCount })
  }

  return NextResponse.json({ processed: campaigns.length, results })
}
