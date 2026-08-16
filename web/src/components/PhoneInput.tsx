import { useMemo } from 'react';
import { validateSafaricomPhone } from '../lib/format';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  id?: string;
  label?: string;
}

/**
 * Reusable phone input component for Kenyan Safaricom numbers.
 * Shows 🇰🇪 +254 prefix indicator and validates the number in real time.
 */
export default function PhoneInput({
  value,
  onChange,
  error,
  placeholder = '07XXXXXXXX',
  id = 'phone',
  label = 'Enter Safaricom Phone Number',
}: PhoneInputProps) {
  const isValid = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    return validateSafaricomPhone(trimmed);
  }, [value]);

  const showError = error || (!isValid && value.trim().length >= 10);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-base font-semibold text-gray-800 mb-2">
          {label}
        </label>
      )}

      <div
        className={`flex items-stretch rounded-2xl border-2 overflow-hidden bg-white transition-colors ${
          showError
            ? 'border-red-400'
            : isValid
            ? 'border-brand-500'
            : 'border-gray-300 focus-within:border-brand-500'
        }`}
      >
        {/* Prefix indicator */}
        <div className="flex items-center gap-1 px-3 bg-gray-50 border-r-2 border-gray-200 flex-shrink-0">
          <span className="text-xl">🇰🇪</span>
          <span className="text-base font-semibold text-gray-700">+254</span>
        </div>

        {/* Input */}
        <input
          id={id}
          type="tel"
          inputMode="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={14}
          autoComplete="tel-national"
          aria-label="Safaricom phone number"
          aria-invalid={!!showError}
          className="flex-1 min-w-0 px-4 py-4 text-lg text-gray-900 placeholder-gray-400 border-0 outline-none bg-transparent"
          style={{ minHeight: '56px' }}
        />

        {/* Validation indicator */}
        {isValid && (
          <div className="flex items-center pr-4 flex-shrink-0">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00A14B"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-label="Valid phone number"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>

      {/* Error message */}
      {showError && (
        <p className="mt-2 text-sm font-medium text-red-600 flex items-center gap-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error || 'Please enter a valid Safaricom number (07XXXXXXXX or 2547XXXXXXXX)'}
        </p>
      )}
    </div>
  );
}
