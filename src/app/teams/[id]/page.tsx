'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Edit,
  Shield,
  Users,
  Mail,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  UserPlus,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Team {
  id: string
  name: string
  email: string
  chatgptAccountId: string
  status: string
  memberCount: number
  hasToken?: boolean
  lastLoginCheckAt?: string
  loginError?: string | null
  description?: string
  teamUrl?: string
  createdAt: string
  lastSyncAt?: string
  members?: any[]
  inviteJobs?: any[]
}

export default function TeamDetailPage({ params }: { params: { id: string } }) {
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [refreshDialogOpen, setRefreshDialogOpen] = useState(false)
  const [emailsText, setEmailsText] = useState('')
  const [refreshToken, setRefreshToken] = useState('')
  const [inviting, setInviting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchTeam()
  }, [])

  const fetchTeam = async () => {
    try {
      const response = await fetch(`/api/teams/${params.id}`)
      if (!response.ok) throw new Error('获取团队信息失败')
      const data = await response.json()
      setTeam(data)
    } catch (error) {
      console.error('获取团队失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const verifyToken = async () => {
    setVerifying(true)
    try {
      const response = await fetch(`/api/teams/${params.id}/verify`, {
        method: 'POST',
      })
      const result = await response.json()
      const memberInfo =
        typeof result.memberCount === 'number' && typeof result.memberLimit === 'number'
          ? `\n成员数（含账号）：${result.memberCount}/${result.memberLimit}\n可用席位：${result.seatsRemaining ?? '-'}`
          : ''
      alert(result.message + memberInfo)
      fetchTeam()
    } catch (error) {
      alert('验证失败：' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      setVerifying(false)
    }
  }

  const syncMembers = async () => {
    setSyncing(true)
    try {
      const response = await fetch(`/api/teams/${params.id}/sync`, {
        method: 'POST',
      })
      const result = await response.json()
      alert(result.message)
      fetchTeam()
    } catch (error) {
      alert('同步失败，请重试')
    } finally {
      setSyncing(false)
    }
  }

  const handleRefreshToken = async () => {
    if (!refreshToken.trim()) {
      alert('请输入 Refresh Token')
      return
    }

    setRefreshing(true)
    try {
      const response = await fetch(`/api/teams/${params.id}/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refreshToken.trim() }),
      })
      const result = await response.json()

      if (response.ok) {
        alert(`Token 刷新成功！有效期：${result.expiresIn} 秒`)
        setRefreshDialogOpen(false)
        setRefreshToken('')
        fetchTeam()
      } else {
        alert(result.error || '刷新失败')
      }
    } catch (error) {
      alert('刷新失败：' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      setRefreshing(false)
    }
  }

  const inviteMembers = async () => {
    if (!emailsText.trim()) {
      alert('请输入至少一个邮箱地址')
      return
    }

    const emails = emailsText
      .split(/[,;\n]/)
      .map(email => email.trim())
      .filter(email => email.length > 0)

    if (emails.length === 0) {
      alert('请输入有效的邮箱地址')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = emails.filter(email => !emailRegex.test(email))
    if (invalidEmails.length > 0) {
      alert(`以下邮箱格式不正确：\n${invalidEmails.join('\n')}`)
      return
    }

    setInviting(true)
    try {
      const response = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: params.id, emails }),
      })

      if (!response.ok) throw new Error('创建邀请任务失败')

      alert(`邀请任务已创建！正在邀请 ${emails.length} 个成员，请稍候刷新查看进度。`)
      setInviteDialogOpen(false)
      setEmailsText('')

      setTimeout(() => fetchTeam(), 2000)
    } catch (error) {
      alert('邀请失败：' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      setInviting(false)
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

  if (!team) {
    return (
      <div className="container max-w-5xl py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">团队不存在</h2>
          <Link href="/teams">
            <Button>返回团队列表</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-6">
        <Link href="/teams">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回团队列表
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{team.name}</h1>
            <p className="text-muted-foreground">{team.email}</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default">
                  <UserPlus className="mr-2 h-4 w-4" />
                  邀请成员
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>邀请成员到团队</DialogTitle>
                  <DialogDescription>
                    输入要邀请的成员邮箱地址，每行一个，也可以用逗号或分号分隔
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="emails">邮箱地址</Label>
                    <Textarea
                      id="emails"
                      placeholder="user1@example.com&#10;user2@example.com"
                      value={emailsText}
                      onChange={(e) => setEmailsText(e.target.value)}
                      rows={8}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteDialogOpen(false)} disabled={inviting}>
                    取消
                  </Button>
                  <Button onClick={inviteMembers} disabled={inviting}>
                    {inviting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        创建任务中...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        开始邀请
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={verifyToken} disabled={verifying}>
              {verifying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Shield className="mr-2 h-4 w-4" />
              )}
              验证 Token
            </Button>

            <Button variant="outline" onClick={syncMembers} disabled={syncing}>
              {syncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              同步成员
            </Button>

            <Dialog open={refreshDialogOpen} onOpenChange={setRefreshDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-amber-200 hover:bg-amber-50">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  刷新 Token
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>刷新 Access Token</DialogTitle>
                  <DialogDescription>
                    使用 Refresh Token 获取新的 Access Token
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="refreshToken">Refresh Token</Label>
                    <Textarea
                      id="refreshToken"
                      placeholder="粘贴 refresh token..."
                      value={refreshToken}
                      onChange={(e) => setRefreshToken(e.target.value)}
                      rows={4}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRefreshDialogOpen(false)} disabled={refreshing}>
                    取消
                  </Button>
                  <Button onClick={handleRefreshToken} disabled={refreshing}>
                    {refreshing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        刷新中...
                      </>
                    ) : (
                      '刷新 Token'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Link href={`/teams/${params.id}/edit`}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                编辑
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">状态</CardTitle>
            {team.status === 'active' ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {team.status === 'active' ? '活跃' : team.status === 'error' ? '错误' : '未激活'}
            </div>
            {team.loginError && (
              <p className="text-xs text-red-500 mt-1">{team.loginError}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">成员数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {team.memberCount}/5
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              其他成员：{Math.max(0, team.memberCount - 1)}（不含账号）
            </div>
            <div className="text-sm text-muted-foreground">
              剩余席位：{Math.max(0, 5 - team.memberCount)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">邀请任务</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.inviteJobs?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 mb-6">
        <CardHeader>
          <CardTitle>团队信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Account ID</p>
            <p className="text-sm text-muted-foreground font-mono">{team.chatgptAccountId}</p>
          </div>
          {team.description && (
            <div>
              <p className="text-sm font-medium mb-1">描述</p>
              <p className="text-sm text-muted-foreground">{team.description}</p>
            </div>
          )}
          {team.teamUrl && (
            <div>
              <p className="text-sm font-medium mb-1">团队 URL</p>
              <a
                href={team.teamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                {team.teamUrl}
              </a>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-1">创建时间</p>
              <p className="text-sm text-muted-foreground">
                {new Date(team.createdAt).toLocaleString('zh-CN')}
              </p>
            </div>
            {team.lastSyncAt && (
              <div>
                <p className="text-sm font-medium mb-1">最后同步</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(team.lastSyncAt).toLocaleString('zh-CN')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {team.members && team.members.length > 0 && (
        <Card className="border-2 mb-6">
          <CardHeader>
            <CardTitle>成员列表 ({team.members.length})</CardTitle>
            <CardDescription>团队成员及其状态</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>邮箱</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>邀请时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.members.slice(0, 10).map((member: any) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.email}</TableCell>
                      <TableCell>
                        {member.role === 'admin' ? '管理员' : '成员'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            member.status === 'joined'
                              ? 'bg-green-500/10 text-green-600'
                              : member.status === 'invited'
                              ? 'bg-blue-500/10 text-blue-600'
                              : member.status === 'failed'
                              ? 'bg-red-500/10 text-red-600'
                              : 'bg-gray-500/10 text-gray-600'
                          }`}
                        >
                          {member.status === 'joined'
                            ? '已加入'
                            : member.status === 'invited'
                            ? '已邀请'
                            : member.status === 'failed'
                            ? '失败'
                            : '待邀请'}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.invitedAt
                          ? new Date(member.invitedAt).toLocaleDateString('zh-CN')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {team.members.length > 10 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                仅显示前 10 个成员
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {team.inviteJobs && team.inviteJobs.length > 0 && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle>邀请历史 ({team.inviteJobs.length})</CardTitle>
            <CardDescription>最近的邀请任务</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>状态</TableHead>
                    <TableHead>总数</TableHead>
                    <TableHead>成功</TableHead>
                    <TableHead>失败</TableHead>
                    <TableHead>创建时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.inviteJobs.map((job: any) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            job.status === 'completed'
                              ? 'bg-green-500/10 text-green-600'
                              : job.status === 'running'
                              ? 'bg-blue-500/10 text-blue-600'
                              : job.status === 'failed'
                              ? 'bg-red-500/10 text-red-600'
                              : 'bg-gray-500/10 text-gray-600'
                          }`}
                        >
                          {job.status === 'completed'
                            ? '已完成'
                            : job.status === 'running'
                            ? '进行中'
                            : job.status === 'failed'
                            ? '失败'
                            : '待处理'}
                        </span>
                      </TableCell>
                      <TableCell>{job.totalCount}</TableCell>
                      <TableCell className="text-green-600">{job.successCount}</TableCell>
                      <TableCell className="text-red-600">{job.failCount}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(job.createdAt).toLocaleString('zh-CN')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
