export type PreGAStatus =
  | "FEASIBLE"
  | "INFEASIBLE";

export interface PreGAResult {
  offeringId: number;
  status: PreGAStatus;
  reason?: string;
}