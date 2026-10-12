import { JobStatus } from "./types";

export function ProgressBar({ status, progress }: { status: JobStatus; progress: number }) {
  if (status === "idle") return null;
  const label = status === "uploading" ? "Uploading inputs" : status === "pending" ? "Queued for generation" : status === "processing" ? `Building output · ${progress}%` : status === "done" ? "Output ready" : "Generation failed";
  return <div className={`dashboard-progress ${status}`}><div className="dashboard-progress-copy"><span>{label}</span><span>{status === "failed" ? "Retry" : `${Math.min(progress, 100)}%`}</span></div><div className="dashboard-progress-track"><i style={{ width: `${status === "failed" ? 100 : Math.max(progress, 4)}%` }} /></div></div>;
}
