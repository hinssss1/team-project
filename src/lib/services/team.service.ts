import prisma from '@/lib/prisma'
import { CreateTeamInput, UpdateTeamInput } from '@/lib/utils/validation'
import { Team } from '@prisma/client'
import { verifyToken, getMembers, AccountCredentials } from '@/lib/automation/chatgpt-api'

export class TeamService {
  private getCredentials(team: Team): AccountCredentials {
    return {
      accessToken: team.accessToken,
      chatgptAccountId: team.chatgptAccountId,
      oaiDeviceId: team.oaiDeviceId,
    }
  }

  async checkTeamToken(id: string): Promise<{
    success: boolean
    valid: boolean
    memberCount?: number
    memberLimit?: number
    seatsRemaining?: number
    message: string
    checkedAt: string
  }> {
    const team = await prisma.team.findUnique({ where: { id } })
    if (!team) {
      return {
        success: false,
        valid: false,
        message: 'Team not found',
        checkedAt: new Date().toISOString(),
      }
    }

    const result = await verifyToken(this.getCredentials(team))
    const now = new Date()
    const memberLimit = Number(process.env.CHATGPT_MEMBER_LIMIT || 5)

    await prisma.team.update({
      where: { id },
      data: {
        status: result.valid ? 'active' : 'error',
        lastLoginCheckAt: now,
        loginError: result.valid ? null : result.message,
        ...(typeof result.memberCount === 'number' ? { memberCount: result.memberCount } : {}),
      },
    })

    return {
      success: true,
      valid: result.valid,
      memberCount: result.memberCount,
      memberLimit,
      seatsRemaining: typeof result.memberCount === 'number'
        ? Math.max(0, memberLimit - result.memberCount)
        : undefined,
      message: result.message,
      checkedAt: now.toISOString(),
    }
  }

  async getAllTeams(): Promise<Team[]> {
    return await prisma.team.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }

  async getTeamById(id: string): Promise<Team | null> {
    return await prisma.team.findUnique({
      where: { id },
      include: {
        members: true,
        inviteJobs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })
  }

  async createTeam(input: CreateTeamInput): Promise<Team> {
    const tags = input.tags ? JSON.stringify(input.tags) : null

    return await prisma.team.create({
      data: {
        name: input.name,
        email: input.email,
        accessToken: input.accessToken,
        chatgptAccountId: input.chatgptAccountId,
        oaiDeviceId: input.oaiDeviceId || null,
        description: input.description,
        teamUrl: input.teamUrl,
        tags,
        autoInvite: input.autoInvite ?? false,
        inviteIntervalMs: input.inviteIntervalMs ?? 3000,
      },
    })
  }

  async updateTeam(input: UpdateTeamInput): Promise<Team> {
    const { id, tags, ...rest } = input

    const data: any = { ...rest }

    if (tags) {
      data.tags = JSON.stringify(tags)
    }

    return await prisma.team.update({
      where: { id },
      data,
    })
  }

  async deleteTeam(id: string): Promise<void> {
    await prisma.team.delete({
      where: { id },
    })
  }

  async syncTeamMembers(id: string): Promise<{
    success: boolean
    count: number
    message: string
  }> {
    const team = await prisma.team.findUnique({ where: { id } })
    if (!team) {
      return { success: false, count: 0, message: 'Team not found' }
    }

    try {
      const result = await getMembers(this.getCredentials(team), { offset: 0, limit: 1 })

      await prisma.team.update({
        where: { id },
        data: {
          memberCount: result.total,
          status: 'active',
          lastSyncAt: new Date(),
          loginError: null,
        },
      })

      return {
        success: true,
        count: result.total,
        message: `同步成功！成员数（含账号）：${result.total}`,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误'

      await prisma.team.update({
        where: { id },
        data: {
          status: 'error',
          loginError: message,
        },
      })

      return { success: false, count: 0, message: `同步失败: ${message}` }
    }
  }

  async getTeamStats(id: string) {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: true,
        inviteJobs: true,
      },
    })

    if (!team) return null

    const totalMembers = team.members.length
    const pendingMembers = team.members.filter((m) => m.status === 'pending').length
    const invitedMembers = team.members.filter((m) => m.status === 'invited').length
    const joinedMembers = team.members.filter((m) => m.status === 'joined').length
    const failedMembers = team.members.filter((m) => m.status === 'failed').length

    const totalJobs = team.inviteJobs.length
    const completedJobs = team.inviteJobs.filter((j) => j.status === 'completed').length
    const totalInvites = team.inviteJobs.reduce((sum, j) => sum + j.totalCount, 0)
    const successfulInvites = team.inviteJobs.reduce((sum, j) => sum + j.successCount, 0)

    return {
      totalMembers,
      pendingMembers,
      invitedMembers,
      joinedMembers,
      failedMembers,
      totalJobs,
      completedJobs,
      totalInvites,
      successfulInvites,
      successRate:
        totalInvites > 0 ? ((successfulInvites / totalInvites) * 100).toFixed(2) : '0',
    }
  }
}

export const teamService = new TeamService()
