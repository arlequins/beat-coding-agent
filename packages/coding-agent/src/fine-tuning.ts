export type FineTuneDatasetManifest = {
  createdAt: string;
  exampleCount: number;
  format: "jsonl";
  objectKey: string;
  sourceFeedbackCount: number;
  version: string;
  workspaceId: string;
};

export type FineTuneJobRequest = {
  baseModel: string;
  datasetVersion: string;
  dryRun?: boolean;
  workspaceId: string;
};

export function shouldPromoteModel(input: {
  baseline: number;
  candidate: number;
  minimumGain?: number;
}): boolean {
  return input.candidate >= input.baseline + (input.minimumGain ?? 0.02);
}

export function makeDatasetVersion(now = new Date()): string {
  return `dataset-${now
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14)}`;
}
