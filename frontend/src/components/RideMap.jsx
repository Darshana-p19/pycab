import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState, useRef } from "react";

// Fix marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom icons for pickup and drop
const createCustomIcon = (color, label) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="
      background-color: ${color};
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 3px 6px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
      position: relative;
    ">
      <div style="position: absolute; top: -24px; left: 50%; transform: translateX(-50%); 
        background: white; color: ${color}; padding: 2px 8px; border-radius: 12px; 
        font-size: 11px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
        ${label}
      </div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const pickupIcon = (label = "PICKUP") => createCustomIcon('#10b981', label);
const dropIcon = (label = "DROP") => createCustomIcon('#ef4444', label);

// Component to update map view when coordinates change
function MapUpdater({ pickup, drop, isLive = false }) {
  const map = useMap();
  const [route, setRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // Function to calculate actual route using OSRM
  const calculateRoute = async (start, end) => {
    if (!start || !end) return null;
    
    try {
      const response = await fetch(
        `http://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
      );
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        return {
          coordinates: data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]),
          distance: (data.routes[0].distance / 1000).toFixed(2),
          duration: Math.round(data.routes[0].duration / 60)
        };
      }
    } catch (error) {
      console.warn("Failed to fetch route from OSRM, using straight line", error);
    }
    return null;
  };

  useEffect(() => {
    if (!pickup?.lat || !drop?.lat) return;

    // Fit map to show both markers
    const bounds = L.latLngBounds(
      [pickup.lat, pickup.lng],
      [drop.lat, drop.lng]
    );
    map.fitBounds(bounds, { padding: [100, 100], maxZoom: 16 });

    // If this is live mode (for /book route), calculate actual route
    if (isLive) {
      setRouteLoading(true);
      calculateRoute(pickup, drop).then(routeData => {
        setRoute(routeData);
        setRouteLoading(false);
      });
    }
  }, [pickup, drop, map, isLive]);

  // Draw route if available
  useEffect(() => {
    if (route) {
      const polyline = L.polyline(route.coordinates, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.8,
        lineJoin: 'round',
        dashArray: routeLoading ? '10, 10' : null
      }).addTo(map);

      return () => {
        map.removeLayer(polyline);
      };
    }
  }, [route, map, routeLoading]);

  return null;
}

// Component to show live distance between markers
function LiveDistance({ pickup, drop, isLive }) {
  const map = useMap();
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);

  // Calculate distance using Haversine formula
  const calculateStraightDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    if (pickup?.lat && drop?.lat) {
      const dist = calculateStraightDistance(
        pickup.lat, pickup.lng,
        drop.lat, drop.lng
      );
      setDistance(dist);
      
      // Estimate duration based on average speed of 25 km/h
      const estimatedDuration = Math.round((dist / 25) * 60);
      setDuration(estimatedDuration);
    }
  }, [pickup, drop]);

  if (!pickup?.lat || !drop?.lat) return null;

  return (
    <div className="leaflet-bottom leaflet-left">
      <div className="leaflet-control leaflet-bar bg-black/80 backdrop-blur-sm text-white p-3 rounded-lg shadow-lg border border-gray-700">
        <div className="text-sm font-semibold mb-1">📍 Route Info</div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-300">Distance:</span>
            <span className="font-bold text-blue-300">{distance.toFixed(2)} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Est. Time:</span>
            <span className="font-bold text-green-300">{duration} mins</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Type:</span>
            <span className="font-bold text-purple-300">
              {isLive ? "Live Route" : "Straight Line"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RideMap({ pickup, drop, isLive = true, showControls = true }) {
  const mapRef = useRef(null);
  
  // Default coordinates for Mumbai if none provided
  const defaultPickup = { lat: 19.0760, lng: 72.8777, address: "Mumbai, Maharashtra" };
  const defaultDrop = { lat: 19.2183, lng: 72.9781, address: "Thane, Maharashtra" };
  
  const pickupCoords = pickup && pickup.lat ? pickup : defaultPickup;
  const dropCoords = drop && drop.lat ? drop : defaultDrop;
  
  // Center map between pickup and drop
  const center = pickup && drop && pickup.lat && drop.lat
    ? [
        (pickup.lat + drop.lat) / 2,
        (pickup.lng + drop.lng) / 2,
      ]
    : [19.0760, 72.8777]; // Default to Mumbai

  // Create a straight line for fallback route
  const straightLine = [
    [pickupCoords.lat, pickupCoords.lng],
    [dropCoords.lat, dropCoords.lng],
  ];

  // Function to handle map initialization
  const handleMapReady = (map) => {
    mapRef.current = map;
    
    // Add zoom control if showControls is true
    if (showControls) {
      L.control.zoom({
        position: 'topright'
      }).addTo(map);
      
      // Add scale control
      L.control.scale({
        imperial: false,
        position: 'bottomleft'
      }).addTo(map);
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-700 shadow-2xl">
      <MapContainer 
        center={center} 
        zoom={12} 
        className="leaflet-container"
        style={{ height: "400px", width: "100%" }}
        whenCreated={handleMapReady}
        scrollWheelZoom={true}
        zoomControl={false} // We'll add custom controls
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        {/* Dark mode tile layer alternative */}
        {/* <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={19}
          className="opacity-30"
        /> */}

        {/* Pickup Marker */}
        <Marker 
          position={[pickupCoords.lat, pickupCoords.lng]} 
          icon={pickupIcon("PICKUP")}
        >
          <Popup>
            <div className="p-2">
              <div className="font-bold text-green-600 mb-2">📍 Pickup Location</div>
              <div className="text-sm mb-1">
                <span className="font-medium">Address:</span> {pickupCoords.address || "Not specified"}
              </div>
              <div className="text-sm">
                <span className="font-medium">Coordinates:</span> {pickupCoords.lat.toFixed(6)}, {pickupCoords.lng.toFixed(6)}
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Drop Marker */}
        <Marker 
          position={[dropCoords.lat, dropCoords.lng]} 
          icon={dropIcon("DROP")}
        >
          <Popup>
            <div className="p-2">
              <div className="font-bold text-red-600 mb-2">🏁 Destination</div>
              <div className="text-sm mb-1">
                <span className="font-medium">Address:</span> {dropCoords.address || "Not specified"}
              </div>
              <div className="text-sm">
                <span className="font-medium">Coordinates:</span> {dropCoords.lat.toFixed(6)}, {dropCoords.lng.toFixed(6)}
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Fallback straight line (only if not in live mode) */}
        {!isLive && (
          <Polyline
            pathOptions={{ 
              color: '#3b82f6', 
              weight: 3, 
              opacity: 0.6, 
              dashArray: '10, 10' 
            }}
            positions={straightLine}
          />
        )}

        {/* Update map view and calculate route */}
        <MapUpdater pickup={pickupCoords} drop={dropCoords} isLive={isLive} />
        
        {/* Live distance display */}
        <LiveDistance pickup={pickupCoords} drop={dropCoords} isLive={isLive} />
        
        {/* Map controls overlay */}
        {showControls && (
          <div className="leaflet-top leaflet-right">
            <div className="leaflet-control leaflet-bar bg-black/70 backdrop-blur-sm rounded-md overflow-hidden">
              <button
                className="p-2 hover:bg-gray-800 transition-colors"
                onClick={() => mapRef.current && mapRef.current.zoomIn()}
                title="Zoom in"
              >
                <span className="text-white font-bold">+</span>
              </button>
              <button
                className="p-2 hover:bg-gray-800 transition-colors border-t border-gray-700"
                onClick={() => mapRef.current && mapRef.current.zoomOut()}
                title="Zoom out"
              >
                <span className="text-white font-bold">−</span>
              </button>
            </div>
          </div>
        )}
      </MapContainer>
      
      {/* Status indicator */}
      <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`}></div>
        <span>{isLive ? 'Live Route' : 'Historical Route'}</span>
      </div>
      
      {/* Loading indicator for route calculation */}
      {isLive && (
        <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
          <span>Calculating route...</span>
        </div>
      )}
      
      {/* Map attribution */}
      {/* <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded opacity-70 hover:opacity-100 transition-opacity">
        © OpenStreetMap
      </div> */}
    </div>
  );
}