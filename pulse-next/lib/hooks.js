"use client";
import { useEffect, useState } from "react";

/* Run an async loader whenever deps change. A stale run never overwrites a newer one. */
export function useAsync(fn, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.resolve()
      .then(fn)
      .then(
        (d) => live && setState({ data: d, loading: false, error: null }),
        (e) => {
          if (!live) return;
          console.error(e);
          setState({ data: null, loading: false, error: e });
        }
      );
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  return { ...state, reload: () => setN((x) => x + 1) };
}

/* Apply a survey theme class (th-royal, th-ocean…) to <html> while a page is mounted */
export function useSurveyTheme(theme) {
  useEffect(() => {
    document.documentElement.className = theme || "";
    return () => { document.documentElement.className = ""; };
  }, [theme]);
}
