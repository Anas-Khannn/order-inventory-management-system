import { useCallback, useEffect, useState } from "react";

export const HASH_QUERY_EVENT = "hashquerychange";

/** Re-renders on any hash change, including in-page filter updates. */
export function useHashLocation() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    window.addEventListener("hashchange", sync);
    window.addEventListener(HASH_QUERY_EVENT, sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener(HASH_QUERY_EVENT, sync);
    };
  }, []);
  return parseHash(hash);
}

/** Split "#/products?status=ACTIVE" into its path and query parts. */
export const parseHash = (hash = window.location.hash) => {
  const raw = hash.replace(/^#\/?/, "");
  const [path = "", query = ""] = raw.split("?");
  return { path, params: new URLSearchParams(query) };
};

/**
 * Page filters/sorting stored in the URL hash, so a filtered view survives refresh and can be shared.
 * Uses replaceState: typing in a search box must not flood the back button.
 */
export function useHashQuery<T extends Record<string, string | undefined>>(defaults: T) {
  const read = useCallback(() => {
    const { params } = parseHash();
    const out = { ...defaults };
    for (const k of Object.keys(defaults)) {
      const v = params.get(k);
      if (v !== null) (out as Record<string, string>)[k] = v;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [state, setState] = useState<T>(read);

  useEffect(() => {
    const onHash = () => setState(read());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [read]);

  const update = useCallback(
    (patch: Partial<T>) =>
      setState((prev) => {
        const next = { ...prev, ...patch };
        const { path } = parseHash();
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(next)) if (v !== undefined && v !== "" && v !== defaults[k]) params.set(k, v);
        const q = params.toString();
        window.history.replaceState(null, "", `#/${path}${q ? `?${q}` : ""}`);
        // replaceState fires no hashchange; tell listeners (e.g. sidebar active views) explicitly.
        queueMicrotask(() => window.dispatchEvent(new Event(HASH_QUERY_EVENT)));
        return next;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return [state, update] as const;
}
