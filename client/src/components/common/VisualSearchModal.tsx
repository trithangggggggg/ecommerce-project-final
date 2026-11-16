import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Upload,
  Link as LinkIcon,
  X,
  RefreshCw,
  AlertCircle,
  Video,
  SwitchCamera,
  ImageIcon,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Cpu,
  Layers,
  Info,
} from 'lucide-react';
import { visualSearchService } from '../../api/services/visualSearch.service';
import type { VisualSearchResponse, VisualSearchProductItem } from '../../models/visualSearch.model';

interface VisualSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'upload' | 'camera' | 'url';

// 4 mẫu ảnh thử nghiệm thực tế có sẵn trong hệ thống
const QUICK_SAMPLE_IMAGES = [
  { label: 'MacBook Air M3', url: '/images/macbook-air-m3-card.jpg' },
  { label: 'iPhone 16 Pro Max', url: '/images/iphone-16-pro-max.jpg' },
  { label: 'Samsung S24 Ultra', url: '/images/samsung-s24-ultra.jpg' },
  { label: 'ASUS ROG Strix G16', url: '/images/asus-rog-strix.jpg' },
];

export const VisualSearchModal: React.FC<VisualSearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  // Tab & Input States
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Selected Image & Status
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | Blob | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [searchResponse, setSearchResponse] = useState<VisualSearchResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Camera / Webcam States
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Dừng stream camera an toàn mà không gây re-render loop
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      streamRef.current = null;
    }
    setCameraStream(null);
  }, []);

  // Khởi động webcam
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const isSecure = window.isSecureContext;
        throw new Error(
          !isSecure
            ? 'Trình duyệt yêu cầu kết nối bảo mật (HTTPS hoặc localhost) để sử dụng máy ảnh.'
            : 'Trình duyệt của bạn không hỗ trợ API truy cập máy ảnh (MediaDevices).'
        );
      }

      // Dừng stream cũ trước khi xin stream mới
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (constraintErr) {
        console.warn('Fallback to basic video constraint:', constraintErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setCameraStream(stream);
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraError('Quyền truy cập máy ảnh bị từ chối. Vui lòng bấm vào biểu tượng ổ khóa/máy ảnh trên thanh địa chỉ trình duyệt để Cho phép (Allow).');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setCameraError('Máy ảnh đang bị ứng dụng khác (Zoom, Teams, Camera app...) chiếm dụng. Vui lòng tắt ứng dụng đó và bấm "Thử lại".');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setCameraError('Không tìm thấy thiết bị máy ảnh (Webcam) kết nối với máy tính/điện thoại.');
      } else {
        setCameraError(error.message || 'Không thể mở máy ảnh.');
      }
    }
  }, [facingMode]);

  // Đồng bộ stream vào thẻ video khi videoRef và cameraStream sẵn sàng
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch((err) => {
        console.warn('Video auto play caught:', err);
      });
    }
  }, [cameraStream]);

  // Tự động bật/tắt camera theo tab
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !selectedImage) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isOpen, activeTab, selectedImage, startCamera, stopCamera]);

  // Dọn dẹp stream khi unmount component
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Lắng nghe sự kiện Paste (Ctrl + V)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      if (selectedImage || isAnalyzing) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileSelect(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, selectedImage, isAnalyzing]);

  // Đóng modal an toàn
  const handleClose = () => {
    if (isAnalyzing) return;
    stopCamera();
    setSelectedImage(null);
    setCurrentFile(null);
    setSearchResponse(null);
    setErrorMsg(null);
    setImageUrlInput('');
    onClose();
  };

  // Phân tích hình ảnh
  const analyzeImage = async (imageInput: File | Blob | string) => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    setSearchResponse(null);
    setStatusMessage('Đang tải hình ảnh và chuẩn bị vector AI...');

    try {
      const res = await visualSearchService.search(imageInput, (step) => {
        setStatusMessage(step);
      });
      setSearchResponse(res);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || 'Không thể phân tích ảnh này. Vui lòng thử lại với ảnh rõ nét hơn.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Chọn file từ máy tính
  const handleFileSelect = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const isJpegExt = file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');
    const isPngExt = file.name.toLowerCase().endsWith('.png');
    const isWebpExt = file.name.toLowerCase().endsWith('.webp');

    if (!validTypes.includes(file.type) && !isJpegExt && !isPngExt && !isWebpExt) {
      setErrorMsg('Vui lòng chọn ảnh định dạng JPEG, PNG hoặc WEBP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Dung lượng ảnh tối đa là 5MB.');
      return;
    }

    stopCamera();
    setCurrentFile(file);
    const objectUrl = URL.createObjectURL(file);
    setSelectedImage(objectUrl);
    analyzeImage(file);
  };

  // Kéo thả ảnh (Drag & Drop)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Chụp ảnh từ Webcam
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stopCamera();
        const objectUrl = URL.createObjectURL(blob);
        setSelectedImage(objectUrl);
        setCurrentFile(blob);
        analyzeImage(blob);
      },
      'image/jpeg',
      0.92
    );
  };

  // Lật camera trước / sau
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Dán đường dẫn URL
  const handleUrlSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUrl = imageUrlInput.trim();
    if (!cleanUrl) {
      setErrorMsg('Vui lòng nhập đường dẫn hình ảnh hợp lệ.');
      return;
    }
    stopCamera();
    setSelectedImage(cleanUrl);
    setCurrentFile(null);
    analyzeImage(cleanUrl);
  };

  // Đổi hoặc quét ảnh khác
  const handleResetImage = () => {
    if (isAnalyzing) return;
    setSelectedImage(null);
    setCurrentFile(null);
    setSearchResponse(null);
    setErrorMsg(null);
    setImageUrlInput('');
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  // Format tiền tệ VND
  const formatPrice = (val?: number) => {
    if (!val) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // Phân loại kết quả: Sản phẩm khớp thực tế (>= 50% và không phải gợi ý fallback) vs Sản phẩm gợi ý thêm
  const exactMatches =
    searchResponse?.products?.filter(
      (p) => p.matchPercent >= 50 && (!p.matchReason || !p.matchReason.includes('Gợi ý'))
    ) || [];

  const suggestedMatches =
    searchResponse?.products?.filter(
      (p) => p.matchPercent < 50 || (p.matchReason && p.matchReason.includes('Gợi ý'))
    ) || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-2xl bg-[#0f1115] border border-white/10 shadow-2xl flex flex-col text-white">
        {/* ========================================================= */}
        {/* 1. HEADER: TỐI GIẢN ĐEN - XÁM - TRẮNG */}
        {/* ========================================================= */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#14171d]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Tìm kiếm bằng hình ảnh (NEXOR AI Vision)
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                  <Sparkles className="w-3 h-3" />
                  Quy trình 2 giai đoạn
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Nhận diện chính xác thương hiệu & dòng sản phẩm trước, sau đó so khớp kho hàng NEXOR
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isAnalyzing}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition border border-white/5 cursor-pointer disabled:opacity-30"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* 2. NỘI DUNG CHÍNH */}
        {/* ========================================================= */}
        <div className="p-5 sm:p-6 flex-1 flex flex-col gap-5">
          {/* KHI CHƯA CHỌN ẢNH: CÁC TAB NẠP ẢNH TỐI GIẢN */}
          {!selectedImage && (
            <div className="flex flex-col gap-5">
              {/* Tab Selector */}
              <div className="flex items-center justify-center gap-1 p-1 bg-[#181a20] rounded-xl border border-white/10 max-w-md mx-auto w-full">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải ảnh lên</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('camera')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition cursor-pointer ${
                    activeTab === 'camera'
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Máy ảnh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('url')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition cursor-pointer ${
                    activeTab === 'url'
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Đường dẫn ảnh</span>
                </button>
              </div>

              {/* TAB 1: KÉO THẢ & CHỌN FILE */}
              {activeTab === 'upload' && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    isDragging
                      ? 'border-white bg-white/5'
                      : 'border-white/15 hover:border-white/40 bg-[#14171d] hover:bg-[#181b22]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-gray-200">
                      Kéo thả ảnh vào đây hoặc{' '}
                      <span className="text-white underline underline-offset-4 font-semibold">
                        chọn từ thiết bị
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">
                      Hỗ trợ JPEG, PNG, WEBP (tối đa 5MB) • Dán nhanh bằng phím{' '}
                      <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-[11px] text-gray-200 font-mono">
                        Ctrl + V
                      </kbd>
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: MÁY ẢNH / WEBCAM */}
              {activeTab === 'camera' && (
                <div className="flex flex-col items-center justify-center gap-4 bg-[#14171d] p-5 rounded-2xl border border-white/10">
                  {cameraError ? (
                    <div className="p-6 text-center flex flex-col items-center gap-3">
                      <AlertCircle className="w-8 h-8 text-gray-400" />
                      <p className="text-xs text-gray-300 max-w-sm">{cameraError}</p>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="py-2 px-4 rounded-lg bg-white text-black text-xs font-semibold hover:bg-gray-200 transition"
                      >
                        Thử lại máy ảnh
                      </button>
                    </div>
                  ) : (
                    <div className="relative w-full max-w-md aspect-[4/3] rounded-xl overflow-hidden bg-black flex items-center justify-center border border-white/15">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {/* Khung ngắm chụp ảnh tối giản */}
                      <div className="absolute inset-5 border border-white/20 rounded-lg pointer-events-none flex flex-col justify-between p-2">
                        <div className="flex justify-between">
                          <div className="w-3 h-3 border-t-2 border-l-2 border-white" />
                          <div className="w-3 h-3 border-t-2 border-r-2 border-white" />
                        </div>
                        <div className="flex justify-between">
                          <div className="w-3 h-3 border-b-2 border-l-2 border-white" />
                          <div className="w-3 h-3 border-b-2 border-r-2 border-white" />
                        </div>
                      </div>

                      {/* Nút lật camera */}
                      <button
                        type="button"
                        onClick={toggleFacingMode}
                        className="absolute top-3 right-3 p-2 rounded-lg bg-black/60 hover:bg-black text-white text-xs backdrop-blur-sm transition border border-white/20 cursor-pointer"
                        title="Đổi camera trước / sau"
                      >
                        <SwitchCamera className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {!cameraError && cameraStream && (
                    <button
                      type="button"
                      onClick={handleCapturePhoto}
                      className="py-2.5 px-6 rounded-full bg-white hover:bg-gray-200 text-black font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Chụp ảnh này</span>
                    </button>
                  )}
                </div>
              )}

              {/* TAB 3: DÁN ĐƯỜNG DẪN URL */}
              {activeTab === 'url' && (
                <form
                  onSubmit={handleUrlSubmit}
                  className="flex flex-col gap-3 bg-[#14171d] p-5 rounded-2xl border border-white/10"
                >
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="relative flex-1 w-full">
                      <LinkIcon className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="url"
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        placeholder="Dán link ảnh sản phẩm (https://.../photo.jpg)"
                        className="w-full bg-[#1b1e26] text-white text-xs pl-10 pr-4 py-2.5 rounded-xl border border-white/15 focus:border-white focus:outline-none transition placeholder-gray-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!imageUrlInput.trim()}
                      className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-white hover:bg-gray-200 disabled:bg-gray-800 disabled:text-gray-500 text-black font-semibold text-xs transition cursor-pointer shrink-0"
                    >
                      Tìm kiếm
                    </button>
                  </div>
                </form>
              )}

              {/* MẪU ẢNH CÔNG NGHỆ THỬ NGHIỆM */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                <span className="text-xs text-gray-400 font-normal">
                  Hoặc thử nhanh với ảnh mẫu công nghệ có sẵn:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {QUICK_SAMPLE_IMAGES.map((sample) => (
                    <button
                      key={sample.url}
                      type="button"
                      onClick={() => {
                        setSelectedImage(sample.url);
                        setCurrentFile(null);
                        analyzeImage(sample.url);
                      }}
                      className="group flex items-center gap-2 p-2 rounded-xl bg-[#14171d] hover:bg-[#1b1e26] border border-white/10 hover:border-white/30 transition cursor-pointer text-left"
                    >
                      <img
                        src={sample.url}
                        alt={sample.label}
                        className="w-8 h-8 rounded-lg object-cover shrink-0 border border-white/10"
                      />
                      <span className="text-xs text-gray-300 group-hover:text-white truncate font-medium">
                        {sample.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* KHI ĐÃ CÓ ẢNH: SPLIT VIEW HIỂN THỊ ẢNH QUÉT & KẾT QUẢ 2 GIAI ĐOẠN */}
          {selectedImage && (
            <div className="flex flex-col lg:flex-row items-start gap-6">
              {/* CỘT TRÁI: KHUNG ẢNH & TIA QUÉT */}
              <div className="w-full lg:w-72 shrink-0 flex flex-col gap-3">
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black border border-white/15 flex items-center justify-center">
                  <img
                    src={selectedImage}
                    alt="Query"
                    className="w-full h-full object-contain p-2"
                  />

                  {/* TIA LASER QUÉT TRÊN ẢNH */}
                  {isAnalyzing && (
                    <>
                      <div className="absolute inset-0 bg-white/5 pointer-events-none" />
                      <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_12px_rgba(255,255,255,0.8)] animate-scan-laser pointer-events-none" />
                    </>
                  )}

                  {/* 4 Góc Reticle */}
                  <div className="absolute inset-2.5 pointer-events-none flex flex-col justify-between p-1">
                    <div className="flex justify-between">
                      <div className="w-3 h-3 border-t border-l border-white/60" />
                      <div className="w-3 h-3 border-t border-r border-white/60" />
                    </div>
                    <div className="flex justify-between">
                      <div className="w-3 h-3 border-b border-l border-white/60" />
                      <div className="w-3 h-3 border-b border-r border-white/60" />
                    </div>
                  </div>
                </div>

                {/* Trạng thái phân tích */}
                {isAnalyzing ? (
                  <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2 text-xs text-gray-300">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-white shrink-0" />
                    <span className="font-normal">{statusMessage}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleResetImage}
                    className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Đổi hoặc quét ảnh khác</span>
                  </button>
                )}
              </div>

              {/* CỘT PHẢI: KẾT QUẢ 2 GIAI ĐOẠN */}
              <div className="flex-1 w-full flex flex-col gap-4">
                {/* Lỗi nếu có */}
                {errorMsg && (
                  <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-red-200">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        currentFile
                          ? analyzeImage(currentFile)
                          : selectedImage && analyzeImage(selectedImage)
                      }
                      className="py-1 px-2.5 bg-red-600 hover:bg-red-500 text-white rounded font-medium text-[11px]"
                    >
                      Thử lại
                    </button>
                  </div>
                )}

                {/* Loading skeleton */}
                {isAnalyzing && (
                  <div className="flex flex-col gap-3">
                    <div className="p-4 rounded-xl bg-[#14171d] border border-white/10 animate-pulse flex flex-col gap-2">
                      <div className="h-4 w-48 bg-white/10 rounded" />
                      <div className="h-3 w-32 bg-white/5 rounded" />
                      <div className="flex gap-2 mt-2">
                        <div className="h-6 w-20 bg-white/5 rounded-md" />
                        <div className="h-6 w-24 bg-white/5 rounded-md" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[1, 2, 3, 4].map((n) => (
                        <div
                          key={n}
                          className="p-3 rounded-xl bg-[#14171d] border border-white/10 flex gap-3 animate-pulse"
                        >
                          <div className="w-16 h-16 bg-white/5 rounded-lg shrink-0" />
                          <div className="flex-1 flex flex-col gap-2 justify-center">
                            <div className="h-3.5 bg-white/10 rounded w-full" />
                            <div className="h-3 bg-white/5 rounded w-2/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ======================================================= */}
                {/* HIỂN THỊ KẾT QUẢ KHI HOÀN TẤT */}
                {/* ======================================================= */}
                {!isAnalyzing && searchResponse && (
                  <div className="flex flex-col gap-4">
                    {/* GIAI ĐOẠN 1: CARD NHẬN DIỆN THỊ GIÁC AI */}
                    {searchResponse.detectedAttributes && (
                      <div className="p-4 rounded-xl bg-[#14171d] border border-white/15 relative overflow-hidden flex flex-col gap-2.5 shadow-sm">
                        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Giai đoạn 1: AI đã nhận diện sản phẩm trong ảnh</span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono">
                            Độ tin cậy: {searchResponse.detectedAttributes.confidence || 'HIGH'}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-white tracking-tight">
                            {searchResponse.detectedAttributes.identifiedTitle ||
                              `${searchResponse.detectedAttributes.brand || ''} ${
                                searchResponse.detectedAttributes.productLine ||
                                searchResponse.detectedAttributes.category ||
                                ''
                              }`.trim()}
                          </h3>
                        </div>

                        {/* Chi tiết thông số nhận diện */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                          <div className="flex flex-col p-2 rounded-lg bg-white/5 border border-white/5">
                            <span className="text-gray-400 text-[10px]">Thương hiệu</span>
                            <span className="font-bold text-white truncate">
                              {searchResponse.detectedAttributes.brand || 'Chưa rõ'}
                            </span>
                          </div>
                          <div className="flex flex-col p-2 rounded-lg bg-white/5 border border-white/5">
                            <span className="text-gray-400 text-[10px]">Dòng sản phẩm</span>
                            <span className="font-bold text-white truncate">
                              {searchResponse.detectedAttributes.productLine ||
                                searchResponse.detectedAttributes.category ||
                                'Tiêu chuẩn'}
                            </span>
                          </div>
                          <div className="flex flex-col p-2 rounded-lg bg-white/5 border border-white/5">
                            <span className="text-gray-400 text-[10px]">Danh mục</span>
                            <span className="font-bold text-white truncate">
                              {searchResponse.detectedAttributes.category || 'Thiết bị số'}
                            </span>
                          </div>
                          <div className="flex flex-col p-2 rounded-lg bg-white/5 border border-white/5">
                            <span className="text-gray-400 text-[10px]">Màu sắc</span>
                            <span className="font-bold text-white truncate">
                              {searchResponse.detectedAttributes.color || 'Tiêu chuẩn'}
                            </span>
                          </div>
                        </div>

                        {/* Đặc trưng thị giác nhận diện được */}
                        {searchResponse.detectedAttributes.distinctiveFeatures &&
                          searchResponse.detectedAttributes.distinctiveFeatures.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-[10px] text-gray-400 flex items-center gap-1 mr-1">
                                <Cpu className="w-3 h-3 text-gray-400" />
                                Đặc trưng AI ghi nhận:
                              </span>
                              {searchResponse.detectedAttributes.distinctiveFeatures.map(
                                (feat, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded-md bg-white/10 text-gray-200 text-[10px] border border-white/10 font-medium"
                                  >
                                    {feat}
                                  </span>
                                )
                              )}
                            </div>
                          )}
                      </div>
                    )}

                    {/* GIAI ĐOẠN 2: KẾT QUẢ SO KHỚP KHO HÀNG */}
                    <div className="flex flex-col gap-3">
                      {/* Trường hợp 1: Có sản phẩm khớp thực sự trong kho */}
                      {exactMatches.length > 0 && (
                        <>
                          <div className="flex items-center justify-between pb-1 border-b border-white/10">
                            <div className="flex items-center gap-2">
                              <Layers className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-xs font-bold text-gray-200">
                                Giai đoạn 2: Tìm thấy {exactMatches.length} sản phẩm tương đồng trong kho NEXOR
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[42vh] overflow-y-auto pr-1">
                            {exactMatches.map((item: VisualSearchProductItem) => (
                              <div
                                key={item.id}
                                onClick={() => {
                                  handleClose();
                                  navigate(`/products/${item.id}`);
                                }}
                                className="group relative p-2.5 rounded-xl bg-[#14171d] hover:bg-[#1a1d26] border border-white/10 hover:border-white/30 transition flex gap-3 cursor-pointer"
                              >
                                {/* Thumbnail */}
                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-black/50 border border-white/10 shrink-0 flex items-center justify-center p-1">
                                  <img
                                    src={item.imageUrl || '/images/logo.png'}
                                    alt={item.name}
                                    className="w-full h-full object-contain"
                                  />
                                </div>

                                {/* Chi tiết */}
                                <div className="flex-1 flex flex-col justify-between min-w-0">
                                  <div>
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      <span className="text-[10px] text-gray-400 uppercase tracking-wide truncate">
                                        {item.brand || item.categoryName}
                                      </span>
                                      {/* Badge % Match */}
                                      <span className="px-1.5 py-0.5 rounded bg-white text-black font-mono text-[10px] font-black border border-white/15 shrink-0">
                                        {item.matchPercent}%
                                      </span>
                                    </div>

                                    <h4 className="text-xs font-medium text-gray-200 line-clamp-2 group-hover:text-white transition">
                                      {item.name}
                                    </h4>

                                    {item.matchReason && (
                                      <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                                        {item.matchReason}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-white/5">
                                    <span className="text-xs font-bold text-white">
                                      {formatPrice(item.price)}
                                    </span>

                                    <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 group-hover:text-white transition">
                                      <span>Xem ngay</span>
                                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Trường hợp 2: Không có sản phẩm khớp chính xác -> Thông báo rõ ràng */}
                      {exactMatches.length === 0 && (
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-2 text-xs">
                          <div className="flex items-center gap-2 text-amber-400 font-semibold">
                            <Info className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>
                              Kho hàng chưa có sẵn dòng sản phẩm chính xác này
                            </span>
                          </div>
                          <p className="text-gray-300 leading-relaxed text-[11px]">
                            AI nhận diện được thiết bị trong ảnh là{' '}
                            <strong className="text-white">
                              {searchResponse.detectedAttributes?.identifiedTitle ||
                                `${searchResponse.detectedAttributes?.brand || ''} ${
                                  searchResponse.detectedAttributes?.productLine || ''
                                }`}
                            </strong>
                            , tuy nhiên hiện tại kho hàng sàn NEXOR chưa nhập mẫu sản phẩm này hoặc
                            đã tạm thời hết hàng.
                          </p>
                        </div>
                      )}

                      {/* Hiển thị sản phẩm gợi ý thêm (nếu có và không có exact match) */}
                      {exactMatches.length === 0 && suggestedMatches.length > 0 && (
                        <div className="flex flex-col gap-2.5 pt-1">
                          <span className="text-xs font-medium text-gray-300">
                            Gợi ý các thiết bị công nghệ nổi bật bạn có thể tham khảo:
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[38vh] overflow-y-auto pr-1">
                            {suggestedMatches.map((item: VisualSearchProductItem) => (
                              <div
                                key={item.id}
                                onClick={() => {
                                  handleClose();
                                  navigate(`/products/${item.id}`);
                                }}
                                className="group relative p-2.5 rounded-xl bg-[#14171d] hover:bg-[#1a1d26] border border-white/10 hover:border-white/30 transition flex gap-3 cursor-pointer"
                              >
                                <div className="w-14 h-14 rounded-lg overflow-hidden bg-black/50 border border-white/10 shrink-0 flex items-center justify-center p-1">
                                  <img
                                    src={item.imageUrl || '/images/logo.png'}
                                    alt={item.name}
                                    className="w-full h-full object-contain"
                                  />
                                </div>

                                <div className="flex-1 flex flex-col justify-between min-w-0">
                                  <div>
                                    <div className="flex items-center justify-between gap-1 mb-0.5">
                                      <span className="text-[10px] text-gray-400 uppercase">
                                        {item.brand || item.categoryName}
                                      </span>
                                      <span className="px-1.5 py-0.2 rounded bg-white/10 text-gray-300 text-[9px] font-medium">
                                        Tham khảo
                                      </span>
                                    </div>
                                    <h4 className="text-xs font-medium text-gray-200 line-clamp-1 group-hover:text-white">
                                      {item.name}
                                    </h4>
                                  </div>

                                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/5">
                                    <span className="text-xs font-bold text-white">
                                      {formatPrice(item.price)}
                                    </span>
                                    <span className="text-[10px] text-gray-400 group-hover:text-white">
                                      Xem &rarr;
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Khi không có bất kỳ sản phẩm nào */}
                      {searchResponse.products.length === 0 && (
                        <div className="p-8 text-center flex flex-col items-center justify-center gap-3 bg-[#14171d] rounded-xl border border-white/10">
                          <ImageIcon className="w-8 h-8 text-gray-500" />
                          <h3 className="text-xs font-medium text-gray-300">
                            Không tìm thấy sản phẩm trong kho hàng
                          </h3>
                          <p className="text-[11px] text-gray-500 max-w-sm">
                            Hãy thử quét hình ảnh thiết bị công nghệ khác (Laptop, Điện thoại, Tai nghe...)
                          </p>
                          <button
                            type="button"
                            onClick={handleResetImage}
                            className="mt-1 py-1.5 px-3.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-gray-200 transition cursor-pointer"
                          >
                            Quét ảnh khác
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualSearchModal;
