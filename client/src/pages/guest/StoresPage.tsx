import 'leaflet/dist/leaflet.css';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Clock,
  Navigation,
  ChevronDown,
  Layers,
  Check,
  Search,
  ArrowRight,
} from 'lucide-react';
import { storeService } from '../../api/services/store.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface Showroom {
  id: number;
  name: string;
  province: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  openHours?: string;
  image?: string;
  distance?: number;
}

const DEFAULT_STORE_IMAGE = '/images/tech-future-banner.jpg';

// Tính khoảng cách Haversine (km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

interface TileSource {
  id: string;
  name: string;
  url: string;
  attribution: string;
  subdomains?: string;
  maxZoom?: number;
}

const TILE_SOURCES: TileSource[] = [
  {
    id: 'esri-street',
    name: 'Esri Street (Giao diện sạch)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19,
  },
  {
    id: 'osm-fr',
    name: 'OpenStreetMap chuẩn',
    url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    subdomains: 'abc',
    maxZoom: 20,
  },
  {
    id: 'osm-hot',
    name: 'OpenStreetMap HOT',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    subdomains: 'abc',
    maxZoom: 19,
  },
];

// Marker Pin vector hiện đại giống hệt ảnh mẫu
const createPinIcon = (isSelected: boolean) =>
  L.divIcon({
    className: 'custom-nexor-marker',
    html: `
      <div style="position: relative; width: 28px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        ${
          isSelected
            ? '<div style="position: absolute; top: -3px; width: 34px; height: 34px; border-radius: 50%; background-color: rgba(15, 23, 42, 0.25); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>'
            : ''
        }
        <svg width="28" height="36" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 5px rgba(0,0,0,0.28)); transition: transform 0.2s ease;">
          <path d="M15 0C6.716 0 0 6.716 0 15C0 25.5 15 38 15 38C15 38 30 25.5 30 15C30 6.716 23.284 0 15 0Z" fill="${
            isSelected ? '#0f172a' : '#1e88e5'
          }"/>
          <circle cx="15" cy="14" r="5.5" fill="#ffffff"/>
          ${isSelected ? '<circle cx="15" cy="14" r="2.8" fill="#0f172a"/>' : ''}
        </svg>
      </div>
    `,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -34],
  });

// ---------------------------------------------------------------------------
// MapController Component
// ---------------------------------------------------------------------------
interface MapControllerProps {
  selected: Showroom | null;
}

const MapController: React.FC<MapControllerProps> = ({ selected }) => {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 300);
    const t3 = setTimeout(() => map.invalidateSize(), 600);
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  useEffect(() => {
    if (selected) {
      map.flyTo([selected.lat, selected.lng], 16, { duration: 1 });
    }
  }, [selected, map]);

  return null;
};

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------
const StoresPage: React.FC = () => {
  const [storesList, setStoresList] = useState<Showroom[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [sortBy, setSortBy] = useState<'default' | 'distance' | 'name'>('default');
  const [selectedShowroom, setSelectedShowroom] = useState<Showroom | null>(null);
  const [activeTileSourceId, setActiveTileSourceId] = useState<string>('esri-street');
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const markerRefs = useRef<{ [key: number]: L.Marker | null }>({});

  // Khóa cuộn trang và ẩn Footer để loại bỏ hoàn toàn thanh kéo dọc khi ở trang Showroom
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const footer = document.querySelector('footer');
    const originalFooterDisplay = footer ? footer.style.display : '';

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    if (footer) {
      footer.style.display = 'none';
    }

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      if (footer) {
        footer.style.display = originalFooterDisplay;
      }
    };
  }, []);

  // Lấy vị trí địa lý của người dùng
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {},
        { timeout: 6000 }
      );
    }
  }, []);

  // Lấy danh sách showroom từ API backend
  useEffect(() => {
    const fetchApiStores = async () => {
      setIsLoadingStores(true);
      setLoadError(null);
      try {
        const data = await storeService.getPublicStores();
        if (Array.isArray(data)) {
          const mapped: Showroom[] = data.map((item) => ({
            id: item.id,
            name: item.name,
            province: item.province,
            address: item.address,
            phone: item.phoneNumber || '',
            lat: item.latitude != null ? item.latitude : 21.0285,
            lng: item.longitude != null ? item.longitude : 105.8542,
            openHours: item.openHours || '08:00 – 21:30',
            image: item.imageUrl?.trim() || DEFAULT_STORE_IMAGE,
          }));
          setStoresList(mapped);
        } else {
          setStoresList([]);
        }
      } catch {
        setStoresList([]);
        setLoadError('Không thể tải danh sách showroom từ máy chủ.');
      } finally {
        setIsLoadingStores(false);
      }
    };
    fetchApiStores();
  }, []);

  const dynamicProvinces = useMemo(() => {
    return Array.from(new Set(storesList.map((s) => s.province))).sort();
  }, [storesList]);

  const filteredAndSortedShowrooms = useMemo(() => {
    let list = storesList.map((store) => {
      const distance = userCoords
        ? calculateDistance(userCoords.lat, userCoords.lng, store.lat, store.lng)
        : undefined;
      return { ...store, distance };
    });

    if (selectedProvince) {
      list = list.filter((s) => s.province === selectedProvince);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.address.toLowerCase().includes(term) ||
          s.province.toLowerCase().includes(term)
      );
    }

    if (sortBy === 'distance') {
      list.sort((a, b) => (a.distance ?? 999999) - (b.distance ?? 999999));
    } else if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [storesList, selectedProvince, searchTerm, sortBy, userCoords]);

  const currentTileSource =
    TILE_SOURCES.find((s) => s.id === activeTileSourceId) || TILE_SOURCES[0];

  const handleShowroomClick = (showroom: Showroom) => {
    setSelectedShowroom(showroom);
    const marker = markerRefs.current[showroom.id];
    if (marker) {
      marker.openPopup();
    }
  };

  const handleDirections = (showroom: Showroom) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${showroom.lat},${showroom.lng}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const defaultCenter: [number, number] = [16.047, 108.206];

  return (
    <>
      {/* CSS Rules đảm bảo trang fit chính xác 1 viewport, ẩn triệt để thanh scrollbar */}
      <style>{`
        footer {
          display: none !important;
        }
        html, body, #root {
          overflow: hidden !important;
          height: 100% !important;
        }
        #main-content {
          overflow: hidden !important;
          height: calc(100vh - 108px) !important;
          display: flex !important;
          flex-direction: column !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        .store-locator-custom-popup .leaflet-popup-content-wrapper {
          padding: 0 !important;
          border-radius: 1rem !important;
          overflow: hidden !important;
          box-shadow: 0 12px 30px -4px rgba(0, 0, 0, 0.16) !important;
        }
        .store-locator-custom-popup .leaflet-popup-content {
          margin: 0 !important;
          line-height: 1.4 !important;
        }
        .store-locator-custom-popup .leaflet-popup-tip {
          background: #ffffff !important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      {/* Container chiếm trọn chiều cao còn lại của viewport (dưới Header ~108px), không tràn */}
      <div className="w-full h-[calc(100vh-108px)] max-h-[calc(100vh-108px)] flex flex-col p-2.5 sm:p-3.5 md:p-4 bg-[#f4f7fb] box-border overflow-hidden">
        {/* Card trắng chính theo phong cách ảnh mẫu */}
        <div className="w-full h-full max-w-[1440px] mx-auto bg-white rounded-2xl md:rounded-3xl shadow-xs border border-slate-200/90 p-3 sm:p-4 lg:p-5 flex flex-col overflow-hidden min-h-0">
          {/* Header Card: Store locator + Badge + Search icon */}
          <div className="flex items-center justify-between shrink-0 pb-2.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-[#1d3557] tracking-tight">
                Tìm kiếm Showroom
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                {filteredAndSortedShowrooms.length} địa điểm
              </span>
            </div>
            <div className="text-slate-400 p-1 rounded-full hover:bg-slate-50 transition">
              <Search className="w-4 h-4 text-slate-500" />
            </div>
          </div>

          {/* Thanh tìm kiếm & Bộ lọc bo tròn (Pill style theo ảnh mẫu) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0 pb-3 border-b border-slate-100">
            {/* Ô nhập địa chỉ / tên */}
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nhập tên showroom, địa chỉ..."
                className="w-full bg-[#f4f6f8] hover:bg-[#edf0f4] focus:bg-white text-slate-800 text-xs sm:text-sm font-medium rounded-full py-2 pl-3.5 pr-8 border border-transparent focus:border-slate-300 focus:outline-none transition"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              ) : (
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              )}
            </div>

            {/* Bộ lọc Tỉnh thành, Khoảng cách và Nút SEARCH */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Dropdown Tỉnh/Thành */}
              <div className="relative min-w-[130px] sm:min-w-[160px]">
                <select
                  value={selectedProvince}
                  onChange={(e) => {
                    setSelectedProvince(e.target.value);
                    setSelectedShowroom(null);
                  }}
                  className="w-full appearance-none bg-[#f4f6f8] hover:bg-[#edf0f4] text-slate-700 text-xs sm:text-sm font-semibold rounded-full py-2 pl-3.5 pr-7 border border-transparent focus:outline-none cursor-pointer transition truncate"
                >
                  <option value="">Tất cả Tỉnh/Thành</option>
                  {dynamicProvinces.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Dropdown Sắp xếp / Khoảng cách */}
              <div className="relative min-w-[110px] sm:min-w-[125px]">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'default' | 'distance' | 'name')}
                  className="w-full appearance-none bg-[#f4f6f8] hover:bg-[#edf0f4] text-slate-700 text-xs sm:text-sm font-semibold rounded-full py-2 pl-3 pr-7 border border-transparent focus:outline-none cursor-pointer transition"
                >
                  <option value="default">Mặc định</option>
                  <option value="distance">Gần nhất</option>
                  <option value="name">Tên A-Z</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Nút TÌM KIẾM pill đen */}
              <button
                type="button"
                onClick={() => {
                  if (filteredAndSortedShowrooms.length > 0) {
                    handleShowroomClick(filteredAndSortedShowrooms[0]);
                  }
                }}
                className="bg-black hover:bg-slate-800 active:scale-95 text-white text-[11px] font-extrabold uppercase tracking-wider px-5 py-2 rounded-full transition shadow-xs cursor-pointer"
              >
                TÌM KIẾM
              </button>
            </div>
          </div>

          {/* Bố cục nội dung chính: Bên trái Bản đồ (Map) - Bên phải Danh sách (List) */}
          {/* min-h-0 và flex-1 đảm bảo không bao giờ tràn ra ngoài viewport */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 pt-3">
            {/* ----------------------------------------------------------------
                BÊN TRÁI: BẢN ĐỒ MAP
            ---------------------------------------------------------------- */}
            <div className="lg:col-span-7 xl:col-span-8 h-full min-h-0 rounded-2xl overflow-hidden relative border border-slate-200 shadow-inner bg-slate-100">
              {/* Nút đổi Tile Layer */}
              <div className="absolute top-2.5 right-2.5 z-[1000]">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowLayerMenu(!showLayerMenu)}
                    className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full shadow-xs border border-slate-200 text-[11px] font-semibold text-slate-700 hover:text-blue-600 transition cursor-pointer"
                    title="Đổi nguồn bản đồ"
                  >
                    <Layers className="w-3 h-3 text-blue-500" />
                    <span>{currentTileSource.name.split(' (')[0]}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {showLayerMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowLayerMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 text-xs">
                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          Nguồn dữ liệu bản đồ
                        </div>
                        {TILE_SOURCES.map((source) => {
                          const isCurrent = source.id === activeTileSourceId;
                          return (
                            <button
                              key={source.id}
                              type="button"
                              onClick={() => {
                                setActiveTileSourceId(source.id);
                                setShowLayerMenu(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition cursor-pointer ${
                                isCurrent
                                  ? 'bg-blue-50 text-blue-600 font-bold'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span>{source.name}</span>
                              {isCurrent && <Check className="w-3 h-3 text-blue-600" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Bản đồ Leaflet Map Container */}
              <MapContainer
                key={activeTileSourceId}
                center={defaultCenter}
                zoom={6}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution={currentTileSource.attribution}
                  url={currentTileSource.url}
                  subdomains={currentTileSource.subdomains || 'abc'}
                  maxZoom={currentTileSource.maxZoom || 19}
                />

                <MapController selected={selectedShowroom} />

                {filteredAndSortedShowrooms.map((showroom) => {
                  const isSelected = selectedShowroom?.id === showroom.id;
                  return (
                    <Marker
                      key={showroom.id}
                      ref={(ref) => {
                        markerRefs.current[showroom.id] = ref;
                      }}
                      position={[showroom.lat, showroom.lng]}
                      icon={createPinIcon(isSelected)}
                      eventHandlers={{
                        click: () => setSelectedShowroom(showroom),
                      }}
                    >
                      <Popup
                        className="store-locator-custom-popup"
                        minWidth={240}
                        maxWidth={270}
                        closeButton={false}
                      >
                        <div className="bg-white rounded-2xl overflow-hidden p-0">
                          {/* Ảnh Showroom */}
                          <div className="h-24 w-full overflow-hidden relative bg-slate-100">
                            <img
                              src={showroom.image || DEFAULT_STORE_IMAGE}
                              alt={showroom.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = DEFAULT_STORE_IMAGE;
                              }}
                            />
                            <span className="absolute bottom-1.5 left-2 text-[9px] font-bold text-white px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-xs">
                              {showroom.province}
                            </span>
                          </div>

                          {/* Thông tin Showroom */}
                          <div className="p-2.5">
                            <h4 className="font-bold text-slate-800 text-xs leading-snug">
                              {showroom.name}
                            </h4>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5 line-clamp-1">
                              {showroom.address}
                            </p>

                            {/* Footer: Khoảng cách + Nút Chỉ đường */}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-blue-500" />
                                {showroom.distance != null
                                  ? `${showroom.distance} KM`
                                  : showroom.phone}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDirections(showroom)}
                                className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-900 hover:text-blue-600 border border-slate-300 hover:border-blue-500 px-2.5 py-1 rounded-full transition cursor-pointer"
                              >
                                <span>CHỈ ĐƯỜNG</span>
                                <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

            {/* ----------------------------------------------------------------
                BÊN PHẢI: DANH SÁCH SHOWROOM
            ---------------------------------------------------------------- */}
            <div className="lg:col-span-5 xl:col-span-4 h-full min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {isLoadingStores ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-xs font-semibold text-slate-600">
                      Đang tải hệ thống showroom từ máy chủ...
                    </p>
                  </div>
                ) : loadError ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center text-rose-500 bg-rose-50/50 rounded-2xl border border-dashed border-rose-200">
                    <p className="text-xs font-semibold">{loadError}</p>
                  </div>
                ) : filteredAndSortedShowrooms.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                    <MapPin className="w-7 h-7 text-slate-300 mb-1.5" />
                    <p className="text-xs font-semibold text-slate-600">
                      Không tìm thấy showroom phù hợp
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Thử đổi từ khóa hoặc chọn tỉnh thành khác
                    </p>
                    {(searchTerm || selectedProvince) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedProvince('');
                        }}
                        className="mt-2 text-xs text-blue-600 font-bold hover:underline"
                      >
                        Xóa bộ lọc
                      </button>
                    )}
                  </div>
                ) : (
                  filteredAndSortedShowrooms.map((showroom) => {
                    const isSelected = selectedShowroom?.id === showroom.id;
                    return (
                      <div
                        key={showroom.id}
                        onClick={() => handleShowroomClick(showroom)}
                        className={`w-full text-left rounded-2xl p-2.5 sm:p-3 transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                          isSelected
                            ? 'bg-blue-50/80 border-2 border-blue-500 shadow-xs'
                            : 'bg-[#f8fafc] hover:bg-slate-100/90 border border-transparent hover:border-slate-200'
                        }`}
                      >
                        {/* Tên & Địa chỉ */}
                        <div className="min-w-0 flex-1">
                          <h3
                            className={`text-xs sm:text-sm font-bold truncate leading-snug ${
                              isSelected ? 'text-blue-700' : 'text-slate-800'
                            }`}
                          >
                            {showroom.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{showroom.address}</span>
                          </div>
                          {showroom.openHours && (
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                              <Clock className="w-2.5 h-2.5 shrink-0" />
                              <span>{showroom.openHours}</span>
                            </div>
                          )}
                        </div>

                        {/* Khoảng cách / SĐT và nút Chỉ đường */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <div className="text-xs font-black text-slate-700">
                              {showroom.distance != null
                                ? `${showroom.distance} KM`
                                : showroom.province}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {showroom.phone}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDirections(showroom);
                            }}
                            className="flex flex-col items-center justify-center w-8 h-8 rounded-xl bg-white hover:bg-blue-600 text-slate-700 hover:text-white border border-slate-200 hover:border-blue-600 transition shadow-2xs group cursor-pointer"
                            title="Chỉ đường trên Google Maps"
                          >
                            <Navigation className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                            <span className="text-[7.5px] font-black uppercase">ĐI</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StoresPage;