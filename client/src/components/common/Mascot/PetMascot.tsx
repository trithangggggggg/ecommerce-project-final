import React, { useState, useRef, useEffect } from 'react';
import { Mascot } from 'page-mascot';

export type MascotCharacter = 'fox' | 'cat' | 'otter' | 'owl';

interface PetMascotProps {
  type?: MascotCharacter;
  size?: number;
  label?: string;
  className?: string;
  enableSpeechBubble?: boolean;
  placement?: 'bottom' | 'top';
}

const CUTE_QUOTES = [
  'Chào bạn! Mình là Pet Fox của NEXOR đây! 🦊✨',
  'Hôm nay có nhiều deal công nghệ cực hời đó nha! 📱🎁',
  'Cần tư vấn gì cứ bấm vào AI Chatbot góc phải nhé! 🤖',
  'Chúc bạn một ngày mua sắm thật nhiều niềm vui! 💻❤️',
  'Hihi nhột quá, bạn thích bấm vào tớ à! 😆',
  'MacBook Air M3 và iPhone 16 Pro Max đang hot lắm đó! 🔥',
];

export const PetMascot: React.FC<PetMascotProps> = ({
  type = 'fox',
  size = 42,
  label = 'NEXOR Pet Fox',
  className = '',
  enableSpeechBubble = true,
  placement = 'bottom',
}) => {
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [clickCount, setClickCount] = useState(0);
  const bubbleTimeoutRef = useRef<number | null>(null);

  const directionsPath = `/mascots/${type}-directions.webp`;
  const reactionsPath = `/mascots/${type}-reactions.webp`;

  const handleMascotClick = () => {
    if (!enableSpeechBubble) return;

    if (bubbleTimeoutRef.current) {
      window.clearTimeout(bubbleTimeoutRef.current);
    }

    const nextCount = clickCount + 1;
    setClickCount(nextCount);

    let text = '';
    if (nextCount >= 5) {
      text = 'Oaaa tớ chóng mặt hoa mắt rồi nèee! 💫😵';
      setClickCount(0);
    } else {
      const randomIndex = Math.floor(Math.random() * CUTE_QUOTES.length);
      text = CUTE_QUOTES[randomIndex];
    }

    setBubbleText(text);

    bubbleTimeoutRef.current = window.setTimeout(() => {
      setBubbleText(null);
    }, 3200);
  };

  useEffect(() => {
    return () => {
      if (bubbleTimeoutRef.current) {
        window.clearTimeout(bubbleTimeoutRef.current);
      }
    };
  }, []);

  const isBottom = placement === 'bottom';

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      title="Bấm vào tôi để xem phản ứng! 🦊"
    >
      {/* Speech Bubble popup */}
      {bubbleText && (
        <div
          className={`absolute ${
            isBottom ? 'top-full mt-2.5 slide-in-from-top-1' : 'bottom-full mb-2.5 slide-in-from-bottom-1'
          } left-1/2 -translate-x-1/2 z-50 bg-white text-gray-800 text-xs font-semibold px-3.5 py-2 rounded-2xl shadow-2xl border border-gray-200/90 whitespace-normal sm:whitespace-nowrap max-w-[240px] sm:max-w-none text-center animate-in fade-in zoom-in-95 duration-200 pointer-events-none drop-shadow-md`}
        >
          <span>{bubbleText}</span>
          {/* Arrow tail */}
          {isBottom ? (
            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-t border-l border-gray-200/90 rotate-45" />
          ) : (
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-gray-200/90 rotate-45" />
          )}
        </div>
      )}

      {/* Mascot Wrapper */}
      <div
        onClick={handleMascotClick}
        className="cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95 flex items-center justify-center"
      >
        <Mascot
          directions={directionsPath}
          reactions={reactionsPath}
          size={size}
          label={label}
        />
      </div>
    </div>
  );
};

export default PetMascot;
