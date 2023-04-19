// eslint-disable-next-line
import { Knex } from 'knex'

declare module 'knex/types/table' {
  export interface Tables {
    users: {
      id: string
      name: string
      created_at: string
      session_id?: string
    }
    meals: {
      id: string
      user_id: string
      name: string
      description: string
      date: string
      created_at: string
      updated_at: string
    }
  }
}
