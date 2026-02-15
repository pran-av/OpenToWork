"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface ProfileData {
  user_first_name: string | null;
  user_last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  linkedin_id: string | null;
  profile_completed: boolean;
}

interface ResumeItem {
  id: string;
  resume_name: string;
  file_name: string;
  created_at: string;
}


export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isLinkedInLinked, setIsLinkedInLinked] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
  });
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [resumesLoading, setResumesLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchResumes = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/resumes");
      const data = await res.json();
      if (res.ok && data.resumes) setResumes(data.resumes);
      else setResumes([]);
    } catch {
      setResumes([]);
    } finally {
      setResumesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    checkLinkedInStatus();
    fetchResumes();
  }, [fetchResumes]);

  // Refresh profile when returning from LinkedIn OAuth (check URL params)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const linked = urlParams.get("linked");
    if (linked === "success") {
      // Refresh profile to get LinkedIn data
      fetchProfile();
      checkLinkedInStatus();
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/profile");
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/profile");
      const data = await response.json();
      
      if (response.ok && data.profile) {
        setProfile(data.profile);
        setFormData({
          first_name: data.profile.user_first_name || "",
          last_name: data.profile.user_last_name || "",
        });
      } else {
        setToast({ message: "Failed to load profile", type: "error" });
        setTimeout(() => setToast(null), 5000);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setToast({ message: "Failed to load profile", type: "error" });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const checkLinkedInStatus = async () => {
    try {
      const response = await fetch("/api/auth/link-identity/status");
      const data = await response.json();
      if (response.ok) {
        setIsLinkedInLinked(data.hasLinkedIn || false);
      }
    } catch (error) {
      console.error("Error checking LinkedIn status:", error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setToast(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: formData.first_name.trim() || null,
          last_name: formData.last_name.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.profile) {
        setProfile(data.profile);
        setToast({ message: "Profile updated successfully!", type: "success" });
        setTimeout(() => setToast(null), 5000);
        
        // Dispatch custom event to notify header to refresh
        window.dispatchEvent(new CustomEvent("profileUpdated"));
      } else {
        setToast({ message: data.error || "Failed to update profile", type: "error" });
        setTimeout(() => setToast(null), 5000);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setToast({ message: "Failed to update profile", type: "error" });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const getResumeDetailMessage = (data: unknown): string => {
    if (data && typeof data === "object" && "detail" in data) {
      const d = (data as { detail?: string | unknown[] }).detail;
      if (typeof d === "string") return d;
      if (Array.isArray(d) && d[0] && typeof d[0] === "object" && "msg" in d[0]) return String((d[0] as { msg: string }).msg);
    }
    return "";
  };

  const handleResumeUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || uploadFile.type !== "application/pdf") {
      setToast({ message: "Please select a PDF file", type: "error" });
      setTimeout(() => setToast(null), 5000);
      return;
    }
    setUploading(true);
    setToast(null);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", uploadFile);
      if (uploadName.trim()) formDataUpload.append("resume_name", uploadName.trim());
      const res = await fetch("/api/agent/resumes", { method: "POST", body: formDataUpload });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: data.message ?? "Resume uploaded successfully", type: "success" });
        setUploadFile(null);
        setUploadName("");
        fetchResumes();
      } else {
        const msg = getResumeDetailMessage(data) || data.error || "Upload failed";
        setToast({ message: msg, type: "error" });
      }
    } catch {
      setToast({ message: "Upload failed. Please try again.", type: "error" });
    } finally {
      setUploading(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const handleRemoveResume = async (resumeId: string) => {
    setDeletingId(resumeId);
    setToast(null);
    try {
      const res = await fetch(`/api/agent/resumes/${resumeId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: data.message ?? "Resume removed", type: "success" });
        fetchResumes();
      } else {
        setToast({ message: data.error ?? "Failed to remove resume", type: "error" });
      }
    } catch {
      setToast({ message: "Failed to remove resume", type: "error" });
    } finally {
      setDeletingId(null);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const handleLinkLinkedIn = async () => {
    setIsLinking(true);
    try {
      // Call server-side API route that runs linkIdentity() with HttpOnly cookies
      const response = await fetch("/api/auth/link-identity", {
        method: "GET",
        credentials: "include", // Include HttpOnly cookies
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to connect LinkedIn";
        setIsLinking(false);
        setToast({ message: errorMessage, type: "error" });
        setTimeout(() => setToast(null), 5000);
        return;
      }

      const data = await response.json();
      
      if (!data.url) {
        setIsLinking(false);
        setToast({ message: "Failed to initiate LinkedIn connection. Please try again.", type: "error" });
        setTimeout(() => setToast(null), 5000);
        return;
      }

      // Redirect to LinkedIn OAuth URL returned from server
      window.location.href = data.url;
    } catch (error) {
      console.error("Error initiating LinkedIn link:", error);
      setIsLinking(false);
      setToast({ message: "An unexpected error occurred. Please try again.", type: "error" });
      setTimeout(() => setToast(null), 5000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">Profile</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Update your profile information
        </p>
      </div>

      {/* Profile Avatar Section */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100 mb-4">Profile Picture</h3>
        <div className="flex items-center gap-4">
          {profile?.avatar_url ? (
            <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-orange-200 dark:border-orange-800">
              <Image
                src={profile.avatar_url}
                alt="Profile"
                fill
                sizes="128px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-orange-100 text-2xl font-semibold text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
              {profile?.display_name?.[0]?.toUpperCase() || 
               formData.first_name?.[0]?.toUpperCase() || 
               formData.last_name?.[0]?.toUpperCase() || 
               "?"}
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              {profile?.avatar_url 
                ? "Profile picture imported from LinkedIn" 
                : "Connect LinkedIn to import your profile picture"}
            </p>
          </div>
        </div>
      </div>

      {/* Profile Form Section */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100 mb-4">Personal Information</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="first_name"
                className="block text-sm font-medium text-gray-700 dark:text-zinc-300"
              >
                First Name
              </label>
              <input
                type="text"
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange("first_name", e.target.value)}
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600 sm:text-sm"
                placeholder="Enter your first name"
              />
            </div>
            <div>
              <label
                htmlFor="last_name"
                className="block text-sm font-medium text-gray-700 dark:text-zinc-300"
              >
                Last Name
              </label>
              <input
                type="text"
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange("last_name", e.target.value)}
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600 sm:text-sm"
                placeholder="Enter your last name"
              />
            </div>
          </div>
          {profile?.display_name && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Display Name
              </label>
              <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
                {profile.display_name}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
                Display name is automatically generated from first and last name
              </p>
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving || !formData.first_name.trim() || !formData.last_name.trim()}
              className="rounded-md bg-orange-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Resumes Section */}
      <div id="resumes" className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 scroll-mt-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100 mb-4">Resumes</h3>
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-4">
          Add PDF resumes to your profile. Use them on the dashboard to score against job descriptions.
        </p>
        {resumesLoading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading resumes...</p>
        ) : (
          <>
            <ul className="space-y-2 mb-4">
              {resumes.length === 0 ? (
                <li className="text-sm text-zinc-500 dark:text-zinc-400">No resumes yet.</li>
              ) : (
                resumes.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <div>
                      <span className="font-medium text-gray-900 dark:text-zinc-100">
                        {r.resume_name || r.file_name || "Resume"}
                      </span>
                      <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                        Uploaded {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveResume(r.id)}
                      disabled={deletingId === r.id}
                      className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-red-100 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      title="Remove resume"
                      aria-label="Remove resume"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </li>
                ))
              )}
            </ul>
            <form onSubmit={handleResumeUpload} className="space-y-3">
              <div>
                <label htmlFor="profile-resume-file" className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                  Add new resume (PDF)
                </label>
                <input
                  id="profile-resume-file"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  className="mt-1 block w-full text-sm text-zinc-600 file:mr-4 file:rounded-md file:border-0 file:bg-orange-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-orange-700 dark:file:bg-orange-900/30 dark:file:text-orange-400"
                />
              </div>
              <div>
                <label htmlFor="profile-resume-name" className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                  Resume name (optional)
                </label>
                <input
                  id="profile-resume-name"
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
                {uploading ? "Uploading..." : "Add Resume"}
              </button>
            </form>
          </>
        )}
      </div>

      {/* LinkedIn Connection Section */}
      {!isLinkedInLinked && (
        <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-6 dark:border-orange-900/30 dark:bg-zinc-900/50">
          <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100 mb-2">Connect LinkedIn</h3>
          <p className="text-sm text-gray-600 dark:text-zinc-400 mb-4">
            Connect your LinkedIn account to automatically import your profile picture and other information.
          </p>
          <button
            onClick={handleLinkLinkedIn}
            className="rounded-md bg-[#0077b5] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#006399] focus:outline-none focus:ring-2 focus:ring-[#0077b5] focus:ring-offset-2"
          >
            Connect LinkedIn
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-6 py-4 shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
          role="alert"
        >
          <div className="flex items-center gap-2">
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-white hover:text-gray-200 transition-colors"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Full-screen overlay loader */}
      {isLinking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-lg bg-white px-8 py-6 shadow-xl dark:bg-zinc-900">
            <svg
              className="h-8 w-8 animate-spin text-orange-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
              Connecting to LinkedIn...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

