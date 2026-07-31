// Quality download threshold — blocks slide downloads below this score
export const QUALITY_DOWNLOAD_THRESHOLD = 60;

export function canDownload(quality: { overall: number } | null | undefined): boolean {
  if (!quality) return true; // no quality data = allow (legacy)
  return quality.overall >= QUALITY_DOWNLOAD_THRESHOLD;
}

export function getQualityColor(score: number): string {
  if (score >= 80) return '#3A9E5E'; // green — good
  if (score >= 60) return '#F5A623'; // yellow — borderline
  return '#D0021B'; // red — insufficient
}
