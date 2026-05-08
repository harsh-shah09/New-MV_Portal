'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

export function BackLink() {
  const [loading, setLoading] = useState(false);

  return (
    <Link
      href="/assets"
      onClick={() => {
        if (loading) return;
        setLoading(true);
      }}
      className={`
        flex items-center justify-center
        h-10 w-10 rounded-xl border
        shadow-sm transition-all
        ${loading
          ? 'pointer-events-none opacity-60 cursor-not-allowed'
          : 'border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50'
        }
      `}
      aria-disabled={loading}
    >
      <ArrowLeft className={`w-4 h-4 ${loading ? 'animate-pulse' : ''}`} />
    </Link>
  );
}