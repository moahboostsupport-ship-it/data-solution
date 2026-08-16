import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { PACKAGES as staticPackages } from '../lib/packages';
import type { Package } from '../lib/types';

export interface UsePackagesResult {
  packages: Package[];
  groupedByCategory: Record<string, Package[]>;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches packages from Supabase. Falls back to static package data
 * if the database is unreachable or returns no results.
 * Groups packages by category for sectioned display.
 */
export function usePackages(): UsePackagesResult {
  const [packages, setPackages] = useState<Package[]>(staticPackages);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchPackages() {
      try {
        const { data, error: fetchError } = await supabase
          .from('packages')
          .select('*')
          .eq('active', true)
          .order('price', { ascending: true });

        if (fetchError) throw fetchError;

        if (mounted) {
          if (data && data.length > 0) {
            setPackages(data as unknown as Package[]);
          }
          setError(null);
        }
      } catch {
        // Silently fall back to static data — user still sees packages
        if (mounted) {
          setPackages(staticPackages);
          setError(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchPackages();

    return () => {
      mounted = false;
    };
  }, []);

  const groupedByCategory = useMemo(() => {
    return packages.reduce<Record<string, Package[]>>((acc, pkg) => {
      const cat = pkg.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(pkg);
      return acc;
    }, {});
  }, [packages]);

  return { packages, groupedByCategory, loading, error };
}
