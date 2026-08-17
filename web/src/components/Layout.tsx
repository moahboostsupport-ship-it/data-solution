import type { ReactNode } from 'react';
import DesktopNav from './DesktopNav';
import MobileHeader from './MobileHeader';
import WhatsAppButton from './WhatsAppButton';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #E8F7EE 0%, #F0F7F3 30%, #F0F7F3 100%)' }}>
      {/* Desktop navigation (md+ screens) */}
      <DesktopNav />

      {/* Mobile navigation (top header + hamburger menu) */}
      <MobileHeader />

      {/* Main content area — cards are directly tappable, no bottom button needed */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 md:px-6 pb-6 md:pb-8 pt-1 md:pt-2 safe-pb">
        {children}
      </main>

      {/* Floating WhatsApp support button (mobile + desktop) */}
      <WhatsAppButton />
    </div>
  );
}
