export interface ScoreComponent {
  name: string;
  weight: number;
  result: "passed" | "failed" | "not_applicable";
  reason: string;
}
export interface ReproducibilityResult {
  score: number;
  components: ScoreComponent[];
}
