"use client";

import { useEffect, useState } from "react";

const POLL_INTERVAL = 30_000; // 30 seconds

export default function PendingCountBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/users/pending/count");
        if (res.ok) {
          const data = await res.json();
          setCount(data.count ?? 0);
        }
      } catch {
        // silently ignore fetch errors
      }
    }

    fetchCount();
    const id = setInterval(fetchCount, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  if (count <= 0) return null;

  return (
    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-500 px-1.5 text-xs font-bold text-white">
      {count}
    </span>
  );
}
