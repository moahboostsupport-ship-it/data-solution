export default function ContactSection() {
  const phoneNumber = '0798507804';
  const phoneTel = '+254798507804';

  return (
    <section id="contact" className="mb-6 md:mb-10 scroll-mt-20">
      <div
        className="rounded-2xl md:rounded-3xl p-4 md:p-8 text-center"
        style={{ background: 'linear-gradient(180deg, #E8F7EE 0%, #ffffff 100%)', border: '1px solid #C7ECD4' }}
      >
        {/* Heading */}
        <h2 className="text-lg md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">
          Need Help?
        </h2>
        <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-6">
          We're here to assist you. Reach out anytime.
        </p>

        {/* Phone number */}
        <div className="mb-4 md:mb-6">
          <a
            href={`tel:${phoneTel}`}
            className="text-2xl md:text-4xl font-extrabold text-brand-600 no-underline hover:text-brand-700 transition-colors"
          >
            {phoneNumber}
          </a>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3 justify-center max-w-sm mx-auto">
          <a
            href={`tel:${phoneTel}`}
            className="flex items-center justify-center gap-2 text-white font-bold text-base md:text-lg py-2.5 md:py-3 px-4 md:px-6 rounded-xl md:rounded-2xl no-underline no-select transition-all active:scale-[0.98]"
            style={{ minHeight: '48px', background: 'linear-gradient(135deg, #005C2B 0%, #00A14B 100%)', boxShadow: '0 2px 8px rgba(0, 92, 43, 0.2)' }}
          >
            <PhoneIcon /> Call Us
          </a>
          <a
            href={`sms:${phoneTel}`}
            className="flex items-center justify-center gap-2 border-2 border-brand-600 text-brand-700 font-bold text-base md:text-lg py-2.5 md:py-3 px-4 md:px-6 rounded-xl md:rounded-2xl no-underline no-select hover:bg-brand-50 transition-colors active:scale-[0.98]"
            style={{ minHeight: '48px' }}
          >
            <MessageIcon /> Send SMS
          </a>
        </div>
      </div>
    </section>
  );
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
