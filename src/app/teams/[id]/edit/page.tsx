'use client'

import { useEffect, useState } from 'react'
import { TeamForm } from '@/components/teams/team-form'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function EditTeamPage({ params }: { params: { id: string } }) {
  const [team, setTeam] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTeam()
  }, [])

  const fetchTeam = async () => {
    try {
      const response = await fetch(`/api/teams/${params.id}`)
      if (!response.ok) throw new Error('获取团队信息失败')
      const data = await response.json()
      setTeam(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  if (error || !team) {
    return (
      <div className="container max-w-3xl py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">加载失败</h2>
          <p className="text-muted-foreground mb-4">{error || '团队不存在'}</p>
          <Link href="/teams">
            <Button>返回团队列表</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6">
        <Link href="/teams">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回团队列表
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">编辑团队</h1>
        <p className="text-muted-foreground">
          修改 {team.name} 的信息
        </p>
      </div>

      <TeamForm
        mode="edit"
        teamId={params.id}
        initialData={{
          name: team.name,
          email: team.email,
          chatgptAccountId: team.chatgptAccountId || '',
          oaiDeviceId: team.oaiDeviceId || '',
          description: team.description,
          teamUrl: team.teamUrl,
        }}
      />
    </div>
  )
}
