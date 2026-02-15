"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

export interface ResumeItem {
  id: string;
  resume_name: string;
  file_name: string;
  storage_url: string;
  pages?: number;
  is_active_for_context: boolean;
  created_at: string;
}

const RESUME_LIST_URL = "/api/agent/resumes";
const TASK_POLL_INTERVAL_MS = 3000;
const NOTIFICATIONS_URL = "/api/agent/notifications";

function isUrl(input: string): boolean {
  const trimmed = input.trim();
  return /^https?:\/\/[^\s]+$/i.test(trimmed) || /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s]+/.test(trimmed);
}

function getDetailMessage(data: unknown): string {
  if (data && typeof data === "object" && "detail" in data) {
    const d = (data as { detail?: string | unknown[] }).detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d) && d.length > 0 && typeof d[0] === "object" && d[0] !== null && "msg" in d[0]) {
      return String((d[0] as { msg: string }).msg);
    }
  }
  return "";
}

interface DashboardResumeSectionProps {
  onToast: (message: string, type: "success" | "error") => void;
}

export function DashboardResumeSection({ onToast }: DashboardResumeSectionProps) {
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [resumesLoading, setResumesLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [jdInput, setJdInput] = useState("");
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<string | null>(null);
  const [scoreResult, setScoreResult] = useState<{
    score_id: string;
    final_score: number;
    score_bucket: string;
    report_url?: string;
  } | null>(null);
  const [scoring, setScoring] = useState(false);

  const fetchResumes = useCallback(async () => {
    try {
      const res = await fetch(RESUME_LIST_URL);
      const data = await res.json();
      if (res.ok && data.resumes) {
        setResumes(data.resumes);
      } else {
        setResumes([]);
      }
    } catch {
      setResumes([]);
    } finally {
      setResumesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || uploadFile.type !== "application/pdf") {
      onToast("Please select a PDF file", "error");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      if (uploadName.trim()) formData.append("resume_name", uploadName.trim());
      const res = await fetch(RESUME_LIST_URL, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        onToast(data.message ?? "Resume uploaded successfully", "success");
        setUploadFile(null);
        setUploadName("");
        await fetchResumes();
      } else {
        const msg = getDetailMessage(data) || data.error || "Upload failed";
        onToast(msg, "error");
      }
    } catch {
      onToast("Upload failed. Please try again.", "error");
    } finally {
      setUploading(false);
    }
  };

  const createScoringTask = useCallback(async () => {
    const trimmed = jdInput.trim();
    if (!trimmed) {
      onToast("Enter a Job Description URL or paste text", "error");
      return;
    }
    setScoring(true);
    setTaskId(null);
    setTaskStatus(null);
    setScoreResult(null);
    try {
      const body: { jd_source_type: string; jd_url?: string; jd_text?: string; resume_id?: string } =
        isUrl(trimmed)
          ? { jd_source_type: "url", jd_url: trimmed }
          : { jd_source_type: "paste", jd_text: trimmed };
      if (selectedResumeId) body.resume_id = selectedResumeId;
      const res = await fetch("/api/agent/tasks/resume-scoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.task_id) {
        setTaskId(data.task_id);
        setTaskStatus(data.status ?? "queued");
      } else {
        onToast(getDetailMessage(data) || data.error || "Failed to start scoring", "error");
        setScoring(false);
      }
    } catch {
      onToast("Failed to start scoring", "error");
      setScoring(false);
    }
  }, [jdInput, selectedResumeId, onToast]);

  useEffect(() => {
    if (!taskId || taskStatus === "completed" || taskStatus === "failed" || taskStatus === "cancelled") {
      if (taskId && (taskStatus === "completed" || taskStatus === "failed" || taskStatus === "cancelled")) {
        setScoring(false);
      }
      return;
    }
    const poll = async () => {
      try {
        const res = await fetch(`/api/agent/tasks/${taskId}`);
        const data = await res.json();
        if (res.ok && data.status) {
          setTaskStatus(data.status);
          if (data.status === "completed") {
            const notifRes = await fetch(`${NOTIFICATIONS_URL}?unread_only=true&limit=20`);
            const notifData = await notifRes.json();
            const reportReady = notifData.notifications?.find(
              (n: { type: string; task_id: string; payload?: { score_id?: string; report_url?: string } }) =>
                n.type === "report_ready" && n.task_id === taskId
            );
            const scoreId = reportReady?.payload?.score_id;
            const reportUrl = reportReady?.payload?.report_url;
            if (scoreId) {
              const reportRes = await fetch(`/api/agent/resume-scoring/reports/${scoreId}`);
              const reportData = await reportRes.json();
              if (reportRes.ok) {
                setScoreResult({
                  score_id: reportData.score_id ?? scoreId,
                  final_score: reportData.final_score ?? 0,
                  score_bucket: reportData.score_bucket ?? "unknown",
                  report_url: reportUrl ?? reportData.report_url,
                });
              }
            }
          }
        }
      } catch {
        setTaskStatus("failed");
        setScoring(false);
      }
    };
    const t = setInterval(poll, TASK_POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [taskId, taskStatus]);

  const jdDetected = jdInput.trim().length > 0;
  const statusLabel = scoreResult
    ? "Completed"
    : taskStatus
      ? taskStatus.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : jdDetected
        ? "JD Detected"
        : null;

  if (resumesLoading) {
    return (
      <div className="rounded-lg border border-orange-100 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading resumes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-orange-100 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-black dark:text-zinc-50">Resumes &amp; Scoring</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {resumes.length === 0
            ? "Upload a PDF resume to get started. You can then score it against job descriptions."
            : "Upload more resumes in Profile. Enter a Job Description below to score your resume."}
        </p>

        {resumes.length === 0 ? (
          <form onSubmit={handleUpload} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="resume-file"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Upload Resume (PDF)
              </label>
              <input
                id="resume-file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm text-zinc-600 file:mr-4 file:rounded-md file:border-0 file:bg-orange-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-orange-700 dark:file:bg-orange-900/30 dark:file:text-orange-400"
              />
            </div>
            <div>
              <label
                htmlFor="resume-name"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Resume name (optional)
              </label>
              <input
                id="resume-name"
                type="text"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="e.g. My Resume 2025"
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black placeholder-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={uploading || !uploadFile}
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload Resume"}
            </button>
          </form>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <Link href="/dashboard/profile#resumes" className="font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300">
                Manage resumes in Profile
              </Link>
            </p>
            <div>
              <label
                htmlFor="jd-input"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Job Description (URL or paste text)
              </label>
              <textarea
                id="jd-input"
                rows={4}
                value={jdInput}
                onChange={(e) => setJdInput(e.target.value)}
                placeholder="Paste JD text or enter a job posting URL..."
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black placeholder-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
                disabled={!!scoreResult || scoring}
              />
            </div>
            {resumes.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Score with resume
                </label>
                <select
                  value={selectedResumeId ?? ""}
                  onChange={(e) => setSelectedResumeId(e.target.value || null)}
                  className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black focus:border-orange-500 focus:outline-none focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
                  disabled={!!scoreResult || scoring}
                >
                  <option value="">Default resume</option>
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.resume_name || r.file_name || r.id}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {statusLabel && (
              <p
                className={`text-sm font-medium ${
                  scoreResult
                    ? "text-green-600 dark:text-green-400"
                    : taskStatus === "failed" || taskStatus === "cancelled"
                      ? "text-red-600 dark:text-red-400"
                      : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                Status: {statusLabel}
              </p>
            )}
            {!scoreResult && (
              <button
                type="button"
                onClick={createScoringTask}
                disabled={!jdDetected || scoring}
                className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {scoring ? "Scoring..." : "Score Resume"}
              </button>
            )}
            {scoreResult && (
              <div className="rounded-md border border-orange-200 bg-orange-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                <p className="text-sm font-medium text-black dark:text-zinc-50">
                  Score: {scoreResult.final_score} ({scoreResult.score_bucket})
                </p>
                {scoreResult.report_url ? (
                  <a
                    href={scoreResult.report_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
                  >
                    Download report
                  </a>
                ) : (
                  <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                    Report PDF will appear when the Agent Service provides a download URL.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
