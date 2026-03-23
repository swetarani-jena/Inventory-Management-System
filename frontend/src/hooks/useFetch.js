import { useState, useEffect, useCallback } from 'react';

export const useFetch = (fetchFn, deps = []) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFn();
      if (!res || res.success === false) {
        throw new Error(res?.message || 'Data fetch failed');
      }
      setData(res?.data ?? null);
    } catch (e) {
      setError(e.message || 'Unknown error');
      setData(null);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line
  }, deps);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
};
