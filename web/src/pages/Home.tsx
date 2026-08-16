import { useNavigate } from 'react-router-dom';
import Hero from '../components/Hero';
import TimeNoticeBanner from '../components/TimeNoticeBanner';
import PackageSection from '../components/PackageSection';
import HighlightedOffer from '../components/HighlightedOffer';
import HowItWorks from '../components/HowItWorks';
import ContactSection from '../components/ContactSection';
import TrustSection from '../components/TrustSection';
import {
  getPackagesByCategory,
  getHighlightedOffer,
} from '../lib/packages';
import type { Package } from '../lib/types';

export default function Home() {
  const navigate = useNavigate();

  const handleSelectPackage = (pkg: Package) => {
    navigate(`/checkout/${pkg.id}`);
  };

  const bingwaDataPackages = getPackagesByCategory('bingwa_data');
  const smsPackages = getPackagesByCategory('sms');
  const minutesPackages = getPackagesByCategory('minutes');
  const tunukiwaPackages = getPackagesByCategory('tunukiwa');
  const highlightedOffer = getHighlightedOffer();

  return (
    <div className="fade-in">
      <Hero />

      <div className="max-w-5xl mx-auto">
        <TimeNoticeBanner />

        {/* Highlighted Offer */}
        {highlightedOffer && (
          <div className="mt-6">
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

        {/* Bingwa Data Deals */}
        <PackageSection
          title="Bingwa Data Deals"
          subtitle="Premium data bundles — Buy Once!"
          icon="🔥"
          packages={bingwaDataPackages}
          onSelectPackage={handleSelectPackage}
        />

        {/* SMS Deals */}
        <PackageSection
          title="SMS Deals"
          subtitle="Send more, pay less — Buy Many Times!"
          icon="💬"
          packages={smsPackages}
          onSelectPackage={handleSelectPackage}
        />

        {/* Minutes Deals */}
        <PackageSection
          title="Minutes Deals"
          subtitle="Talk for longer — Buy Many Times!"
          icon="📞"
          packages={minutesPackages}
          onSelectPackage={handleSelectPackage}
        />

        {/* Tunukiwa Deals */}
        <PackageSection
          title="Tunukiwa Deals"
          subtitle="Special offers just for you — Buy Many Times!"
          icon="🔥"
          packages={tunukiwaPackages}
          onSelectPackage={handleSelectPackage}
        />

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
