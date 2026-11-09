import 'leaflet/dist/leaflet.css';
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Phone,
  Clock,
  Navigation,
  ChevronDown,
  Store,
  Layers,
  Check,
  Compass,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types & Data
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
}

const SHOWROOMS: Showroom[] = [
  {
    id: 1,
    name: 'NEXOR Hà Nội – Cầu Giấy',
    province: 'Hà Nội',
    address: '215 Trần Duy Hưng, Cầu Giấy, Hà Nội',
    phone: '024 3200 1001',
    lat: 21.0066,
    lng: 105.7901,
    openHours: '08:00 – 21:00',
  },
  {
    id: 2,
    name: 'NEXOR Hà Nội – Hoàn Kiếm',
    province: 'Hà Nội',
    address: '52 Lý Thái Tổ, Hoàn Kiếm, Hà Nội',
    phone: '024 3200 1002',
    lat: 21.0286,
    lng: 105.8521,
    openHours: '08:30 – 21:30',
  },
  {
    id: 3,
    name: 'NEXOR TP.HCM – Quận 1',
    province: 'TP. Hồ Chí Minh',
    address: '187 Điện Biên Phủ, Phường 15, Quận 1, TP.HCM',
    phone: '028 3900 2001',
    lat: 10.7769,
    lng: 106.6951,
    openHours: '08:00 – 22:00',
  },
  {
    id: 4,
    name: 'NEXOR TP.HCM – Thủ Đức',
    province: 'TP. Hồ Chí Minh',
    address: '10 Võ Văn Ngân, Bình Thọ, TP. Thủ Đức, TP.HCM',
    phone: '028 3900 2002',
    lat: 10.8509,
    lng: 106.7721,
    openHours: '08:00 – 21:30',
  },
  {
    id: 5,
    name: 'NEXOR Đà Nẵng – Hải Châu',
    province: 'Đà Nẵng',
    address: '74 Hùng Vương, Hải Châu, Đà Nẵng',
    phone: '0236 3600 500',
    lat: 16.0544,
    lng: 108.2022,
    openHours: '08:00 – 21:00',
  },
  {
    id: 6,
    name: 'NEXOR Đà Nẵng – Thanh Khê',
    province: 'Đà Nẵng',
    address: '168 Điện Biên Phủ, Thanh Khê, Đà Nẵng',
    phone: '0236 3600 501',
    lat: 16.0693,
    lng: 108.1797,
    openHours: '08:30 – 21:00',
  },
  {
    id: 7,
    name: 'NEXOR Hải Phòng – Lê Chân',
    province: 'Hải Phòng',
    address: '34 Lạch Tray, Lê Chân, Hải Phòng',
    phone: '0225 3800 700',
    lat: 20.8449,
    lng: 106.6881,
    openHours: '08:00 – 21:00',
  },
  {
    id: 8,
    name: 'NEXOR Cần Thơ – Ninh Kiều',
    province: 'Cần Thơ',
    address: '58 3 Tháng 2, Hưng Lợi, Ninh Kiều, Cần Thơ',
    phone: '0292 3900 800',
    lat: 10.0333,
    lng: 105.7881,
    openHours: '08:00 – 21:00',
  },
  {
    id: 9,
    name: 'NEXOR Nha Trang – Vĩnh Hải',
    province: 'Khánh Hòa',
    address: '12 Trần Phú, Lộc Thọ, Nha Trang, Khánh Hòa',
    phone: '0258 3700 900',
    lat: 12.2451,
    lng: 109.1951,
    openHours: '08:00 – 21:00',
  },
  {
    id: 10,
    name: 'NEXOR Huế – Thành phố Huế',
    province: 'Thừa Thiên Huế',
    address: '25 Trần Hưng Đạo, Phú Hội, TP. Huế',
    phone: '0234 3600 100',
    lat: 16.4674,
    lng: 107.5951,
    openHours: '08:00 – 20:30',
  },
];

const PROVINCES = Array.from(new Set(SHOWROOMS.map((s) => s.province))).sort();

// Các nguồn Tile Layer HOÀN TOÀN MIỄN PHÍ - KHÔNG CẦN BẤT KỲ API KEY NÀO
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
    id: 'osm-fr',
    name: 'Bản đồ OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://openstreetmap.fr" target="_blank" rel="noreferrer">OSM France</a>',
    subdomains: 'abc',
    maxZoom: 20,
  },
  {
    id: 'esri-street',
    name: 'Bản đồ đường phố Esri',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom',
    maxZoom: 19,
  },
  {
    id: 'osm-hot',
    name: 'Bản đồ OpenStreetMap Nhân đạo (HOT)',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors, Tiles style by Humanitarian OpenStreetMap Team',
    subdomains: 'abc',
    maxZoom: 19,
  },
];

// Tạo Marker Icon vector hiện đại (không bị vỡ ảnh trên mọi thiết bị)
const createPinIcon = (isSelected: boolean) =>
  L.divIcon({
    className: 'custom-nexor-marker',
    html: `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
        ${
          isSelected
            ? '<div style="position: absolute; inset: -4px; border-radius: 50%; background-color: rgba(99, 102, 241, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>'
            : ''
        }
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          background: ${isSelected ? 'linear-gradient(135deg, #4f46e5, #4338ca)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)'};
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #ffffff;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
          transition: transform 0.2s ease, background 0.2s ease;
        ">
          <svg style="transform: rotate(45deg); width: 16px; height: 16px; color: #ffffff;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32],
  });

// ---------------------------------------------------------------------------
// MapController Component (FlyTo + InvalidateSize handling)
// ---------------------------------------------------------------------------
interface MapControllerProps {
  selected: Showroom | null;
}

const MapController: React.FC<MapControllerProps> = ({ selected }) => {
  const map = useMap();

  useEffect(() => {
    // Sửa lỗi nền xám: Kích hoạt tính toán lại kích thước khung hình bản đồ
    map.invalidateSize();

    const timer1 = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 600);

    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  useEffect(() => {
    if (selected) {
      map.flyTo([selected.lat, selected.lng], 16, { duration: 1.2 });
    }
  }, [selected, map]);

  return null;
};

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------
const StoresPage: React.FC = () => {
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedShowroom, setSelectedShowroom] = useState<Showroom | null>(null);
  const [activeTileSourceId, setActiveTileSourceId] = useState<string>('osm-fr');
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);

  // Lưu trữ ref các Marker để tự động mở Popup khi click showroom ở danh sách trái
  const markerRefs = useRef<{ [key: number]: L.Marker | null }>({});

  const filteredShowrooms = selectedProvince
    ? SHOWROOMS.filter((s) => s.province === selectedProvince)
    : SHOWROOMS;

  const currentTileSource =
    TILE_SOURCES.find((s) => s.id === activeTileSourceId) || TILE_SOURCES[0];

  const handleShowroomClick = (showroom: Showroom) => {
    setSelectedShowroom(showroom);
    // Tự động mở Popup tương ứng trên bản đồ
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

  // Tọa độ trung tâm Việt Nam
  const defaultCenter: [number, number] = [16.047, 108.206];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-[#181a20] via-[#1e2330] to-[#282d3d] py-10 px-4 shadow-inner">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Hệ Thống Showroom NEXOR
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
                Trải nghiệm trực tiếp các sản phẩm công nghệ flagship tại các thành phố lớn
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-[380px_1fr] gap-6 items-start">
          {/* ----------------------------------------------------------------
              LEFT PANEL: Province filter & Showroom List
          ---------------------------------------------------------------- */}
          <div className="flex flex-col gap-4">
            {/* Bộ lọc Tỉnh / Thành phố */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Chọn khu vực / Tỉnh thành
              </label>
              <div className="relative">
                <select
                  value={selectedProvince}
                  onChange={(e) => {
                    setSelectedProvince(e.target.value);
                    setSelectedShowroom(null);
                  }}
                  className="w-full appearance-none bg-gray-50 hover:bg-gray-100/80 border border-gray-200 text-gray-800 text-sm font-semibold rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer transition"
                >
                  <option value="">— Tất cả Tỉnh / Thành phố ({SHOWROOMS.length} Showroom) —</option>
                  {PROVINCES.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov} ({SHOWROOMS.filter((s) => s.province === prov).length} địa điểm)
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <div className="flex items-center justify-between mt-2.5 text-xs text-gray-500">
                <span>
                  Hiển thị{' '}
                  <strong className="text-indigo-600 font-bold">{filteredShowrooms.length}</strong>{' '}
                  showroom
                </span>
                {selectedProvince && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProvince('');
                      setSelectedShowroom(null);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline cursor-pointer"
                  >
                    Xem tất cả
                  </button>
                )}
              </div>
            </div>

            {/* Danh sách Showroom dạng cuộn */}
            <div className="flex flex-col gap-3 max-h-[580px] overflow-y-auto pr-1 no-scrollbar">
              {filteredShowrooms.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
                  <Store className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  Không tìm thấy showroom nào tại tỉnh thành này.
                </div>
              ) : (
                filteredShowrooms.map((showroom) => {
                  const isActive = selectedShowroom?.id === showroom.id;
                  return (
                    <div
                      key={showroom.id}
                      onClick={() => handleShowroomClick(showroom)}
                      className={`w-full text-left bg-white rounded-2xl border p-4 transition-all cursor-pointer shadow-sm hover:shadow-md ${
                        isActive
                          ? 'border-indigo-500 ring-2 ring-indigo-100 shadow-indigo-100/50'
                          : 'border-gray-100 hover:border-indigo-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                              : 'bg-indigo-50 text-indigo-600'
                          }`}
                        >
                          <MapPin className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3
                              className={`text-sm font-bold leading-tight truncate ${
                                isActive ? 'text-indigo-600' : 'text-gray-900'
                              }`}
                            >
                              {showroom.name}
                            </h3>
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full shrink-0">
                              {showroom.province}
                            </span>
                          </div>

                          <p className="text-xs text-gray-600 mt-1 leading-snug line-clamp-2">
                            {showroom.address}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Phone className="w-3.5 h-3.5 text-indigo-500" />
                              {showroom.phone}
                            </span>
                            {showroom.openHours && (
                              <span className="flex items-center gap-1.5 text-gray-500">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                {showroom.openHours}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-gray-100">
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              <Compass className="w-3 h-3" />
                              Bấm để xem trên bản đồ
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDirections(showroom);
                              }}
                              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition py-1 px-2 hover:bg-indigo-50 rounded-lg cursor-pointer"
                              title="Mở Google Maps chỉ đường"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              Chỉ đường
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ----------------------------------------------------------------
              RIGHT PANEL: Leaflet Map Container
          ---------------------------------------------------------------- */}
          <div className="relative rounded-2xl overflow-hidden shadow-lg border border-gray-200 h-[600px] md:h-[650px] bg-slate-100">
            {/* Control bar: Nguồn bản đồ (Tile Provider Selector) */}
            <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLayerMenu(!showLayerMenu)}
                  className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-gray-200 text-xs font-semibold text-gray-700 hover:text-indigo-600 hover:border-indigo-300 transition cursor-pointer"
                  title="Đổi nguồn bản đồ khi mạng chập chờn"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{currentTileSource.name.split(' (')[0]}</span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>

                {showLayerMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowLayerMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                        Chọn nguồn dữ liệu bản đồ
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
                            className={`w-full flex items-center justify-between px-3 py-2 text-left transition cursor-pointer ${
                              isCurrent
                                ? 'bg-indigo-50 text-indigo-600 font-bold'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span>{source.name}</span>
                            {isCurrent && <Check className="w-3.5 h-3.5 text-indigo-600" />}
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
              key={activeTileSourceId} // Re-mount sạch sẽ khi chuyển nguồn Tile Layer
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

              {/* Map Controller tự động bay tới tọa độ & sửa lỗi render */}
              <MapController selected={selectedShowroom} />

              {/* Danh sách Markers */}
              {filteredShowrooms.map((showroom) => {
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
                    <Popup minWidth={240} maxWidth={300} className="custom-leaflet-popup">
                      <div className="p-1">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                            Showroom NEXOR
                          </span>
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm leading-tight mb-1">
                          {showroom.name}
                        </h4>
                        <p className="text-gray-600 text-xs mb-2 leading-snug flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                          <span>{showroom.address}</span>
                        </p>
                        <div className="space-y-1 mb-3 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span className="font-medium text-gray-800">{showroom.phone}</span>
                          </div>
                          {showroom.openHours && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span>{showroom.openHours}</span>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDirections(showroom)}
                          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold py-2 px-3 rounded-xl shadow-md shadow-indigo-200 transition cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Chỉ đường trên Google Maps</span>
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoresPage;
