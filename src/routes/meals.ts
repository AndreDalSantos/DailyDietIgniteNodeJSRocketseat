import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { knex } from '../database'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'
import { formatDateMeal } from '../../utils/formatDate'

export async function mealsRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [checkSessionIdExists] }, async (request) => {
    const { sessionId } = request.cookies

    const user = await knex('users').where('session_id', sessionId)
    if (!user[0]) {
      throw new Error('User does not exists!')
    }

    const userMeals = await knex('meals')
      .where('user_id', user[0].id)
      .select()
      .orderBy('date', 'asc')

    userMeals.forEach((meal) => {
      meal.date = formatDateMeal(meal)
    })

    return { userMeals }
  })

  app.get(
    '/metrics',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const { sessionId } = request.cookies

      const user = await knex('users').where('session_id', sessionId)
      if (!user[0]) {
        throw new Error('User does not exists!')
      }

      const response = {
        mealsAmount: 0,
        mealsAmountWithinDiet: 0,
        mealsAmountWithoutDiet: 0,
        bestSequenceOfMealsWithinDiet: 0,
      }

      const userMeals = await knex('meals')
        .where('user_id', user[0].id)
        .select()
        .orderBy('date', 'asc')

      let itsWithinTheDietCount = 0
      let itsWithoutTheDietCount = 0
      let okDietCount = 0
      let maxOkDietCount = 0

      userMeals.forEach((meal) => {
        if (meal.its_within_the_diet === 1) {
          itsWithinTheDietCount++
        }

        if (meal.its_within_the_diet === 0) {
          itsWithoutTheDietCount++
        }

        if (meal.its_within_the_diet === 1) {
          okDietCount++
        } else if (meal.its_within_the_diet === 0) {
          maxOkDietCount = Math.max(maxOkDietCount, okDietCount)
          okDietCount = 0
        }
      })
      maxOkDietCount = Math.max(maxOkDietCount, okDietCount)

      response.mealsAmount = userMeals.length
      response.mealsAmountWithinDiet = itsWithinTheDietCount
      response.mealsAmountWithoutDiet = itsWithoutTheDietCount
      response.bestSequenceOfMealsWithinDiet = maxOkDietCount

      return reply.status(200).send({ response })
    },
  )

  app.get(
    '/:meal_id',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const { sessionId } = request.cookies
      const checkIfUserExists = await knex('users')
        .where('session_id', sessionId)
        .select()
      if (!checkIfUserExists[0]) {
        throw new Error('User does not exists!')
      }

      const updateMealParamsSchema = z.object({
        meal_id: z.string(),
      })

      const mealId = updateMealParamsSchema.parse(request.params).meal_id
      const checkIfMealExists = await knex('meals').where('id', mealId)

      if (!checkIfMealExists[0]) {
        throw new Error('Meal does not exist!')
      }

      if (checkIfMealExists[0].user_id !== checkIfUserExists[0].id) {
        throw new Error('Not allowed for this user!')
      }

      const meal = await knex('meals').where('id', mealId).select()

      meal[0].date = formatDateMeal(meal[0])

      return reply.status(200).send({ meal })
    },
  )

  app.post(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const createMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        date: z.string(),
        itsWithinTheDiet: z.boolean(),
      })

      const { name, description, date, itsWithinTheDiet } =
        createMealBodySchema.parse(request.body)

      const { sessionId } = request.cookies
      const checkIfUserExists = await knex('users')
        .where('session_id', sessionId)
        .select()
      if (!checkIfUserExists[0]) {
        throw new Error('User does not exists!')
      }

      const dateObject = new Date(date)
      const timestamp = dateObject.getTime()

      await knex('meals').insert({
        id: randomUUID(),
        name,
        description,
        user_id: checkIfUserExists[0].id,
        date: timestamp,
        its_within_the_diet: itsWithinTheDiet,
      })
      return reply.status(201).send()
    },
  )

  app.put(
    '/:meal_id',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const { sessionId } = request.cookies
      const checkIfUserExists = await knex('users')
        .where('session_id', sessionId)
        .select()
      if (!checkIfUserExists[0]) {
        throw new Error('User does not exists!')
      }

      const updateMealParamsSchema = z.object({
        meal_id: z.string(),
      })

      const mealId = updateMealParamsSchema.parse(request.params).meal_id
      const checkIfMealExists = await knex('meals').where('id', mealId)

      if (!checkIfMealExists[0]) {
        throw new Error('Meal does not exist!')
      }

      if (checkIfMealExists[0].user_id !== checkIfUserExists[0].id) {
        throw new Error('Not allowed for this user!')
      }

      const updateMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        date: z.string(),
        itsWithinTheDiet: z.boolean(),
      })

      const data = updateMealBodySchema.parse(request.body)

      const mealUpdate = {
        name: '',
        description: '',
        date: 0,
        itsWithinTheDiet: false,
      }

      if (data.name) {
        mealUpdate.name = data.name
      } else {
        mealUpdate.name = checkIfMealExists[0].name
      }
      if (data.description) {
        mealUpdate.description = data.description
      } else {
        mealUpdate.description = checkIfMealExists[0].description
      }
      if (data.date) {
        const dateObject = new Date(data.date)
        const timestamp = dateObject.getTime()
        mealUpdate.date = timestamp
      } else {
        mealUpdate.date = checkIfMealExists[0].date
      }
      if (data.itsWithinTheDiet || data.itsWithinTheDiet === false) {
        mealUpdate.itsWithinTheDiet = data.itsWithinTheDiet
      } else {
        mealUpdate.itsWithinTheDiet = checkIfMealExists[0].its_within_the_diet
      }

      await knex('meals')
        .where('id', mealId)
        .update({
          name: mealUpdate.name,
          description: mealUpdate.description,
          date: mealUpdate.date,
          its_within_the_diet: mealUpdate.itsWithinTheDiet,
          updated_at: new Date()
            .toISOString()
            .replace('T', ' ')
            .substring(0, 19),
        })

      return reply.status(200).send()
    },
  )

  app.delete(
    '/:meal_id',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const { sessionId } = request.cookies
      const checkIfUserExists = await knex('users')
        .where('session_id', sessionId)
        .select()
      if (!checkIfUserExists[0]) {
        throw new Error('User does not exists!')
      }

      const updateMealParamsSchema = z.object({
        meal_id: z.string(),
      })

      const mealId = updateMealParamsSchema.parse(request.params).meal_id
      const checkIfMealExists = await knex('meals').where('id', mealId)

      if (!checkIfMealExists[0]) {
        throw new Error('Meal does not exist!')
      }

      if (checkIfMealExists[0].user_id !== checkIfUserExists[0].id) {
        throw new Error('Not allowed for this user!')
      }

      await knex('meals').where('id', mealId).delete()

      return reply.status(204).send()
    },
  )
}
