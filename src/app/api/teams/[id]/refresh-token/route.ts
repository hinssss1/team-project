import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { refreshAccessToken } from '@/lib/automation/chatgpt-api'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await _request.json().catch(() => ({}))
    const { refreshToken } = body as { refreshToken?: string }

    if (!refreshToken) {
      return NextResponse.json(
        { error: '请提供 refreshToken' },
        { status: 400 }
      )
    }

    const team = await prisma.team.findUnique({ where: { id: params.id } })
    if (!team) {
      return NextResponse.json(
        { error: '团队不存在' },
        { status: 404 }
      )
    }

    const result = await refreshAccessToken(refreshToken)

    await prisma.team.update({
      where: { id: params.id },
      data: {
        accessToken: result.accessToken,
        status: 'active',
        loginError: null,
        lastLoginCheckAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Token 刷新成功',
      expiresIn: result.expiresIn,
    })
  } catch (error) {
    console.error('Refresh token failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '刷新失败' },
      { status: 500 }
    )
  }
}
