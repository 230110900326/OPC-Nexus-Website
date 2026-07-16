export type HeatInput = {
  likes: number; comments: number; favorites: number; shares: number; reads: number;
  externalViews: number; externalLikes: number; ageHours: number; keywordMatch: number;
  sourceTrust: number; editorScore: number; contentType: "article" | "policy" | "video" | "post" | "demand";
  externalViewPercentile?: number; externalLikePercentile?: number;
};

const HALF_LIFE: Record<HeatInput["contentType"], number> = { article: 48, policy: 168, video: 72, post: 24, demand: 168 };
export function percentile(value: number, sample: number[]) { if (!sample.length) return 0; return sample.filter((item) => item <= value).length / sample.length; }
export function calculateHeat(input: HeatInput) {
  const engagement = input.likes * 3 + input.comments * 5 + input.favorites * 4 + input.shares * 6 + Math.log1p(input.reads) * 2;
  const external = (input.externalViewPercentile ?? percentile(input.externalViews, [0, 100, 1_000, 10_000, 100_000])) * 20 + (input.externalLikePercentile ?? percentile(input.externalLikes, [0, 10, 100, 1_000, 10_000])) * 15;
  const quality = input.keywordMatch * 12 + input.sourceTrust * 10 + input.editorScore * 8;
  const decay = Math.pow(0.5, Math.max(0, input.ageHours) / HALF_LIFE[input.contentType]);
  return Math.round((engagement + external + quality) * decay * 100) / 100;
}
