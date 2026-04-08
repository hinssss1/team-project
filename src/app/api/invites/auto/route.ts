import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { inviteService } from '@/lib/services/invite.service'

const autoInviteSchema = z.object({
  emails: z.array(z.string().email()).min(1, 'At least one email is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { emails } = autoInviteSchema.parse(body)

    const memberLimit = Number(process.env.CHATGPT_MEMBER_LIMIT || 5)

    const candidates = await prisma.team.findMany({
      where: {
        status: 'active',
        memberCount: { lt: memberLimit },
      },
      orderBy: [{ createdAt: 'asc' }, { memberCount: 'asc' }],
      select: {
        id: true,
        name: true,
        accessToken: true,
        chatgptAccountId: true,
        memberCount: true,
      },
    })

    const selected = candidates.find(t => t.accessToken && t.chatgptAccountId)
    if (!selected) {
      return NextResponse.json(
        { error: '没有可用的团队（需要有效的 token 和可用席位）' },
        { status: 400 }
      )
    }

    const job = await inviteService.createInviteJob({
      teamId: selected.id,
      emails,
    })

    inviteService.executeInviteJob(job.id).catch((error) => {
      console.error('Error executing auto invite job:', error)
    })

    return NextResponse.json(
      {
        team: { id: selected.id, name: selected.name, memberCount: selected.memberCount },
        job,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating auto invite job:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create auto invite job' },
      { status: 500 }
    )
  }
}
