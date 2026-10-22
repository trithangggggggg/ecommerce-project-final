import React, { useState, useRef, useEffect } from 'react';
import { Mascot } from 'page-mascot';

export type MascotCharacter = 'fox' | 'cat' | 'otter' | 'owl';

interface PetMascotProps {
  type?: MascotCharacter;
  size?: number;
  label?: string;
  className?: string;
  enableSpeechBubble?: boolean;
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

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      title="Bấm vào tôi để xem phản ứng! 🦊"
    >
      {/* Speech Bubble popup */}
      {bubbleText && (
        <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap bg-white text-gray-800 text-[11px] font-semibold px-3 py-1.5 rounded-xl shadow-xl border border-gray-100 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
          <span>{bubbleText}</span>
          {/* Arrow pointing down */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-solid border-t-white border-t-6 border-x-transparent border-x-6 border-b-0 filter drop-shadow-sm" />
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
