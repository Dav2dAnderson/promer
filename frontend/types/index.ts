export type User = {
  id: number
  username: string
  first_name: string
  last_name: string
  phone_number: string
  email: string
  is_manager: boolean
  github_username?: string
}

export type AuthResponse = {
  access: string
  refresh: string
  user: User
}

export type LoginRequest = {
  username: string
  password: string
}

export type RegisterRequest = {
  username: string
  first_name: string
  last_name: string
  phone_number: string
  email: string
  password1: string
  password2: string
}

export type ManagerRequestStatus = 'pending' | 'approved' | 'rejected'

export type ManagerRequest = {
  id: number
  user: number
  reason: string
  status: ManagerRequestStatus
  created_at: string
}

export type CreateManagerRequest = {
  reason: string
}

export type Project = {
  slug: string
  name: string
  description: string
  owner: User
  contributors: User[]
  start_date: string
  end_date?: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export type TaskStatus = 'pending' | 'in_progress' | 'in-progress' | 'done'

export type CreateProjectRequest = {
  name: string
  description: string
  start_date: string
  end_date?: string
  is_public?: boolean
}

export type UpdateProjectRequest = Partial<CreateProjectRequest>

export type Task = {
  slug: string
  project: string | { slug: string }
  title: string
  description: string
  from_user: User
  to_user: User
  status: TaskStatus
  created_at: string
  updated_at: string
  due_date?: string
}

export type CreateTaskRequest = {
  title: string
  description: string
  to_user: number
  due_date?: string
}

export type UpdateTaskRequest = Partial<CreateTaskRequest> & {
  status?: TaskStatus
}

export type Comment = {
  id: number
  task: number
  user: User
  content: string
  github_url?: string
  created_at: string
}

export type CreateCommentRequest = {
  content: string
  github_url?: string
}

export type Application = {
  slug: string
  project: string
  applicant: User
  title: string
  content: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}

export type CreateApplicationRequest = {
  title: string
  content: string
}

export type Department = {
  slug: string
  project: string
  name: string
  description: string
  created_at: string
}

export type CreateDepartmentRequest = {
  name: string
  description: string
}

export type DepartmentMember = {
  id: number
  department: number
  user: User
  role: string
  joined_at: string
}

export type AddDepartmentMemberRequest = {
  user: number
  role: string
}

export type ApiResponse<T> = {
  data: T
}

export type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type ApiError = {
  detail?: string
  [key: string]: string | string[] | undefined
}