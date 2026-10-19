import { useState } from 'react'
import { getRecommendations } from './utils/recommendations'
import './App.css'

function getWeatherCondition(code) {
  if (code === 0 || code === 1) return 'Clear'
  if (code === 2 || code === 3 || code === 45 || code === 48) return 'Cloudy'
  if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    (code >= 95 && code <= 99)
  ) {
    return 'Rain'
  }
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
    return 'Snow'
  }
  return 'Cloudy'
}

async function fetchWeather(location) {
  const response = await fetch(
    `/api/weather?location=${encodeURIComponent(location)}`,
  )

  let data
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const message =
      data?.error ||
      (response.status === 404
        ? `No matching location found for "${location}".`
        : `Failed to fetch weather for "${location}".`)
    throw new Error(message)
  }

  return data
}

function formatPlace(location) {
  if (!location) return ''
  const parts = [location.city, location.region].filter(Boolean)
  return parts.join(', ')
}

function WeatherCard({ title, data }) {
  if (!data) {
    return (
      <article className="weather-card">
        <h2>{title}</h2>
        <div className="weather-card-body" />
      </article>
    )
  }

  const { location, weather } = data
  const condition = getWeatherCondition(weather.weatherCode)

  return (
    <article className="weather-card">
      <h2>{title}</h2>
      <div className="weather-card-body weather-card-body--filled">
        <p className="weather-place">{formatPlace(location)}</p>
        <p className="weather-condition">{condition}</p>
        <dl className="weather-details">
          <div>
            <dt>Temperature</dt>
            <dd>{weather.temperature}&deg;F</dd>
          </div>
          <div>
            <dt>Feels like</dt>
            <dd>{weather.apparentTemperature}&deg;F</dd>
          </div>
          <div>
            <dt>High / Low</dt>
            <dd>
              {weather.high}&deg;F / {weather.low}&deg;F
            </dd>
          </div>
          <div>
            <dt>Wind</dt>
            <dd>{weather.windSpeed} mph</dd>
          </div>
          <div>
            <dt>Precip chance</dt>
            <dd>{weather.precipitationProbabilityMax}%</dd>
          </div>
          <div>
            <dt>UV index</dt>
            <dd>{weather.uvIndexMax}</dd>
          </div>
        </dl>
      </div>
    </article>
  )
}

function App() {
  const [currentLocation, setCurrentLocation] = useState('')
  const [destination, setDestination] = useState('')
  const [currentWeather, setCurrentWeather] = useState(null)
  const [destinationWeather, setDestinationWeather] = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleUseMyLocation() {
    // Geolocation will be wired up later
  }

  async function handleCompareWeather(event) {
    event.preventDefault()

    const from = currentLocation.trim()
    const to = destination.trim()

    if (!from || !to) {
      setError('Please enter both a current location and a destination.')
      return
    }

    setLoading(true)
    setError('')
    setCurrentWeather(null)
    setDestinationWeather(null)
    setRecommendations(null)

    try {
      const [currentData, destinationData] = await Promise.all([
        fetchWeather(from),
        fetchWeather(to),
      ])
      setCurrentWeather(currentData)
      setDestinationWeather(destinationData)
      setRecommendations(getRecommendations(currentData, destinationData))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while fetching weather.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">WeatherWear</h1>
        <p className="app-tagline">Compare conditions. Dress for your destination.</p>
      </header>

      <form className="location-form" onSubmit={handleCompareWeather}>
        <div className="field-group">
          <label htmlFor="current-location">Current Location</label>
          <div className="field-row">
            <input
              id="current-location"
              type="text"
              placeholder="Enter your current location"
              value={currentLocation}
              onChange={(event) => setCurrentLocation(event.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleUseMyLocation}
              disabled={loading}
            >
              Use My Location
            </button>
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="destination">Destination</label>
          <input
            id="destination"
            type="text"
            placeholder="Enter your destination"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            disabled={loading}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Comparing…' : 'Compare Weather'}
        </button>
      </form>

      {loading && (
        <p className="status-message" role="status">
          Loading weather for both locations…
        </p>
      )}

      {error && (
        <p className="status-message status-message--error" role="alert">
          {error}
        </p>
      )}

      <section className="weather-cards" aria-label="Weather comparison">
        <WeatherCard title="Current Location" data={currentWeather} />
        <WeatherCard title="Destination" data={destinationWeather} />
      </section>

      <section className="recommendations" aria-label="Clothing recommendations">
        <h2>What Should I Wear?</h2>
        {recommendations ? (
          <div className="recommendations-body recommendations-body--filled">
            {recommendations.comparison && (
              <p className="recommendations-comparison">
                {recommendations.comparison}
              </p>
            )}
            <ul className="recommendations-list">
              {recommendations.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="recommendations-body" />
        )}
      </section>
    </div>
  )
}

export default App
