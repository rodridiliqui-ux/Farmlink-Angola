import React, { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

// Fix Leaflet marker icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Map Icons
const createCustomIcon = (color: string) => L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24]
});

const farmerIcon = createCustomIcon('#16a34a'); // Green
const buyerIcon = createCustomIcon('#2563eb'); // Blue
const transporterIcon = createCustomIcon('#9333ea'); // Purple

// Routing Component for Leaflet
const Routing = ({ waypoints }: { waypoints: L.LatLng[] }) => {
  const map = useMap();
  const routingControlRef = useRef<any>(null);

  useEffect(() => {
    if (!map || waypoints.length < 2) return;

    // Remove existing control if any
    if (routingControlRef.current) {
      try {
        map.removeControl(routingControlRef.current);
      } catch (e) {
        console.log("Error removing routing control", e);
      }
    }

    try {
      // @ts-ignore
      routingControlRef.current = L.Routing.control({
        waypoints,
        lineOptions: {
          styles: [{ color: '#16a34a', weight: 6, opacity: 0.8 }],
          extendToWaypoints: true,
          missingRouteTolerance: 0
        },
        show: false,
        addWaypoints: false,
        routeWhileDragging: false,
        fitSelectedRoutes: true,
        showAlternatives: false,
        collapsible: false,
        containerClassName: 'hidden'
      }).addTo(map);
    } catch (err) {
      console.error("Routing error:", err);
    }

    return () => {
      if (routingControlRef.current && map) {
        try {
          map.removeControl(routingControlRef.current);
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, [map, JSON.stringify(waypoints)]);

  return null;
};

const FitBounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const validPoints = points.filter(p => p && p[0] && p[1]);
      if (validPoints.length > 0) {
        const bounds = L.latLngBounds(validPoints as L.LatLngExpression[]);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [points, map]);
  return null;
};

interface MapViewProps {
  farmerLoc?: [number, number];
  buyerLoc?: [number, number];
  transporterLoc?: [number, number];
  items?: any[]; // Keep for compatibility
}

export const MapView: React.FC<MapViewProps> = ({ farmerLoc, buyerLoc, transporterLoc, items = [] }) => {
  const waypoints = useMemo(() => [
    transporterLoc && L.latLng(transporterLoc[0], transporterLoc[1]),
    farmerLoc && L.latLng(farmerLoc[0], farmerLoc[1]),
    buyerLoc && L.latLng(buyerLoc[0], buyerLoc[1])
  ].filter(Boolean) as L.LatLng[], [transporterLoc, farmerLoc, buyerLoc]);

  const allPoints: [number, number][] = useMemo(() => {
    const points: [number, number][] = [];
    if (transporterLoc) points.push(transporterLoc);
    if (farmerLoc) points.push(farmerLoc);
    if (buyerLoc) points.push(buyerLoc);
    items.forEach(item => {
      if (item.lat && item.lng) points.push([item.lat, item.lng]);
    });
    return points;
  }, [transporterLoc, farmerLoc, buyerLoc, items]);

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden border border-gray-200 shadow-inner relative">
      <MapContainer center={farmerLoc || buyerLoc || transporterLoc || [-8.839, 13.289]} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {farmerLoc && (
          <Marker position={farmerLoc} icon={farmerIcon}>
            <Popup>Fazenda (Origem)</Popup>
          </Marker>
        )}
        
        {buyerLoc && (
          <Marker position={buyerLoc} icon={buyerIcon}>
            <Popup>Comprador (Destino)</Popup>
          </Marker>
        )}
        
        {transporterLoc && (
          <Marker position={transporterLoc} icon={transporterIcon}>
            <Popup>Sua Localização</Popup>
          </Marker>
        )}

        {items.map((item) => (
          item.lat && item.lng && (
            <Marker key={item.id} position={[item.lat, item.lng]}>
              <Popup>
                <div className="p-1">
                  <h3 className="font-bold text-green-700">{item.name}</h3>
                  <p className="text-xs text-gray-600">{item.location}</p>
                </div>
              </Popup>
            </Marker>
          )
        ))}

        {waypoints.length >= 2 && <Routing waypoints={waypoints} />}
        <FitBounds points={allPoints} />
      </MapContainer>
    </div>
  );
};
