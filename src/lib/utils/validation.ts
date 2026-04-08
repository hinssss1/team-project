import { z } from 'zod'

export const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  email: z.string().email('Invalid email address'),
  accessToken: z.string().min(1, 'Access token is required'),
  chatgptAccountId: z.string().min(1, 'ChatGPT account ID is required'),
  oaiDeviceId: z.string().optional().or(z.literal('')),
  description: z.string().optional(),
  teamUrl: z.string().url().optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
  autoInvite: z.boolean().optional(),
  inviteIntervalMs: z.number().min(1000).optional(),
})

export const updateTeamSchema = createTeamSchema.partial().extend({
  id: z.string(),
})

export const createMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'admin']).optional(),
  teamId: z.string(),
})

export const batchInviteSchema = z.object({
  teamId: z.string(),
  emails: z.array(z.string().email()).min(1, 'At least one email is required'),
  role: z.enum(['member', 'admin']).optional(),
  delayMs: z.number().min(0).optional(),
})

export const createInviteJobSchema = z.object({
  teamId: z.string(),
  emails: z.array(z.string().email()).min(1, 'At least one email is required'),
})

export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>
export type CreateMemberInput = z.infer<typeof createMemberSchema>
export type BatchInviteInput = z.infer<typeof batchInviteSchema>
export type CreateInviteJobInput = z.infer<typeof createInviteJobSchema>
