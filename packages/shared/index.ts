export interface User {
  id:         string
  username:   string
  created_at: number
}

export interface Profile {
  user_id:    string
  first_name: string
  last_name:  string
  phone:      string
  avatar_url: string | null
}

export interface Contact {
  contact_id: string
  room_id:    string
  created_at: number
  username:   string | null
  first_name: string | null
  last_name:  string | null
  phone:      string | null
}

export interface SearchUser {
  id:         string
  username:   string
  first_name: string | null
  last_name:  string | null
  phone:      string | null
}

export interface Notification {
  id:          string
  status:      'pending' | 'accepted' | 'rejected'
  room_id:     string
  created_at:  number
  resolved_at: number | null
  from_id:     string
  username:    string | null
  first_name:  string | null
  last_name:   string | null
  phone:       string | null
}

export interface Room {
  id:   string
  name: string
}

export interface AuthResponse {
  user:       User
  token:      string
  chat_token: string
}
