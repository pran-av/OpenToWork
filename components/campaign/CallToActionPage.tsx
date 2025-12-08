"use client";

import { useState } from "react";
import { Calendar, Mail, Linkedin, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { checkUserExists, ensureAnonymousAuth } from "@/lib/utils/auth";
import type { CampaignData } from "@/lib/db/campaigns";

interface CallToActionPageProps {
  campaign: CampaignData;
}

export default function CallToActionPage({ campaign }: CallToActionPageProps) {
  const clientName = campaign.campaign_structure.client_name;
  const ctaConfig = campaign.cta_config;
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone_isd: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  // Sanitize input to prevent XSS and script injections
  const sanitizeInput = (input: string): string => {
    // Remove HTML tags and encode special characters
    return input
      .replace(/[<>]/g, "") // Remove angle brackets
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .replace(/on\w+=/gi, "") // Remove event handlers
      .trim();
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!formData.company.trim()) {
      newErrors.company = "Company is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    // Sanitize input to prevent XSS
    const sanitized = sanitizeInput(value);
    setFormData((prev) => ({ ...prev, [field]: sanitized }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Critical operation: Verify user exists before submitting lead data
      // If user doesn't exist, create anonymous user, then submit
      // If user exists, directly submit
      const userExists = await checkUserExists(supabase);
      if (!userExists) {
        // console.log("[CallToAction] No user found - creating anonymous user before submit...");
        const authSuccess = await ensureAnonymousAuth(supabase, "CallToAction");
        if (!authSuccess) {
          throw new Error("Failed to authenticate user");
        }
        // console.log("[CallToAction] Anonymous user created - proceeding with submission");
      } else {
        // console.log("[CallToAction] User exists - proceeding with submission");
      }

      // Save lead to database via API route
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaign_id: campaign.campaign_id,
          lead_name: formData.name,
          lead_company: formData.company,
          lead_email: formData.email,
          lead_phone_isd: formData.phone_isd.trim() || undefined,
          lead_phone: formData.phone.trim() || undefined,
          meeting_scheduled: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.details || errorData.error || "Failed to submit lead";
        // console.error("API error:", errorMessage);
        throw new Error(errorMessage);
      }

      alert("Thank you! We'll be in touch soon.");
      setFormData({ name: "", company: "", email: "", phone_isd: "", phone: "" });
    } catch (error) {
      // console.error("Failed to submit lead:", error);
      alert("There was an error submitting your information. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCtaClick = (type: "schedule_meeting" | "mailto" | "linkedin" | "phone") => {
    const url = ctaConfig[type];
    if (url) {
      if (type === "mailto") {
        window.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Section 1: Connect with Client */}
      <div className="mb-8">
        <p className="mb-2 text-sm text-gray-500">Let's have you</p>
        <h1 className="mb-3 text-3xl font-bold text-gray-900 md:text-4xl">
          Connect with {clientName}
        </h1>
        <p className="text-base text-gray-700">
          Plan interviews, explore more details on projects, or discuss service charges
        </p>
      </div>

      {/* Section 2: Communication Preferences */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Choose your communication preference
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {ctaConfig.schedule_meeting && (
            <button
              onClick={() => handleCtaClick("schedule_meeting")}
              className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-6 transition-all hover:border-blue-400 hover:bg-blue-50"
            >
              <Calendar className="h-6 w-6 text-gray-700" />
              <span className="text-sm font-medium text-gray-900">
                Schedule a Meeting
              </span>
            </button>
          )}

          {ctaConfig.mailto && (
            <button
              onClick={() => handleCtaClick("mailto")}
              className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-6 transition-all hover:border-blue-400 hover:bg-blue-50"
            >
              <Mail className="h-6 w-6 text-gray-700" />
              <span className="text-sm font-medium text-gray-900">
                Send an Email
              </span>
            </button>
          )}

          {ctaConfig.linkedin && (
            <button
              onClick={() => handleCtaClick("linkedin")}
              className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-6 transition-all hover:border-blue-400 hover:bg-blue-50"
            >
              <Linkedin className="h-6 w-6 text-gray-700" />
              <span className="text-sm font-medium text-gray-900">
                Connect on Linkedin
              </span>
            </button>
          )}

          {ctaConfig.phone && (
            <button
              onClick={() => handleCtaClick("phone")}
              className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-6 transition-all hover:border-blue-400 hover:bg-blue-50"
            >
              <MessageCircle className="h-6 w-6 text-gray-700" />
              <span className="text-sm font-medium text-gray-900">
                Connect on Chat/Phone Call
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Section 3: Lead Form */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Want {clientName} to get in touch?
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              required
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="company"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Company <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="company"
              value={formData.company}
              onChange={(e) => handleInputChange("company", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              required
            />
            {errors.company && (
              <p className="mt-1 text-sm text-red-500">{errors.company}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              required
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
          <div>
              <label
                htmlFor="phone_isd"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                ISD Code
              </label>
              <input
                type="text"
                id="phone_isd"
                value={formData.phone_isd}
                onChange={(e) => handleInputChange("phone_isd", e.target.value)}
                placeholder="+91"
                maxLength={5}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="col-span-2">
            <label
              htmlFor="phone"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
                Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="97623123123"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-gray-800 px-6 py-3 font-semibold text-white transition-colors hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "SUBMITTING..." : "SUBMIT"}
          </button>
        </form>
      </div>
    </div>
  );
}

