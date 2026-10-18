export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed. Use GET.' })
  }

  const location =
    typeof req.query.location === 'string' ? req.query.location.trim() : ''

  if (!location) {
    return res.status(400).json({
      error: 'Missing required query parameter: location',
    })
  }

  try {
    const geoUrl = new URL('https://geocoding-api.open-meteo.com/v1/search')
    geoUrl.searchParams.set('name', location)
    geoUrl.searchParams.set('count', '1')

    const geoResponse = await fetch(geoUrl)
    if (!geoResponse.ok) {
      return res.status(500).json({ error: 'Failed to look up location.' })
    }

    const geoData = await geoResponse.json()
    const match = geoData.results?.[0]

    if (!match) {
      return res.status(404).json({ error: 'No matching location found.' })
    }

    const {
      name,
      admin1,
      country,
      latitude,
      longitude,
      timezone,
    } = match

    const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast')
    forecastUrl.searchParams.set('latitude', String(latitude))
    forecastUrl.searchParams.set('longitude', String(longitude))
    forecastUrl.searchParams.set(
      'current',
      [
        'temperature_2m',
        'apparent_temperature',
        'weather_code',
        'precipitation',
        'wind_speed_10m',
      ].join(','),
    )
    forecastUrl.searchParams.set(
      'daily',
      [
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_probability_max',
        'uv_index_max',
      ].join(','),
    )
    forecastUrl.searchParams.set('temperature_unit', 'fahrenheit')
    forecastUrl.searchParams.set('wind_speed_unit', 'mph')
    forecastUrl.searchParams.set('timezone', timezone || 'auto')
    forecastUrl.searchParams.set('forecast_days', '1')

    const forecastResponse = await fetch(forecastUrl)
    if (!forecastResponse.ok) {
      return res.status(500).json({ error: 'Failed to retrieve weather data.' })
    }

    const forecastData = await forecastResponse.json()
    const current = forecastData.current
    const daily = forecastData.daily

    if (!current || !daily) {
      return res.status(500).json({ error: 'Failed to retrieve weather data.' })
    }

    return res.status(200).json({
      location: {
        city: name,
        region: admin1 ?? null,
        country: country ?? null,
        latitude,
        longitude,
        timezone: forecastData.timezone ?? timezone ?? null,
      },
      weather: {
        temperature: current.temperature_2m,
        apparentTemperature: current.apparent_temperature,
        weatherCode: current.weather_code,
        precipitation: current.precipitation,
        windSpeed: current.wind_speed_10m,
        high: daily.temperature_2m_max?.[0] ?? null,
        low: daily.temperature_2m_min?.[0] ?? null,
        precipitationProbabilityMax:
          daily.precipitation_probability_max?.[0] ?? null,
        uvIndexMax: daily.uv_index_max?.[0] ?? null,
      },
      units: {
        temperature: '°F',
        precipitation: 'inch',
        windSpeed: 'mph',
        precipitationProbability: '%',
        uvIndex: 'index',
      },
    })
  } catch {
    return res.status(500).json({ error: 'Failed to retrieve weather data.' })
  }
}
