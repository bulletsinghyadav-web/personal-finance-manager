import { useCallback, useEffect, useState } from 'react';
import { accountsApi, categoriesApi } from '../services/resourceApis';

export function useAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await accountsApi.list();
      setAccounts(data);
    } catch {
      setError('Could not load accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { accounts, loading, error, reload };
}

export function useCategories(type) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await categoriesApi.list(type);
      setCategories(data);
    } catch {
      setError('Could not load categories.');
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { categories, loading, error, reload };
}
