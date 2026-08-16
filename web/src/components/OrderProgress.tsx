import type { OrderStatus } from '../lib/types';

interface OrderProgressProps {
  status: OrderStatus;
}

const PROGRESS_STEPS = [
  { number: 1, label: 'Order Created' },
  { number: 2, label: 'Payment Verified' },
  { number: 3, label: 'Processing' },
  { number: 4, label: 'Completed' },
];

function getStatusStep(status: OrderStatus): number {
  switch (status) {
    case 'awaiting_payment':
    case 'payment_verification':
      return 1;
    case 'payment_confirmed':
      return 2;
    case 'processing':
      return 3;
    case 'completed':
      return 4;
    case 'failed':
    case 'cancelled':
      return -1; // Terminal error states
    default:
      return 1;
  }
}

/**
 * Progress indicator component for order status.
 * Shows a horizontal progress bar with 4 steps:
 * Order Created → Payment Verified → Processing → Completed
 * Handles failed/cancelled states appropriately.
 */
export default function OrderProgress({ status }: OrderProgressProps) {
  const currentStep = getStatusStep(status);
  const isError = currentStep === -1;

  if (isError) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center gap-2 py-4">
          {status === 'failed' ? (
            <div className="flex items-center gap-2 text-red-600 font-semibold">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              Order Failed
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500 font-semibold">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              Order Cancelled
            </div>
          )}
        </div>
        {/* Show partially completed steps with error overlay */}
        <div className="flex items-center justify-between mt-2">
          {PROGRESS_STEPS.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-9 h-9 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center text-sm font-bold">
                  {step.number}
                </div>
                <span className="text-xs text-gray-400 text-center max-w-[72px] leading-tight">
                  {step.label}
                </span>
              </div>
              {index < PROGRESS_STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 -mt-5 bg-gray-200 rounded-full" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {PROGRESS_STEPS.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;

          return (
            <div key={step.number} className="flex items-center flex-1 last:flex-none">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    isCompleted
                      ? 'bg-brand-600 text-white'
                      : isCurrent
                      ? 'bg-brand-500 text-white ring-4 ring-brand-100'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`text-xs font-medium text-center max-w-[72px] leading-tight ${
                    isCurrent
                      ? 'text-brand-700 font-bold'
                      : isCompleted
                      ? 'text-brand-600'
                      : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < PROGRESS_STEPS.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-1 -mt-6 rounded-full transition-colors ${
                    step.number < currentStep ? 'bg-brand-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current status label */}
      <div className="mt-4 text-center">
        <p className="text-sm font-semibold text-gray-600">
          {status === 'awaiting_payment' && 'Waiting for your M-PESA payment...'}
          {status === 'payment_verification' && 'Verifying your payment...'}
          {status === 'payment_confirmed' && 'Payment confirmed! Preparing your package...'}
          {status === 'processing' && 'Processing your order...'}
          {status === 'completed' && 'Your order is complete! 🎉'}
        </p>
      </div>
    </div>
  );
}
