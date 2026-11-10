import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Upload,
  Link as LinkIcon,
  X,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Video,
  SwitchCamera,
  Image as ImageIcon,
  ArrowRight,
} from 'lucide-react';
import { visualSearchService } from '../../api/services/visualSearch.service';
import type { VisualSearchResultItem, VisualSearchResponse } from '../../models/visualSearch.model';

interface VisualSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'upload' | 'camera' | 'url';

// 4 mẫu ảnh test nhanh tiện lợi cho người dùng thử nghiệm tính năng ngay lập tức
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
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Dừng stream camera khi đóng modal hoặc đổi tab
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  // Khởi động camera webcam
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt của bạn không hỗ trợ truy cập Webcam.');
      }
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: unknown) {
      const error = err as Error;
      setCameraError(
        error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError'
          ? 'Bạn đã từ chối quyền truy cập máy ảnh. Vui lòng cấp quyền trong cài đặt trình duyệt để sử dụng.'
          : error.message || 'Không thể kết nối đến máy ảnh.'
      );
    }
  }, [facingMode, stopCamera]);

  // Khi chuyển sang tab Camera thì tự động bật, rời tab thì tắt
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !selectedImage) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isOpen, activeTab, selectedImage, startCamera, stopCamera]);

  // Lắng nghe sự kiện Paste (Ctrl + V) trên toàn màn hình khi modal đang mở
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

  // Dọn dẹp khi đóng modal
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

  // Tiến hành phân tích ảnh qua Visual Search Service
  const analyzeImage = async (imageInput: File | Blob | string) => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    setSearchResponse(null);
    setStatusMessage('Đang khởi tạo mô hình AI...');

    try {
      const res = await visualSearchService.search(imageInput, (step) => {
        setStatusMessage(step);
      });
      setSearchResponse(res);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || 'Không thể phân tích hình ảnh này. Vui lòng thử lại với ảnh khác!');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Xử lý khi chọn file ảnh từ máy tính
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WEBP, GIF).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Dung lượng ảnh tối đa cho phép là 10MB.');
      return;
    }

    stopCamera();
    setCurrentFile(file);
    const objectUrl = URL.createObjectURL(file);
    setSelectedImage(objectUrl);
    analyzeImage(file);
  };

  // Xử lý kéo-thả ảnh (Drag & Drop)
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

  // Chụp ảnh từ khung hình Webcam
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
      0.95
    );
  };

  // Lật camera trước / sau
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Xử lý tìm kiếm bằng đường dẫn URL
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

  // Đổi ảnh khác
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

  // Định dạng giá tiền VND
  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-3xl bg-[#13151b] border border-blue-500/25 shadow-[0_0_50px_rgba(30,58,138,0.35)] flex flex-col text-white">
        
        {/* ========================================================= */}
        {/* 1. MODAL HEADER */}
        {/* ========================================================= */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-800/80 bg-gradient-to-r from-[#181b24] via-[#1a1f2c] to-[#181b24]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Camera className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-wider mb-0.5">
                <Sparkles className="w-3 h-3 text-blue-400" />
                <span>NEXOR Vision AI</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                Tìm kiếm bằng hình ảnh
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isAnalyzing}
            className="w-8 h-8 rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition border border-white/5 cursor-pointer disabled:opacity-40"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* 2. MAIN BODY */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-6 flex-1 flex flex-col gap-6">

          {/* KHI CHƯA CHỌN ẢNH: HIỂN THỊ CÁC TAB NHẬP LIỆU */}
          {!selectedImage && (
            <div className="flex flex-col gap-4">
              {/* Tab Navigation */}
              <div className="flex items-center justify-center gap-2 p-1 bg-[#1a1e28] rounded-2xl border border-gray-800/60 max-w-md mx-auto w-full">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải ảnh lên</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('camera')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'camera'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Chụp ảnh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('url')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'url'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Dán liên kết</span>
                </button>
              </div>

              {/* TAB 1: KÉO THẢ & CHỌN FILE */}
              {activeTab === 'upload' && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    isDragging
                      ? 'border-blue-500 bg-blue-500/10 scale-[0.99]'
                      : 'border-gray-700/60 hover:border-blue-500/60 bg-[#171a23]/80 hover:bg-[#1a1f2b]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-md">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm sm:text-base font-bold text-gray-200">
                      Kéo thả hình ảnh vào đây hoặc{' '}
                      <span className="text-blue-400 underline decoration-blue-400/40 underline-offset-4">
                        chọn từ thiết bị
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">
                      Hỗ trợ định dạng JPG, PNG, WEBP (Tối đa 10MB) • Hỗ trợ dán trực tiếp <kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-[10px] text-gray-300">Ctrl + V</kbd>
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: CHỤP ẢNH BẰNG WEBCAM */}
              {activeTab === 'camera' && (
                <div className="flex flex-col items-center justify-center gap-4 bg-[#171a23] p-4 sm:p-6 rounded-3xl border border-gray-800">
                  {cameraError ? (
                    <div className="p-6 text-center flex flex-col items-center gap-3">
                      <AlertCircle className="w-10 h-10 text-red-400" />
                      <p className="text-sm text-red-300 font-medium">{cameraError}</p>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Thử lại máy ảnh</span>
                      </button>
                    </div>
                  ) : (
                    <div className="relative w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-gray-700/60 shadow-xl">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {/* Khung ngắm chụp ảnh Target Reticle */}
                      <div className="absolute inset-6 border border-white/30 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                        <div className="flex justify-between">
                          <div className="w-4 h-4 border-t-2 border-l-2 border-blue-400" />
                          <div className="w-4 h-4 border-t-2 border-r-2 border-blue-400" />
                        </div>
                        <div className="flex justify-between">
                          <div className="w-4 h-4 border-b-2 border-l-2 border-blue-400" />
                          <div className="w-4 h-4 border-b-2 border-r-2 border-blue-400" />
                        </div>
                      </div>

                      {/* Nút lật camera trước/sau */}
                      <button
                        type="button"
                        onClick={toggleFacingMode}
                        className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs backdrop-blur-sm transition border border-white/20"
                        title="Đổi camera trước / sau"
                      >
                        <SwitchCamera className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {!cameraError && cameraStream && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleCapturePhoto}
                        className="py-3 px-6 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm transition-all shadow-[0_0_20px_rgba(59,130,246,0.5)] flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Chụp & Tìm kiếm</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: DÁN ĐƯỜNG DẪN URL HÌNH ẢNH */}
              {activeTab === 'url' && (
                <form onSubmit={handleUrlSubmit} className="flex flex-col gap-3 bg-[#171a23] p-4 sm:p-6 rounded-3xl border border-gray-800">
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="relative flex-1 w-full">
                      <LinkIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="url"
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        placeholder="Dán đường dẫn ảnh sản phẩm (https://.../photo.jpg)"
                        className="w-full bg-[#1e222d] text-white text-xs pl-10 pr-4 py-3 rounded-2xl border border-gray-700/80 focus:border-blue-500 focus:outline-none transition placeholder-gray-400"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!imageUrlInput.trim()}
                      className="w-full sm:w-auto py-3 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold text-xs transition cursor-pointer shrink-0"
                    >
                      Tìm kiếm
                    </button>
                  </div>
                </form>
              )}

              {/* MẪU ẢNH TEST NHANH 1-CLICK DỄ DÀNG */}
              <div className="flex flex-col gap-2 pt-2 border-t border-gray-800/60">
                <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Hoặc thử ngay với các ảnh mẫu công nghệ có sẵn:</span>
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
                      className="group flex items-center gap-2 p-2 rounded-xl bg-[#181b24] hover:bg-blue-600/10 border border-gray-800 hover:border-blue-500/40 transition cursor-pointer text-left"
                    >
                      <img
                        src={sample.url}
                        alt={sample.label}
                        className="w-8 h-8 rounded-lg object-cover shrink-0 border border-white/10 group-hover:scale-105 transition-transform"
                      />
                      <span className="text-[11px] font-semibold text-gray-300 group-hover:text-blue-300 truncate">
                        {sample.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* KHI ĐÃ CÓ ẢNH: KHUNG XEM TRƯỚC + HIỆU ỨNG LASER SCANNER + KẾT QUẢ TÌM KIẾM */}
          {selectedImage && (
            <div className="flex flex-col lg:flex-row items-start gap-6">
              
              {/* CỘT TRÁI: ẢNH XEM TRƯỚC VÀ HIỆU ỨNG QUÉT LASER */}
              <div className="w-full lg:w-72 shrink-0 flex flex-col gap-3">
                <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-[#0c0d12] border-2 border-blue-500/40 shadow-[0_0_30px_rgba(59,130,246,0.25)] flex items-center justify-center group">
                  <img
                    src={selectedImage}
                    alt="Query Image"
                    className="w-full h-full object-contain p-2"
                  />

                  {/* HIỆU ỨNG TIA LASER NEON QUÉT DỌC ẢNH */}
                  {isAnalyzing && (
                    <>
                      <div className="absolute inset-0 bg-blue-500/10 pointer-events-none" />
                      <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee,0_0_30px_#3b82f6] animate-scan-laser pointer-events-none" />
                    </>
                  )}

                  {/* 4 Góc Target Corners AI */}
                  <div className="absolute inset-3 pointer-events-none flex flex-col justify-between p-1">
                    <div className="flex justify-between">
                      <div className="w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-400" />
                      <div className="w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-400" />
                    </div>
                    <div className="flex justify-between">
                      <div className="w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-400" />
                      <div className="w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-400" />
                    </div>
                  </div>
                </div>

                {/* Trạng thái phân tích */}
                {isAnalyzing ? (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-blue-300">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
                    <span className="font-medium animate-pulse">{statusMessage}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleResetImage}
                    className="w-full py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border border-white/5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Đổi hoặc quét ảnh khác</span>
                  </button>
                )}
              </div>

              {/* CỘT PHẢI: KẾT QUẢ SẢN PHẨM TƯƠNG ĐỒNG */}
              <div className="flex-1 w-full flex flex-col gap-3">
                {/* Thông báo lỗi nếu có */}
                {errorMsg && (
                  <div className="p-4 bg-red-500/15 border border-red-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs text-red-300">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => currentFile ? analyzeImage(currentFile) : (selectedImage && analyzeImage(selectedImage))}
                      className="py-1 px-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold"
                    >
                      Thử lại
                    </button>
                  </div>
                )}

                {/* Skeleton Loader khi đang quét */}
                {isAnalyzing && (
                  <div className="flex flex-col gap-3">
                    <div className="h-6 w-48 bg-gray-800 rounded-lg animate-pulse" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map((n) => (
                        <div key={n} className="p-3 rounded-2xl bg-[#171a23] border border-gray-800 flex gap-3 animate-pulse">
                          <div className="w-20 h-20 bg-gray-800 rounded-xl shrink-0" />
                          <div className="flex-1 flex flex-col gap-2 justify-center">
                            <div className="h-4 bg-gray-800 rounded w-full" />
                            <div className="h-3 bg-gray-800 rounded w-2/3" />
                            <div className="h-4 bg-gray-800 rounded w-1/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Khi hoàn thành và có kết quả */}
                {!isAnalyzing && searchResponse && (
                  <div className="flex flex-col gap-3">
                    {/* Header kết quả */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-black text-gray-100">
                          Tìm thấy {searchResponse.results.length} sản phẩm tương đồng
                        </span>
                      </div>
                      {searchResponse.detectedCategory && (
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-bold">
                          {searchResponse.detectedCategory}
                        </span>
                      )}
                    </div>

                    {/* Danh sách nhãn AI nhận diện được */}
                    {searchResponse.labels && searchResponse.labels.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-gray-400">Đặc trưng nhận diện:</span>
                        {searchResponse.labels.map((lbl, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-[#1f2430] text-gray-300 text-[10px] font-medium border border-gray-700/60"
                          >
                            #{lbl}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Grid sản phẩm tương đồng */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[52vh] overflow-y-auto pr-1">
                      {searchResponse.results.map((item: VisualSearchResultItem) => (
                        <div
                          key={item.product.id}
                          onClick={() => {
                            handleClose();
                            navigate(`/products/${item.product.id}`);
                          }}
                          className="group relative p-3 rounded-2xl bg-[#171a23] hover:bg-[#1c212e] border border-gray-800 hover:border-blue-500/50 transition-all flex gap-3 cursor-pointer shadow-md hover:shadow-blue-500/10"
                        >
                          {/* Ảnh Thumbnail */}
                          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-900 border border-white/5 shrink-0 flex items-center justify-center p-1">
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-300"
                            />
                          </div>

                          {/* Chi tiết sản phẩm */}
                          <div className="flex-1 flex flex-col justify-between min-w-0">
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                {item.brand && (
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
                                    {item.brand}
                                  </span>
                                )}
                                {/* Huy hiệu % Match */}
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                                    item.matchScore >= 90
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                      : item.matchScore >= 80
                                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                  }`}
                                >
                                  {item.matchScore}% Match
                                </span>
                              </div>

                              <h4 className="text-xs font-bold text-gray-200 line-clamp-2 group-hover:text-blue-400 transition-colors">
                                {item.product.name}
                              </h4>
                            </div>

                            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-800/80">
                              <span className="text-xs font-black text-blue-400">
                                {formatPrice(item.product.price)}
                              </span>

                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-400 group-hover:text-white transition">
                                <span>Xem</span>
                                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Kết quả rỗng nếu không có sản phẩm */}
                {!isAnalyzing && searchResponse && searchResponse.results.length === 0 && (
                  <div className="p-8 text-center flex flex-col items-center justify-center gap-3 bg-[#171a23] rounded-2xl border border-gray-800">
                    <ImageIcon className="w-12 h-12 text-gray-600" />
                    <h3 className="text-sm font-bold text-gray-300">Không tìm thấy sản phẩm tương đồng</h3>
                    <p className="text-xs text-gray-500 max-w-sm">
                      Hãy thử tải lên ảnh có độ phân giải cao hơn, góc chụp thẳng và đủ ánh sáng để AI nhận diện tốt nhất.
                    </p>
                    <button
                      type="button"
                      onClick={handleResetImage}
                      className="mt-2 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
                    >
                      Thử ảnh khác
                    </button>
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

