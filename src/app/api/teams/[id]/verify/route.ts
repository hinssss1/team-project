import { NextRequest, NextResponse } from 'next/server'
import { teamService } from '@/lib/services/team.service'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await teamService.checkTeamToken(params.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error verifying team:', error)
    return NextResponse.json(
      { error: 'Failed to verify token' },
      { status: 500 }
    )
  }
}
