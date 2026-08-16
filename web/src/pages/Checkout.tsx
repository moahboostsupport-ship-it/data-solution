import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPackageById, PACKAGES } from '../lib/packages';
import { createOrder, notifyPayment } from '../lib/api';
import { formatPhone, validateSafaricomPhone } from '../lib/format';
import type { Package } from '../lib/types';
import PhoneInput from '../components/PhoneInput';
import CheckoutSteps from '../components/CheckoutSteps';
import MpesaInstructions from '../components/MpesaInstructions';

/**
 * Checkout page — package selection confirmation, phone entry,
 * and M-PESA payment instructions. Creates an order and notifies
 * the backend that the customer is waiting for payment verification.
 */
export default function Checkout() {
  const { packageId } = useParams<{ packageId: string }>();
  const navigate = useNavigate();

  const [pkg, setPkg] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load package details
  useEffect(() => {
    if (!packageId) {
      navigate('/deals');
      return;
    }

    const found = getPackageById(packageId) || PACKAGES.find((p) => p.id === packageId);
    if (found) {
      setPkg(found);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [packageId, navigate]);

  const isPhoneValid = useMemo(() => {
    if (!phone.trim()) return false;
    return validateSafaricomPhone(phone);
  }, [phone]);

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    setPhoneError(null);
  };

  const handleSubmit = async () => {
    if (!pkg) return;

    if (!phone.trim()) {
      setPhoneError('Please enter your Safaricom phone number.');
      return;
    }
    if (!isPhoneValid) {
      setPhoneError('Please enter a valid Safaricom number (07XXXXXXXX or 2547XXXXXXXX).');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const normalizedPhone = formatPhone(phone);

      // Create order
      const result = await createOrder({
        packageId: pkg.id,
        phoneNumber: normalizedPhone,
      });

      if (!result?.order_number) {
        throw new Error('Failed to create order. Please try again.');
      }

      // Notify backend that customer is waiting for verification
      try {
        await notifyPayment({
          order_number: result.order_number,
          amount: pkg.price,
          phone_number: normalizedPhone,
        });
      } catch {
        // Non-fatal — order is created, backend will still verify
      }

      // Redirect to order status page with phone
      navigate(`/order/${result.order_number}?phone=${encodeURIComponent(normalizedPhone)}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again or contact 0798507804.'
      );
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span className="text-sm font-medium">Loading package details...</span>
        </div>
      </div>
    );
  }

  // Package not found
  if (!pkg) {
    return (
      <div className="text-center py-16">
        <span className="text-4xl">😕</span>
        <h1 className="text-xl font-bold text-gray-900 mt-3">Package Not Found</h1>
        <p className="text-sm text-gray-500 mt-2 mb-6">
          The package you're looking for doesn't exist or is no longer available.
        </p>
        <button
          onClick={() => navigate('/deals')}
          className="text-white font-bold text-lg px-8 py-3.5 rounded-2xl no-select transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #005C2B 0%, #00A14B 100%)', minHeight: '52px' }}
        >
          Browse Deals
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto fade-in">
      <div className="pt-2">
        <CheckoutSteps currentStep={2} />
      </div>

      {/* Order summary */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 border-t-[3px] border-brand-500">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>🛒</span> Your Order
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Package</span>
            <span className="text-base font-semibold text-gray-800">{pkg.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Description</span>
            <span className="text-sm text-gray-700">{pkg.description || pkg.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Validity</span>
            <span className="text-sm text-gray-700">{pkg.validity}</span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-base font-semibold text-gray-700">Amount</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-brand-700">KSh</span>
              <span className="text-3xl font-extrabold text-brand-600">{pkg.price}</span>
            </div>
          </div>
        </div>
      </div>

      <PhoneInput
        value={phone}
        onChange={handlePhoneChange}
        error={phoneError || undefined}
        id="checkout-phone"
      />

      <MpesaInstructions amount={pkg.price} />

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
          <p className="text-sm font-medium text-red-700 flex items-start gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {submitError}
          </p>
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={handleSubmit}
          disabled={submitting || !isPhoneValid}
          className="w-full text-white font-bold text-lg py-4 rounded-2xl transition-all active:scale-[0.98] no-select disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            minHeight: '56px',
            background: 'linear-gradient(135deg, #005C2B 0%, #00A14B 100%)',
            boxShadow: '0 2px 12px rgba(0, 161, 75, 0.3)'
          }}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Creating your order...
            </span>
          ) : (
            '✅ I have completed payment'
          )}
        </button>

        <button
          onClick={() => navigate('/deals')}
          disabled={submitting}
          className="w-full bg-gray-100 text-gray-700 font-semibold text-base py-3.5 rounded-2xl active:bg-gray-200 transition-colors no-select disabled:opacity-50"
          style={{ minHeight: '52px' }}
        >
          Cancel
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center">
        After completing your M-PESA payment, tap the button above. We'll verify your payment and process your order.
      </p>
    </div>
  );
}
