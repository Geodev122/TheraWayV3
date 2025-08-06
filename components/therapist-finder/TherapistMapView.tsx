import React, { useEffect, useRef } from 'react';
import { Therapist } from '../../types';
import { useTranslation } from '../../hooks/useTranslation'; 
import L, { Map as LeafletMap, TileLayer, Marker as LeafletMarkerClass, LatLngBounds, LatLngTuple, Popup } from 'leaflet';


interface TherapistMapViewProps {
  therapists: Therapist[];
  onViewProfile: (therapist: Therapist) => void;
}

export const TherapistMapView: React.FC<TherapistMapViewProps> = ({ therapists, onViewProfile }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<LeafletMap | null>(null); 
  const { t, direction } = useTranslation(); 

  useEffect(() => {
    if (!L) {
      console.error("Leaflet library not loaded.");
      if (mapRef.current) {
        mapRef.current.innerHTML = `<p style="padding: 20px; text-align: center; color: red;">${t('mapCouldNotBeLoaded')}</p>`;
      }
      return;
    }

    if (mapRef.current && !mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([34.0522, -118.2437] as LatLngTuple, 10); 
      
      (L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }) as TileLayer).addTo(mapInstance.current);
    }

    // Add/Update markers
    if (mapInstance.current) {
      // Clear existing markers
      mapInstance.current.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) {
          mapInstance.current!.removeLayer(layer);
        }
      });

      const validTherapists = therapists.filter(
        t =>
          t.locations &&
          t.locations.some(
            l => typeof l.lat === 'number' && typeof l.lng === 'number'
          )
      );

      if (validTherapists.length > 0) {
        const bounds = L.latLngBounds([] as LatLngTuple[]);
        validTherapists.forEach(therapist => {
          therapist.locations.forEach(location => {
            if (
              typeof location.lat === 'number' &&
              typeof location.lng === 'number'
            ) {
              const marker = (L.marker([location.lat, location.lng]) as LeafletMarkerClass).addTo(mapInstance.current!);
              
              const popupContent = document.createElement('div');
              popupContent.innerHTML = `
                <h4 style="font-weight: 600; margin-bottom: 4px; color: #1e293b; text-align: ${direction === 'rtl' ? 'right' : 'left'};">${therapist.name}</h4>
                <p style="font-size: 0.8rem; margin-bottom: 2px; color: #4b5563; text-align: ${direction === 'rtl' ? 'right' : 'left'};">${therapist.specializations[0]}</p>
                <p style="font-size: 0.8rem; margin-bottom: 6px; color: #4b5563; text-align: ${direction === 'rtl' ? 'right' : 'left'};">${location.address.split(',').slice(0,2).join(',')}</p>
              `;
              
              const button = document.createElement('button');
              button.className = 'theraway-map-popup-button'; 
              button.innerText = t('viewProfile');
              button.onclick = () => onViewProfile(therapist);
              popupContent.appendChild(button);
              
              marker.bindPopup(popupContent as HTMLElement | string | Popup);
              bounds.extend([location.lat, location.lng] as LatLngTuple);
            }
          });
        });
        if (bounds.isValid()) {
             mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
        }
      } else if (mapInstance.current.getZoom() > 5) { 
         mapInstance.current.setView([34.0522, -118.2437] as LatLngTuple, 10); 
      }
    }
  }, [therapists, onViewProfile, L, t, direction]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full rounded-lg shadow-lg border border-accent/30"
      aria-label={t('mapOfTherapistLocationsLabel', { default: "Map of therapist locations"})}
    >
       {/* Map will be initialized here */}
    </div>
  );
};
