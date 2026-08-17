import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPackageById, PACKAGES } from '../lib/packages';
import { createOrder, initiateStkPush } from '../lib/api';
import { formatPhone, validateSafaricomPhone } from '../lib/format';
import { supabase } from '../lib/supabase';
import type { Package } from '../lib/types';
import PhoneInput from '../components/PhoneInput';
import CheckoutSteps from '../components/CheckoutSteps';

/**
 * Checkout page — package summary, phone entry, and automatic M-PESA STK Push.
 * Creates an order and triggers STK Push via Tuma.co.ke.
 * Customer gets an M-PESA prompt on their phone — no manual steps.
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

  // Load package details — try static data first, then Supabase
  useEffect(() => {
    if (!packageId) {
      navigate('/deals');
      return;
    }

    let mounted = true;

    async function loadPackage() {
      // 1. Try static packages first (string IDs like "bingwa-250mb")
      const found = packageId ? (getPackageById(packageId) || PACKAGES.find((p) => p.id === packageId)) : null;
      if (found) {
        if (mounted) {
          setPkg(found);
          setLoading(false);
        }
        return;
      }

      // 2. Try Supabase (UUID IDs from database)
      try {
        const { data, error } = await supabase
          .from('packages')
          .select('*')
          .eq('id', packageId)
          .single();

        if (error) throw error;

        if (data && mounted) {
          setPkg(data as unknown as Package);
          setLoading(false);
        }
      } catch {
        // 3. Package not found anywhere
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadPackage();

    return () => {
      mounted = false;
    };
  }, [packageId, navigate]);

  const isPhoneValid = useMemo(() => {
    if (!phone.trim()) return false;
    return validateSafaricomPhone(phone);
  }, [phone]);

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    setPhoneError(null);
  };

  const handlePay = async () => {
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

      // Step 1: Create order
      const orderResult = await createOrder({
        packageId: pkg.id,
        phoneNumber: normalizedPhone,
      });

      if (!orderResult?.order_number) {
        throw new Error('Failed to create order. Please try again.');
      }

      // Step 2: Initiate STK Push
      try {
        await initiateStkPush({
          order_number: orderResult.order_number,
          customer_phone: normalizedPhone,
        });
      } catch (stkErr) {
        // STK Push failed — but order is created. Redirect to order status
        const msg = stkErr instanceof Error ? stkErr.message : 'Payment request failed.';
        navigate(`/order/${orderResult.order_number}?phone=${encodeURIComponent(normalizedPhone)}&error=${encodeURIComponent(msg)}`);
        return;
      }

      // Step 3: Redirect to order status page — polling will confirm payment
      navigate(`/order/${orderResult.order_number}?phone=${encodeURIComponent(normalizedPhone)}`);
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

      {/* Phone input */}
      <PhoneInput
        value={phone}
        onChange={handlePhoneChange}
        error={phoneError || undefined}
        id="checkout-phone"
      />

      {/* Pay button — right after phone number */}
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

      <button
        onClick={handlePay}
        disabled={submitting || !isPhoneValid}
        className="w-full text-white font-bold text-lg py-4 rounded-2xl transition-all active:scale-[0.98] no-select disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          minHeight: '56px',
          background: 'linear-gradient(135deg, #005C2B 0%, #00A14B 100%)',
          boxShadow: '0 2px 12px rgba(0, 161, 75, 0.3)',
        }}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Sending M-PESA Prompt...
          </span>
        ) : (
          <>Pay KSh {pkg.price} via M-PESA</>
        )}
      </button>

      <p className="text-center text-xs text-gray-400 -mt-2">
        By paying, you agree to receive an M-PESA prompt on your phone.
      </p>

      {/* M-PESA info card — below the pay button */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div
          className="px-5 py-4 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #005C2B 0%, #00A14B 100%)' }}
        >
          <span className="text-2xl">📲</span>
          <div>
            <h3 className="text-lg font-bold text-white">How It Works</h3>
            <p className="text-sm text-white/80">Simple 3-step M-PESA payment</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">1</span>
            <span className="text-base text-gray-700 leading-relaxed pt-0.5">Tap "Pay" above — we'll send an M-PESA prompt to your phone</span>
          </div>
          <div className="flex items-start gap-3 mt-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">2</span>
            <span className="text-base text-gray-700 leading-relaxed pt-0.5">Enter your M-PESA PIN on your phone to authorize</span>
          </div>
          <div className="flex items-start gap-3 mt-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">3</span>
            <span className="text-base text-gray-700 leading-relaxed pt-0.5">Payment confirmed automatically — your package is processed instantly</span>
          </div>
        </div>
        <div className="px-5 py-4 bg-amber-50 border-t border-amber-200">
          <div className="flex items-start gap-2">
            <span className="text-xl flex-shrink-0">🔒</span>
            <p className="text-sm text-yellow-900 font-medium leading-snug">
              Your payment is processed securely by M-PESA. We never see your PIN.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
