export default function TimeNoticeBanner() {
  return (
    <div className="bg-amber-notice border border-amber-noticeBorder rounded-2xl px-4 py-3 mx-auto mt-4 max-w-3xl">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">⚠️</span>
        <p className="text-sm md:text-base text-yellow-900 leading-snug">
          <span className="font-bold">Important Notice:</span> 1GB 1HR is available only from{' '}
          <span className="font-semibold">12:00 AM to 3:59 PM</span>. From{' '}
          <span className="font-semibold">4:00 PM</span> it is replaced by 250MB.
        </p>
      </div>
    </div>
  );
}
