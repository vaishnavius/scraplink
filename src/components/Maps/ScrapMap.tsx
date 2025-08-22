import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { format } from 'date-fns';
import 'leaflet/dist/leaflet.css';

// Custom marker for scrap locations
import L from 'leaflet';

const scrapIcon = L.divIcon({
  html: `<div class="bg-blue-600 w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
    <div class="bg-white w-4 h-4 rounded-full"></div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

interface ScrapListing {
  scrap_id: string;
  scrap_type: string;
  description: string;
  weight: number;
  estimated_price: number;
  posted_date: string;
  status: string;
  latitude: number;
  longitude: number;
  distance?: number;
}

interface ScrapMapProps {
  listings: ScrapListing[];
  center: [number, number];
  onScrapSelect?: (scrap: ScrapListing) => void;
}

export function ScrapMap({ listings, center, onScrapSelect }: ScrapMapProps) {
  return (
    <div className="h-96 w-full rounded-lg overflow-hidden border border-gray-300">
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {listings.map((listing) => (
          <Marker
            key={listing.scrap_id}
            position={[listing.latitude, listing.longitude]}
            icon={scrapIcon}
            eventHandlers={{
              click: () => onScrapSelect?.(listing),
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-lg">{listing.scrap_type}</h3>
                <p className="text-gray-600 mb-2">{listing.description}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Weight:</span> {listing.weight} kg
                  </div>
                  <div>
                    <span className="font-medium">Price:</span> ${listing.estimated_price}
                    <span className="font-medium">Price:</span> ₹{listing.estimated_price}
                  </div>
                  <div>
                    <span className="font-medium">Posted:</span> {format(new Date(listing.posted_date), 'MMM dd')}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> 
                    <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                      listing.status === 'available' ? 'bg-green-100 text-green-800' :
                      listing.status === 'accepted' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {listing.status}
                    </span>
                  </div>
                  {listing.distance && (
                    <div className="col-span-2">
                      <span className="font-medium">Distance:</span> {listing.distance.toFixed(1)} km
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}