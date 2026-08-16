/**
 * packages-list/index.ts
 * GET — returns all active packages, grouped by category
 *
 * Security: No auth required, public endpoint
 * Filters out inactive packages and time-based packages not available at current Nairobi time
 */

import { supabaseAdmin } from '../_shared/supabase.ts';
import { handleOption, corsHeaders } from '../_shared/cors.ts';
import { errorResponse } from '../_shared/errors.ts';
import { isPackageAvailable } from '../_shared/time.ts';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const preflight = handleOption(req);
  if (preflight) return preflight;

  // Only allow GET
  if (req.method !== 'GET') {
    return errorResponse(req, 'Method not allowed', 405);
  }

  try {
    // Fetch all active packages from database
    const { data: packages, error } = await supabaseAdmin
      .from('packages')
      .select('*')
      .eq('active', true)
      .order('category', { ascending: true })
      .order('price', { ascending: true });

    if (error) {
      console.error('Database error fetching packages:', error.message);
      return errorResponse(req, 'Unable to fetch packages', 500);
    }

    // Filter packages based on time availability
    // For time-based packages (start_time/end_time set), check current Nairobi time
    const availablePackages = (packages || []).filter((pkg) =>
      isPackageAvailable({
        start_time: pkg.start_time,
        end_time: pkg.end_time,
        active: pkg.active,
      })
    );

    // Group by category
    const grouped: Record<string, typeof availablePackages> = {};
    for (const pkg of availablePackages) {
      const category = pkg.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      // Return safe public fields only — no internal timestamps exposed
      grouped[category].push({
        id: pkg.id,
        name: pkg.name,
        category: pkg.category,
        price: pkg.price,
        description: pkg.description,
        validity: pkg.validity,
        featured: pkg.featured,
        start_time: pkg.start_time,
        end_time: pkg.end_time,
        purchase_frequency: pkg.purchase_frequency,
      });
    }

    const origin = req.headers.get('origin');
    return new Response(
      JSON.stringify({
        packages: availablePackages.map((pkg) => ({
          id: pkg.id,
          name: pkg.name,
          category: pkg.category,
          price: pkg.price,
          description: pkg.description,
          validity: pkg.validity,
          featured: pkg.featured,
          start_time: pkg.start_time,
          end_time: pkg.end_time,
          purchase_frequency: pkg.purchase_frequency,
        })),
        grouped,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      }
    );
  } catch (err) {
    console.error('Unexpected error in packages-list:', err);
    return errorResponse(req, 'An unexpected error occurred', 500);
  }
});
