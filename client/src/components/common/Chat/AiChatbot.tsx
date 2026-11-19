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
  AlertCircle,
  Eye,
  QrCode,
} from 'lucide-react';
import { aiService, type ChatMessage } from '../../../api/services/ai.service';
import { formatPrice } from '../../../utils/format';
import OrderDetailModal from '../../../pages/order/OrderDetailModal';

const QUICK_PROMPTS = [
  '📦 Đặt hàng hộ tôi',
  '💻 Laptop sinh viên giá tốt',
  '🔥 iPhone 16 Pro Max',
  '🎧 Tai nghe chống ồn',
  '🚚 Chính sách bảo hành',
];

const INITIAL_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Dạ em chào bạn! 👋 Mình là **Trợ lý AI của NEXOR**.\n\nBạn đang cần tìm thiết bị nào hoặc cần đặt hàng hộ cứ nhắn mình hỗ trợ ngay nhé!',
  timestamp: new Date(),
};

export function AiChatbot() {
  const [isOpen, setIsOpen] = useState(false);

  // 1. Lưu lịch sử hội thoại trong phiên (State + Session Storage)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem('nexor_ai_chat_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: any) => ({
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          }));
        }
      }
    } catch {}
    return [INITIAL_MESSAGE];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Đồng bộ lịch sử chat vào Session Storage
  useEffect(() => {
    try {
      sessionStorage.setItem('nexor_ai_chat_session', JSON.stringify(messages));
    } catch {}
  }, [messages]);

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

      let orderToAttach = response.createdOrder;
      // Fallback: nếu câu hỏi là tra cứu/xem đơn nhưng backend chưa trả order,
      // tìm đơn gần nhất trong phiên chat để hiển thị thẻ chi tiết
      if (
        !orderToAttach &&
        /xem\s+đơn|kiem\s+tra\s+don|tra\s+cuu\s+don|don\s+hang|don\s+cua\s+toi/i.test(text)
      ) {
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].createdOrder) {
            orderToAttach = messages[i].createdOrder;
            break;
          }
        }
      }

      if (orderToAttach) {
        try {
          localStorage.setItem('nexor_ai_last_order', JSON.stringify(orderToAttach));
        } catch {}
      }

      const products = orderToAttach
        ? []
        : response.suggestedProducts || response.recommendedProducts;

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        suggestedProducts: products,
        recommendedProducts: products,
        createdOrder: orderToAttach,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      // Xử lý lỗi kết nối thân thiện kèm nút gửi lại (Retry)
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          role: 'assistant',
          content: 'Xin lỗi bạn, kết nối máy chủ AI tạm thời gián đoạn. Bạn vui lòng thử lại nhé! 🙏',
          isError: true,
          failedText: text,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    const resetMsg: ChatMessage = {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      content:
        'Đoạn hội thoại đã được làm mới! ✨ Bạn cần mình hỗ trợ tìm kiếm hay tư vấn thông số sản phẩm nào không ạ?',
      timestamp: new Date(),
    };
    setMessages([resetMsg]);
    try {
      sessionStorage.removeItem('nexor_ai_chat_session');
    } catch {}
  };

  // Helper format Markdown sạch sẽ (Bold, Headings, Bullets, Inline Code)
  const renderFormattedText = (content: string, isUser: boolean = false) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Tiêu đề Markdown ###
      if (line.trim().startsWith('### ') || line.trim().startsWith('#### ')) {
        const titleText = line.replace(/^#{3,4}\s+/, '');
        return (
          <h4 key={idx} className="font-extrabold text-gray-900 mt-2 mb-1 text-xs tracking-tight">
            {titleText}
          </h4>
        );
      }

      // Xử lý các token inline (In đậm **text**, Code `text`, Links [text](url))
      const parts = line.split(/(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g);
      const parseToken = (part: string, pIdx: number) => {
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
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={pIdx}
              className="bg-gray-100 text-blue-700 font-mono text-[11px] px-1 py-0.5 rounded border border-gray-200"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
        if (linkMatch) {
          const [, label, url] = linkMatch;
          if (url.startsWith('/')) {
            return (
              <Link
                key={pIdx}
                to={url}
                onClick={() => setIsOpen(false)}
                className="font-bold text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-0.5"
              >
                {label}
              </Link>
            );
          }
          return (
            <a
              key={pIdx}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-blue-600 hover:text-blue-800 underline"
            >
              {label}
            </a>
          );
        }
        return part;
      };

      const formattedParts = parts.map((part, pIdx) => parseToken(part, pIdx));

      // Danh sách gạch đầu dòng (- / * / • / 🔹)
      const trimmed = line.trim();
      if (
        trimmed.startsWith('- ') ||
        trimmed.startsWith('* ') ||
        trimmed.startsWith('• ') ||
        trimmed.startsWith('🔹 ')
      ) {
        const bulletIcon = trimmed.startsWith('🔹 ') ? '🔹' : '•';
        const cleanLine = trimmed.replace(/^[-*•🔹]\s+/, '');
        const cleanParts = cleanLine.split(/(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g).map((part, pIdx) => parseToken(part, pIdx));

        return (
          <div
            key={idx}
            className={`flex items-start gap-1.5 my-1 ml-0.5 ${isUser ? 'text-white' : 'text-gray-800'}`}
          >
            <span className={`${isUser ? 'text-white font-bold' : 'text-blue-600 font-bold'} leading-5 shrink-0`}>
              {bulletIcon}
            </span>
            <span className="flex-1">{cleanParts}</span>
          </div>
        );
      }

      // Dòng trống cách đoạn
      if (!trimmed) {
        return <div key={idx} className="h-1.5" />;
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
    <div className="fixed bottom-4 right-3 sm:bottom-6 sm:right-6 z-50 select-none max-w-[calc(100vw-24px)]">
      {/* 1. Tooltip chào mời (hiển thị khi chưa mở chat) */}
      {!isOpen && showTooltip && (
        <div className="absolute bottom-16 right-0 mb-2 w-64 max-w-[calc(100vw-32px)] bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-gray-100 flex items-start gap-2.5 animate-bounce-subtle">
          <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center shrink-0 shadow-sm p-1">
            <img src="/images/nexor_logo.png" alt="NEXOR AI" className="w-6 h-6 object-contain" />
          </div>
          <div className="flex-1 text-xs">
            <div className="font-bold text-gray-900">NEXOR AI</div>
            <p className="text-gray-600 mt-0.5 leading-tight">
              Cần tư vấn chọn mua đồ công nghệ? Bấm chat ngay nhé! 👋
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowTooltip(false);
            }}
            className="text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
            aria-label="Đóng gợi ý"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* 2. AiAssistantWidget: Nút bong bóng chat tròn nổi góc phải dưới */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative group p-3.5 sm:p-4 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center cursor-pointer border border-white/20"
          title="Mở NEXOR AI Chatbot"
          aria-label="Mở NEXOR AI Chatbot"
        >
          {/* Radar ping animation */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-white"></span>
          </span>

          <Bot size={26} className="sm:w-7 sm:h-7 group-hover:rotate-12 transition-transform duration-300" />
        </button>
      )}

      {/* 3. Cửa sổ hộp thoại Chat (Chat Window) */}
      {isOpen && (
        <div className="w-[calc(100vw-24px)] sm:w-[420px] max-w-[420px] h-[520px] sm:h-[580px] max-h-[85vh] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200/80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-[#161820] via-[#1f232e] to-[#161820] text-white p-4 flex items-center justify-between border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1e2230] to-[#2d3345] flex items-center justify-center shadow-md p-1.5 border border-white/10">
                  <img src="/images/nexor_logo.png" alt="NEXOR AI" className="w-7 h-7 object-contain" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#161820] rounded-full"></span>
              </div>
              <div>
                <div className="font-extrabold text-sm flex items-center gap-1.5">
                  <span>NEXOR AI</span>
                  <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.2 rounded-md font-semibold">
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
              const displayProducts = msg.suggestedProducts || msg.recommendedProducts;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-end gap-2 max-w-[92%]">
                    {!isUser && (
                      <div className="w-7 h-7 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 shadow-xs mb-1 p-0.5">
                        <img src="/images/nexor_logo.png" alt="NEXOR AI" className="w-5 h-5 object-contain" />
                      </div>
                    )}
                    <div
                      className={`p-3.5 rounded-2xl shadow-xs ${
                        isUser
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs shadow-md shadow-blue-500/20'
                          : msg.isError
                          ? 'bg-rose-50 border border-rose-200 text-rose-900 rounded-bl-xs'
                          : 'bg-white border border-gray-200/80 text-gray-800 rounded-bl-xs'
                      }`}
                    >
                      {msg.isError && (
                        <div className="flex items-center gap-1.5 font-bold text-rose-700 mb-1">
                          <AlertCircle size={14} />
                          <span>Lỗi kết nối</span>
                        </div>
                      )}

                      {renderFormattedText(msg.content, isUser)}

                      {/* Nút gửi lại (Retry) khi có lỗi */}
                      {msg.isError && msg.failedText && (
                        <button
                          type="button"
                          onClick={() => handleSendMessage(msg.failedText)}
                          disabled={isLoading}
                          className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                        >
                          <RotateCcw size={12} />
                          <span>Thử lại câu này</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Hiển thị thẻ xác nhận Đơn hàng tự động nếu vừa tạo đơn qua AI */}
                  {msg.createdOrder && (
                    <div className={`mt-2.5 ml-9 p-3 rounded-xl w-[calc(100%-2.25rem)] text-xs shadow-xs ${
                      msg.createdOrder.paymentMethod === 'SEPAY'
                        ? 'bg-blue-50/90 border border-blue-200 text-blue-950'
                        : 'bg-emerald-50/90 border border-emerald-200 text-emerald-950'
                    }`}>
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span className={`flex items-center gap-1.5 ${
                          msg.createdOrder.paymentMethod === 'SEPAY' ? 'text-blue-800' : 'text-emerald-800'
                        }`}>
                          <CheckCircle2 size={14} className={
                            msg.createdOrder.paymentMethod === 'SEPAY' ? 'text-blue-600' : 'text-emerald-600'
                          } />
                          Đơn hàng #{msg.createdOrder.id}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          msg.createdOrder.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : msg.createdOrder.status === 'SHIPPING'
                            ? 'bg-blue-100 text-blue-800'
                            : msg.createdOrder.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : msg.createdOrder.paymentMethod === 'SEPAY'
                            ? 'bg-amber-100 text-amber-800 font-bold'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {msg.createdOrder.status === 'COMPLETED'
                            ? 'Hoàn thành'
                            : msg.createdOrder.status === 'SHIPPING'
                            ? 'Đang giao'
                            : msg.createdOrder.status === 'CANCELLED'
                            ? 'Đã hủy'
                            : msg.createdOrder.paymentMethod === 'SEPAY'
                            ? 'Chờ thanh toán (VietQR)'
                            : 'Chờ xác nhận (COD)'}
                        </span>
                      </div>
                      <div className={`text-[11px] text-gray-700 space-y-0.5 mt-1.5 border-t pt-1.5 ${
                        msg.createdOrder.paymentMethod === 'SEPAY' ? 'border-blue-100' : 'border-emerald-100'
                      }`}>
                        <div>
                          <strong className="text-gray-900">Người nhận:</strong> {msg.createdOrder.receiverName} ({msg.createdOrder.phoneNumber})
                        </div>
                        <div className="truncate">
                          <strong className="text-gray-900">Địa chỉ:</strong> {msg.createdOrder.shippingAddress}
                        </div>
                        {msg.createdOrder.note && (
                          <div className="truncate">
                            <strong className="text-gray-900">Ghi chú:</strong> {msg.createdOrder.note}
                          </div>
                        )}
                        <div>
                          <strong className="text-gray-900">Hình thức:</strong>{' '}
                          <span className="font-semibold text-gray-900">
                            {msg.createdOrder.paymentMethod === 'SEPAY' ? 'Chuyển khoản VietQR Online (SePay)' : 'Thanh toán khi nhận hàng (COD)'}
                          </span>
                        </div>
                        <div>
                          <strong className="text-gray-900">Tổng thanh toán:</strong>{' '}
                          <span className="font-bold text-blue-600">
                            {formatPrice(msg.createdOrder.totalAmount)}
                          </span>{' '}
                          (Freeship)
                        </div>
                      </div>
                      <div className={`mt-2.5 pt-2 border-t flex flex-wrap items-center justify-between gap-2 ${
                        msg.createdOrder.paymentMethod === 'SEPAY' ? 'border-blue-200/60' : 'border-emerald-200/60'
                      }`}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setViewingOrder(msg.createdOrder)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow-xs cursor-pointer active:scale-95"
                          >
                            <Eye size={12} />
                            <span>Chi tiết</span>
                          </button>
                          {msg.createdOrder.paymentMethod === 'SEPAY' && (
                            <Link
                              to={`/payment/qr/${msg.createdOrder.id}`}
                              onClick={() => setIsOpen(false)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition shadow-xs cursor-pointer active:scale-95"
                            >
                              <QrCode size={12} />
                              <span>Quét mã VietQR</span>
                            </Link>
                          )}
                        </div>
                        <Link
                          to="/my-orders"
                          state={{ newOrderId: msg.createdOrder?.id }}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-700 hover:text-gray-900 hover:underline"
                        >
                          <span>Lịch sử đơn hàng</span>
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Hiển thị thẻ sản phẩm đề xuất (click mở /products/{id}) */}
                  {displayProducts && displayProducts.length > 0 && (
                    <div className="mt-2.5 ml-9 space-y-2 w-[calc(100%-2.25rem)]">
                      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles size={12} className="text-blue-600" />
                        <span>Sản phẩm gợi ý cho bạn:</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {displayProducts.map((p) => (
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
                                {p.category?.name || 'Chính hãng NEXOR'}
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

          {/* Quick Prompts (Câu hỏi mẫu) */}
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
              maxLength={500}
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

      {/* Modal hiển thị chi tiết đơn hàng trực tiếp ngay trong Chatbot */}
      {viewingOrder && (
        <OrderDetailModal
          isOpen={!!viewingOrder}
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
        />
      )}
    </div>
  );
}

// Export cả AiAssistantWidget và AiChatbot để tương thích với mọi quy ước đặt tên
export const AiAssistantWidget = AiChatbot;
export default AiChatbot;
