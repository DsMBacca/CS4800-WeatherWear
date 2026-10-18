import { useState } from 'react'
import './App.css'

function App() {
  const [currentLocation, setCurrentLocation] = useState('')
  const [destination, setDestination] = useState('')

  function handleUseMyLocation() {
    // Geolocation and weather APIs will be wired up later
  }

  function handleCompareWeather(event) {
    event.preventDefault()
    // Weather comparison will be wired up later
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
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleUseMyLocation}
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
          />
        </div>

        <button type="submit" className="btn btn-primary">
          Compare Weather
        </button>
      </form>

      <section className="weather-cards" aria-label="Weather comparison">
        <article className="weather-card">
          <h2>Current Location</h2>
          <div className="weather-card-body" />
        </article>

        <article className="weather-card">
          <h2>Destination</h2>
          <div className="weather-card-body" />
        </article>
      </section>

      <section className="recommendations" aria-label="Clothing recommendations">
        <h2>What Should I Wear?</h2>
        <div className="recommendations-body" />
      </section>
    </div>
  )
}

export default App
