import { useState } from 'react';
import { formatCurrency } from '../lib/format';

interface MpesaInstructionsProps {
  tillNumber?: string;
  tillName?: string;
  amount: number;
}

const DEFAULT_TILL_NUMBER = '3090748';
const DEFAULT_TILL_NAME = 'Victor (Safaricom)';

const STEPS = [
  'Open M-PESA on your phone',
  'Select "Lipa na M-PESA"',
  'Select "Buy Goods and Services"',
  'Enter Till Number',
  'Confirm Till Name',
  'Enter the exact amount shown',
  'Enter your M-PESA PIN',
  'Complete the payment',
  'Return to this website',
];

/**
 * Reusable component showing M-PESA payment instructions as a clear,
 * numbered list. Includes a copy Till Number button and a security note.
 */
export default function MpesaInstructions({
  tillNumber = DEFAULT_TILL_NUMBER,
  tillName = DEFAULT_TILL_NAME,
  amount,
}: MpesaInstructionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(tillNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = tillNumber;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // ignore
      }
      document.body.removeChild(textarea);
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header — Safaricom green gradient */}
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg, #005C2B 0%, #00A14B 100%)' }}
      >
        <span className="text-2xl">📲</span>
        <div>
          <h3 className="text-lg font-bold text-white">M-PESA Payment Instructions</h3>
          <p className="text-sm text-white/80">Follow these steps to complete your payment</p>
        </div>
      </div>

      {/* Till info */}
      <div className="px-5 py-4 bg-brand-50 border-b border-gray-100">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm text-gray-600">Pay to Till Number</p>
            <p className="text-2xl font-extrabold text-brand-700 tracking-wide">{tillNumber}</p>
            <p className="text-sm font-medium text-gray-700">{tillName}</p>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 bg-brand-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xl active:bg-brand-700 transition-colors no-select"
            style={{ minHeight: '44px' }}
            aria-label="Copy Till Number"
          >
            {copied ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy Till No.
              </>
            )}
          </button>
        </div>
        <div className="mt-3 inline-flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-brand-200">
          <span className="text-sm text-gray-600">Amount to pay:</span>
          <span className="text-xl font-extrabold text-brand-700">{formatCurrency(amount)}</span>
        </div>
      </div>

      {/* Steps */}
      <ol className="px-5 py-4 space-y-3">
        {STEPS.map((step, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">
              {index + 1}
            </span>
            <span className="text-base text-gray-700 leading-relaxed pt-0.5">{step}</span>
          </li>
        ))}
      </ol>

      {/* Security note */}
      <div className="px-5 py-4 bg-amber-notice border-t border-amber-noticeBorder">
        <div className="flex items-start gap-2">
          <span className="text-xl flex-shrink-0">🔒</span>
          <p className="text-sm text-yellow-900 font-medium leading-snug">
            Your payment is verified securely. Do not share your M-PESA PIN with anyone.
          </p>
        </div>
      </div>
    </div>
  );
}
