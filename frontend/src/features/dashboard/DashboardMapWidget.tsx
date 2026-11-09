import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { MapPin, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import type { MapFeature, ZoneGeoBoundary } from '../../types/map';

export const DashboardMapWidget: React.FC = () => {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polygonsLayerRef = useRef<L.LayerGroup | null>(null);

  const [features, setFeatures] = useState<MapFeature[]>([]);
  const [zones, setZones] = useState<ZoneGeoBoundary[]>([]);
  const [activeTab, setActiveTab] = useState<'layers' | 'legend'>('layers');

  // Layer Visibility Toggles
  const [showProjects, setShowProjects] = useState<boolean>(true);
  const [showAssets, setShowAssets] = useState<boolean>(true);
  const [showInspections, setShowInspections] = useState<boolean>(true);
  const [showDefects, setShowDefects] = useState<boolean>(true);
  const [showBoundaries, setShowBoundaries] = useState<boolean>(false);

  // Load Map Data
  useEffect(() => {
    let isMounted = true;
    const fetchMap = async () => {
      try {
        const [featData, zoneData] = await Promise.all([
          api.getMapFeatures({}),
          api.getMapZones(),
        ]);
        if (isMounted) {
          setFeatures(featData.features || []);
          setZones(zoneData || []);
        }
      } catch (err) {
        console.warn('Failed to load dashboard map markers:', err);
      }
    };
    fetchMap();
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize Map Once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Rajamahendravaram Godavari Pushkar Ghat Coordinates
    const map = L.map(mapContainerRef.current, {
      center: [16.9950, 81.7680],
      zoom: 13,
      zoomControl: false, // Cleaner look on dashboard
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);

    const polygons = L.layerGroup().addTo(map);
    const markers = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    polygonsLayerRef.current = polygons;
    markersLayerRef.current = markers;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync Layers when toggles or data change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !polygonsLayerRef.current) return;

    const markersGroup = markersLayerRef.current;
    const polygonsGroup = polygonsLayerRef.current;

    markersGroup.clearLayers();
    polygonsGroup.clearLayers();

    // 1. Draw Zone Boundaries if enabled
    if (showBoundaries) {
      const zoneColors: Record<string, string> = {
        'zone-koti': '#E87512',
        'zone-pushkar': '#15803D',
        'zone-saraswati': '#F4B942',
        'zone-dowles': '#8F2D16',
      };

      zones.forEach((z) => {
        if (z.polygon_coordinates && z.polygon_coordinates.length > 2) {
          const color = zoneColors[z.id] || '#8F2D16';
          const polygon = L.polygon(z.polygon_coordinates, {
            color: color,
            weight: 2,
            opacity: 0.8,
            fillColor: color,
            fillOpacity: 0.12,
            dashArray: '4, 4',
          });
          polygonsGroup.addLayer(polygon);
        }
      });
    }

    // 2. Draw Entity Markers based on toggles
    features.forEach((feat) => {
      const type = feat.properties.entity_type;
      if (type === 'project' && !showProjects) return;
      if (type === 'asset' && !showAssets) return;
      if (type === 'inspection' && !showInspections) return;
      if (type === 'defect' && !showDefects) return;

      const [lat, lng] = feat.geometry.coordinates;

      // Color scheme matching reference design:
      // Green = Projects, Orange/Teal = Assets, Purple = Inspections, Red = Defects
      let markerColor = '#15803D';
      let iconSymbol = '●';
      if (type === 'asset') {
        markerColor = '#0F766E';
        iconSymbol = '❖';
      } else if (type === 'inspection') {
        markerColor = '#7C3AED';
        iconSymbol = '✓';
      } else if (type === 'defect') {
        markerColor = '#B91C1C';
        iconSymbol = '!';
      }

      const customIcon = L.divIcon({
        className: 'custom-dashboard-pin',
        html: `
          <div style="
            background-color: ${markerColor};
            width: 26px;
            height: 26px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 11px;
            font-weight: bold;
          ">
            ${iconSymbol}
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });
      marker.bindPopup(`
        <div style="padding: 10px; font-family: sans-serif; min-width: 170px;">
          <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: ${markerColor};">
            ${type}
          </span>
          <h4 style="font-size: 12px; font-weight: bold; margin: 3px 0 2px; color: #35251E;">
            ${feat.properties.title}
          </h4>
          <p style="font-size: 11px; color: #7C7168; margin: 0 0 6px;">
            ${feat.properties.status}
          </p>
          <a href="${feat.properties.details_url}" style="font-size: 11px; color: #8F2D16; font-weight: 600; text-decoration: none;">
            View Details &rarr;
          </a>
        </div>
      `);

      markersGroup.addLayer(marker);
    });
  }, [features, zones, showProjects, showAssets, showInspections, showDefects, showBoundaries]);

  return (
    <div className="bg-white rounded-2xl border border-[#E9DED2] shadow-card overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 bg-[#FFFDF9] border-b border-[#E9DED2] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#8F2D16]" />
          <h3 className="text-xs font-bold text-textPrimary uppercase tracking-wider">
            Project Readiness Map
          </h3>
        </div>
        <button
          onClick={() => navigate('/map')}
          className="text-xs font-bold text-[#8F2D16] hover:text-[#73200E] flex items-center gap-1 transition-colors"
        >
          <span>View Full Map</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Map Viewport with Floating Controls */}
      <div className="relative flex-1 min-h-[290px] w-full">
        {/* Leaflet Container */}
        <div ref={mapContainerRef} className="w-full h-full min-h-[290px] z-0" />

        {/* Floating Layer / Legend Toggle Panel */}
        <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-md rounded-xl shadow-dropdown border border-[#E9DED2] p-2.5 text-xs w-48 transition-all">
          {/* Tab Switcher */}
          <div className="flex rounded-lg bg-[#FAF4EC] p-0.5 mb-2 text-[11px] font-semibold">
            <button
              onClick={() => setActiveTab('layers')}
              className={`flex-1 py-1 rounded-md text-center transition-colors ${
                activeTab === 'layers'
                  ? 'bg-white text-textPrimary shadow-xs font-bold'
                  : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              Layers
            </button>
            <button
              onClick={() => setActiveTab('legend')}
              className={`flex-1 py-1 rounded-md text-center transition-colors ${
                activeTab === 'legend'
                  ? 'bg-white text-textPrimary shadow-xs font-bold'
                  : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              Legend
            </button>
          </div>

          {activeTab === 'layers' ? (
            <div className="space-y-1.5 text-[11px]">
              {/* Projects Toggle */}
              <label className="flex items-center justify-between cursor-pointer select-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]" />
                  <span className="text-textPrimary font-medium">Projects & Works</span>
                </div>
                <input
                  type="checkbox"
                  checked={showProjects}
                  onChange={(e) => setShowProjects(e.target.checked)}
                  className="rounded text-[#E87512] focus:ring-[#E87512] h-3.5 w-3.5"
                />
              </label>

              {/* Assets Toggle */}
              <label className="flex items-center justify-between cursor-pointer select-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]" />
                  <span className="text-textPrimary font-medium">Assets</span>
                </div>
                <input
                  type="checkbox"
                  checked={showAssets}
                  onChange={(e) => setShowAssets(e.target.checked)}
                  className="rounded text-[#E87512] focus:ring-[#E87512] h-3.5 w-3.5"
                />
              </label>

              {/* Inspections Toggle */}
              <label className="flex items-center justify-between cursor-pointer select-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]" />
                  <span className="text-textPrimary font-medium">Inspections</span>
                </div>
                <input
                  type="checkbox"
                  checked={showInspections}
                  onChange={(e) => setShowInspections(e.target.checked)}
                  className="rounded text-[#E87512] focus:ring-[#E87512] h-3.5 w-3.5"
                />
              </label>

              {/* Defects Toggle */}
              <label className="flex items-center justify-between cursor-pointer select-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B91C1C]" />
                  <span className="text-textPrimary font-medium">Defects</span>
                </div>
                <input
                  type="checkbox"
                  checked={showDefects}
                  onChange={(e) => setShowDefects(e.target.checked)}
                  className="rounded text-[#E87512] focus:ring-[#E87512] h-3.5 w-3.5"
                />
              </label>

              {/* Boundaries Toggle */}
              <label className="flex items-center justify-between cursor-pointer select-none pt-1 border-t border-[#E9DED2]/60">
                <span className="text-textSecondary font-medium">Ghat / Zone Grid</span>
                <input
                  type="checkbox"
                  checked={showBoundaries}
                  onChange={(e) => setShowBoundaries(e.target.checked)}
                  className="rounded text-[#E87512] focus:ring-[#E87512] h-3.5 w-3.5"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-1.5 text-[10px] text-textSecondary">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]" />
                <span>Verified / Active Work</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]" />
                <span>Asset QR Station</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]" />
                <span>Field Check Required</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B91C1C]" />
                <span>Critical Defect Flag</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

