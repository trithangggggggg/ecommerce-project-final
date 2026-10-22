import React, { useState, useRef, useEffect, useCallback } from 'react';

export type MascotCharacter = 'fox' | 'cat' | 'otter' | 'owl';

interface PetMascotProps {
  type?: MascotCharacter;
  size?: number;
  label?: string;
  className?: string;
  enableSpeechBubble?: boolean;
  placement?: 'bottom' | 'top';
}

interface MascotReaction {
  text: string;
  col: number;
  row: number;
}

const CUTE_REACTIONS: MascotReaction[] = [
  { text: 'Chào bạn! Tớ là Pet Fox của NEXOR đây! 🦊✨', col: 2, row: 0 }, // Sparkles
  { text: 'Hôm nay có voucher công nghệ cực hot đó nha! 📱🎁', col: 1, row: 1 }, // Star eyes
  { text: 'Cần tư vấn gì cứ bấm vào AI Chatbot góc phải nhé! 🤖', col: 1, row: 1 }, // Star eyes
  { text: 'Chúc bạn một ngày mua sắm thật nhiều niềm vui! 💻❤️', col: 1, row: 0 }, // Heart love
  { text: 'Hihi nhột quá, bạn thích bấm vào tớ à! 😆', col: 2, row: 2 }, // Laughing
  { text: 'MacBook Air M3 và iPhone 16 Pro Max đang hot lắm! 🔥', col: 0, row: 1 }, // Surprised
  { text: 'Tớ luôn ở đây đồng hành cùng bạn mua sắm! 🥰', col: 2, row: 1 }, // Blush
];

export const PetMascot: React.FC<PetMascotProps> = ({
  type = 'fox',
  size = 42,
  label = 'NEXOR Pet Fox',
  className = '',
  enableSpeechBubble = true,
  placement = 'bottom',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Sprite frame state: col (0-2), row (0-2)
  const [frame, setFrame] = useState<{ col: number; row: number }>({ col: 1, row: 1 });
  const [activeSheet, setActiveSheet] = useState<'directions' | 'reactions'>('directions');
  const [isDizzy, setIsDizzy] = useState(false);
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [clickCount, setClickCount] = useState(0);

  // Control refs
  const isHoveredRef = useRef(false);
  const isReactingRef = useRef(false);
  const reactionTimerRef = useRef<number | null>(null);
  const bubbleTimerRef = useRef<number | null>(null);

  const directionsPath = `/mascots/${type}-directions.webp`;
  const reactionsPath = `/mascots/${type}-reactions.webp`;

  // Preload both sprite sheets for smooth frame transitions
  useEffect(() => {
    const img1 = new Image();
    img1.src = directionsPath;
    const img2 = new Image();
    img2.src = reactionsPath;
  }, [directionsPath, reactionsPath]);

  // Mouse tracking to turn head towards cursor
  useEffect(() => {
    let animFrame: number;
    let lastMove = Date.now();

    const handleMouseMove = (e: MouseEvent) => {
      // Don't override while displaying an active emotional reaction
      if (isReactingRef.current || isHoveredRef.current) return;

      cancelAnimationFrame(animFrame);
      animFrame = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        lastMove = Date.now();

        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;

        // Determine look column: 0=Left, 1=Center, 2=Right
        let col = 1;
        if (dx < -45) col = 0;
        else if (dx > 45) col = 2;

        // Determine look row: 0=Up, 1=Center, 2=Down
        let row = 1;
        if (dy < -35) row = 0;
        else if (dy > 35) row = 2;

        setActiveSheet('directions');
        setFrame({ col, row });
      });
    };

    // Return to front-facing center when cursor is idle for > 4s
    const idleCheck = setInterval(() => {
      if (isReactingRef.current || isHoveredRef.current) return;
      if (Date.now() - lastMove > 4000) {
        setFrame((prev) => (prev.col === 1 && prev.row === 1 ? prev : { col: 1, row: 1 }));
      }
    }, 1000);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animFrame);
      clearInterval(idleCheck);
    };
  }, []);

  // Handle Hover: Fox smiles / shows heart
  const handleMouseEnter = useCallback(() => {
    isHoveredRef.current = true;
    if (isReactingRef.current) return;

    setActiveSheet('reactions');
    // Frame (1, 0) = Floating Heart reaction ❤️
    setFrame({ col: 1, row: 0 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    isHoveredRef.current = false;
    if (isReactingRef.current) return;

    setActiveSheet('directions');
    setFrame({ col: 1, row: 1 });
  }, []);

  // Handle Click: Speech bubble + fun reaction
  const handleClick = useCallback(() => {
    if (reactionTimerRef.current) window.clearTimeout(reactionTimerRef.current);
    if (bubbleTimerRef.current) window.clearTimeout(bubbleTimerRef.current);

    const nextCount = clickCount + 1;
    setClickCount(nextCount);
    isReactingRef.current = true;
    setActiveSheet('reactions');

    let text = '';
    let targetFrame = { col: 1, row: 1 };

    if (nextCount >= 5) {
      // 5th click: Dizzy spiral eyes!
      text = 'Oaaa tớ chóng mặt hoa mắt rồi nèee! 💫😵';
      targetFrame = { col: 1, row: 2 }; // Spiral dizzy eyes
      setIsDizzy(true);
      setClickCount(0);
    } else {
      setIsDizzy(false);
      const chosen = CUTE_REACTIONS[Math.floor(Math.random() * CUTE_REACTIONS.length)];
      text = chosen.text;
      targetFrame = { col: chosen.col, row: chosen.row };
    }

    setFrame(targetFrame);
    if (enableSpeechBubble) {
      setBubbleText(text);
    }

    // Reaction duration
    reactionTimerRef.current = window.setTimeout(() => {
      isReactingRef.current = false;
      setIsDizzy(false);
      if (isHoveredRef.current) {
        // Still hovering -> show heart
        setActiveSheet('reactions');
        setFrame({ col: 1, row: 0 });
      } else {
        // Return to directions
        setActiveSheet('directions');
        setFrame({ col: 1, row: 1 });
      }
    }, 2800);

    bubbleTimerRef.current = window.setTimeout(() => {
      setBubbleText(null);
    }, 3200);
  }, [clickCount, enableSpeechBubble]);

  // Clean up timers
  useEffect(() => {
    return () => {
      if (reactionTimerRef.current) window.clearTimeout(reactionTimerRef.current);
      if (bubbleTimerRef.current) window.clearTimeout(bubbleTimerRef.current);
    };
  }, []);

  const isBottom = placement === 'bottom';
  const currentSheet = activeSheet === 'reactions' ? reactionsPath : directionsPath;

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className={`relative inline-flex items-center justify-center select-none cursor-pointer p-1 rounded-2xl hover:bg-white/10 transition-colors ${className}`}
      title="Bấm vào tớ để trò chuyện nhé! 🦊"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* CSS Animation for dizzy effect */}
      <style>{`
        @keyframes mascot-dizzy-wobble {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(-14deg) scale(1.08); }
          75% { transform: rotate(14deg) scale(1.08); }
        }
      `}</style>

      {/* Speech Bubble popup */}
      {bubbleText && (
        <div
          className={`absolute ${
            isBottom ? 'top-full mt-2.5' : 'bottom-full mb-2.5'
          } left-1/2 -translate-x-1/2 z-[60] bg-white text-gray-800 text-xs font-medium px-4 py-2.5 rounded-2xl shadow-2xl border border-gray-200/90 whitespace-normal sm:whitespace-nowrap max-w-[280px] sm:max-w-none text-center animate-in fade-in zoom-in-95 duration-200 pointer-events-none drop-shadow-2xl`}
        >
          <div className="flex items-center justify-center gap-1 font-bold text-orange-500 text-[11px] mb-0.5">
            <span>🦊 NEXOR Pet Fox</span>
          </div>
          <span className="leading-snug block text-gray-700 font-normal">{bubbleText}</span>
          {/* Arrow tail */}
          {isBottom ? (
            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-t border-l border-gray-200/90 rotate-45" />
          ) : (
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-gray-200/90 rotate-45" />
          )}
        </div>
      )}

      {/* Mascot Sprite Wrapper */}
      <div
        style={isDizzy ? { animation: 'mascot-dizzy-wobble 0.35s ease-in-out infinite' } : {}}
        className="transition-transform duration-200 hover:scale-110 active:scale-95 flex items-center justify-center hover:drop-shadow-[0_4px_10px_rgba(249,115,22,0.35)]"
      >
        {/*
          Cropped 3x3 Sprite Frame:
          Each sheet is 1080x1080 (3x3 grid of 360x360 frames).
          background-size: 300% 300%
          col 0: 0%, col 1: 50%, col 2: 100%
          row 0: 0%, row 1: 50%, row 2: 100%
        */}
        <div
          role="img"
          aria-label={label}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            backgroundImage: `url(${currentSheet})`,
            backgroundSize: '300% 300%',
            backgroundPosition: `${frame.col * 50}% ${frame.row * 50}%`,
            backgroundRepeat: 'no-repeat',
          }}
          className="select-none pointer-events-none"
        />
      </div>
    </div>
  );
};

export default PetMascot;
