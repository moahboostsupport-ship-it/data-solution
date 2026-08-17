interface CheckoutStepsProps {
  currentStep: number;
}

const STEPS = [
  { number: 1, label: 'Select Package' },
  { number: 2, label: 'Enter Phone' },
  { number: 3, label: 'M-PESA Prompt' },
  { number: 4, label: 'Confirmation' },
];

/**
 * Step indicator for the checkout flow.
 * Shows the 4 steps with the current step highlighted and completed steps checked.
 */
export default function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;

          return (
            <div key={step.number} className="flex items-center flex-1 last:flex-none">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    isCompleted
                      ? 'bg-brand-600 text-white'
                      : isCurrent
                      ? 'bg-brand-500 text-white ring-4 ring-brand-100'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`text-xs font-medium text-center max-w-[64px] leading-tight ${
                    isCurrent ? 'text-brand-700 font-bold' : isCompleted ? 'text-brand-600' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 -mt-5 rounded-full transition-colors ${
                    step.number < currentStep ? 'bg-brand-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
