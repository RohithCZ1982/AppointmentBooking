export default function ServerWaking() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-cyan-50 flex flex-col items-center justify-center p-6">
      {/* 3D spinning tooth */}
      <div className="relative mb-8" style={{ perspective: '600px' }}>
        <div
          className="w-32 h-32"
          style={{
            animation: 'spin3d 3s ease-in-out infinite',
            transformStyle: 'preserve-3d',
          }}
        >
          <svg viewBox="0 0 120 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
            {/* Tooth body */}
            <path
              d="M20 30 C10 30 5 45 5 60 C5 80 10 110 22 120 C27 125 33 122 38 115 C43 108 47 100 50 95 C53 90 57 88 60 88 C63 88 67 90 70 95 C73 100 77 108 82 115 C87 122 93 125 98 120 C110 110 115 80 115 60 C115 45 110 30 100 30 C95 30 90 35 85 35 C78 35 72 28 65 22 C62 19 61 15 60 15 C59 15 58 19 55 22 C48 28 42 35 35 35 C30 35 25 30 20 30Z"
              fill="url(#toothGrad)"
              stroke="#0d9488"
              strokeWidth="2.5"
            />
            {/* Tooth shine */}
            <path
              d="M30 38 C24 40 18 52 18 62 C18 68 20 65 25 60 C30 55 35 45 38 40 C35 38 32 37 30 38Z"
              fill="white"
              opacity="0.6"
            />
            <path
              d="M42 22 C40 25 42 30 46 30 C48 29 48 26 46 23 C45 21 43 21 42 22Z"
              fill="white"
              opacity="0.5"
            />
            {/* Root lines */}
            <path d="M50 95 C50 100 49 108 48 115" stroke="#99f6e4" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            <path d="M70 95 C70 100 71 108 72 115" stroke="#99f6e4" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

            {/* Gradient definition */}
            <defs>
              <linearGradient id="toothGrad" x1="0" y1="0" x2="120" y2="130" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ccfbf1" />
                <stop offset="40%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#5eead4" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Shadow under tooth */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-3 bg-primary-200 rounded-full blur-md opacity-60"
          style={{ animation: 'shadowPulse 3s ease-in-out infinite' }}
        />
      </div>

      {/* Message */}
      <h2 className="text-2xl font-bold text-primary-700 mb-2 text-center">Just a moment…</h2>
      <p className="text-gray-500 text-center max-w-xs mb-6 text-sm leading-relaxed">
        The server is warming up. This takes about <span className="font-semibold text-primary-600">30 seconds</span> on first visit.
      </p>

      {/* Animated dots */}
      <div className="flex gap-2 mb-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-primary-400"
            style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>

      {/* Retry button */}
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors shadow-sm"
      >
        Try again
      </button>

      <p className="mt-4 text-xs text-gray-400">DentEase · Dental Clinic Management</p>

      {/* Keyframe styles */}
      <style>{`
        @keyframes spin3d {
          0%   { transform: rotateY(0deg) rotateX(5deg); }
          25%  { transform: rotateY(90deg) rotateX(15deg); }
          50%  { transform: rotateY(180deg) rotateX(5deg); }
          75%  { transform: rotateY(270deg) rotateX(15deg); }
          100% { transform: rotateY(360deg) rotateX(5deg); }
        }
        @keyframes shadowPulse {
          0%, 100% { transform: translateX(-50%) scaleX(1);   opacity: 0.5; }
          25%, 75%  { transform: translateX(-50%) scaleX(0.4); opacity: 0.2; }
          50%       { transform: translateX(-50%) scaleX(1);   opacity: 0.5; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  )
}
