export default function TimeNoticeBanner() {
  return (
    <div className="bg-amber-notice border border-amber-noticeBorder rounded-xl md:rounded-2xl px-3 py-2.5 md:px-4 md:py-3 mx-auto mt-3 md:mt-4 max-w-3xl">
      <div className="flex items-start gap-2">
        <span className="text-lg md:text-2xl flex-shrink-0">⚠️</span>
        <p className="text-xs md:text-base text-yellow-900 leading-snug">
          <span className="font-bold">1GB 1HR:</span> Available{' '}
          <span className="font-semibold">12 AM – 3:59 PM</span>. From{' '}
          <span className="font-semibold">4 PM</span> → 250MB.
        </p>
      </div>
    </div>
  );
}
