import type { ParkingWithDistance } from '../types/types'

type Props = {
  parkings: ParkingWithDistance[]
  selected: ParkingWithDistance | null
  onSelect: (parking: ParkingWithDistance) => void
}

export const ParkingList = ({ parkings, selected, onSelect }: Props) => {
  return (
    <>
      {parkings.map(parking => (
        <div
          key={parking.id}
          onClick={() => onSelect(parking)}
          style={{
            padding: '10px 12px',
            borderBottom: '1px solid #eee',
            cursor: 'pointer',
            background: selected?.id === parking.id ? '#e8f4fd' : 'white',
          }}
        >
          <strong>{parking.name}</strong>
          <p style={{ fontSize: '12px', margin: '2px 0', color: '#555' }}>{parking.address}</p>
          <p style={{ fontSize: '12px', margin: '2px 0' }}>空き: {parking.available ?? '不明'}</p>
          <p style={{ fontSize: '12px', margin: '2px 0' }}>料金: {parking.price != null ? `${parking.price}円` : '不明'}</p>
          {parking.distanceText ? (
            <p style={{ fontSize: '12px', margin: '2px 0', color: '#1976d2', fontWeight: 'bold' }}>
              🚗 {parking.distanceText}（{parking.durationText}）
            </p>
          ) : (
            <p style={{ fontSize: '12px', margin: '2px 0', color: '#aaa' }}>距離計算中...</p>
          )}
        </div>
      ))}
    </>
  )
}
