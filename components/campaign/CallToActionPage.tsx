"use client";

import { useState } from "react";
import { Calendar, Mail, Linkedin, MessageCircle } from "lucide-react";

// Hardcoded data from wireframes
const ctaConfig = {
  schedule_meeting: "https://calendly.com/example",
  mailto: "mailto:abc@email.com",
  linkedin: "https://linkedin.com/in/example",
  phone: "+91 98239838238",
};

const clientName = "Pranav";

export default function CallToActionPage() {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    // TODO: In P2, this will save to database
    // For now, just log and show success
    console.log("Lead data:", formData);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    alert("Thank you! We'll be in touch soon.");
    setIsSubmitting(false);
    
    // Reset form
    setFormData({ name: "", company: "", email: "", phone: "" });
  };

  const handleCtaClick = (type: keyof typeof ctaConfig) => {
    const url = ctaConfig[type];
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
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
          <button
            onClick={() => handleCtaClick("schedule_meeting")}
            className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-6 transition-all hover:border-blue-400 hover:bg-blue-50"
          >
            <Calendar className="h-6 w-6 text-gray-700" />
            <span className="text-sm font-medium text-gray-900">
              Schedule a Meeting
            </span>
          </button>

          <button
            onClick={() => handleCtaClick("mailto")}
            className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-6 transition-all hover:border-blue-400 hover:bg-blue-50"
          >
            <Mail className="h-6 w-6 text-gray-700" />
            <span className="text-sm font-medium text-gray-900">
              Send an Email
            </span>
          </button>

          <button
            onClick={() => handleCtaClick("linkedin")}
            className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-6 transition-all hover:border-blue-400 hover:bg-blue-50"
          >
            <Linkedin className="h-6 w-6 text-gray-700" />
            <span className="text-sm font-medium text-gray-900">
              Connect on Linkedin
            </span>
          </button>

          <button
            onClick={() => handleCtaClick("phone")}
            className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-6 transition-all hover:border-blue-400 hover:bg-blue-50"
          >
            <MessageCircle className="h-6 w-6 text-gray-700" />
            <span className="text-sm font-medium text-gray-900">
              Connect on Chat/Phone Call
            </span>
          </button>
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

          <div>
            <label
              htmlFor="phone"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
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

