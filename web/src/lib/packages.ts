// packages.ts
// Static package data for DATA SOLUTION.
// Used as a frontend fallback when Supabase is not yet connected.
// Mirrors the seed data in supabase/migrations/002_seed_packages.sql.

import type { Package, PackageCategory } from './types';

export const PACKAGES: Package[] = [
  // ============================================================
  // Bingwa Data (category: 'bingwa_data', purchase_frequency: 'buy_once')
  // ============================================================
  { id: 'bingwa-750mb', name: '750MB', category: 'bingwa_data', price: 55, validity: '24 Hours', purchase_frequency: 'buy_once', active: true, featured: false },
  { id: 'bingwa-250mb', name: '250MB', category: 'bingwa_data', price: 20, validity: '24 Hours', purchase_frequency: 'buy_once', active: true, featured: false },
  { id: 'bingwa-1gb-1hr', name: '1GB', category: 'bingwa_data', price: 19, validity: '1 Hour', purchase_frequency: 'buy_once', active: true, featured: true, start_time: '00:00', end_time: '15:59' },
  { id: 'bingwa-1_5gb', name: '1.5GB', category: 'bingwa_data', price: 99, validity: '24 Hours', purchase_frequency: 'buy_once', active: true, featured: true },
  { id: 'bingwa-400mb-7d', name: '400MB', category: 'bingwa_data', price: 49, validity: '7 Days', purchase_frequency: 'buy_once', active: true, featured: false },

  // ============================================================
  // SMS Deals (category: 'sms', purchase_frequency: 'buy_many')
  // ============================================================
  { id: 'sms-20', name: '20 SMS', category: 'sms', price: 5, validity: '24 Hours', purchase_frequency: 'buy_many', active: true, featured: false },
  { id: 'sms-200', name: '200 SMS', category: 'sms', price: 10, validity: '24 Hours', purchase_frequency: 'buy_many', active: true, featured: false },
  { id: 'sms-1000', name: '1,000 SMS', category: 'sms', price: 30, validity: '7 Days', purchase_frequency: 'buy_many', active: true, featured: false },
  { id: 'sms-1500', name: '1,500 SMS', category: 'sms', price: 101, validity: '30 Days', purchase_frequency: 'buy_many', active: true, featured: true },

  // ============================================================
  // Minutes Deals (category: 'minutes', purchase_frequency: 'buy_many')
  // ============================================================
  { id: 'min-45', name: '45 Minutes', category: 'minutes', price: 21, validity: '3 Hours', purchase_frequency: 'buy_many', active: true, featured: false },
  { id: 'min-50', name: '50 Minutes', category: 'minutes', price: 51, validity: 'Till Midnight', purchase_frequency: 'buy_many', active: true, featured: false },

  // ============================================================
  // Highlighted Offer (category: 'highlighted', purchase_frequency: 'buy_many')
  // ============================================================
  { id: 'highlighted-250mb-wa', name: '250MB + FREE WhatsApp', category: 'highlighted', price: 25, validity: '24 Hours', purchase_frequency: 'buy_many', active: true, featured: true },

  // ============================================================
  // Tunukiwa Deals (category: 'tunukiwa', purchase_frequency: 'buy_many')
  // ============================================================
  { id: 'tunukiwa-1gb-1hr', name: '1GB', category: 'tunukiwa', price: 23, validity: '1 Hour', purchase_frequency: 'buy_many', active: true, featured: false },
  { id: 'tunukiwa-2gb', name: '2GB', category: 'tunukiwa', price: 110, validity: '24 Hours', purchase_frequency: 'buy_many', active: true, featured: true },
];

export const PACKAGES_BY_CATEGORY: Record<PackageCategory, Package[]> = {
  bingwa_data: PACKAGES.filter((p) => p.category === 'bingwa_data'),
  sms: PACKAGES.filter((p) => p.category === 'sms'),
  minutes: PACKAGES.filter((p) => p.category === 'minutes'),
  highlighted: PACKAGES.filter((p) => p.category === 'highlighted'),
  tunukiwa: PACKAGES.filter((p) => p.category === 'tunukiwa'),
};

/** Get all active packages in a given category (sorted: featured first, then by price). */
export function getPackagesByCategory(category: PackageCategory): Package[] {
  return PACKAGES.filter((p) => p.category === category && p.active !== false)
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.price - b.price;
    });
}

/** Get the highlighted offer package (category 'highlighted'), if any. */
export function getHighlightedOffer(): Package | null {
  return PACKAGES.find((p) => p.category === 'highlighted' && p.active !== false) ?? null;
}

/** Get a single package by its id. Returns undefined if not found. */
export function getPackageById(id: string): Package | undefined {
  return PACKAGES.find((p) => p.id === id);
}
