const express = require('express')
const supabase = require('../lib/supabase')
const router = express.Router()

const asNullableNumber = value => {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeParking = (parking, limits, rates, maxFees) => ({
  ...parking,
  max_height: limits?.height_limit_cm ?? null,
  max_width: limits?.width_limit_cm ?? null,
  max_length: limits?.length_limit_cm ?? null,
  max_weight: limits?.weight_limit_kg ?? null,
  min_ground_clearance: limits?.minimum_ground_clearance_cm ?? null,
  is_light_only: limits?.is_light_only ?? false,
  is_ev_available: limits?.is_ev_available ?? false,
  is_cashless: limits?.is_cashless ?? false,
  rates: rates.sort((a, b) => String(a.start_time).localeCompare(String(b.start_time))),
  max_fees: maxFees,
})

router.get('/', async (_req, res) => {
  // Fetch related tables separately instead of relying on PostgREST embedded
  // relationships. This keeps the API working immediately after migrations,
  // even before the PostgREST schema cache has refreshed.
  const [parkingResult, limitsResult, ratesResult, maxFeesResult] = await Promise.all([
    supabase.from('parking').select('*'),
    supabase.from('parking_limits').select('*'),
    supabase.from('parking_rates').select('*'),
    supabase.from('parking_max_fees').select('*'),
  ])

  const firstError = [parkingResult, limitsResult, ratesResult, maxFeesResult]
    .map(result => result.error)
    .find(Boolean)

  if (firstError) {
    console.error('parking list error:', firstError)
    return res.status(500).json({ error: '駐車場データの取得に失敗しました' })
  }

  const limitsByParking = new Map(
    (limitsResult.data ?? []).map(limit => [limit.parking_id, limit]),
  )
  const ratesByParking = new Map()
  for (const rate of ratesResult.data ?? []) {
    const list = ratesByParking.get(rate.parking_id) ?? []
    list.push(rate)
    ratesByParking.set(rate.parking_id, list)
  }
  const maxFeesByParking = new Map()
  for (const rule of maxFeesResult.data ?? []) {
    const list = maxFeesByParking.get(rule.parking_id) ?? []
    list.push(rule)
    maxFeesByParking.set(rule.parking_id, list)
  }

  res.json(
    (parkingResult.data ?? []).map(parking => normalizeParking(
      parking,
      limitsByParking.get(parking.id),
      ratesByParking.get(parking.id) ?? [],
      maxFeesByParking.get(parking.id) ?? [],
    )),
  )
})

router.post('/search', async (req, res) => {
  const {
    start,
    end,
    sortKey = 'fee',
    ascending = true,
    vehicleHeight,
    vehicleWidth,
    vehicleLength,
    vehicleWeight,
    groundClearance,
    requiresEv = false,
    requiresCashless = false,
    lightVehicle = false,
    maxFee,
  } = req.body ?? {}

  if (!start || !end) {
    return res.status(400).json({ error: 'start and end are required' })
  }

  const startMs = Date.parse(start)
  const endMs = Date.parse(end)
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || startMs >= endMs) {
    return res.status(400).json({ error: '利用日時が正しくありません' })
  }

  const { data, error } = await supabase.rpc('search_parkings', {
    p_start: start,
    p_end: end,
    p_sort_key: sortKey,
    p_ascending: Boolean(ascending),
    p_vehicle_height_cm: asNullableNumber(vehicleHeight),
    p_vehicle_width_cm: asNullableNumber(vehicleWidth),
    p_vehicle_length_cm: asNullableNumber(vehicleLength),
    p_vehicle_weight_kg: asNullableNumber(vehicleWeight),
    p_ground_clearance_cm: asNullableNumber(groundClearance),
    p_requires_ev: Boolean(requiresEv),
    p_requires_cashless: Boolean(requiresCashless),
    p_light_vehicle: Boolean(lightVehicle),
    p_max_fee: asNullableNumber(maxFee),
  })

  if (error) {
    console.error('search_parkings error:', error)
    return res.status(500).json({ error: '料金検索に失敗しました' })
  }

  res.json(data ?? [])
})

module.exports = router
