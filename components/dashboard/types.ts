export type GenerationKind = "video" | "3d" | "floor-plan" | "walkthrough";
export type JobStatus = "idle" | "uploading" | "pending" | "processing" | "done" | "failed";

export type GenerationResponse = {
  jobId: string;
  kind: GenerationKind;
  status: Exclude<JobStatus, "idle" | "uploading">;
  progress: number;
  resultUrl?: string;
  resultType?: "video" | "model" | "image" | "walkthrough";
  error?: string;
};
