import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gift,
  X,
  Sparkles,
  Copy,
  Check,
  RotateCw,
  Clock,
  LogIn,
  AlertCircle,
  ShoppingBag,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { wheelService } from '../../api/services/wheel.service';
import { useAuthStore } from '../../store/useAuthStore';
import { ROUTES } from '../../constants/routes';
import type { WheelReward, WheelStatusResponse, WheelSpinResponse } from '../../models/wheel.model';

export const LuckyWheelModal: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

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

  // Fallback 8 rewards nếu chưa load được từ API
  const defaultRewards: WheelReward[] = [
    { id: 0, label: 'Voucher 10K', shortLabel: '10K', discount: '10.000', type: 'ORDER', minOrder: 'Mọi đơn', weight: 30, color: '#1e293b', textColor: '#f8fafc' },
    { id: 1, label: 'Giảm 10%', shortLabel: '10%', discount: '10%', type: 'ORDER', minOrder: '100K', weight: 25, color: '#4f46e5', textColor: '#ffffff' },
    { id: 2, label: 'Freeship 100%', shortLabel: 'FREESHIP', discount: '100%', type: 'SHIPPING', minOrder: 'Mọi đơn', weight: 20, color: '#059669', textColor: '#ffffff' },
    { id: 3, label: 'Voucher 20K', shortLabel: '20K', discount: '20.000', type: 'ORDER', minOrder: '200K', weight: 15, color: '#d97706', textColor: '#ffffff' },
    { id: 4, label: 'Giảm 15%', shortLabel: '15%', discount: '15%', type: 'ORDER', minOrder: '300K', weight: 10, color: '#e11d48', textColor: '#ffffff' },
    { id: 5, label: 'Giảm 30K Ship', shortLabel: 'SHIP 30K', discount: '30.000', type: 'SHIPPING', minOrder: 'Mọi đơn', weight: 15, color: '#7c3aed', textColor: '#ffffff' },
    { id: 6, label: 'Voucher 50K', shortLabel: '50K', discount: '50.000', type: 'ORDER', minOrder: '500K', weight: 5, color: '#ea580c', textColor: '#ffffff' },
    { id: 7, label: '100K VIP', shortLabel: '100K VIP', discount: '100.000', type: 'ORDER', minOrder: '800K', weight: 2, color: '#f59e0b', textColor: '#1e1e24' },
  ];

  const rewards = wheelStatus?.rewards && wheelStatus.rewards.length === 8
    ? wheelStatus.rewards
    : defaultRewards;

  // Lấy trạng thái vòng quay
  const fetchStatus = useCallback(async () => {
    try {
      const data = await wheelService.getStatus();
      setWheelStatus(data);
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus, isAuthenticated]);

  // Đếm ngược đến 00:00 ngày hôm sau
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeUntilTomorrow(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Web Audio API: Sinh âm thanh tích tắc khi nan ô quay qua kim chỉ
  const playTickSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Bỏ qua lỗi audio nếu trình duyệt chặn
    }
  }, []);

  // Vẽ vòng quay trên Canvas
  const drawWheel = useCallback((rotationAngle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 12; // Viền ngoài
    const numSlices = rewards.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    ctx.clearRect(0, 0, size, size);

    // Lưu state trước khi xoay
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(rotationAngle);

    // 1. Vẽ các nan ô (Slices)
    for (let i = 0; i < numSlices; i++) {
      const angleStart = i * sliceAngle;
      const angleEnd = angleStart + sliceAngle;
      const reward = rewards[i];

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, angleStart, angleEnd);
      ctx.closePath();

      // Màu nền
      ctx.fillStyle = reward.color || (i % 2 === 0 ? '#1e293b' : '#3b82f6');
      ctx.fill();

      // Viền chia nan
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 2. Vẽ chữ & nhãn phần thưởng trong từng ô
      ctx.save();
      ctx.rotate(angleStart + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = reward.textColor || '#ffffff';

      // Chữ lớn (Short label)
      ctx.font = 'bold 15px sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 3;
      ctx.fillText(reward.shortLabel, radius - 20, 0);

      // Icon hoặc sub-text
      ctx.font = '10px sans-serif';
      ctx.fillStyle = reward.textColor === '#1e1e24' ? '#334155' : 'rgba(255,255,255,0.85)';
      ctx.fillText(reward.type === 'SHIPPING' ? 'Freeship' : 'Voucher', radius - 20, 16);

      ctx.restore();
    }

    ctx.restore();

    // 2. Viền ngoài trang trí kim tuyến / đèn led tròn
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#f59e0b'; // Gold border
    ctx.stroke();

    // Vòng đèn LED trang trí xung quanh viền
    const numDots = 24;
    for (let j = 0; j < numDots; j++) {
      const dotAngle = (j * 2 * Math.PI) / numDots;
      const dotX = center + (radius + 4) * Math.cos(dotAngle);
      const dotY = center + (radius + 4) * Math.sin(dotAngle);

      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, 2 * Math.PI);
      ctx.fillStyle = j % 2 === 0 ? '#fef08a' : '#ffffff';
      ctx.fill();
    }

    // 3. Tâm vòng quay tròn (Center Hub)
    ctx.beginPath();
    ctx.arc(center, center, 32, 0, 2 * Math.PI);
    const grad = ctx.createRadialGradient(center, center, 5, center, center, 32);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(1, '#d97706');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Chữ 'LUCKY' ở tâm
    ctx.font = 'black 11px sans-serif';
    ctx.fillStyle = '#181a20';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText('LUCKY', center, center);
  }, [rewards]);

  // Vẽ lại vòng quay khi mở modal hoặc thay đổi góc
  useEffect(() => {
    if (isOpen) {
      drawWheel(currentRotationRef.current);
    }
  }, [isOpen, drawWheel]);

  // Xử lý quay thưởng
  const handleSpin = async () => {
    if (spinning) return;
    setErrorMsg(null);
    setSpinResult(null);

    if (!isAuthenticated) {
      setErrorMsg('Vui lòng đăng nhập tài khoản để tham gia quay thưởng nhận voucher!');
      return;
    }

    if (wheelStatus && !wheelStatus.canSpin) {
      setErrorMsg('Bạn đã sử dụng lượt quay may mắn hôm nay. Hãy quay lại vào ngày mai!');
      return;
    }

    try {
      setSpinning(true);

      // Gọi API Backend lấy kết quả ngẫu nhiên theo trọng số
      const result = await wheelService.spin();

      // Backend trả về rewardIndex (0..7)
      const targetIndex = result.rewardIndex;
      const numSlices = rewards.length;
      const sliceAngle = (2 * Math.PI) / numSlices;

      // Kim chỉ nằm ở đỉnh trên cùng: góc 270 độ = 3*PI/2 (hoặc -PI/2)
      // Khi kim chỉ vào đỉnh ô i, góc quay của vòng quay cần thỏa mãn:
      // (rotation + i * sliceAngle + sliceAngle / 2) mod 2PI = 3*PI/2
      // => rotation = 3*PI/2 - (i * sliceAngle + sliceAngle / 2)
      const pointerAngle = (3 * Math.PI) / 2;
      const targetSliceCenter = targetIndex * sliceAngle + sliceAngle / 2;

      // Thêm 6 đến 8 vòng quay đầy đủ (Full spins) để tạo hiệu ứng quay tít
      const extraSpins = 6 * (2 * Math.PI);
      const currentAngle = currentRotationRef.current % (2 * Math.PI);
      let deltaAngle = (pointerAngle - targetSliceCenter - currentAngle) % (2 * Math.PI);
      if (deltaAngle < 0) {
        deltaAngle += 2 * Math.PI;
      }

      const totalRotationNeeded = extraSpins + deltaAngle;
      const startAngle = currentRotationRef.current;
      const finalAngle = startAngle + totalRotationNeeded;

      // Animation xoay mượt mà với cubic-bezier / ease-out (thời lượng 5.5 giây)
      const durationMs = 5500;
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1);

        // Cubic-bezier ease-out (chạy nhanh lúc đầu, giảm tốc từ từ đến khi dừng)
        const easeOut = 1 - Math.pow(1 - progress, 3.5);
        const currentAngleNow = startAngle + totalRotationNeeded * easeOut;

        currentRotationRef.current = currentAngleNow;
        drawWheel(currentAngleNow);

        // Tính nan ô hiện tại đi qua kim để phát âm thanh tick
        const normalizedAngle = (currentAngleNow % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        const currentSliceUnderPointer = Math.floor(
          ((pointerAngle - normalizedAngle + 2 * Math.PI) % (2 * Math.PI)) / sliceAngle
        );

        if (currentSliceUnderPointer !== lastSoundTickSliceRef.current) {
          lastSoundTickSliceRef.current = currentSliceUnderPointer;
          playTickSound();
        }

        if (progress < 1) {
          animationFrameIdRef.current = requestAnimationFrame(animate);
        } else {
          // Hoàn thành vòng quay!
          currentRotationRef.current = finalAngle;
          drawWheel(finalAngle);
          setSpinning(false);
          setSpinResult(result);

          // Cập nhật trạng thái đã quay
          setWheelStatus((prev) =>
            prev
              ? {
                  ...prev,
                  canSpin: false,
                  hasSpunToday: true,
                  todayVoucherCode: result.voucherCode,
                  todayRewardLabel: result.reward.label,
                }
              : null
          );

          // Bắn pháo hoa rực rỡ với canvas-confetti
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.55 },
            colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'],
          });
        }
      };

      animationFrameIdRef.current = requestAnimationFrame(animate);
    } catch (err) {
      setSpinning(false);
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi quay thưởng!';
      setErrorMsg(msg);
    }
  };

  const handleCopyVoucher = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const closeModal = () => {
    if (spinning) return; // Không cho tắt khi đang quay
    setIsOpen(false);
    setErrorMsg(null);
  };

  return (
    <>
      {/* 1. Nút nổi hình hộp quà (Floating Gift Button) cố định ở góc dưới màn hình */}
      <div className="fixed bottom-6 left-6 z-40 select-none">
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setSpinResult(null);
            setErrorMsg(null);
            fetchStatus();
          }}
          className="group relative flex items-center gap-2.5 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 text-white p-3 sm:px-4 sm:py-3 rounded-full shadow-2xl hover:shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border border-white/20 animate-bounce"
          style={{ animationDuration: '3s' }}
          title="Vòng quay may mắn nhận Voucher"
        >
          {/* Hộp quà icon có ánh sáng lấp lánh */}
          <div className="relative">
            <Gift className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300 drop-shadow" />
            <Sparkles className="w-3.5 h-3.5 text-yellow-200 absolute -top-1 -right-1 animate-pulse" />
          </div>

          <div className="hidden sm:flex flex-col text-left">
            <span className="text-[10px] uppercase font-black tracking-wider text-yellow-200 leading-none">
              Gamification
            </span>
            <span className="text-xs font-bold text-white leading-tight">
              Vòng Quay May Mắn
            </span>
          </div>

          {/* Huy hiệu thông báo 1 lượt miễn phí */}
          {(!wheelStatus || wheelStatus.canSpin) && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm animate-pulse">
              1 lượt
            </span>
          )}
        </button>
      </div>

      {/* 2. Modal Vòng Quay May Mắn */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-lg bg-[#181a20] border border-gray-700/80 rounded-3xl shadow-2xl overflow-hidden p-6 text-white flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút đóng modal */}
            <button
              type="button"
              disabled={spinning}
              onClick={closeModal}
              className={`absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition ${
                spinning ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Tiêu đề Modal */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>NEXOR Lucky Wheel</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                VÒNG QUAY MAY MẮN
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Quay mỗi ngày nhận Voucher giảm giá đến 100.000₫ và Freeship 100%
              </p>
            </div>

            {/* Canvas Vòng Quay & Kim chỉ Pointer */}
            <div className="relative flex items-center justify-center my-2">
              {/* Kim chỉ phần thưởng (Pointer ở đỉnh trên cùng) */}
              <div className="absolute -top-3 z-20 flex flex-col items-center">
                <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[26px] border-t-amber-400 drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]" />
                <div className="w-3 h-3 rounded-full bg-red-600 -mt-7 border-2 border-white shadow" />
              </div>

              {/* Canvas 360x360 */}
              <canvas
                ref={canvasRef}
                width={340}
                height={340}
                className="rounded-full shadow-[0_0_30px_rgba(245,158,11,0.2)] bg-[#0f1115]"
              />

              {/* Nút bấm quay ở trung tâm */}
              <button
                type="button"
                onClick={handleSpin}
                disabled={spinning || (wheelStatus ? !wheelStatus.canSpin : false)}
                className={`absolute z-10 w-16 h-16 rounded-full flex flex-col items-center justify-center text-xs font-black tracking-wider shadow-xl transition-all cursor-pointer ${
                  spinning || (wheelStatus ? !wheelStatus.canSpin : false)
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-80'
                    : 'bg-gradient-to-b from-amber-400 to-amber-600 text-gray-950 hover:scale-110 active:scale-95 hover:shadow-amber-500/50 ring-4 ring-[#181a20]'
                }`}
              >
                {spinning ? (
                  <RotateCw className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <>
                    <span className="text-[13px] font-black leading-tight">QUAY</span>
                    <span className="text-[9px] font-bold text-gray-800">NGAY</span>
                  </>
                )}
              </button>
            </div>

            {/* Thông báo lỗi / trạng thái */}
            {errorMsg && (
              <div className="mt-3 w-full p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-300 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span className="flex-1">{errorMsg}</span>
              </div>
            )}

            {/* Chưa đăng nhập: Prompt đăng nhập */}
            {!isAuthenticated && (
              <div className="mt-3 w-full p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between gap-3 text-xs">
                <span className="text-gray-300">Đăng nhập để nhận 1 lượt quay miễn phí mỗi ngày!</span>
                <button
                  type="button"
                  onClick={() => {
                    closeModal();
                    navigate(ROUTES.LOGIN);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition flex items-center gap-1.5 shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng nhập</span>
                </button>
              </div>
            )}

            {/* Đã quay hôm nay: Thông báo đếm ngược */}
            {isAuthenticated && wheelStatus && wheelStatus.hasSpunToday && !spinResult && (
              <div className="mt-3 w-full p-3.5 bg-gray-800/80 border border-gray-700 rounded-2xl flex flex-col items-center gap-2 text-center text-xs">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <Clock className="w-4 h-4" />
                  <span>Lượt quay tiếp theo sau:</span>
                  <span className="font-mono font-bold text-white bg-gray-900 px-2 py-0.5 rounded border border-gray-700">
                    {timeUntilTomorrow}
                  </span>
                </div>

                {wheelStatus.todayVoucherCode && (
                  <div className="mt-1 flex items-center gap-2 bg-gray-900/80 px-3 py-1.5 rounded-lg border border-gray-700">
                    <span className="text-gray-400 text-[11px]">Voucher hôm nay:</span>
                    <span className="font-mono font-bold text-amber-400 text-xs">
                      {wheelStatus.todayVoucherCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyVoucher(wheelStatus.todayVoucherCode!)}
                      className="text-gray-400 hover:text-white p-1"
                      title="Sao chép"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Card chúc mừng khi vừa trúng thưởng */}
            {spinResult && (
              <div className="mt-4 w-full p-4 bg-gradient-to-b from-amber-500/20 to-transparent border border-amber-500/40 rounded-2xl flex flex-col items-center gap-2.5 text-center animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300">
                  <Award className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-black text-amber-300 uppercase tracking-wide">
                    {spinResult.message}
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Mã giảm giá đã được lưu vào ví voucher tài khoản của bạn!
                  </p>
                </div>

                {/* Box hiển thị Voucher Code */}
                <div className="flex items-center gap-2 bg-[#232731] border border-amber-500/40 px-4 py-2 rounded-xl mt-1">
                  <span className="font-mono font-black text-base text-amber-400 tracking-wider">
                    {spinResult.voucherCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyVoucher(spinResult.voucherCode)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-xs rounded-lg transition ml-2 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-950" />
                        <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Nút hành động */}
                <div className="flex items-center gap-2 mt-2 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      closeModal();
                      navigate(ROUTES.CART);
                    }}
                    className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Dùng ngay tại Giỏ hàng</span>
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="py-2 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs rounded-xl transition cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default LuckyWheelModal;

