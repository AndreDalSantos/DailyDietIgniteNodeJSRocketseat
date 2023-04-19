import { it, beforeAll, afterAll, describe, expect, beforeEach } from 'vitest'
import { execSync } from 'node:child_process'
import request from 'supertest'
import { app } from '../src/app'

describe('Users and Meals routes', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    execSync('npm run knex migrate:rollback --all')
    execSync('npm run knex migrate:latest')
  })

  //   Users tests
  it('should be able to create a new user', async () => {
    await request(app.server)
      .post('/users')
      .send({
        name: 'John Doe',
      })
      .expect(201)
  })

  it('should be able to list all users', async () => {
    await request(app.server).post('/users').send({
      name: 'John Doe',
    })

    await request(app.server).post('/users').send({
      name: 'Mary Doe',
    })

    const listOfUsers = await request(app.server).get('/users').expect(200)

    expect(listOfUsers.body.users).toEqual([
      expect.objectContaining({
        name: 'John Doe',
      }),
      expect.objectContaining({
        name: 'Mary Doe',
      }),
    ])
  })

  it('should be able to login with an user', async () => {
    await request(app.server).post('/users').send({
      name: 'John Doe',
    })

    await request(app.server)
      .post('/users/login')
      .send({
        name: 'John Doe',
      })
      .expect(200)
  })

  //   Meals tests
  it('should be able to create a new meal', async () => {
    await request(app.server).post('/users').send({
      name: 'John Doe',
    })

    const user = await request(app.server).post('/users/login').send({
      name: 'John Doe',
    })

    const cookies = user.get('Set-Cookie')

    await request(app.server)
      .post('/meals')
      .send({
        name: 'lunch',
        description: 'lunch at home',
        date: '2023-03-18 10:40:25',
        itsWithinTheDiet: true,
      })
      .set('Cookie', cookies)
      .expect(201)
  })

  it('should be able to list all meals of an user', async () => {
    await request(app.server).post('/users').send({
      name: 'John Doe',
    })

    const user = await request(app.server).post('/users/login').send({
      name: 'John Doe',
    })

    const cookies = user.get('Set-Cookie')

    await request(app.server)
      .post('/meals')
      .send({
        name: 'lunch',
        description: 'lunch at home',
        date: '2023-03-18 10:40:25',
        itsWithinTheDiet: true,
      })
      .set('Cookie', cookies)

    await request(app.server)
      .post('/meals')
      .send({
        name: 'dinner',
        description: 'dinner at home',
        date: '2023-03-18 18:40:25',
        itsWithinTheDiet: false,
      })
      .set('Cookie', cookies)

    const listMeals = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)
      .expect(200)

    expect(listMeals.body.userMeals).toEqual([
      expect.objectContaining({
        name: 'lunch',
        description: 'lunch at home',
      }),
      expect.objectContaining({
        name: 'dinner',
        description: 'dinner at home',
      }),
    ])
  })

  it('should be able to get an specific meal of an user', async () => {
    await request(app.server).post('/users').send({
      name: 'John Doe',
    })

    const user = await request(app.server).post('/users/login').send({
      name: 'John Doe',
    })

    const cookies = user.get('Set-Cookie')

    await request(app.server)
      .post('/meals')
      .send({
        name: 'lunch',
        description: 'lunch at home',
        date: '2023-03-18 10:40:25',
        itsWithinTheDiet: true,
      })
      .set('Cookie', cookies)
    const listMeals = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)

    const mealId = listMeals.body.userMeals[0].id

    const getMealResponse = await request(app.server)
      .get(`/meals/${mealId}`)
      .set('Cookie', cookies)
      .expect(200)

    expect(getMealResponse.body.meal[0]).toEqual(
      expect.objectContaining({
        name: 'lunch',
        description: 'lunch at home',
        date: '2023-03-18 10:40:25',
        its_within_the_diet: 1,
      }),
    )
  })

  it('should be able to delete an specific meal of an user', async () => {
    await request(app.server).post('/users').send({
      name: 'John Doe',
    })

    const user = await request(app.server).post('/users/login').send({
      name: 'John Doe',
    })

    const cookies = user.get('Set-Cookie')

    await request(app.server)
      .post('/meals')
      .send({
        name: 'lunch',
        description: 'lunch at home',
        date: '2023-03-18 10:40:25',
        itsWithinTheDiet: true,
      })
      .set('Cookie', cookies)
    const listMeals = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)

    const mealId = listMeals.body.userMeals[0].id

    await request(app.server)
      .delete(`/meals/${mealId}`)
      .set('Cookie', cookies)
      .expect(204)
  })

  it('should be able to updatre an specific meal of an user', async () => {
    await request(app.server).post('/users').send({
      name: 'John Doe',
    })

    const user = await request(app.server).post('/users/login').send({
      name: 'John Doe',
    })

    const cookies = user.get('Set-Cookie')

    await request(app.server)
      .post('/meals')
      .send({
        name: 'lunch',
        description: 'lunch at home',
        date: '2023-03-18 10:40:25',
        itsWithinTheDiet: true,
      })
      .set('Cookie', cookies)

    const listMeals = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)

    const mealId = listMeals.body.userMeals[0].id

    await request(app.server)
      .put(`/meals/${mealId}`)
      .send({
        name: 'dinner',
        description: 'dinner at restaurant',
        date: '2023-03-18 18:00:00',
        itsWithinTheDiet: false,
      })
      .set('Cookie', cookies)

    const getMealResponse = await request(app.server)
      .get(`/meals/${mealId}`)
      .set('Cookie', cookies)
      .expect(200)

    expect(getMealResponse.body.meal[0]).toEqual(
      expect.objectContaining({
        name: 'dinner',
        description: 'dinner at restaurant',
        date: '2023-03-18 18:00:00',
        its_within_the_diet: 0,
      }),
    )
  })

  it('should be able to get metrics of all meals of an user', async () => {
    await request(app.server).post('/users').send({
      name: 'John Doe',
    })

    const user = await request(app.server).post('/users/login').send({
      name: 'John Doe',
    })

    const cookies = user.get('Set-Cookie')

    await request(app.server)
      .post('/meals')
      .send({
        name: 'meal1',
        description: 'lunch at home',
        date: '2023-04-10 10:00:00',
        itsWithinTheDiet: true,
      })
      .set('Cookie', cookies)

    await request(app.server)
      .post('/meals')
      .send({
        name: 'meal2',
        description: 'lunch at home',
        date: '2023-04-10 10:00:00',
        itsWithinTheDiet: true,
      })
      .set('Cookie', cookies)

    await request(app.server)
      .post('/meals')
      .send({
        name: 'meal3',
        description: 'lunch at home',
        date: '2023-04-10 10:00:00',
        itsWithinTheDiet: false,
      })
      .set('Cookie', cookies)

    await request(app.server)
      .post('/meals')
      .send({
        name: 'meal4',
        description: 'lunch at home',
        date: '2023-04-10 10:00:00',
        itsWithinTheDiet: false,
      })
      .set('Cookie', cookies)

    await request(app.server)
      .post('/meals')
      .send({
        name: 'meal5',
        description: 'lunch at home',
        date: '2023-04-10 10:00:00',
        itsWithinTheDiet: true,
      })
      .set('Cookie', cookies)

    await request(app.server)
      .post('/meals')
      .send({
        name: 'meal6',
        description: 'lunch at home',
        date: '2023-04-10 10:00:00',
        itsWithinTheDiet: true,
      })
      .set('Cookie', cookies)

    await request(app.server)
      .post('/meals')
      .send({
        name: 'meal7',
        description: 'lunch at home',
        date: '2023-04-10 10:00:00',
        itsWithinTheDiet: true,
      })
      .set('Cookie', cookies)

    await request(app.server)
      .post('/meals')
      .send({
        name: 'meal8',
        description: 'lunch at home',
        date: '2023-04-10 10:00:00',
        itsWithinTheDiet: false,
      })
      .set('Cookie', cookies)

    const response = await request(app.server)
      .get('/meals/metrics')
      .set('Cookie', cookies)
      .expect(200)

    expect(response.body.response).toEqual(
      expect.objectContaining({
        mealsAmount: 8,
        mealsAmountWithinDiet: 5,
        mealsAmountWithoutDiet: 3,
        bestSequenceOfMealsWithinDiet: 3,
      }),
    )
  })
})
