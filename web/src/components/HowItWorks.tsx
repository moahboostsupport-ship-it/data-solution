const steps = [
  {
    number: 1,
    title: 'Choose a Package',
    description: 'Select the data, SMS or minutes package you want.',
    icon: '📦',
  },
  {
    number: 2,
    title: 'Pay via M-PESA',
    description: 'Use Buy Goods and Services → Till 3090748',
    icon: '📲',
  },
  {
    number: 3,
    title: 'Get Your Package',
    description: 'Once payment is securely verified, your package is processed.',
    icon: '✅',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="mb-10 scroll-mt-20">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          How It Works
        </h2>
        <p className="text-sm text-gray-500">
          Get connected in 3 easy steps
        </p>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {steps.map((step, index) => (
          <div
            key={step.number}
            className="bg-white rounded-2xl p-6 text-center card-shadow flex flex-col items-center relative"
          >
            {/* Connecting line (desktop) */}
            {index < steps.length - 1 && (
              <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-brand-200" />
            )}

            {/* Numbered circle with Safaricom green gradient */}
            <div className="relative mb-4">
              <div
                className="w-14 h-14 rounded-full text-white flex items-center justify-center text-2xl font-bold"
                style={{ background: 'linear-gradient(135deg, #005C2B 0%, #00A14B 100%)', boxShadow: '0 2px 8px rgba(0, 92, 43, 0.2)' }}
              >
                {step.number}
              </div>
            </div>

            {/* Icon */}
            <div className="text-3xl mb-2">{step.icon}</div>

            {/* Title */}
            <h3 className="text-lg font-bold text-gray-800 mb-1">
              {step.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-500 leading-snug max-w-xs">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
