import prisma from '@/lib/prisma'
import { CreateInviteJobInput } from '@/lib/utils/validation'
import { InviteJob } from '@prisma/client'
import { inviteMember, AccountCredentials } from '@/lib/automation/chatgpt-api'
import { memberService } from './member.service'

interface InviteJobLog {
  timestamp: string
  email: string
  status: 'success' | 'failed'
  error?: string
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export class InviteService {
  async getInviteJobsByTeamId(teamId: string): Promise<InviteJob[]> {
    return await prisma.inviteJob.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getInviteJobById(id: string): Promise<InviteJob | null> {
    return await prisma.inviteJob.findUnique({
      where: { id },
      include: { team: true },
    })
  }

  async createInviteJob(input: CreateInviteJobInput): Promise<InviteJob> {
    await memberService.createMembers(input.teamId, input.emails)

    return await prisma.inviteJob.create({
      data: {
        teamId: input.teamId,
        emails: JSON.stringify(input.emails),
        totalCount: input.emails.length,
        status: 'pending',
      },
    })
  }

  async executeInviteJob(jobId: string): Promise<{
    success: boolean
    message: string
  }> {
    const job = await prisma.inviteJob.findUnique({
      where: { id: jobId },
      include: { team: true },
    })

    if (!job) {
      return { success: false, message: 'Job not found' }
    }

    if (job.status === 'running') {
      return { success: false, message: 'Job is already running' }
    }

    try {
      await prisma.inviteJob.update({
        where: { id: jobId },
        data: {
          status: 'running',
          startedAt: new Date(),
        },
      })

      const emails: string[] = JSON.parse(job.emails)
      const logs: InviteJobLog[] = []

      const creds: AccountCredentials = {
        accessToken: job.team.accessToken,
        chatgptAccountId: job.team.chatgptAccountId,
        oaiDeviceId: job.team.oaiDeviceId,
      }

      let successCount = 0
      let failCount = 0

      for (let i = 0; i < emails.length; i++) {
        const email = emails[i]

        const result = await inviteMember(creds, email)

        const log: InviteJobLog = {
          timestamp: new Date().toISOString(),
          email,
          status: result.success ? 'success' : 'failed',
          error: result.error,
        }
        logs.push(log)

        if (result.success) {
          successCount++
        } else {
          failCount++
        }

        const member = await prisma.member.findUnique({
          where: { teamId_email: { teamId: job.teamId, email } },
        })

        if (member) {
          await memberService.updateMemberStatus(
            member.id,
            result.success ? 'invited' : 'failed',
            result.error
          )
        }

        await prisma.inviteJob.update({
          where: { id: jobId },
          data: { successCount, failCount, logs: JSON.stringify(logs) },
        })

        if (i < emails.length - 1) {
          await sleep(job.team.inviteIntervalMs)
        }
      }

      await prisma.inviteJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          successCount,
          failCount,
          logs: JSON.stringify(logs),
        },
      })

      await prisma.team.update({
        where: { id: job.teamId },
        data: { lastInviteAt: new Date() },
      })

      return {
        success: true,
        message: `完成: ${successCount} 成功, ${failCount} 失败`,
      }
    } catch (error) {
      console.error('Error executing invite job:', error)

      await prisma.inviteJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          logs: JSON.stringify([
            {
              timestamp: new Date().toISOString(),
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          ]),
        },
      })

      return {
        success: false,
        message: `任务失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  async getJobLogs(jobId: string): Promise<InviteJobLog[]> {
    const job = await prisma.inviteJob.findUnique({
      where: { id: jobId },
    })

    if (!job || !job.logs) {
      return []
    }

    try {
      return JSON.parse(job.logs)
    } catch {
      return []
    }
  }
}

export const inviteService = new InviteService()
