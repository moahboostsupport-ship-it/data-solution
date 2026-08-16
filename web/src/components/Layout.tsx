import type { ReactNode } from 'react';
import DesktopNav from './DesktopNav';
import BottomNav from './BottomNav';
import StickyCTA from './StickyCTA';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #E8F7EE 0%, #F0F7F3 30%, #F0F7F3 100%)' }}>
      {/* Desktop navigation (md+ screens) */}
      <DesktopNav />

      {/* Main content area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-6 pb-28 md:pb-8 pt-2 safe-pt safe-pb">
        {children}
      </main>

      {/* Sticky CTA bar (mobile only) */}
      <StickyCTA />

      {/* Bottom navigation (mobile only) */}
      <BottomNav />
    </div>
  );
}
