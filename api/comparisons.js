import process from 'node:process'
import pg from 'pg'

const { Pool } = pg

let pool

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured.')
    }

    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  }

  return pool
}

function mapComparison(row) {
  return {
    id: row.id,
    currentLocation: row.current_location,
    destinationLocation: row.destination_location,
    currentTemperature: row.current_temperature,
    destinationTemperature: row.destination_temperature,
    recommendations: row.recommendations,
    createdAt: row.created_at,
  }
}

function isMissing(value) {
  return value === undefined || value === null || value === ''
}

function parseTemperature(value) {
  const temperature = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(temperature) ? temperature : null
}

function normalizeRecommendations(value) {
  if (typeof value === 'string') {
    return value.trim() === '' ? null : value
  }

  if (Array.isArray(value) || (value && typeof value === 'object')) {
    return JSON.stringify(value)
  }

  return null
}

async function handlePost(req, res) {
  const body = req.body ?? {}
  const {
    currentLocation,
    destinationLocation,
    currentTemperature,
    destinationTemperature,
    recommendations,
  } = body

  if (
    isMissing(currentLocation) ||
    isMissing(destinationLocation) ||
    isMissing(currentTemperature) ||
    isMissing(destinationTemperature) ||
    isMissing(recommendations)
  ) {
    return res.status(400).json({
      error:
        'Missing required fields: currentLocation, destinationLocation, currentTemperature, destinationTemperature, and recommendations.',
    })
  }

  const currentTemp = parseTemperature(currentTemperature)
  const destinationTemp = parseTemperature(destinationTemperature)
  const normalizedRecommendations = normalizeRecommendations(recommendations)

  if (currentTemp === null || destinationTemp === null) {
    return res.status(400).json({
      error: 'currentTemperature and destinationTemperature must be valid numbers.',
    })
  }

  if (normalizedRecommendations === null) {
    return res.status(400).json({
      error: 'recommendations is required.',
    })
  }

  const currentLocationText = String(currentLocation).trim()
  const destinationLocationText = String(destinationLocation).trim()

  if (!currentLocationText || !destinationLocationText) {
    return res.status(400).json({
      error: 'currentLocation and destinationLocation must not be empty.',
    })
  }

  const result = await getPool().query(
    `INSERT INTO comparisons (
      current_location,
      destination_location,
      current_temperature,
      destination_temperature,
      recommendations
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [
      currentLocationText,
      destinationLocationText,
      currentTemp,
      destinationTemp,
      normalizedRecommendations,
    ],
  )

  return res.status(201).json(mapComparison(result.rows[0]))
}

async function handleGet(res) {
  const result = await getPool().query(
    `SELECT *
     FROM comparisons
     ORDER BY created_at DESC
     LIMIT 10`,
  )

  return res.status(200).json(result.rows.map(mapComparison))
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' })
  }

  try {
    if (req.method === 'POST') {
      return await handlePost(req, res)
    }

    return await handleGet(res)
  } catch (error) {
    console.error('comparisons API error:', error.message)
    return res.status(500).json({
      error: 'Database request failed. Please try again later.',
    })
  }
}
