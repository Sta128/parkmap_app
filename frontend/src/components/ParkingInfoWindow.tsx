import { InfoWindow } from '@vis.gl/react-google-maps'
import type { ParkingWithDistance, Position } from '../types/parkings'

type Props = {
  parking: ParkingWithDistance
  onClose: () => void
  onRouteRequest: (pos: Position) => void
}

export const ParkingInfoWindow = ({ parking, onClose, onRouteRequest }: Props) => {
  return (
    <InfoWindow
      position={{ lat: parking.lat, lng: parking.lng }}
      onCloseClick={onClose}
    >
      <div>
        <h2 style={{ color: '#111', fontWeight: 'bold' }}>{parking.name}</h2>
        <p>住所: {parking.address}</p>
        <p>空き: {parking.available ?? '不明'}</p>
        <p>料金: {parking.price != null ? `${parking.price}円` : '不明'}</p>
        {parking.distanceText && (
          <p>距離: {parking.distanceText}（{parking.durationText}）</p>
        )}
        <button
          onClick={() => onRouteRequest({ lat: parking.lat, lng: parking.lng })}
          style={{
            marginTop: '6px',
            padding: '6px 12px',
            fontSize: '13px',
            background: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          ルートを表示
        </button>
      </div>
    </InfoWindow>
  )
}
