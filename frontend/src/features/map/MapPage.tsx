import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Layers,
  List as ListIcon,
  Search,
  RotateCcw,
  Maximize2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Info,
  X
} from 'lucide-react';
import { api } from '../../services/api';
import { Badge, type BadgeVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type {
  MapFeature,
  MapFeatureCollection,
  ZoneGeoBoundary,
  MapEntityType,
} from '../../types/map';

export const MapPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [featureData, setFeatureData] = useState<MapFeatureCollection | null>(null);
  const [zones, setZones] = useState<ZoneGeoBoundary[]>([]);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedFeature, setSelectedFeature] = useState<MapFeature | null>(null);

  // Filters
  const [selectedZoneId, setSelectedZoneId] = useState<string>('All');
  const [selectedEntityType, setSelectedEntityType] = useState<MapEntityType | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Leaflet map container and instance references
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polygonsLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    loadMapData();
  }, [selectedZoneId, selectedEntityType, selectedCategory]);

  const loadMapData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [featRes, zonesRes] = await Promise.all([
        api.getMapFeatures({
          zone_id: selectedZoneId,
          entity_type: selectedEntityType,
          category: selectedCategory,
          search: searchQuery.trim() || undefined,
        }),
        api.getMapZones(),
      ]);
      setFeatureData(featRes);
      setZones(zonesRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load GIS map data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadMapData();
  };

  const handleResetFilters = () => {
    setSelectedZoneId('All');
    setSelectedEntityType('All');
    setSelectedCategory('All');
    setSearchQuery('');
  };

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center: Rajahmundry (Kotilingala / Pushkar Ghat area)
    const map = L.map(mapContainerRef.current, {
      center: [16.9950, 81.7680],
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | CivicProof GIS',
    }).addTo(map);

    const polygonsGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    polygonsLayerRef.current = polygonsGroup;
    markersLayerRef.current = markersGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync Layers (Polygons + Markers) whenever data changes or viewMode toggles to map
  useEffect(() => {
    if (viewMode !== 'map' || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    const polygonsGroup = polygonsLayerRef.current;

    if (!markersGroup || !polygonsGroup) return;

    // 1. Clear existing layers
    markersGroup.clearLayers();
    polygonsGroup.clearLayers();

    // 2. Render Zone Boundaries
    const zoneColors: Record<string, string> = {
      'zone-koti': '#2563EB',     // Blue
      'zone-pushkar': '#059669',  // Emerald
      'zone-saraswati': '#D97706',// Amber
      'zone-dowles': '#4F46E5',   // Indigo
    };

    zones.forEach((z) => {
      if (selectedZoneId !== 'All' && z.id !== selectedZoneId) return;

      if (z.polygon_coordinates && z.polygon_coordinates.length > 2) {
        const color = zoneColors[z.id] || '#64748B';
        const polygon = L.polygon(z.polygon_coordinates, {
          color: color,
          weight: 2,
          opacity: 0.85,
          fillColor: color,
          fillOpacity: 0.08,
          dashArray: '4, 4',
        });

        polygon.bindTooltip(
          `<strong>${z.name}</strong><br/>Readiness: ${z.readiness_percentage}% | Risk: ${z.risk_level}`,
          { permanent: false, direction: 'center', className: 'text-xs font-sans' }
        );

        polygonsGroup.addLayer(polygon);
      }
    });

    // 3. Render Feature Markers
    const bounds = L.latLngBounds([]);

    const featuresToRender = (featureData?.features || []).filter((f) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          f.properties.title.toLowerCase().includes(q) ||
          f.properties.code.toLowerCase().includes(q) ||
          f.properties.category.toLowerCase().includes(q)
        );
      }
      return true;
    });

    featuresToRender.forEach((f) => {
      const lat = f.properties.latitude;
      const lng = f.properties.longitude;
      const latLng = L.latLng(lat, lng);
      bounds.extend(latLng);

      const customIcon = createCustomDivIcon(f.properties.entity_type, f.properties.status);

      const marker = L.marker(latLng, { icon: customIcon });

      // Create rich popup content
      const popupHtml = `
        <div style="min-width: 220px; font-family: 'Inter', sans-serif;">
          <div style="background-color: #0F172A; padding: 10px 12px; color: white;">
            <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #94A3B8; font-weight: 700;">
              ${f.properties.entity_type} • ${f.properties.code}
            </span>
            <h4 style="margin: 2px 0 0 0; font-size: 13px; font-weight: 700; color: #FFFFFF; line-height: 1.3;">
              ${escapeHtml(f.properties.title)}
            </h4>
          </div>
          <div style="padding: 12px; font-size: 11px; color: #334155; line-height: 1.5; background: #FFFFFF;">
            <div style="margin-bottom: 6px;">
              <span style="color: #64748B;">Category:</span> <strong>${escapeHtml(f.properties.category)}</strong>
            </div>
            <div style="margin-bottom: 6px;">
              <span style="color: #64748B;">Status:</span> <strong>${escapeHtml(f.properties.status)}</strong>
            </div>
            <div style="margin-bottom: 8px;">
              <span style="color: #64748B;">Zone:</span> <strong>${escapeHtml(f.properties.zone_name || 'N/A')}</strong>
            </div>
            <div style="padding-top: 8px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 10px; font-family: monospace; color: #64748B;">${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
              <a href="${f.properties.details_url}" style="font-size: 11px; font-weight: 700; color: #174EA6; text-decoration: none;">
                View Details &rarr;
              </a>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280, closeButton: false });

      marker.on('click', () => {
        setSelectedFeature(f);
      });

      markersGroup.addLayer(marker);
    });

    // Fit bounds if we have valid coordinates
    if (featuresToRender.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [featureData, zones, selectedZoneId, viewMode, searchQuery]);

  const fitBoundsToAll = () => {
    if (!mapInstanceRef.current || !featureData) return;
    const bounds = L.latLngBounds([]);
    featureData.features.forEach((f) => {
      bounds.extend([f.properties.latitude, f.properties.longitude]);
    });
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  };

  // Helper to create high-visibility SVG pin icons
  const createCustomDivIcon = (type: MapEntityType, status: string): L.DivIcon => {
    let bgColor = '#2563EB'; // Blue
    let iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/></svg>`;

    if (type === 'asset') {
      bgColor = '#059669'; // Emerald
      iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/></svg>`;
    } else if (type === 'inspection') {
      bgColor = '#0284C7'; // Sky
      iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`;
    } else if (type === 'defect') {
      bgColor = '#DC2626'; // Red
      iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    }

    const isCritical = status === 'Critical' || status === 'Failed' || status === 'Delayed';

    const html = `
      <div style="
        position: relative;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: ${bgColor};
        color: white;
        border-radius: 9999px;
        border: 2px solid white;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.25);
        cursor: pointer;
      ">
        ${iconSvg}
        ${
          isCritical
            ? `<span style="
                position: absolute;
                top: -3px;
                right: -3px;
                width: 10px;
                height: 10px;
                background-color: #EF4444;
                border: 2px solid white;
                border-radius: 9999px;
                animation: pulse 1.5s infinite;
              "></span>`
            : ''
        }
      </div>
    `;

    return L.divIcon({
      className: 'custom-map-pin',
      html: html,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -18],
    });
  };

  const getEntityBadgeVariant = (type: MapEntityType): BadgeVariant => {
    switch (type) {
      case 'project':
        return 'brand';
      case 'asset':
        return 'success';
      case 'inspection':
        return 'neutral';
      case 'defect':
        return 'error';
      default:
        return 'neutral';
    }
  };

  const getRiskBadgeVariant = (risk: string): BadgeVariant => {
    switch (risk) {
      case 'Low':
        return 'success';
      case 'Medium':
        return 'warning';
      case 'High':
      case 'Critical':
        return 'error';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* DEMO DATA Notice Banner (Mandated by Section 15 / Page 34) */}
      <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-amber-900">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>DEMO DATA:</strong> Geographic coordinates are synthetic representations of Godavari Pushkaralu 2027 ghat sectors for demonstration purposes. Never use for official surveying or navigation.
          </span>
        </div>
        <span className="font-mono text-[10px] font-bold uppercase bg-amber-200/60 px-2 py-0.5 rounded text-amber-800">
          Prototype
        </span>
      </div>

      {/* Header Banner */}
      <div className="bg-white border border-borderLight rounded-xl p-6 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                Module 10 GIS
              </span>
              <span className="text-xs text-textSecondary font-medium">OpenStreetMap & Leaflet Zone Monitoring</span>
            </div>
            <h1 className="text-2xl font-bold text-textPrimary tracking-tight">
              Geographic Map & Zone Monitoring
            </h1>
            <p className="text-sm text-textSecondary mt-1 max-w-3xl">
              Spatial tracking of Pushkaralu ghat works, municipal assets, field inspections, and safety hazard clusters along the River Godavari.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Map / List View Toggle */}
            <div className="inline-flex rounded-lg border border-borderLight p-1 bg-slate-50">
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'map'
                    ? 'bg-white text-brand shadow-sm'
                    : 'text-textSecondary hover:text-textPrimary'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Map View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-brand shadow-sm'
                    : 'text-textSecondary hover:text-textPrimary'
                }`}
              >
                <ListIcon className="w-3.5 h-3.5" />
                Accessible List
              </button>
            </div>

            <Button
              variant="secondary"
              onClick={loadMapData}
              isLoading={loading}
              icon={<RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Timeline Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-borderLight rounded-xl p-4 shadow-card">
          <span className="text-[11px] text-textSecondary font-semibold uppercase tracking-wider block">Total Mapped Entities</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-slate-900">{featureData?.total_features ?? '--'}</span>
            <span className="text-xs text-slate-500">geolocations</span>
          </div>
        </div>

        <div className="bg-white border border-borderLight rounded-xl p-4 shadow-card">
          <span className="text-[11px] text-textSecondary font-semibold uppercase tracking-wider block">Active Projects</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-blue-600">{featureData?.projects_count ?? '--'}</span>
            <span className="text-xs text-slate-500">sites</span>
          </div>
        </div>

        <div className="bg-white border border-borderLight rounded-xl p-4 shadow-card">
          <span className="text-[11px] text-textSecondary font-semibold uppercase tracking-wider block">Tracked Assets</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-emerald-600">{featureData?.assets_count ?? '--'}</span>
            <span className="text-xs text-slate-500">municipal units</span>
          </div>
        </div>

        <div className="bg-white border border-borderLight rounded-xl p-4 shadow-card">
          <span className="text-[11px] text-textSecondary font-semibold uppercase tracking-wider block">Inspections Completed</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-sky-600">{featureData?.inspections_count ?? '--'}</span>
            <span className="text-xs text-slate-500">checkpoints</span>
          </div>
        </div>

        <div className="bg-white border border-borderLight rounded-xl p-4 shadow-card">
          <span className="text-[11px] text-textSecondary font-semibold uppercase tracking-wider block">Active Hazards / Defects</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-red-600">{featureData?.defects_count ?? 0}</span>
            <span className="text-xs text-red-500 font-medium">pending rework</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-borderLight rounded-xl p-4 shadow-card">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Zone Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Zone:</span>
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="All">All Zones & Ghats</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Entity Type Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Type:</span>
              <select
                value={selectedEntityType}
                onChange={(e) => setSelectedEntityType(e.target.value as any)}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="All">All Entities</option>
                <option value="project">Projects</option>
                <option value="asset">Assets</option>
                <option value="inspection">Inspections</option>
                <option value="defect">Defects</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="All">All Categories</option>
                <option value="Drinking Water">Drinking Water</option>
                <option value="Sanitation">Sanitation</option>
                <option value="Public Lighting">Public Lighting</option>
                <option value="Public Safety">Public Safety</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by code, title, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand focus:border-brand bg-slate-50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === 'map' && (
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={fitBoundsToAll}
                icon={<Maximize2 className="w-3.5 h-3.5" />}
              >
                Fit to Results
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={handleResetFilters}
            >
              Reset
            </Button>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Workspace: Map Canvas + Geographic Intelligence Side Panel */}
      {viewMode === 'map' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Leaflet Map Canvas (8 cols) */}
          <div className="lg:col-span-8 bg-white border border-borderLight rounded-xl shadow-card overflow-hidden relative">
            <div
              ref={mapContainerRef}
              className="w-full h-[620px] bg-slate-100 z-0"
              style={{ minHeight: '620px' }}
            />

            {/* Floating Status Legend (Bottom Right) */}
            <div className="absolute bottom-4 right-4 z-20 bg-white/95 backdrop-blur-sm border border-borderLight rounded-xl p-3 shadow-lg text-[11px] space-y-2 pointer-events-auto">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
                Map Entity Legend
              </span>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600 border border-white shadow-sm flex items-center justify-center text-[8px] text-white font-bold" />
                  <span className="text-slate-700">Project Location</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-600 border border-white shadow-sm flex items-center justify-center text-[8px] text-white font-bold" />
                  <span className="text-slate-700">Municipal Asset</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-sky-600 border border-white shadow-sm flex items-center justify-center text-[8px] text-white font-bold" />
                  <span className="text-slate-700">Inspection Checkpoint</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600 border border-white shadow-sm flex items-center justify-center text-[8px] text-white font-bold animate-pulse" />
                  <span className="text-slate-700">Defect / Hazard</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <span className="w-4 h-1 border-b-2 border-dashed border-indigo-600" />
                  <span className="text-slate-600">Ghat Zone Perimeter</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Selected Entity Dossier & Zone Readiness Summary (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Selected Feature Flyout */}
            {selectedFeature ? (
              <div className="bg-white border border-borderLight rounded-xl shadow-card p-5 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-borderLight pb-2.5">
                  <div className="flex items-center gap-2">
                    <Badge variant={getEntityBadgeVariant(selectedFeature.properties.entity_type)} size="sm">
                      {selectedFeature.properties.entity_type.toUpperCase()}
                    </Badge>
                    <span className="font-mono text-xs font-bold text-slate-500">
                      {selectedFeature.properties.code}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFeature(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {selectedFeature.properties.title}
                  </h3>
                  <span className="text-xs text-textSecondary block mt-0.5">
                    {selectedFeature.properties.zone_name || 'Unassigned Zone'}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-xs border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Category:</span>
                    <span className="font-semibold text-slate-800">{selectedFeature.properties.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-semibold text-slate-800">{selectedFeature.properties.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Coordinates:</span>
                    <span className="font-mono text-[11px] font-semibold text-slate-700">
                      {selectedFeature.properties.latitude.toFixed(4)}, {selectedFeature.properties.longitude.toFixed(4)}
                    </span>
                  </div>
                  {selectedFeature.properties.project_name && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Parent Project:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                        {selectedFeature.properties.project_name}
                      </span>
                    </div>
                  )}
                </div>

                <a
                  href={selectedFeature.properties.details_url}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-brand rounded-lg hover:bg-brand-dark transition-all shadow-sm"
                >
                  <span>Open Full Record Dossier</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <div className="bg-white border border-borderLight rounded-xl shadow-card p-5 text-center text-xs text-slate-500">
                <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span className="font-semibold text-slate-700 block">Click any map marker</span>
                <span className="text-[11px] text-slate-400">View detailed entity dossier, coordinates, and linked records.</span>
              </div>
            )}

            {/* Zone Readiness Leaderboard */}
            <div className="bg-white border border-borderLight rounded-xl shadow-card p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-borderLight pb-2.5">
                <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-brand" />
                  Ghat Sector Readiness
                </h3>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">4 Sectors</span>
              </div>

              <div className="space-y-3">
                {zones.map((z) => (
                  <div
                    key={z.id}
                    onClick={() => {
                      setSelectedZoneId(z.id);
                      if (mapInstanceRef.current && z.center_lat && z.center_lng) {
                        mapInstanceRef.current.setView([z.center_lat, z.center_lng], 15);
                      }
                    }}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      selectedZoneId === z.id
                        ? 'bg-blue-50/70 border-brand'
                        : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800">{z.name}</span>
                      <Badge variant={getRiskBadgeVariant(z.risk_level)} size="sm">
                        {z.risk_level} Risk
                      </Badge>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Verified Readiness:</span>
                        <span className="font-bold text-slate-900">{z.readiness_percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            z.readiness_percentage >= 75
                              ? 'bg-emerald-600'
                              : z.readiness_percentage >= 40
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, z.readiness_percentage)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 mt-2 border-t border-slate-200/60">
                      <span>{z.total_projects} Projects</span>
                      <span>{z.total_assets} Assets</span>
                      <span className={z.open_defects > 0 ? 'text-red-600 font-bold' : ''}>
                        {z.open_defects} Open Hazards
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Accessible List View Alternative (Mandated by Section 15 / Page 34) */
        <div className="bg-white border border-borderLight rounded-xl shadow-card overflow-hidden">
          <div className="p-4 border-b border-borderLight flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Accessible Geographic Record Directory</h3>
              <p className="text-xs text-textSecondary mt-0.5">
                Screen-reader friendly tabular view of all geolocated Pushkaralu infrastructure works and assets.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
              {featureData?.features.length ?? 0} Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-borderLight text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Identifier / Code</th>
                  <th className="py-3 px-4">Name / Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Zone / Ghat</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Coordinates</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderLight">
                {(featureData?.features || []).map((f) => (
                  <tr key={f.properties.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <Badge variant={getEntityBadgeVariant(f.properties.entity_type)} size="sm">
                        {f.properties.entity_type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{f.properties.code}</td>
                    <td className="py-3 px-4 font-medium text-slate-900 max-w-[240px] truncate">
                      {f.properties.title}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{f.properties.category}</td>
                    <td className="py-3 px-4 text-slate-600">{f.properties.zone_name || 'N/A'}</td>
                    <td className="py-3 px-4">
                      <Badge variant="neutral" size="sm">
                        {f.properties.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {f.properties.latitude.toFixed(4)}, {f.properties.longitude.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={f.properties.details_url}
                        className="text-brand font-bold hover:underline inline-flex items-center gap-1"
                      >
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
