import { useEffect, useState } from 'react'
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

function formatSavedDate(value) {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function buildRecommendationArray(recommendations) {
  if (!recommendations) return []
  const items = [...recommendations.items]
  if (recommendations.comparison) {
    items.unshift(recommendations.comparison)
  }
  return items
}

async function fetchRecentComparisons() {
  const response = await fetch('/api/comparisons')
  let data
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new Error(data?.error || 'Failed to load recent comparisons.')
  }

  return Array.isArray(data) ? data : []
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
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [recentComparisons, setRecentComparisons] = useState([])
  const [recentLoading, setRecentLoading] = useState(true)
  const [recentError, setRecentError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadRecentComparisons() {
      setRecentLoading(true)
      setRecentError('')

      try {
        const comparisons = await fetchRecentComparisons()
        if (!cancelled) {
          setRecentComparisons(comparisons)
        }
      } catch (err) {
        if (!cancelled) {
          setRecentError(
            err instanceof Error
              ? err.message
              : 'Failed to load recent comparisons.',
          )
        }
      } finally {
        if (!cancelled) {
          setRecentLoading(false)
        }
      }
    }

    loadRecentComparisons()

    return () => {
      cancelled = true
    }
  }, [])

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
    setSaveMessage('')
    setSaveError('')
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

  async function handleSaveComparison() {
    if (!currentWeather || !destinationWeather || !recommendations) {
      return
    }

    setSaving(true)
    setSaveMessage('')
    setSaveError('')

    try {
      const response = await fetch('/api/comparisons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentLocation: formatPlace(currentWeather.location),
          destinationLocation: formatPlace(destinationWeather.location),
          currentTemperature: currentWeather.weather.temperature,
          destinationTemperature: destinationWeather.weather.temperature,
          recommendations: buildRecommendationArray(recommendations),
        }),
      })

      let data
      try {
        data = await response.json()
      } catch {
        data = null
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save comparison.')
      }

      setSaveMessage('Comparison saved successfully.')
      const comparisons = await fetchRecentComparisons()
      setRecentComparisons(comparisons)
      setRecentError('')
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Failed to save comparison.',
      )
    } finally {
      setSaving(false)
    }
  }

  const canSave =
    Boolean(currentWeather && destinationWeather && recommendations) && !loading

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">WeatherWear</h1>
        <p className="app-tagline">Compare conditions. Dress for your destination.</p>
      </header>

      <form className="location-form" onSubmit={handleCompareWeather}>
        <div className="field-group">
          <label htmlFor="current-location">Current Location</label>
          <input
            id="current-location"
            type="text"
            placeholder="Enter your current location"
            value={currentLocation}
            onChange={(event) => setCurrentLocation(event.target.value)}
            disabled={loading}
          />
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

        {canSave && (
          <div className="save-comparison">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveComparison}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save Comparison'}
            </button>
            {saveMessage && (
              <p className="status-message status-message--success" role="status">
                {saveMessage}
              </p>
            )}
            {saveError && (
              <p className="status-message status-message--error" role="alert">
                {saveError}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="recent-comparisons" aria-label="Recent comparisons">
        <h2>Recent Comparisons</h2>
        {recentLoading && (
          <p className="status-message" role="status">
            Loading recent comparisons…
          </p>
        )}
        {!recentLoading && recentError && (
          <p className="status-message status-message--error" role="alert">
            {recentError}
          </p>
        )}
        {!recentLoading && !recentError && recentComparisons.length === 0 && (
          <p className="status-message">
            No saved comparisons yet. Compare two locations and save one to see
            it here.
          </p>
        )}
        {!recentLoading && !recentError && recentComparisons.length > 0 && (
          <ul className="recent-list">
            {recentComparisons.map((comparison) => (
              <li key={comparison.id} className="recent-item">
                <p className="recent-route">
                  <span>{comparison.currentLocation}</span>
                  <span className="recent-arrow" aria-hidden="true">
                    →
                  </span>
                  <span>{comparison.destinationLocation}</span>
                </p>
                <dl className="recent-details">
                  <div>
                    <dt>Current temp</dt>
                    <dd>{comparison.currentTemperature}&deg;F</dd>
                  </div>
                  <div>
                    <dt>Destination temp</dt>
                    <dd>{comparison.destinationTemperature}&deg;F</dd>
                  </div>
                  <div>
                    <dt>Saved</dt>
                    <dd>{formatSavedDate(comparison.createdAt)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default App
