import { useState, useEffect, useCallback, useRef } from 'react';

export const useFetch = (fn, deps = []) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [tick,    setTick]    = useState(0);

  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; }, [fn]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fnRef.current()
      .then(res => {
        if (cancelled) return;
        setData(res?.success !== undefined ? res.data : res);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message || 'Unknown error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [tick, ...deps]);

  const reload = useCallback(() => setTick(t => t + 1), []);

  return { data, loading, error, reload };
};