import { useNavigate } from 'react-router-dom';
import Hero from '../components/Hero';
import TimeNoticeBanner from '../components/TimeNoticeBanner';
import PackageSection from '../components/PackageSection';
import HighlightedOffer from '../components/HighlightedOffer';
import HowItWorks from '../components/HowItWorks';
import ContactSection from '../components/ContactSection';
import TrustSection from '../components/TrustSection';
import { usePackages } from '../hooks/usePackages';
import type { Package } from '../lib/types';

export default function Home() {
  const navigate = useNavigate();
  const { groupedByCategory, packages, loading } = usePackages();

  const handleSelectPackage = (pkg: Package) => {
    navigate(`/checkout/${pkg.id}`);
  };

  const bingwaDataPackages = groupedByCategory['bingwa_data'] || [];
  const smsPackages = groupedByCategory['sms'] || [];
  const minutesPackages = groupedByCategory['minutes'] || [];
  const tunukiwaPackages = groupedByCategory['tunukiwa'] || [];
  const highlightedOffer = (groupedByCategory['highlighted'] || [])[0];

  // Check if 1GB 1HR package exists (by name + validity, works with both ID formats)
  const has1GB1HR = packages.some(
    (p) => p.name === '1GB' && p.validity === '1 Hour'
  );

  return (
    <div className="fade-in">
      <Hero />

      <div className="max-w-5xl mx-auto">
        {has1GB1HR && <TimeNoticeBanner />}

        {/* Highlighted Offer */}
        {highlightedOffer && (
          <div className="mt-4">
            <HighlightedOffer
              name={highlightedOffer.name}
              price={highlightedOffer.price}
              validity={highlightedOffer.validity}
              onClick={() => handleSelectPackage(highlightedOffer)}
            />
          </div>
        )}

        {/* Trust section */}
        <TrustSection />

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-gray-500">
              <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span className="text-sm font-medium">Loading packages...</span>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* Bingwa Data Deals */}
            {bingwaDataPackages.length > 0 && (
              <PackageSection
                title="Bingwa Data Deals"
                subtitle="Premium data bundles — Buy Once!"
                icon="🔥"
                packages={bingwaDataPackages}
                onSelectPackage={handleSelectPackage}
              />
            )}

            {/* SMS Deals */}
            {smsPackages.length > 0 && (
              <PackageSection
                title="SMS Deals"
                subtitle="Send more, pay less — Buy Many Times!"
                icon="💬"
                packages={smsPackages}
                onSelectPackage={handleSelectPackage}
              />
            )}

            {/* Minutes Deals */}
            {minutesPackages.length > 0 && (
              <PackageSection
                title="Minutes Deals"
                subtitle="Talk for longer — Buy Many Times!"
                icon="📞"
                packages={minutesPackages}
                onSelectPackage={handleSelectPackage}
              />
            )}

            {/* Tunukiwa Deals */}
            {tunukiwaPackages.length > 0 && (
              <PackageSection
                title="Tunukiwa Deals"
                subtitle="Special offers just for you — Buy Many Times!"
                icon="🔥"
                packages={tunukiwaPackages}
                onSelectPackage={handleSelectPackage}
              />
            )}
          </>
        )}

        {/* How It Works */}
        <HowItWorks />

        {/* Contact */}
        <ContactSection />

        {/* Footer */}
        <footer className="text-center py-6 text-xs text-gray-400">
          <p className="font-medium">DATA SOLUTION — CONNECT &amp; STAY AHEAD!</p>
          <p className="mt-1">Pay via M-PESA • Buy Goods &amp; Services • Till 3090748</p>
        </footer>
      </div>
    </div>
  );
}
