import { Outlet } from 'react-router-dom';
import Header from '../components/common/Header/Header';
import Footer from '../components/common/Footer/Footer';
import AiChatbot from '../components/common/Chat/AiChatbot';

export default function GuestLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f5f6fa] relative">
      <Header />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {/* Floating AI Chatbot Bubble */}
      <AiChatbot />
    </div>
  );
}
