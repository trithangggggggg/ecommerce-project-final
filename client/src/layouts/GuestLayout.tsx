import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/common/Header/Header';
import Footer from '../components/common/Footer/Footer';
import AiChatbot from '../components/common/Chat/AiChatbot';
import LuckyWheelModal from '../components/common/LuckyWheelModal';
import { useSiteConfigStore } from '../store/useSiteConfigStore';
import { useBannerStore } from '../store/useBannerStore';

export default function GuestLayout() {
  const fetchSiteConfig = useSiteConfigStore((s) => s.fetchSiteConfig);
  const fetchBanners = useBannerStore((s) => s.fetchBanners);

  useEffect(() => {
    void fetchSiteConfig();
    void fetchBanners();
  }, [fetchSiteConfig, fetchBanners]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f6fa] relative">
      <Header />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {/* Floating AI Chatbot Bubble */}
      <AiChatbot />
      {/* Floating Lucky Wheel Button & Modal */}
      <LuckyWheelModal />
    </div>
  );
}
