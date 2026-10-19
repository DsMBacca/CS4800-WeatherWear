/**
 * Build clothing and item recommendations from compared weather data.
 * @param {{ weather: object }} currentData
 * @param {{ weather: object }} destinationData
 * @returns {{ items: string[], comparison: string | null }}
 */
export function getRecommendations(currentData, destinationData) {
  const current = currentData.weather
  const destination = destinationData.weather
  const items = []

  const feelsLike = destination.apparentTemperature

  if (feelsLike < 40) {
    items.push('Wear a heavy coat, warm layers, and gloves.')
  } else if (feelsLike <= 54) {
    items.push('Wear a jacket or sweater.')
  } else if (feelsLike <= 69) {
    items.push('Wear a light jacket or long sleeves.')
  } else if (feelsLike <= 84) {
    items.push('Wear light, breathable clothing.')
  } else {
    items.push('Wear very light clothing and bring extra water.')
  }

  if (destination.precipitationProbabilityMax >= 40) {
    items.push('Bring an umbrella or rain jacket.')
  }

  if (destination.uvIndexMax >= 6) {
    items.push('Bring sunscreen and sunglasses.')
  }

  if (destination.windSpeed >= 20) {
    items.push('Bring a windbreaker.')
  }

  const tempDifference =
    destination.apparentTemperature - current.apparentTemperature

  let comparison = null
  if (tempDifference >= 10) {
    comparison =
      'Your destination feels at least 10°F warmer than your current location.'
  } else if (tempDifference <= -10) {
    comparison =
      'Your destination feels at least 10°F colder than your current location.'
  }

  return { items, comparison }
}
