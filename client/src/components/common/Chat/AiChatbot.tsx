import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  Bot,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { aiService, type ChatMessage } from '../../../api/services/ai.service';
import { formatPrice } from '../../../utils/format';

const QUICK_PROMPTS = [
  '💻 Laptop sinh viên giá tốt',
  '🔥 iPhone 16 Pro Max',
  '🎧 Tai nghe chống ồn',
  '🚚 Chính sách bảo hành',
];

export default function AiChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Dạ xin chào bạn! 👋 Mình là **Trợ lý AI của E-ShopTECH**.\n\nMình có thể giúp bạn tìm kiếm thiết bị công nghệ phù hợp với ngân sách, so sánh cấu hình hoặc giải đáp chính sách bảo hành. Bạn đang quan tâm đến sản phẩm nào ạ?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Tự động cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setShowTooltip(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, messages, isLoading]);

  // Ẩn tooltip sau 10 giây nếu người dùng không bấm
  useEffect(() => {
    const timer = setTimeout(() => setShowTooltip(false), 10000);
    return () => clearTimeout(timer);
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const response = await aiService.chat(text, history);

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        recommendedProducts: response.recommendedProducts,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          role: 'assistant',
          content: 'Xin lỗi bạn, kết nối máy chủ AI tạm thời gián đoạn. Bạn thử lại giúp mình nhé! 🙏',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content:
          'Đoạn hội thoại đã được làm mới! ✨ Bạn cần mình hỗ trợ tìm kiếm hay tư vấn thông số sản phẩm nào không ạ?',
        timestamp: new Date(),
      },
    ]);
  };

  // Helper format Markdown đơn giản (bold, bullet points, line breaks)
  const renderFormattedText = (content: string, isUser: boolean = false) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // In đậm cú pháp **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong
              key={pIdx}
              className={`font-bold ${isUser ? 'text-white underline decoration-white/40' : 'text-gray-950'}`}
            >
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().startsWith('• ')) {
        return (
          <div
            key={idx}
            className={`flex items-start gap-1.5 my-1 ml-1 ${isUser ? 'text-white' : 'text-gray-800'}`}
          >
            <span className={`${isUser ? 'text-white font-bold' : 'text-blue-600 font-bold'} leading-5`}>
              •
            </span>
            <span className="flex-1">{formattedParts}</span>
          </div>
        );
      }

      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p
          key={idx}
          className={`my-0.5 leading-relaxed ${isUser ? 'text-white font-medium' : 'text-gray-800'}`}
        >
          {formattedParts}
        </p>
      );
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none">
      {/* 1. Tooltip chào mời (hiển thị khi chưa mở chat) */}
      {!isOpen && showTooltip && (
        <div className="absolute bottom-16 right-0 mb-2 w-64 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-gray-100 flex items-start gap-2.5 animate-bounce-subtle">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles size={16} />
          </div>
          <div className="flex-1 text-xs">
            <div className="font-bold text-gray-900">E-ShopTECH AI</div>
            <p className="text-gray-600 mt-0.5 leading-tight">
              Cần tư vấn chọn mua đồ công nghệ? Bấm chat ngay nhé! 👋
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowTooltip(false);
            }}
            className="text-gray-400 hover:text-gray-600 p-0.5"
            aria-label="Đóng gợi ý"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* 2. Nút tròn bong bóng Chat nổi */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative group p-4 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center cursor-pointer border border-white/20"
          title="Mở E-ShopTECH AI Chatbot"
          aria-label="Mở E-ShopTECH AI Chatbot"
        >
          {/* Vòng sáng radar ping */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-white"></span>
          </span>

          <Bot size={28} className="group-hover:rotate-12 transition-transform duration-300" />
        </button>
      )}

      {/* 3. Cửa sổ hộp thoại Chat (Chat Window) */}
      {isOpen && (
        <div className="w-[375px] sm:w-[420px] h-[580px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-gray-200/80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-[#161820] via-[#1f232e] to-[#161820] text-white p-4 flex items-center justify-between border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md">
                  <Bot size={22} className="text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#161820] rounded-full"></span>
              </div>
              <div>
                <div className="font-extrabold text-sm flex items-center gap-1.5">
                  <span>E-ShopTECH AI</span>
                  <span className="text-[10px] bg-blue-500/30 text-blue-300 px-1.5 py-0.2 rounded-md font-semibold">
                    Trợ lý 24/7
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-emerald-400" />
                  <span>Sẵn sàng tư vấn sản phẩm</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="Làm mới cuộc trò chuyện"
                aria-label="Làm mới cuộc trò chuyện"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="Đóng hộp thoại"
                aria-label="Đóng hộp thoại"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body: Danh sách tin nhắn */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#f8fafc] text-xs">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-end gap-2 max-w-[92%]">
                    {!isUser && (
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mb-1">
                        <Bot size={15} />
                      </div>
                    )}
                    <div
                      className={`p-3.5 rounded-2xl shadow-xs ${
                        isUser
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs shadow-md shadow-blue-500/20'
                          : 'bg-white border border-gray-200/80 text-gray-800 rounded-bl-xs'
                      }`}
                    >
                      {renderFormattedText(msg.content, isUser)}
                    </div>
                  </div>

                  {/* Hiển thị thẻ sản phẩm đề xuất (nếu có) */}
                  {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                    <div className="mt-2.5 ml-9 space-y-2 w-[calc(100%-2.25rem)]">
                      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles size={12} className="text-blue-600" />
                        <span>Sản phẩm gợi ý cho bạn:</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {msg.recommendedProducts.map((p) => (
                          <Link
                            key={p.id}
                            to={`/products/${p.id}`}
                            onClick={() => setIsOpen(false)}
                            className="bg-white rounded-xl border border-gray-200/90 p-2.5 flex items-center gap-3 hover:border-blue-500 hover:shadow-md transition-all group"
                          >
                            <div className="w-14 h-14 bg-gray-50 rounded-lg p-1 shrink-0 flex items-center justify-center overflow-hidden">
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200';
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                {p.name}
                              </div>
                              <div className="text-[11px] font-extrabold text-blue-600 mt-0.5">
                                {formatPrice(p.price)}
                              </div>
                              <span className="text-[10px] text-gray-400 inline-block truncate">
                                {p.category?.name || 'Chính hãng E-ShopTECH'}
                              </span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-gray-50 group-hover:bg-blue-600 group-hover:text-white text-gray-400 transition-colors shrink-0">
                              <ArrowRight size={14} />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex items-end gap-2">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mb-1">
                  <Bot size={15} />
                </div>
                <div className="bg-white border border-gray-200/80 px-4 py-3 rounded-2xl rounded-bl-xs shadow-xs flex items-center gap-1.5">
                  <span className="text-[11px] text-gray-400 font-medium">AI đang soạn câu trả lời</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-2 bg-slate-50/90 border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="text-[11px] whitespace-nowrap bg-white hover:bg-blue-600 hover:text-white text-gray-700 border border-gray-200 hover:border-blue-600 px-3 py-1.5 rounded-full font-medium transition-all shadow-xs shrink-0 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Footer Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-gray-100 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi tìm kiếm sản phẩm..."
              disabled={isLoading}
              className="flex-1 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white text-xs rounded-xl px-3.5 py-2.5 text-gray-900 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-xl shadow-xs transition-colors flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="Gửi tin nhắn"
            >
              <Send size={15} />
            </button>
          </form>

        </div>
      )}
    </div>
  );
}
