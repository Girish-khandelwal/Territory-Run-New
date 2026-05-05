'use client';

import { useSearchParams } from 'next/navigation';

export default function ErrorPage() {
  const error = useSearchParams().get('error');

  return (
    <div className="h-screen flex items-center justify-center">
      <p>Error: {error}</p>
    </div>
  );
}