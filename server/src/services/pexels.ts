/**
 * Pexels API client — free hero images for slide decks.
 * API: https://www.pexels.com/api/
 * Tier: 200 req/hour, 20,000 req/month free.
 *
 * NOTE: This service is wired for a future sprint. The current P1.7 spike uses
 * pre-fetched assets in `public/design-assets/hero/`. Integration into the
 * slides motor route (server-side pre-fetch + pass to SlideContent) is a
 * separate task — do not enable this in production until that wiring exists.
 */

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';
const PEXELS_API_URL = 'https://api.pexels.com/v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h cache

interface PexelsPhoto {
  id: number;
  alt: string;
  src: {
    original: string;
    large: string;
    medium: string;
    landscape: string;
  };
  photographer: string;
}

interface CachedPhoto {
  url: string;
  alt: string;
  photographer: string;
  fetchedAt: number;
}

// In-memory cache. Replace with Redis when wiring into the live route.
const cache = new Map<string, CachedPhoto>();

/**
 * Search Pexels for a hero image. Returns cached result if available.
 * Returns null if PEXELS_API_KEY is unset or the API call fails.
 */
export async function fetchPexelsHero(query: string): Promise<CachedPhoto | null> {
  if (!PEXELS_API_KEY) {
    console.warn('[pexels] PEXELS_API_KEY not set — skipping Pexels fetch');
    return null;
  }

  // Check cache
  const cached = cache.get(query);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached;
  }

  try {
    const url = `${PEXELS_API_URL}/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
    const response = await fetch(url, {
      headers: { Authorization: PEXELS_API_KEY },
    });

    if (!response.ok) {
      console.warn(`[pexels] API error: ${response.status} for query "${query}"`);
      return null;
    }

    const data = (await response.json()) as { photos: PexelsPhoto[] };
    if (!data.photos || data.photos.length === 0) {
      console.warn(`[pexels] No results for query "${query}"`);
      return null;
    }

    const photo = data.photos[0];
    const result: CachedPhoto = {
      url: photo.src.large,
      alt: photo.alt,
      photographer: photo.photographer,
      fetchedAt: Date.now(),
    };

    cache.set(query, result);
    return result;
  } catch (err) {
    console.warn('[pexels] fetch failed:', err);
    return null;
  }
}

/**
 * Map a slide topic + keywords to a Pexels search query string.
 * Returns Bolivia-relevant queries when topic matches a known subject.
 */
export function topicToPexelsQuery(tema: string, keywords: string[]): string {
  const text = `${tema} ${keywords.join(' ')}`.toLowerCase();

  if (text.match(/titicaca|lago andino/)) return 'lago titicaca bolivia';
  if (text.match(/glaciar|hielo|andino/)) return 'andean glacier bolivia';
  if (text.match(/amazon|selva|trópico/)) return 'amazon river bolivia';
  if (text.match(/salar|desierto/)) return 'salar de uyuni bolivia';
  if (text.match(/ciclo del agua|evaporac|lluvia/)) return 'andes mountains water';
  if (text.match(/río|agua|lago/)) return 'bolivia river water';
  return 'bolivia landscape';
}
