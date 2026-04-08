import { NextRequest, NextResponse } from 'next/server'
import { teamService } from '@/lib/services/team.service'
import { createTeamSchema } from '@/lib/utils/validation'
import { z } from 'zod'
import { auth } from '@/auth'

export async function GET() {
  const session = await auth()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const teams = await teamService.getAllTeams()
    const result = teams.map((team) => ({
      id: team.id,
      name: team.name,
      email: team.email,
      chatgptAccountId: team.chatgptAccountId,
      status: team.status,
      memberCount: team.memberCount,
      createdAt: team.createdAt,
      lastLoginCheckAt: team.lastLoginCheckAt,
      loginError: team.loginError,
    }))
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validatedData = createTeamSchema.parse(body)

    const team = await teamService.createTeam(validatedData)

    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    console.error('Error creating team:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    )
  }
}
