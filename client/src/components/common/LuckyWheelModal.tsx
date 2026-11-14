import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gift,
  X,
  Copy,
  Check,
  RotateCw,
  Clock,
  LogIn,
  AlertCircle,
  ShoppingBag,
  Ticket,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { wheelService } from '../../api/services/wheel.service';
import { useAuthStore } from '../../store/useAuthStore';
import { useSiteConfigStore } from '../../store/useSiteConfigStore';
import { ROUTES } from '../../constants/routes';
import type { WheelReward, WheelStatusResponse, WheelSpinResponse } from '../../models/wheel.model';
import wheelBg from '../../assets/images/wheel-bg-luxury.png';

// Emoji icon tương ứng từng ô phần thưởng giống ảnh thiết kế
const getRewardEmoji = (reward: WheelReward): string => {
  if (reward.shortLabel.includes('100K') || reward.icon === 'crown') return '👑';
  if (reward.shortLabel.includes('50K') || reward.icon === 'ticket') return '🎟️';
  if (reward.shortLabel.includes('50%') || reward.icon === 'diamond') return '💎';
  if (reward.shortLabel.includes('15%') || reward.icon === 'tag') return '🏷️';
  if (reward.shortLabel.includes('20K') || reward.icon === 'coins') return '🪙';
  if (reward.type === 'SHIPPING' || reward.shortLabel.includes('SHIP') || reward.icon === 'truck') return '🚚';
  if (reward.shortLabel.includes('10%') || reward.icon === 'cube') return '📦';
  if (reward.shortLabel.includes('10K') || reward.icon === 'coupon') return '🎫';
  return '🎁';
};

// 2 dòng text cho mỗi ô trên nan quạt
const getRewardTextLines = (reward: WheelReward): [string, string] => {
  if (reward.shortLabel.includes('100K')) return ['100K VIP', 'Voucher'];
  if (reward.shortLabel.includes('50K')) return ['50K', 'Voucher'];
  if (reward.shortLabel.includes('50%')) return ['Voucher', '50%'];
  if (reward.shortLabel.includes('15%')) return ['Giảm Giá', '15%'];
  if (reward.shortLabel.includes('20K')) return ['20K', 'Voucher'];
  if (reward.type === 'SHIPPING' || reward.shortLabel.includes('SHIP')) return ['Miễn Phí', 'Vận Chuyển'];
  if (reward.shortLabel.includes('10%')) return ['10%', 'Giảm Giá'];
  if (reward.shortLabel.includes('10K')) return ['10K', 'Voucher'];
  return [reward.shortLabel, reward.discount];
};

export const LuckyWheelModal: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const wheelEnabled = useSiteConfigStore((s) => s.config.general.wheelEnabled);

  const [isOpen, setIsOpen] = useState(false);
  const [wheelStatus, setWheelStatus] = useState<WheelStatusResponse | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<WheelSpinResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [timeUntilTomorrow, setTimeUntilTomorrow] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentRotationRef = useRef<number>(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastSoundTickSliceRef = useRef<number>(-1);

  // Phần thưởng mặc định dự phòng nếu backend chưa trả về danh sách
  const defaultRewards: WheelReward[] = [
    { id: 0, label: '10K Voucher', shortLabel: '10K', discount: '10.000', type: 'ORDER', minOrder: 'Mọi đơn hàng', weight: 30, color: '#1e40af', textColor: '#ffffff', icon: 'coupon' },
    { id: 1, label: '10% Giảm Giá', shortLabel: '10%', discount: '10%', type: 'ORDER', minOrder: '100.000₫', weight: 25, color: '#4338ca', textColor: '#ffffff', icon: 'cube' },
    { id: 2, label: 'Miễn Phí Vận Chuyển', shortLabel: 'FREESHIP', discount: '100%', type: 'SHIPPING', minOrder: 'Mọi đơn hàng', weight: 20, color: '#059669', textColor: '#ffffff', icon: 'truck' },
    { id: 3, label: '20K Voucher', shortLabel: '20K', discount: '20.000', type: 'ORDER', minOrder: '200.000₫', weight: 15, color: '#ea580c', textColor: '#ffffff', icon: 'coins' },
    { id: 4, label: 'Giảm Giá 15%', shortLabel: '15%', discount: '15%', type: 'ORDER', minOrder: '300.000₫', weight: 10, color: '#e11d48', textColor: '#ffffff', icon: 'tag' },
    { id: 5, label: 'Voucher 50%', shortLabel: '50%', discount: '50%', type: 'ORDER', minOrder: '500.000₫', weight: 10, color: '#7c3aed', textColor: '#ffffff', icon: 'diamond' },
    { id: 6, label: '50K Voucher', shortLabel: '50K', discount: '50.000', type: 'ORDER', minOrder: '500.000₫', weight: 5, color: '#f97316', textColor: '#ffffff', icon: 'ticket' },
    { id: 7, label: '100K VIP Voucher', shortLabel: '100K VIP', discount: '100.000', type: 'ORDER', minOrder: '800.000₫', weight: 2, color: '#f59e0b', textColor: '#1e1e24', icon: 'crown' },
  ];

  const rewards = wheelStatus?.rewards && wheelStatus.rewards.length > 0
    ? wheelStatus.rewards
    : defaultRewards;

  // Lấy trạng thái vòng quay từ backend
  const fetchStatus = useCallback(async () => {
    try {
      const data = await wheelService.getStatus();
      setWheelStatus(data);
    } catch {
      // Giữ defaultRewards nếu chưa load được
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus, isAuthenticated]);

  // Lắng nghe sự kiện mở modal từ bất kỳ đâu (Banner trang chủ, CTA...)
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-lucky-wheel', handleOpen);
    return () => window.removeEventListener('open-lucky-wheel', handleOpen);
  }, []);

  // Đồng hồ đếm ngược đến 00:00:00 ngày hôm sau
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
      const diffMs = tomorrow.getTime() - now.getTime();

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeUntilTomorrow(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Web Audio API: Giả lập âm thanh bánh răng click/tick khi kim quét qua vạch chia
  const playTickSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.035);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.035);
    } catch {
      // Audio autoplay policy
    }
  }, []);

  // Vẽ vòng quay trên Canvas 360x360
  const drawWheel = useCallback((rotationAngle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const outerRimRadius = center - 8;
    const innerRimRadius = outerRimRadius - 14;
    const numSlices = rewards.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    ctx.clearRect(0, 0, size, size);

    // ==========================================
    // 1. VẼ 8 NAN QUẠT & NỘI DUNG (Xoay theo góc)
    // ==========================================
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(rotationAngle);

    for (let i = 0; i < numSlices; i++) {
      const angleStart = i * sliceAngle;
      const angleEnd = angleStart + sliceAngle;
      const reward = rewards[i];

      // Nan quạt
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, innerRimRadius, angleStart, angleEnd);
      ctx.closePath();

      ctx.fillStyle = reward.color || '#3b82f6';
      ctx.fill();

      // Viền chia nan màu vàng kim mảnh
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Vẽ Icon và Text theo hướng bán kính (quay mặt vào tâm)
      ctx.save();
      ctx.rotate(angleStart + sliceAngle / 2);
      ctx.translate(innerRimRadius * 0.65, 0);
      ctx.rotate(Math.PI / 2);

      const emoji = getRewardEmoji(reward);
      const [line1, line2] = getRewardTextLines(reward);

      // Icon Emoji
      ctx.font = '22px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 0, -22);

      // Dòng 1: Label chính
      ctx.font = '900 12px "Inter", sans-serif';
      ctx.fillStyle = reward.textColor || '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 3;
      ctx.fillText(line1, 0, 2);

      // Dòng 2: Label phụ
      ctx.font = '700 10px "Inter", sans-serif';
      ctx.fillStyle = reward.textColor === '#1e1e24' ? '#292524' : 'rgba(255, 255, 255, 0.9)';
      ctx.fillText(line2, 0, 16);

      ctx.restore();
    }

    ctx.restore();

    // ==========================================
    // 2. VÒNG VIỀN VÀNG & ĐÈN MARQUEE XUNG QUANH
    // ==========================================
    ctx.save();
    ctx.translate(center, center);

    // Vành vàng kim loại ngoài
    const rimGrad = ctx.createLinearGradient(-outerRimRadius, -outerRimRadius, outerRimRadius, outerRimRadius);
    rimGrad.addColorStop(0, '#fde047');
    rimGrad.addColorStop(0.3, '#d97706');
    rimGrad.addColorStop(0.5, '#fef08a');
    rimGrad.addColorStop(0.7, '#b45309');
    rimGrad.addColorStop(1, '#fde047');

    ctx.beginPath();
    ctx.arc(0, 0, outerRimRadius, 0, 2 * Math.PI);
    ctx.arc(0, 0, innerRimRadius, 0, 2 * Math.PI, true);
    ctx.fillStyle = rimGrad;
    ctx.fill();

    // Vạch viền vàng sáng bóng
    ctx.beginPath();
    ctx.arc(0, 0, innerRimRadius, 0, 2 * Math.PI);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#fef08a';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, outerRimRadius, 0, 2 * Math.PI);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#fef08a';
    ctx.stroke();

    // 24 bóng đèn LED Marquee phát sáng chạy quanh viền
    const bulbRadius = (outerRimRadius + innerRimRadius) / 2;
    const numBulbs = 24;
    for (let b = 0; b < numBulbs; b++) {
      const bAngle = (b * 2 * Math.PI) / numBulbs;
      const bx = bulbRadius * Math.cos(bAngle);
      const by = bulbRadius * Math.sin(bAngle);

      ctx.beginPath();
      ctx.arc(bx, by, 3.2, 0, 2 * Math.PI);
      ctx.fillStyle = b % 2 === 0 ? '#ffffff' : '#fef08a';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 6;
      ctx.fill();
    }

    ctx.restore();
  }, [rewards]);

  // Vẽ vòng quay khi mở Modal hoặc thay đổi cấu hình và khóa cuộn trang nền để không hiện scrollbar
  useEffect(() => {
    if (!isOpen) return;
    drawWheel(currentRotationRef.current);

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isOpen, drawWheel]);

  // Kích hoạt quay thưởng
  const handleSpin = async () => {
    if (spinning) return;
    setErrorMsg(null);
    setSpinResult(null);

    if (!isAuthenticated) {
      setErrorMsg('Vui lòng đăng nhập tài khoản để tham gia quay thưởng nhận voucher!');
      return;
    }

    if (wheelStatus && !wheelStatus.canSpin) {
      setErrorMsg('Bạn đã sử dụng lượt quay may mắn hôm nay. Hãy quay lại vào ngày mai nhé!');
      return;
    }

    try {
      setSpinning(true);

      // Gọi API Backend lấy kết quả trúng thưởng ngẫu nhiên theo trọng số
      const result = await wheelService.spin();
      const targetIndex = result.rewardIndex;
      const numSlices = rewards.length;
      const sliceAngle = (2 * Math.PI) / numSlices;

      // Kim chỉ ở đỉnh 12h = 270 độ (3*PI/2)
      // Góc quay đích để tâm ô targetIndex dừng ngay dưới kim chỉ:
      const pointerAngle = (3 * Math.PI) / 2;
      const targetSliceCenter = targetIndex * sliceAngle + sliceAngle / 2;

      const normalizedStop = (pointerAngle - targetSliceCenter + 4 * Math.PI) % (2 * Math.PI);
      const currentNormalized = ((currentRotationRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

      let delta = normalizedStop - currentNormalized;
      if (delta <= 0) {
        delta += 2 * Math.PI;
      }

      // Xoay thêm 6 vòng tròn đầy đủ tạo tốc độ cao
      const extraSpins = 6 * (2 * Math.PI);
      const targetRotation = currentRotationRef.current + delta + extraSpins;
      const startRotation = currentRotationRef.current;
      const totalDelta = targetRotation - startRotation;

      const durationMs = 5200; // 5.2 giây
      const startTime = performance.now();

      // Hàm easing giảm tốc mượt mà (Cubic ease out)
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        const easeVal = easeOutCubic(progress);

        const currentRot = startRotation + totalDelta * easeVal;
        currentRotationRef.current = currentRot;

        drawWheel(currentRot);

        // Phát âm thanh khi nan quạt quét qua kim chỉ
        const currentSliceUnderPointer = Math.floor(
          (((pointerAngle - (currentRot % (2 * Math.PI)) + 4 * Math.PI) % (2 * Math.PI)) / sliceAngle)
        );
        if (currentSliceUnderPointer !== lastSoundTickSliceRef.current) {
          lastSoundTickSliceRef.current = currentSliceUnderPointer;
          playTickSound();
        }

        if (progress < 1) {
          animationFrameIdRef.current = requestAnimationFrame(animate);
        } else {
          // Kết thúc vòng quay
          setSpinning(false);
          setSpinResult(result);
          fetchStatus(); // Đồng bộ trạng thái mới từ server

          // Bắn pháo hoa Confetti rực rỡ từ 2 góc
          confetti({
            particleCount: 90,
            spread: 75,
            origin: { x: 0.25, y: 0.65 },
            colors: ['#f59e0b', '#fbbf24', '#ffffff', '#ec4899', '#3b82f6'],
          });
          confetti({
            particleCount: 90,
            spread: 75,
            origin: { x: 0.75, y: 0.65 },
            colors: ['#f59e0b', '#fbbf24', '#ffffff', '#10b981', '#8b5cf6'],
          });
        }
      };

      animationFrameIdRef.current = requestAnimationFrame(animate);
    } catch (err: unknown) {
      setSpinning(false);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMsg(error.response?.data?.message || error.message || 'Quay thưởng thất bại. Vui lòng thử lại!');
    }
  };

  // Sao chép mã voucher vào Clipboard
  const handleCopyVoucher = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Đóng modal an toàn
  const closeModal = () => {
    if (spinning) return;
    setIsOpen(false);
    setErrorMsg(null);
  };

  // Số lượt quay khả dụng hôm nay
  const remainingSpins = !isAuthenticated
    ? 1
    : (wheelStatus?.remainingSpins !== undefined
        ? wheelStatus.remainingSpins
        : (wheelStatus?.canSpin ? 1 : 0));

  // Xác định mã voucher hiển thị hôm nay
  const displayVoucherCode = spinResult?.voucherCode || wheelStatus?.todayVoucherCode;

  if (!wheelEnabled) return null;

  return (
    <>
      {/* ========================================================= */}
      {/* 1. NÚT NỔI HỘP QUÀ (FLOATING GIFT BUTTON GÓC TRÁI MÀN HÌNH) */}
      {/* ========================================================= */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-40 group flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-gray-950 font-black rounded-full shadow-[0_8px_25px_rgba(245,158,11,0.5)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-amber-400/30"
        title="Vòng Quay May Mắn - NEXOR"
      >
        <div className="relative">
          <Gift className="w-6 h-6 text-gray-950 animate-bounce" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                remainingSpins > 0 ? 'bg-emerald-400' : 'bg-red-400'
              } opacity-75`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                remainingSpins > 0 ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
          </span>
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[11px] font-black uppercase tracking-wider leading-none text-gray-950">
            VÒNG QUAY NEXOR
          </span>
          <span className="text-[9px] font-extrabold text-amber-950 leading-tight">
            {!isAuthenticated
              ? '1 LƯỢT MIỄN PHÍ'
              : remainingSpins > 0
              ? 'CÒN 1 LƯỢT QUAY'
              : '0 LƯỢT - CHỜ MAI'}
          </span>
        </div>
      </button>

      {/* ========================================================= */}
      {/* 2. MODAL VÒNG QUAY MAY MẮN (GIAO DIỆN SANG TRỌNG 100% NHƯ ẢNH) */}
      {/* ========================================================= */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            className="relative w-full max-w-[700px] max-h-[96vh] overflow-y-auto overflow-x-hidden no-scrollbar rounded-[30px] border border-amber-500/30 shadow-[0_0_60px_rgba(0,0,0,0.95),0_0_35px_rgba(245,158,11,0.25)] flex flex-col items-center justify-between p-4 sm:p-5"
            style={{
              backgroundImage: `url(${wheelBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: '#0a0a0e',
            }}
          >
            {/* Nút đóng modal X ở góc trên cùng bên phải */}
            <button
              type="button"
              onClick={closeModal}
              disabled={spinning}
              className="absolute top-3.5 right-4 sm:top-4 sm:right-5 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-gray-300 hover:text-white flex items-center justify-center transition border border-white/10 cursor-pointer disabled:opacity-40"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>

            {/* HEADER: Badge NEXOR + Tiêu đề Vòng quay may mắn */}
            <div className="flex flex-col items-center text-center mt-0.5 mb-1.5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-950/70 border border-amber-500/50 text-amber-300 text-xs font-black uppercase tracking-wider shadow-sm mb-1">
                <Gift className="w-3.5 h-3.5 text-amber-400" />
                <span>NEXOR</span>
                <span className="w-1 h-1 rounded-full bg-amber-400/60" />
                <span className="text-[11px] font-bold text-amber-200">
                  {isAuthenticated
                    ? `Lượt quay: ${remainingSpins}`
                    : '1 lượt/ngày'}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2">
                <span className="text-amber-400 text-base sm:text-lg">✦</span>
                <span className="text-xl sm:text-2xl">🎁</span>
                <h2 className="text-lg sm:text-2xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-200 drop-shadow-[0_2px_12px_rgba(245,158,11,0.5)]">
                  VÒNG QUAY MAY MẮN
                </h2>
                <span className="text-amber-400 text-base sm:text-lg">✦</span>
              </div>

              <p className="text-[11px] sm:text-xs text-gray-300 font-medium mt-0.5">
                Quay mỗi ngày để nhận những phần quà hấp dẫn từ NEXOR!
              </p>
            </div>

            {/* CANVAS VÒNG QUAY + KIM CHỈ + NÚT QUAY TÂM */}
            <div className="relative flex items-center justify-center my-2">
              {/* Kim chỉ phần thưởng (Teardrop pointer giọt nước vàng chỉ đỉnh 12h) */}
              <div className="absolute -top-3.5 z-20 flex flex-col items-center pointer-events-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                <svg className="w-8 h-10 sm:w-9 sm:h-11" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="pointerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="40%" stopColor="#f59e0b" />
                      <stop offset="80%" stopColor="#d97706" />
                      <stop offset="100%" stopColor="#b45309" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M5 17 C5 8.7 11.7 2 20 2 C28.3 2 35 8.7 35 17 C35 23.5 30 31 20 48 C10 31 5 23.5 5 17 Z"
                    fill="url(#pointerGrad)"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <circle cx="20" cy="17" r="7.5" fill="#fef08a" stroke="#d97706" strokeWidth="1.5" />
                  <circle cx="18" cy="15" r="2.2" fill="#ffffff" />
                </svg>
              </div>

              {/* Canvas 360x360 co giãn vừa khung không tràn */}
              <canvas
                ref={canvasRef}
                width={360}
                height={360}
                className="w-[268px] h-[268px] sm:w-[310px] sm:h-[310px] rounded-full shadow-[0_0_40px_rgba(245,158,11,0.35)]"
              />

              {/* Nút bấm QUAY NGAY ở trung tâm vòng quay */}
              <button
                type="button"
                onClick={handleSpin}
                disabled={spinning || (wheelStatus ? !wheelStatus.canSpin : false)}
                className={`absolute z-10 w-[62px] h-[62px] sm:w-[70px] sm:h-[70px] rounded-full flex flex-col items-center justify-center shadow-[0_4px_18px_rgba(0,0,0,0.6),0_0_18px_rgba(245,158,11,0.5)] transition-all cursor-pointer ${
                  spinning || (wheelStatus ? !wheelStatus.canSpin : false)
                    ? 'bg-gradient-to-b from-gray-600 to-gray-800 text-gray-300 cursor-not-allowed opacity-90 ring-4 ring-gray-900/60'
                    : 'bg-gradient-to-b from-[#fef08a] via-[#f59e0b] to-[#d97706] text-[#291e0a] hover:scale-105 active:scale-95 hover:shadow-[0_0_25px_rgba(245,158,11,0.8)] ring-4 ring-amber-300/40 border-2 border-white'
                }`}
              >
                {spinning ? (
                  <RotateCw className="w-6 h-6 animate-spin text-white" />
                ) : wheelStatus && !wheelStatus.canSpin ? (
                  <>
                    <span className="text-[11px] sm:text-[12px] font-black leading-tight tracking-wider text-gray-200">HẾT</span>
                    <span className="text-[9px] sm:text-[10px] font-bold leading-tight tracking-wider text-amber-400">LƯỢT</span>
                  </>
                ) : (
                  <>
                    <span className="text-[12px] sm:text-[14px] font-black leading-tight tracking-wider">QUAY</span>
                    <span className="text-[10px] sm:text-[11px] font-black leading-tight tracking-wider text-[#3d2708]">NGAY</span>
                  </>
                )}
              </button>
            </div>

            {/* Thông báo lỗi nếu có */}
            {errorMsg && (
              <div className="w-full max-w-[500px] mt-1 p-2 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-300 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span className="flex-1">{errorMsg}</span>
              </div>
            )}

            {/* KHUNG THÔNG TIN BÊN DƯỚI: ĐẾM NGƯỢC HOẶC MÃ VOUCHER TRÚNG THƯỞNG */}
            <div className="w-full max-w-[500px] mt-1.5 mb-0.5 p-2.5 sm:p-3.5 rounded-2xl bg-[#12141a]/95 backdrop-blur-md border border-amber-500/30 shadow-xl flex flex-col gap-2">
              {/* Chưa đăng nhập */}
              {!isAuthenticated && (
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-gray-300">Đăng nhập để nhận 1 lượt quay may mắn mỗi ngày!</span>
                  <button
                    type="button"
                    onClick={() => {
                      closeModal();
                      navigate(ROUTES.LOGIN);
                    }}
                    className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-gray-950 font-black rounded-lg transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Đăng nhập</span>
                  </button>
                </div>
              )}

              {/* Đã đăng nhập */}
              {isAuthenticated && (
                <>
                  {/* Dòng 1: Hiển thị trực quan Số lượt quay còn lại */}
                  <div className="flex items-center justify-between text-xs sm:text-sm bg-black/40 px-3 py-2 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 text-gray-200 font-medium">
                      <RotateCw className="w-4 h-4 text-amber-400" />
                      <span>Số lượt quay còn lại:</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-0.5 rounded-full font-black text-xs uppercase tracking-wide border ${
                          remainingSpins > 0
                            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                            : 'bg-red-950/80 border-red-500/40 text-red-400'
                        }`}
                      >
                        {remainingSpins} lượt
                      </span>
                    </div>
                  </div>

                  {/* Dòng 2: Đếm ngược lượt quay tiếp theo nếu đã hết lượt */}
                  {wheelStatus && !wheelStatus.canSpin && (
                    <div className="flex items-center justify-between text-xs sm:text-sm px-1">
                      <div className="flex items-center gap-2 text-gray-300 font-medium">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>Lượt quay miễn phí tiếp theo sau:</span>
                      </div>
                      <span className="bg-[#0b0c10]/90 border border-amber-500/40 px-3 py-1 rounded-lg text-amber-300 font-mono font-bold tracking-wider shadow-inner">
                        {timeUntilTomorrow}
                      </span>
                    </div>
                  )}

                  {/* Dòng 3: Voucher hôm nay (nếu đã có voucher) */}
                  {displayVoucherCode && (
                    <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs sm:text-sm">
                      <div className="flex items-center gap-2 text-gray-300 font-medium">
                        <Ticket className="w-4 h-4 text-amber-400" />
                        <span>Voucher hôm nay:</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-amber-300 font-mono font-black tracking-widest bg-black/40 px-2.5 py-0.5 rounded border border-amber-500/20">
                          {displayVoucherCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyVoucher(displayVoucherCode)}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-amber-300 hover:text-white transition cursor-pointer"
                          title="Sao chép mã voucher"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Nút hành động nhanh: Dùng ngay tại giỏ hàng nếu vừa trúng thưởng */}
                  {spinResult && (
                    <div className="flex items-center gap-2 mt-1 pt-2 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          closeModal();
                          navigate(ROUTES.CART);
                        }}
                        className="flex-1 py-2 px-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-gray-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Dùng ngay tại Giỏ hàng</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LuckyWheelModal;
