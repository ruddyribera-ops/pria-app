export default async function globalSetup() {
  // Rate limiter table clearing removed — CI uses GH Actions service container (no Docker).
  // In local dev, manual DB reset or docker exec against pria-postgres is sufficient.
  console.log('[globalSetup] Rate limiter not cleared in CI (GH Actions has no Docker)');
}
