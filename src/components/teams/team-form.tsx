'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

const teamSchema = z.object({
  name: z.string().min(1, '团队名称不能为空'),
  email: z.string().email('请输入有效的邮箱地址'),
  accessToken: z.string().optional().or(z.literal('')),
  chatgptAccountId: z.string().min(1, 'ChatGPT Account ID 不能为空'),
  oaiDeviceId: z.string().optional().or(z.literal('')),
  description: z.string().optional(),
  teamUrl: z.string().url('请输入有效的URL').optional().or(z.literal('')),
})

type TeamFormData = z.infer<typeof teamSchema>

interface TeamFormProps {
  mode: 'create' | 'edit'
  initialData?: Partial<TeamFormData>
  teamId?: string
}

export function TeamForm({ mode, initialData, teamId }: TeamFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info'
    text: string
  } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: initialData || {
      name: '',
      email: '',
      accessToken: '',
      chatgptAccountId: '',
      oaiDeviceId: '',
      description: '',
      teamUrl: '',
    },
  })

  const onSubmit = async (data: TeamFormData) => {
    setIsSubmitting(true)
    setStatusMessage(null)

    try {
      const url = mode === 'create' ? '/api/teams' : `/api/teams/${teamId}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const payload: Record<string, unknown> = { ...data }
      if (mode === 'edit' && !payload.accessToken) {
        delete payload.accessToken
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (response.ok) {
        setStatusMessage({
          type: 'success',
          text: mode === 'create' ? '团队创建成功！' : '团队更新成功！',
        })

        setTimeout(() => {
          if (mode === 'create' && result?.id) {
            router.push(`/teams/${result.id}`)
          } else if (mode === 'create') {
            router.push('/teams')
          } else {
            router.push(`/teams/${teamId}`)
          }
        }, 1000)
      } else {
        setStatusMessage({
          type: 'error',
          text: result.details
            ? result.details.map((d: { message: string; path: string[] }) => `${d.path.join('.')}: ${d.message}`).join('; ')
            : result.error || '操作失败',
        })
      }
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: '操作失败: ' + (error instanceof Error ? error.message : '未知错误'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === 'create' ? '创建新团队' : '编辑团队'}</CardTitle>
        <CardDescription>
          {mode === 'create'
            ? '添加一个新的 GPT 团队，需要提供 ChatGPT Bearer Token 和 Account ID'
            : '更新团队信息'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {statusMessage && (
          <div
            className={`mb-4 p-4 rounded-md ${
              statusMessage.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : statusMessage.type === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              团队名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="例如：Marketing Team"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              账号邮箱 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="team@example.com"
              {...register('email')}
            />
            <p className="text-xs text-muted-foreground">仅作标识，不用于登录</p>
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessToken">
              Access Token {mode === 'create' && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id="accessToken"
              placeholder={mode === 'edit' ? '留空则保持原 Token 不变' : 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIs...'}
              rows={3}
              className="font-mono text-xs"
              {...register('accessToken')}
            />
            <p className="text-xs text-muted-foreground">
              ChatGPT 的 Bearer Token（从浏览器 DevTools 的 Network 请求头中获取）
            </p>
            {errors.accessToken && (
              <p className="text-sm text-red-500">{errors.accessToken.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="chatgptAccountId">
              ChatGPT Account ID <span className="text-red-500">*</span>
            </Label>
            <Input
              id="chatgptAccountId"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="font-mono"
              {...register('chatgptAccountId')}
            />
            <p className="text-xs text-muted-foreground">
              工作空间的 account ID（从请求头 chatgpt-account-id 中获取）
            </p>
            {errors.chatgptAccountId && (
              <p className="text-sm text-red-500">{errors.chatgptAccountId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="oaiDeviceId">OAI Device ID</Label>
            <Input
              id="oaiDeviceId"
              placeholder="可选"
              className="font-mono"
              {...register('oaiDeviceId')}
            />
            <p className="text-xs text-muted-foreground">
              可选，从请求头 oai-device-id 中获取
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="teamUrl">团队 URL</Label>
            <Input
              id="teamUrl"
              type="url"
              placeholder="https://chatgpt.com/..."
              {...register('teamUrl')}
            />
            {errors.teamUrl && (
              <p className="text-sm text-red-500">{errors.teamUrl.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              placeholder="团队描述或备注信息"
              rows={3}
              {...register('description')}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === 'create' ? '创建中...' : '更新中...'}
                </>
              ) : (
                <>{mode === 'create' ? '创建团队' : '更新团队'}</>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
