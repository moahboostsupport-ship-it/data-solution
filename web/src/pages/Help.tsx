import HowItWorks from '../components/HowItWorks';
import ContactSection from '../components/ContactSection';

const FAQS = [
  {
    question: 'How do I buy a data package?',
    answer: 'Go to the Deals page, select your preferred package, enter your Safaricom phone number, and follow the M-PESA payment instructions. Once payment is verified, your package will be processed automatically.',
  },
  {
    question: 'What M-PESA method should I use?',
    answer: 'Use "Lipa na M-PESA" → "Buy Goods and Services" with Till Number 3090748 (Victor - Safaricom). Do NOT use "Send Money" as it will not be verified correctly.',
  },
  {
    question: 'How long does it take to receive my package?',
    answer: 'After completing your M-PESA payment, click "I have completed payment" on the checkout page. We verify your payment and process your order — typically within a few minutes. You can check your order status anytime using your order number.',
  },
  {
    question: 'How do I check my order status?',
    answer: 'Go to the Orders page and enter your order number or phone number. You\'ll see the current status of your order and its progress.',
  },
  {
    question: 'What if my payment fails or is not verified?',
    answer: 'If your payment cannot be verified, you\'ll see a "Failed" status on your order. Please wait a moment and check again. If the issue persists, contact us at 0798507804 for assistance.',
  },
  {
    question: 'Can I use any phone number?',
    answer: 'Currently, we only support Safaricom phone numbers (starting with 07 or 2547). Ensure the number you enter is a valid Safaricom line.',
  },
  {
    question: 'Is it safe to pay through this website?',
    answer: 'Yes. You make the payment directly through M-PESA on your phone — we never handle your M-PESA PIN. We only verify the payment and deliver your package. Never share your M-PESA PIN with anyone.',
  },
  {
    question: 'What packages are available?',
    answer: 'We offer Data (Bingwa Data), SMS, Minutes, Highlighted Offers, and Tunukiwa Deals. Check the Deals page for the latest packages and prices.',
  },
];

/**
 * FAQ-style help page with contact options and how it works summary.
 */
export default function Help() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="text-center pt-4">
        <span className="text-4xl">🤝</span>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">Help & Support</h1>
        <p className="text-sm text-gray-500 mt-1">Find answers to common questions</p>
      </div>

      {/* How It Works */}
      <HowItWorks />

      {/* FAQ section */}
      <section>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQS.map((faq, index) => (
            <details
              key={index}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden group"
            >
              <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer text-base font-semibold text-gray-800 list-none">
                <span>{faq.question}</span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </summary>
              <div className="px-5 pb-4 text-sm md:text-base text-gray-600 leading-relaxed">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Contact section */}
      <ContactSection />
    </div>
  );
}
