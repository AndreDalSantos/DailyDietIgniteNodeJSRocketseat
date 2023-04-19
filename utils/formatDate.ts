interface mealInterface {
  date: string
}

export function formatDateMeal(meal: mealInterface) {
  const dateObject = new Date(meal.date)
  const year = dateObject.getFullYear()
  const month = (dateObject.getMonth() + 1).toString().padStart(2, '0')
  const day = dateObject.getDate().toString().padStart(2, '0')
  const hour = dateObject.getHours().toString().padStart(2, '0')
  const minute = dateObject.getMinutes().toString().padStart(2, '0')
  const second = dateObject.getSeconds().toString().padStart(2, '0')
  const dateString = `${year}-${month}-${day} ${hour}:${minute}:${second}`

  return dateString
}
