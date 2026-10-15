"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCelebs, type GetCelebsParams } from "@/actions/home/getCelebs";
import { createListingRequest } from "@/lib/listingRequest";

export function useCelebListingRequest() {
  const [request] = useState(() => createListingRequest(getCelebs));
  const [isLoading, setIsLoading] = useState(false);
  const [listingError, setListingError] = useState(false);
  const latest = useRef({ id: 0 });
  const invalidateListingCache = useCallback(() => request.invalidate(), [request]);

  useEffect(() => {
    const active = latest.current;
    const onVisible = () => { if (document.visibilityState === "visible") request.invalidate(); };
    window.addEventListener("focus", invalidateListingCache);
    window.addEventListener("storage", invalidateListingCache);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active.id++;
      request.clearPending();
      request.invalidate();
      window.removeEventListener("focus", invalidateListingCache);
      window.removeEventListener("storage", invalidateListingCache);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [request, invalidateListingCache]);

  const loadListing = useCallback(async (params: GetCelebsParams, apply: (result: Awaited<ReturnType<typeof getCelebs>>) => void) => {
    const id = ++latest.current.id;
    setIsLoading(true);
    setListingError(false);
    try {
      const result = await request(params);
      if (id !== latest.current.id || !result) return;
      if (result.error) { setListingError(true); return; }
      apply(result);
    } catch {
      if (id === latest.current.id) setListingError(true);
    } finally {
      if (id === latest.current.id) setIsLoading(false);
    }
  }, [request]);

  return { isLoading, listingError, loadListing, invalidateListingCache };
}
