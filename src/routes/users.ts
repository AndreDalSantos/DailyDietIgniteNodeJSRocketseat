import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { knex } from '../database'

export async function usersRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const users = await knex('users').select()

    return { users }
  })

  app.post('/login', async (request, reply) => {
    const createUserBodySchema = z.object({
      name: z.string(),
    })

    const { name } = createUserBodySchema.parse(request.body)

    const checkIfUserExists = await knex('users').where('name', name).select()

    if (!checkIfUserExists[0]) {
      throw new Error('User does not exists!')
    }

    const sessionId = randomUUID()

    reply.cookie('sessionId', sessionId, {
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    })

    await knex('users').where('name', name).update({ session_id: sessionId })

    return reply.status(200).send()
  })

  app.post('/', async (request, reply) => {
    const createUserBodySchema = z.object({
      name: z.string(),
    })

    const { name } = createUserBodySchema.parse(request.body)

    const checkIfUserExists = await knex('users').where('name', name).select()

    if (checkIfUserExists[0]) {
      throw new Error('User already exists!')
    }

    await knex('users').insert({
      id: randomUUID(),
      name,
    })

    return reply.status(201).send()
  })
}
