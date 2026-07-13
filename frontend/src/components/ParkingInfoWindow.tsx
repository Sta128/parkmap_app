import { InfoWindow } from '@vis.gl/react-google-maps'
import type { ParkingRate, ParkingWithDistance, Position } from '../types/parkings'

type Props = {
  parking: ParkingWithDistance
  onClose: () => void
  onRouteRequest: (pos: Position) => void
  navigationOrigin?: Position
}

const toMinutes = (time: string) => {
  const [hour = '0', minute = '0'] = time.split(':')
  return Number(hour) * 60 + Number(minute)
}

const formatTime = (time: string) => time.slice(0, 5)
const formatRate = (rate: ParkingRate) => `¥${rate.fee_unit}/${rate.unit_minutes}min`

const appliesAt = (rate: ParkingRate, minute: number) => {
  const start = toMinutes(rate.start_time)
  const end = toMinutes(rate.end_time)
  if (start === end) return true
  if (start < end) return minute >= start && minute < end
  return minute >= start || minute < end
}

const palette = ['#3182ce', '#38a169', '#d69e2e', '#805ad5', '#dd6b20', '#319795']

const RateTimeline = ({ rates }: { rates: ParkingRate[] }) => {
  const segments = rates.flatMap((rate, index) => {
    const start = toMinutes(rate.start_time)
    const end = toMinutes(rate.end_time)
    const color = palette[index % palette.length]
    if (start === end) return [{ start: 0, end: 1440, rate, color }]
    if (start < end) return [{ start, end, rate, color }]
    return [
      { start, end: 1440, rate, color },
      { start: 0, end, rate, color },
    ]
  }).sort((a, b) => a.start - b.start)

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 5 }}>1日の料金時間帯</div>
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ minWidth: 760 }}>
          <div style={{ position: 'relative', height: 74, borderRadius: 6, border: '1px solid #cbd5e0', background: '#f7fafc' }}>
            {segments.map((segment, index) => {
              const left = (segment.start / 1440) * 100
              const width = ((segment.end - segment.start) / 1440) * 100
              const labelTop = index % 2 === 0 ? 3 : 23
              return (
                <div key={`${segment.rate.id}-${segment.start}-${index}`}>
                  <div
                    title={`${formatTime(segment.rate.start_time)}〜${formatTime(segment.rate.end_time)} ${formatRate(segment.rate)}`}
                    style={{
                      position: 'absolute',
                      left: `${left}%`,
                      width: `${width}%`,
                      bottom: 0,
                      height: 30,
                      background: segment.color,
                      borderRight: '1px solid rgba(255,255,255,.8)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: `${left + width / 2}%`,
                      top: labelTop,
                      transform: 'translateX(-50%)',
                      minWidth: 74,
                      padding: '1px 4px',
                      borderRadius: 4,
                      background: 'rgba(255,255,255,.96)',
                      border: `1px solid ${segment.color}`,
                      color: '#1a202c',
                      fontSize: 9,
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      zIndex: 2,
                    }}
                  >
                    {formatRate(segment.rate)}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#4a5568' }}>
            <span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
        {rates.map((rate, index) => (
          <span key={rate.id} style={{ fontSize: 10, borderLeft: `5px solid ${palette[index % palette.length]}`, background: '#edf2f7', borderRadius: 4, padding: '2px 5px' }}>
            {formatTime(rate.start_time)}〜{formatTime(rate.end_time)} {formatRate(rate)}
          </span>
        ))}
      </div>
    </div>
  )
}

export const ParkingInfoWindow = ({ parking, onClose, onRouteRequest, navigationOrigin }: Props) => {
  const now = new Date()
  const japanParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now)
  const hour = Number(japanParts.find(part => part.type === 'hour')?.value ?? 0) % 24
  const minute = Number(japanParts.find(part => part.type === 'minute')?.value ?? 0)
  const currentRate = parking.rates?.find(rate => appliesAt(rate, hour * 60 + minute))


  const openGoogleMapsNavigation = () => {
    const params = new URLSearchParams({
      api: '1',
      destination: `${parking.lat},${parking.lng}`,
      travelmode: 'driving',
      dir_action: 'navigate',
    })

    if (navigationOrigin) {
      params.set('origin', `${navigationOrigin.lat},${navigationOrigin.lng}`)
    }

    window.open(`https://www.google.com/maps/dir/?${params.toString()}`, '_blank', 'noopener,noreferrer')
  }

  const limits = [
    parking.max_height != null ? `全高 ${parking.max_height}cmまで` : null,
    parking.max_width != null ? `車幅 ${parking.max_width}cmまで` : null,
    parking.max_length != null ? `全長 ${parking.max_length}cmまで` : null,
    parking.max_weight != null ? `重量 ${parking.max_weight}kgまで` : null,
    parking.min_ground_clearance != null ? `最低地上高 ${parking.min_ground_clearance}cm以上` : null,
    parking.is_light_only ? '軽自動車専用' : null,
    parking.is_ev_available ? 'EV対応' : null,
    parking.is_cashless ? 'キャッシュレス対応' : null,
  ].filter(Boolean)

  return (
    <InfoWindow position={{ lat: parking.lat, lng: parking.lng }} onCloseClick={onClose}>
      <div style={{ color: '#1a202c', width: 330, maxWidth: '78vw', maxHeight: '65vh', overflowY: 'auto', lineHeight: 1.45 }}>
        <h2 style={{ color: '#111', fontWeight: 'bold', fontSize: 16, marginBottom: 6 }}>{parking.name}</h2>
        <p style={{ margin: '3px 0' }}>住所: {parking.address}</p>
        <p style={{ margin: '3px 0' }}>空き: {parking.available ?? '不明'}台 / {parking.capacity ?? '不明'}台</p>
        {parking.price != null && <p style={{ margin: '3px 0' }}>指定時間の料金: ¥{parking.price}</p>}
        {parking.distanceText && <p style={{ margin: '3px 0' }}>距離: {parking.distanceText}（{parking.durationText}）</p>}

        <div style={{ marginTop: 10, padding: 9, borderRadius: 7, background: '#ebf8ff' }}>
          <div style={{ fontWeight: 700, fontSize: 12 }}>現在の料金</div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{currentRate ? formatRate(currentRate) : '料金情報なし'}</div>
          {currentRate?.period_max_fee != null && <div style={{ fontSize: 12 }}>現在の時間帯最大: ¥{currentRate.period_max_fee}</div>}
          {(parking.max_fees ?? []).filter(rule => rule.kind === 'daily').map(rule => <div key={rule.id} style={{ fontSize: 12 }}>当日最大: ¥{rule.amount}</div>)}
          {(parking.max_fees ?? []).filter(rule => rule.kind === 'rolling' && rule.duration_minutes != null).map(rule => {
            const minutes = rule.duration_minutes as number
            const duration = minutes % 1440 === 0
              ? `${minutes / 1440}日`
              : minutes % 60 === 0
                ? `${minutes / 60}時間`
                : `${minutes}分`
            return <div key={rule.id} style={{ fontSize: 12 }}>{duration}最大: ¥{rule.amount}</div>
          })}
        </div>

        {!!parking.rates?.length && <RateTimeline rates={parking.rates} />}

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>車両制限・設備</div>
          {limits.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {limits.map(limit => <span key={limit} style={{ fontSize: 11, background: '#edf2f7', borderRadius: 999, padding: '3px 7px' }}>{limit}</span>)}
            </div>
          ) : <div style={{ fontSize: 12, color: '#718096' }}>登録された制限情報はありません</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
          <button
            onClick={() => onRouteRequest({ lat: parking.lat, lng: parking.lng })}
            style={{ padding: '8px 10px', fontSize: 13, background: '#edf2f7', color: '#1a202c', border: '1px solid #cbd5e0', borderRadius: 5, cursor: 'pointer' }}
          >
            地図内でルート
          </button>
          <button
            onClick={openGoogleMapsNavigation}
            style={{ padding: '8px 10px', fontSize: 13, background: '#1976d2', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer' }}
          >
            Googleマップでナビ
          </button>
        </div>
      </div>
    </InfoWindow>
  )
}
