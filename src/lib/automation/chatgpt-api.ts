import axios, { AxiosRequestConfig } from 'axios'
import { SocksProxyAgent } from 'socks-proxy-agent'

const OAI_CLIENT_VERSION = 'prod-eddc2f6ff65fee2d0d6439e379eab94fe3047f72'
const OPENAI_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann'
const DEFAULT_TIMEOUT_MS = 60000

function getProxyAgent(): SocksProxyAgent | undefined {
  const url = process.env.SOCKS_PROXY || process.env.ALL_PROXY || process.env.all_proxy
  if (url && url.startsWith('socks')) {
    return new SocksProxyAgent(url)
  }
  return undefined
}

function buildHeaders(token: string, chatgptAccountId: string, oaiDeviceId?: string | null) {
  return {
    'accept': '*/*',
    'accept-language': 'zh-CN,zh;q=0.9',
    'authorization': `Bearer ${token}`,
    'chatgpt-account-id': chatgptAccountId,
    'content-type': 'application/json',
    'oai-client-version': OAI_CLIENT_VERSION,
    'oai-device-id': oaiDeviceId || '',
    'oai-language': 'zh-CN',
    'origin': 'https://chatgpt.com',
    'referer': 'https://chatgpt.com/admin/members',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  }
}

export interface AccountCredentials {
  accessToken: string
  chatgptAccountId: string
  oaiDeviceId?: string | null
}

export interface UserItem {
  id: string
  account_user_id: string
  email: string
  role: string
  name: string
  created_time: string
}

export interface InviteItem {
  id: string
  email_address: string
  role: string
  created_time: string
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export interface InviteResult {
  success: boolean
  inviteId?: string
  error?: string
}

export interface RefreshTokenResult {
  accessToken: string
  refreshToken?: string
  idToken?: string
  expiresIn: number
}

async function request(url: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<{ status: number; text: string }> {
  const agent = getProxyAgent()
  const config: AxiosRequestConfig = {
    url,
    method: (options.method || 'GET') as AxiosRequestConfig['method'],
    headers: options.headers,
    data: options.body,
    timeout: DEFAULT_TIMEOUT_MS,
    responseType: 'text',
    validateStatus: () => true,
    ...(agent ? { httpAgent: agent, httpsAgent: agent, proxy: false } : {}),
  }
  const res = await axios.request(config)
  return { status: res.status, text: typeof res.data === 'string' ? res.data : JSON.stringify(res.data) }
}

function parseOrThrow(text: string, label: string): any {
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`${label}: JSON 解析失败`)
  }
}

function throwApiError(status: number, text: string, label: string): never {
  if (status === 401) throw new Error(`${label}: Token 已过期或无效`)
  if (status === 404) throw new Error(`${label}: 账号不存在或无权访问`)
  if (status === 429) throw new Error(`${label}: 请求过于频繁，请稍后重试`)
  throw new Error(`${label}: HTTP ${status} - ${text.slice(0, 300)}`)
}

export async function getMembers(
  creds: AccountCredentials,
  params: { offset?: number; limit?: number } = {}
): Promise<PaginatedResult<UserItem>> {
  const limit = params.limit ?? 25
  const offset = params.offset ?? 0
  const url = `https://chatgpt.com/backend-api/accounts/${creds.chatgptAccountId}/users?offset=${offset}&limit=${limit}&query=`

  const { status, text } = await request(url, {
    method: 'GET',
    headers: buildHeaders(creds.accessToken, creds.chatgptAccountId, creds.oaiDeviceId),
  })

  if (status < 200 || status >= 300) throwApiError(status, text, '获取成员')

  const data = parseOrThrow(text, '获取成员')
  return {
    total: data.total,
    limit: data.limit ?? limit,
    offset: data.offset ?? offset,
    items: (data.items || []).map((item: any) => ({
      id: item.id,
      account_user_id: item.account_user_id,
      email: item.email,
      role: item.role,
      name: item.name,
      created_time: item.created_time,
    })),
  }
}

export async function inviteMember(
  creds: AccountCredentials,
  email: string
): Promise<InviteResult> {
  const url = `https://chatgpt.com/backend-api/accounts/${creds.chatgptAccountId}/invites`

  const { status, text } = await request(url, {
    method: 'POST',
    headers: buildHeaders(creds.accessToken, creds.chatgptAccountId, creds.oaiDeviceId),
    body: JSON.stringify({
      email_addresses: [email.trim()],
      role: 'standard-user',
      resend_emails: true,
    }),
  })

  if (status < 200 || status >= 300) {
    return { success: false, error: `HTTP ${status}: ${text.slice(0, 300)}` }
  }

  const data = parseOrThrow(text, '邀请成员')
  return {
    success: true,
    inviteId: data?.account_invites?.[0]?.id,
  }
}

export async function getInvites(
  creds: AccountCredentials,
  params: { offset?: number; limit?: number } = {}
): Promise<PaginatedResult<InviteItem>> {
  const limit = params.limit ?? 25
  const offset = params.offset ?? 0
  const url = `https://chatgpt.com/backend-api/accounts/${creds.chatgptAccountId}/invites?offset=${offset}&limit=${limit}&query=`

  const { status, text } = await request(url, {
    method: 'GET',
    headers: {
      ...buildHeaders(creds.accessToken, creds.chatgptAccountId, creds.oaiDeviceId),
      referer: 'https://chatgpt.com/admin/members?tab=invites',
    },
  })

  if (status < 200 || status >= 300) throwApiError(status, text, '获取邀请列表')

  const data = parseOrThrow(text, '获取邀请列表')
  return {
    total: data.total,
    limit: data.limit ?? limit,
    offset: data.offset ?? offset,
    items: (data.items || []).map((item: any) => ({
      id: item.id,
      email_address: item.email_address,
      role: item.role,
      created_time: item.created_time,
    })),
  }
}

export async function deleteInvite(
  creds: AccountCredentials,
  email: string
): Promise<void> {
  const url = `https://chatgpt.com/backend-api/accounts/${creds.chatgptAccountId}/invites`

  const { status, text } = await request(url, {
    method: 'DELETE',
    headers: {
      ...buildHeaders(creds.accessToken, creds.chatgptAccountId, creds.oaiDeviceId),
      referer: 'https://chatgpt.com/admin/members?tab=invites',
    },
    body: JSON.stringify({ email_address: email.trim().toLowerCase() }),
  })

  if (status < 200 || status >= 300) throwApiError(status, text, '撤回邀请')
}

export async function deleteMember(
  creds: AccountCredentials,
  userId: string
): Promise<void> {
  const normalizedId = userId.startsWith('user-') ? userId : `user-${userId}`
  const url = `https://chatgpt.com/backend-api/accounts/${creds.chatgptAccountId}/users/${normalizedId}`

  const { status, text } = await request(url, {
    method: 'DELETE',
    headers: buildHeaders(creds.accessToken, creds.chatgptAccountId, creds.oaiDeviceId),
  })

  if (status < 200 || status >= 300) throwApiError(status, text, '删除成员')
}

export async function refreshAccessToken(refreshToken: string): Promise<RefreshTokenResult> {
  const agent = getProxyAgent()
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: OPENAI_CLIENT_ID,
    refresh_token: refreshToken,
    scope: 'openid profile email',
  }).toString()

  const config: AxiosRequestConfig = {
    url: 'https://auth.openai.com/oauth/token',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    data: body,
    timeout: DEFAULT_TIMEOUT_MS,
    validateStatus: () => true,
    responseType: 'text',
    ...(agent ? { httpAgent: agent, httpsAgent: agent, proxy: false } : {}),
  }

  const res = await axios.request(config)

  if (res.status < 200 || res.status >= 300) {
    const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
    throw new Error(`刷新 token 失败: HTTP ${res.status} - ${text.slice(0, 300)}`)
  }

  const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
  if (!data.access_token) {
    throw new Error('刷新 token 失败: 未返回有效凭证')
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    idToken: data.id_token,
    expiresIn: data.expires_in || 3600,
  }
}

export async function verifyToken(creds: AccountCredentials): Promise<{
  valid: boolean
  memberCount?: number
  message: string
}> {
  try {
    const result = await getMembers(creds, { offset: 0, limit: 1 })
    return {
      valid: true,
      memberCount: result.total,
      message: `Token 有效，当前成员数: ${result.total}`,
    }
  } catch (error) {
    return {
      valid: false,
      message: error instanceof Error ? error.message : 'Token 验证失败',
    }
  }
}
