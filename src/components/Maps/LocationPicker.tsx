import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.divIcon({
  html: `<div class="bg-green-600 w-6 h-6 rounded-full border-2 border-white shadow-lg"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPickerProps {
  center?: [number, number];
  onLocationSelect: (lat: number, lng: number) => void;
  selectedLocation?: [number, number];
}

function LocationMarker({ onLocationSelect, selectedLocation }: { 
  onLocationSelect: (lat: number, lng: number) => void;
  selectedLocation?: [number, number];
}) {
  const [position, setPosition] = useState<LatLng | null>(
    selectedLocation ? new LatLng(selectedLocation[0], selectedLocation[1]) : null
  );

  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    if (selectedLocation) {
      const newPos = new LatLng(selectedLocation[0], selectedLocation[1]);
      setPosition(newPos);
      map.setView(newPos, map.getZoom());
    }
  }, [selectedLocation, map]);

  return position === null ? null : (
    <Marker position={position} />
  );
}

export function LocationPicker({ center = [37.7749, -122.4194], onLocationSelect, selectedLocation }: LocationPickerProps) {
  const [currentLocation, setCurrentLocation] = useState<[number, number]>(center);

  useEffect(() => {
    // Try to get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation([latitude, longitude]);
          if (!selectedLocation) {
            onLocationSelect(latitude, longitude);
          }
        },
        (error) => {
          console.warn('Geolocation error:', error);
        }
      );
    }
  }, [onLocationSelect, selectedLocation]);

  return (
    <div className="h-64 w-full rounded-lg overflow-hidden border border-gray-300">
      <MapContainer
        center={selectedLocation || currentLocation}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker onLocationSelect={onLocationSelect} selectedLocation={selectedLocation} />
      </MapContainer>
    </div>
  );
}