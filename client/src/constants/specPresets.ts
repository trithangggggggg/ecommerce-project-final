export interface SpecPresetItem {
  group: string;
  key: string;
  value: string;
  isRequired?: boolean;
}

export interface SpecPresetGroup {
  id: string;
  name: string;
  description: string;
  deviceType: 'phone' | 'laptop' | 'both';
  items: SpecPresetItem[];
}

// ============================================================
// 1. LAPTOP PRESETS (Theo yêu cầu: Cần có & Bổ sung)
// ============================================================

export const LAPTOP_REQUIRED_SPECS: SpecPresetItem[] = [
  // CPU (Cần có)
  { group: 'CPU', key: 'Model CPU', value: 'Intel Core i7-13700H', isRequired: true },
  { group: 'CPU', key: 'Số nhân CPU', value: '14 nhân (6 P-core, 8 E-core)', isRequired: true },
  { group: 'CPU', key: 'Số luồng CPU', value: '20 luồng', isRequired: true },
  { group: 'CPU', key: 'Xung nhịp tối đa', value: '5.0 GHz Turbo Boost', isRequired: true },

  // GPU (Cần có)
  { group: 'GPU', key: 'Model GPU', value: 'NVIDIA GeForce RTX 4060', isRequired: true },
  { group: 'GPU', key: 'Loại card', value: 'Card đồ họa rời', isRequired: true },
  { group: 'GPU', key: 'Bộ nhớ VRAM', value: '8GB GDDR6 (140W TGP)', isRequired: true },

  // RAM (Cần có)
  { group: 'RAM', key: 'Loại RAM', value: 'DDR5', isRequired: true },
  { group: 'RAM', key: 'Tốc độ RAM (Bus)', value: '5200 MHz', isRequired: true },
  { group: 'RAM', key: 'Số khe RAM', value: '2 khe (1 khe có sẵn 16GB, 1 khe trống)', isRequired: true },
  { group: 'RAM', key: 'Hỗ trợ RAM tối đa', value: '64 GB', isRequired: true },

  // Ổ cứng (Cần có)
  { group: 'Ổ cứng', key: 'Loại ổ cứng', value: 'SSD M.2 NVMe PCIe', isRequired: true },
  { group: 'Ổ cứng', key: 'Chuẩn giao tiếp', value: 'PCIe Gen 4.0 x4', isRequired: true },
  { group: 'Ổ cứng', key: 'Số khe cắm SSD', value: '2 khe M.2 (512GB có sẵn + 1 khe trống nâng cấp)', isRequired: true },

  // Màn hình (Cần có)
  { group: 'Màn hình', key: 'Kích thước màn hình', value: '15.6 inch', isRequired: true },
  { group: 'Màn hình', key: 'Độ phân giải', value: 'QHD / 2K (2560 x 1440)', isRequired: true },
  { group: 'Màn hình', key: 'Tần số quét', value: '165 Hz', isRequired: true },
  { group: 'Màn hình', key: 'Công nghệ tấm nền', value: 'IPS, 100% sRGB, 300 nits', isRequired: true },

  // Kết nối (Cần có)
  { group: 'Kết nối', key: 'Wi-Fi', value: 'Wi-Fi 6E (802.11ax)', isRequired: true },
  { group: 'Kết nối', key: 'Bluetooth', value: 'Bluetooth 5.3', isRequired: true },
  { group: 'Kết nối', key: 'Cổng USB-A', value: '2x USB 3.2 Gen 1 Type-A', isRequired: true },
  { group: 'Kết nối', key: 'Cổng USB-C', value: '1x Thunderbolt 4 / USB-C (Power Delivery, DisplayPort)', isRequired: true },
  { group: 'Kết nối', key: 'Cổng HDMI', value: '1x HDMI 2.1', isRequired: true },
  { group: 'Kết nối', key: 'Cổng LAN (RJ45)', value: '1x RJ-45 Gigabit Ethernet', isRequired: true },
  { group: 'Kết nối', key: 'Jack âm thanh', value: 'Jack tai nghe 3.5mm combo (Mic & Audio)', isRequired: true },

  // Pin (Cần có)
  { group: 'Pin', key: 'Dung lượng pin (Wh)', value: '80 Wh', isRequired: true },
  { group: 'Pin', key: 'Số cell pin', value: '4 cell Li-ion', isRequired: true },

  // Hệ điều hành (Cần có)
  { group: 'Hệ điều hành', key: 'Tên hệ điều hành', value: 'Windows 11 Home', isRequired: true },
  { group: 'Hệ điều hành', key: 'Phiên bản OS', value: '64-bit', isRequired: true },
  { group: 'Hệ điều hành', key: 'Bản quyền', value: 'Bản quyền vĩnh viễn theo máy', isRequired: true },

  // Thiết kế (Cần có)
  { group: 'Thiết kế', key: 'Kích thước', value: '359 x 256 x 22.8 mm', isRequired: true },
  { group: 'Thiết kế', key: 'Trọng lượng', value: '2.25 kg', isRequired: true },
];

export const LAPTOP_ADDITIONAL_SPECS: SpecPresetItem[] = [
  // Màn hình (Bổ sung)
  { group: 'Màn hình', key: 'Tỷ lệ khung hình', value: '16:10', isRequired: false },
  { group: 'Màn hình', key: 'Lớp phủ màn hình', value: 'Chống chói Anti-Glare', isRequired: false },
  { group: 'Màn hình', key: 'Công nghệ đồng bộ', value: 'NVIDIA G-Sync / AMD FreeSync', isRequired: false },

  // Nguồn điện (Bổ sung)
  { group: 'Nguồn điện', key: 'Công suất sạc', value: '170W AC Adapter', isRequired: false },
  { group: 'Nguồn điện', key: 'Công nghệ sạc', value: 'Sạc nhanh Rapid Charge Pro (50% trong 30 phút)', isRequired: false },

  // Ngoại vi (Bổ sung)
  { group: 'Ngoại vi', key: 'Bàn phím', value: 'Full-size có bàn phím số riêng (Numpad)', isRequired: false },
  { group: 'Ngoại vi', key: 'Đèn nền bàn phím', value: 'RGB 4 vùng hoặc LED đơn sắc trắng', isRequired: false },
  { group: 'Ngoại vi', key: 'Webcam', value: '1080p FHD với công tắc khóa E-shutter bảo mật', isRequired: false },
  { group: 'Ngoại vi', key: 'Hệ thống loa', value: '2x 2W Stereo Speakers, hỗ trợ Nahimic Audio', isRequired: false },
  { group: 'Ngoại vi', key: 'Microphone', value: 'Mảng micro kép tích hợp khử ồn AI', isRequired: false },
];

export const LAPTOP_FULL_SPECS: SpecPresetItem[] = [
  ...LAPTOP_REQUIRED_SPECS,
  ...LAPTOP_ADDITIONAL_SPECS,
];

// ============================================================
// 2. ĐIỆN THOẠI PRESETS (Theo yêu cầu: 9 nhóm và các field mặc định)
// ============================================================

export const PHONE_FULL_SPECS: SpecPresetItem[] = [
  // Màn hình
  { group: 'Màn hình', key: 'Kích thước màn hình', value: '6.7 inch', isRequired: true },
  { group: 'Màn hình', key: 'Công nghệ màn hình', value: 'Super Retina XDR OLED / Dynamic AMOLED 2X', isRequired: true },
  { group: 'Màn hình', key: 'Độ phân giải', value: '1.5K (2796 x 1290 pixels)', isRequired: true },
  { group: 'Màn hình', key: 'Tần số quét', value: '120Hz ProMotion (thích ứng 1 - 120Hz)', isRequired: true },
  { group: 'Màn hình', key: 'Độ sáng tối đa', value: '2000 nits (ngoài trời)', isRequired: true },
  { group: 'Màn hình', key: 'Hỗ trợ HDR', value: 'HDR10+, Dolby Vision', isRequired: true },
  { group: 'Màn hình', key: 'Kính bảo vệ', value: 'Ceramic Shield thế hệ mới / Gorilla Glass Armor', isRequired: true },

  // Hiệu năng
  { group: 'Hiệu năng', key: 'Chip xử lý (CPU)', value: 'Apple A18 Pro / Snapdragon 8 Gen 3', isRequired: true },
  { group: 'Hiệu năng', key: 'Chip đồ họa (GPU)', value: 'Apple 6-core GPU / Adreno 750', isRequired: true },
  { group: 'Hiệu năng', key: 'Tiến trình sản xuất', value: '3 nm', isRequired: true },
  { group: 'Hiệu năng', key: 'Số nhân CPU', value: '6 nhân (2 nhân hiệu năng cao + 4 nhân tiết kiệm)', isRequired: true },
  { group: 'Hiệu năng', key: 'Tốc độ CPU', value: 'Tối đa 4.04 GHz', isRequired: true },

  // Camera
  { group: 'Camera', key: 'Cụm camera sau', value: 'Chính 48 MP, Góc siêu rộng 48 MP, Telephoto 12 MP', isRequired: true },
  { group: 'Camera', key: 'Camera chính', value: '48 MP, f/1.78, 24mm, Sensor-shift OIS thế hệ 2', isRequired: true },
  { group: 'Camera', key: 'Góc siêu rộng', value: '48 MP, f/2.2, 120 độ, hỗ trợ chụp Macro', isRequired: true },
  { group: 'Camera', key: 'Telephoto', value: '12 MP, Zoom quang học 5x (120mm), f/2.8, 3D Sensor-shift OIS', isRequired: true },
  { group: 'Camera', key: 'Chống rung (OIS)', value: 'OIS dịch chuyển cảm biến quang học thế hệ 2', isRequired: true },
  { group: 'Camera', key: 'Camera trước', value: '12 MP, f/1.9, Tự động lấy nét Autofocus, cảm biến TrueDepth', isRequired: true },
  { group: 'Camera', key: 'Quay video', value: '4K@120fps Dolby Vision HDR, ProRes, Không gian 3D Spatial Video', isRequired: true },

  // Pin & sạc
  { group: 'Pin & sạc', key: 'Dung lượng pin', value: '4685 mAh', isRequired: true },
  { group: 'Pin & sạc', key: 'Công suất sạc dây', value: 'Sạc nhanh 25W - 50% trong 30 phút', isRequired: true },
  { group: 'Pin & sạc', key: 'Sạc không dây', value: 'MagSafe 25W, chuẩn Qi2 15W', isRequired: true },
  { group: 'Pin & sạc', key: 'Sạc ngược', value: 'Sạc ngược có dây 4.5W cho phụ kiện và thiết bị khác', isRequired: true },
  { group: 'Pin & sạc', key: 'Chuẩn sạc', value: 'USB Power Delivery (USB-PD 3.0)', isRequired: true },

  // Kết nối
  { group: 'Kết nối', key: 'Mạng di động', value: '5G (Sub-6 GHz & mmWave), 4G LTE đa băng tần', isRequired: true },
  { group: 'Kết nối', key: 'Loại SIM', value: 'eSIM và Nano-SIM', isRequired: true },
  { group: 'Kết nối', key: 'Số SIM', value: '2 SIM (1 Nano SIM + 1 eSIM hoặc Dual eSIM)', isRequired: true },
  { group: 'Kết nối', key: 'Wi-Fi', value: 'Wi-Fi 7 (802.11be) với MIMO 2x2', isRequired: true },
  { group: 'Kết nối', key: 'Bluetooth', value: 'Bluetooth 5.3', isRequired: true },
  { group: 'Kết nối', key: 'NFC', value: 'Có (Hỗ trợ Apple Pay / Google Pay / Thẻ ra vào)', isRequired: true },
  { group: 'Kết nối', key: 'Cổng USB', value: 'USB Type-C chuẩn USB 3.0 (tốc độ truyền 10Gbps, DisplayPort)', isRequired: true },
  { group: 'Kết nối', key: 'Định vị GPS', value: 'GPS tần số kép chính xác, GLONASS, Galileo, QZSS, BeiDou', isRequired: true },

  // Bảo mật & độ bền
  { group: 'Bảo mật & độ bền', key: 'Cảm biến vân tay', value: 'Không / Vân tay siêu âm ẩn dưới màn hình', isRequired: true },
  { group: 'Bảo mật & độ bền', key: 'Nhận diện khuôn mặt', value: 'Face ID 3D (Bảo mật sinh trắc học chuẩn ngân hàng)', isRequired: true },
  { group: 'Bảo mật & độ bền', key: 'Chỉ số chống nước/bụi (IP rating)', value: 'IP68 (Độ sâu tối đa 6m trong 30 phút)', isRequired: true },
  { group: 'Bảo mật & độ bền', key: 'Kính bảo vệ', value: 'Ceramic Shield thế hệ mới bền hơn gấp 2 lần', isRequired: true },
  { group: 'Bảo mật & độ bền', key: 'Chất liệu khung và mặt lưng', value: 'Khung Titan chuẩn hàng không vũ trụ cấp 5, mặt lưng kính nhám mờ', isRequired: true },

  // Phần mềm
  { group: 'Phần mềm', key: 'Hệ điều hành', value: 'iOS 18 / Android 15', isRequired: true },
  { group: 'Phần mềm', key: 'Phiên bản OS', value: 'Bản mới nhất tích hợp các tính năng AI', isRequired: true },
  { group: 'Phần mềm', key: 'Thời gian cập nhật phần mềm', value: 'Cam kết cập nhật hệ điều hành & bảo mật 5 - 7 năm', isRequired: true },

  // Âm thanh & cảm biến
  { group: 'Âm thanh & cảm biến', key: 'Hệ thống loa', value: 'Loa kép Stereo đa hướng hỗ trợ Dolby Atmos', isRequired: true },
  { group: 'Âm thanh & cảm biến', key: 'Jack tai nghe', value: 'Không (Hỗ trợ qua cổng Type-C hoặc Bluetooth)', isRequired: true },
  { group: 'Âm thanh & cảm biến', key: 'Microphone', value: 'Mảng 4 micro chuẩn studio, lọc tiếng gió & chống ồn AI', isRequired: true },
  { group: 'Âm thanh & cảm biến', key: 'Con quay hồi chuyển', value: 'Con quay hồi chuyển dải động cao (High Dynamic Range)', isRequired: true },
  { group: 'Âm thanh & cảm biến', key: 'Cảm biến tiệm cận', value: 'Cảm biến tiệm cận độ nhạy cao', isRequired: true },
  { group: 'Âm thanh & cảm biến', key: 'Cảm biến ánh sáng', value: 'Cảm biến ánh sáng kép xung quanh mặt trước và sau', isRequired: true },

  // Thiết kế
  { group: 'Thiết kế', key: 'Kích thước máy', value: '163 x 77.6 x 8.25 mm', isRequired: true },
  { group: 'Thiết kế', key: 'Trọng lượng', value: '227 g', isRequired: true },
];

export const PHONE_BASIC_SPECS: SpecPresetItem[] = PHONE_FULL_SPECS.filter((item) =>
  ['Màn hình', 'Hiệu năng', 'Camera', 'Pin & sạc', 'Kết nối', 'Thiết kế'].includes(item.group)
);

// ============================================================
// 3. PHỤ KIỆN PRESET (Accessory)
// ============================================================

export const ACCESSORY_SPECS: SpecPresetItem[] = [
  { group: 'Thông số chung', key: 'Chuẩn kết nối', value: 'Bluetooth 5.3 / USB Type-C', isRequired: true },
  { group: 'Thông số chung', key: 'Chất liệu', value: 'Nhựa ABS / Hợp kim nhôm', isRequired: true },
  { group: 'Thông số chung', key: 'Tương thích', value: 'iOS, Android, Windows, macOS', isRequired: true },
  { group: 'Pin & Nguồn', key: 'Thời lượng pin', value: 'Lên đến 30 giờ (kèm hộp sạc)', isRequired: true },
  { group: 'Pin & Nguồn', key: 'Cổng sạc', value: 'USB Type-C hỗ trợ sạc nhanh', isRequired: true },
  { group: 'Bảo hành', key: 'Thời hạn bảo hành', value: '12 tháng chính hãng 1 đổi 1', isRequired: true },
];

// ============================================================
// 4. DANH SÁCH TỪNG NHÓM (Dùng để chèn lẻ từng nhóm linh hoạt)
// ============================================================

export const SPEC_GROUPS_CATALOG: SpecPresetGroup[] = [
  {
    id: 'cpu',
    name: 'CPU (Vi xử lý Laptop)',
    description: 'Model, số nhân, số luồng, xung nhịp',
    deviceType: 'laptop',
    items: LAPTOP_REQUIRED_SPECS.filter((i) => i.group === 'CPU'),
  },
  {
    id: 'gpu',
    name: 'GPU (Card đồ họa Laptop)',
    description: 'Model GPU, loại card rời/tích hợp, VRAM',
    deviceType: 'laptop',
    items: LAPTOP_REQUIRED_SPECS.filter((i) => i.group === 'GPU'),
  },
  {
    id: 'ram',
    name: 'RAM (Bộ nhớ trong Laptop)',
    description: 'Loại RAM, tốc độ bus, số khe, hỗ trợ tối đa',
    deviceType: 'laptop',
    items: LAPTOP_REQUIRED_SPECS.filter((i) => i.group === 'RAM'),
  },
  {
    id: 'storage',
    name: 'Ổ cứng & Lưu trữ',
    description: 'Loại ổ SSD, chuẩn giao tiếp, số khe M.2',
    deviceType: 'laptop',
    items: LAPTOP_REQUIRED_SPECS.filter((i) => i.group === 'Ổ cứng'),
  },
  {
    id: 'laptop-display',
    name: 'Màn hình Laptop',
    description: 'Kích thước, độ phân giải, tần số quét, tấm nền, tỷ lệ, chống chói',
    deviceType: 'laptop',
    items: [
      ...LAPTOP_REQUIRED_SPECS.filter((i) => i.group === 'Màn hình'),
      ...LAPTOP_ADDITIONAL_SPECS.filter((i) => i.group === 'Màn hình'),
    ],
  },
  {
    id: 'phone-display',
    name: 'Màn hình Điện thoại',
    description: 'Kích thước, công nghệ OLED, 120Hz, độ sáng nits, HDR, kính',
    deviceType: 'phone',
    items: PHONE_FULL_SPECS.filter((i) => i.group === 'Màn hình'),
  },
  {
    id: 'phone-performance',
    name: 'Hiệu năng Điện thoại',
    description: 'Chip CPU, GPU, tiến trình 3nm, số nhân, xung nhịp',
    deviceType: 'phone',
    items: PHONE_FULL_SPECS.filter((i) => i.group === 'Hiệu năng'),
  },
  {
    id: 'camera',
    name: 'Cụm Camera Điện thoại',
    description: 'Camera chính, góc siêu rộng, telephoto, OIS, selfie, quay 4K',
    deviceType: 'phone',
    items: PHONE_FULL_SPECS.filter((i) => i.group === 'Camera'),
  },
  {
    id: 'phone-battery',
    name: 'Pin & Sạc Điện thoại',
    description: 'Dung lượng mAh, sạc nhanh dây, sạc không dây, sạc ngược',
    deviceType: 'phone',
    items: PHONE_FULL_SPECS.filter((i) => i.group === 'Pin & sạc'),
  },
  {
    id: 'laptop-battery',
    name: 'Pin & Nguồn Laptop',
    description: 'Dung lượng Wh, số cell, công suất sạc AC, công nghệ sạc',
    deviceType: 'laptop',
    items: [
      ...LAPTOP_REQUIRED_SPECS.filter((i) => i.group === 'Pin'),
      ...LAPTOP_ADDITIONAL_SPECS.filter((i) => i.group === 'Nguồn điện'),
    ],
  },
  {
    id: 'phone-connectivity',
    name: 'Kết nối Điện thoại',
    description: '5G, 2 SIM, Wi-Fi 7, Bluetooth, NFC, Type-C, GPS',
    deviceType: 'phone',
    items: PHONE_FULL_SPECS.filter((i) => i.group === 'Kết nối'),
  },
  {
    id: 'laptop-connectivity',
    name: 'Kết nối Laptop',
    description: 'Wi-Fi 6E, Bluetooth, USB-A, Thunderbolt 4, HDMI, LAN, Jack 3.5',
    deviceType: 'laptop',
    items: LAPTOP_REQUIRED_SPECS.filter((i) => i.group === 'Kết nối'),
  },
  {
    id: 'security-durability',
    name: 'Bảo mật & Độ bền',
    description: 'Face ID / Vân tay, chuẩn IP68, kính bảo vệ, khung viền',
    deviceType: 'phone',
    items: PHONE_FULL_SPECS.filter((i) => i.group === 'Bảo mật & độ bền'),
  },
  {
    id: 'audio-sensors',
    name: 'Âm thanh & Cảm biến',
    description: 'Loa stereo Dolby Atmos, mic phòng thu, con quay hồi chuyển...',
    deviceType: 'phone',
    items: PHONE_FULL_SPECS.filter((i) => i.group === 'Âm thanh & cảm biến'),
  },
  {
    id: 'software',
    name: 'Hệ điều hành & Phần mềm',
    description: 'Hệ điều hành, phiên bản, thời hạn hỗ trợ cập nhật',
    deviceType: 'both',
    items: PHONE_FULL_SPECS.filter((i) => i.group === 'Phần mềm'),
  },
  {
    id: 'peripherals',
    name: 'Ngoại vi Laptop',
    description: 'Bàn phím, đèn nền RGB, webcam 1080p, loa, mic',
    deviceType: 'laptop',
    items: LAPTOP_ADDITIONAL_SPECS.filter((i) => i.group === 'Ngoại vi'),
  },
  {
    id: 'design',
    name: 'Thiết kế & Trọng lượng',
    description: 'Kích thước máy và khối lượng tổng thể',
    deviceType: 'both',
    items: LAPTOP_REQUIRED_SPECS.filter((i) => i.group === 'Thiết kế'),
  },
];
