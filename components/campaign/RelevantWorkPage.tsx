"use client";

import { Check } from "lucide-react";

interface RelevantWorkPageProps {
  selectedServiceId: string | null;
  onConnect: () => void;
}

// Hardcoded data from wireframes
const serviceData: Record<string, { name: string; summary: string }> = {
  "service-1": {
    name: "Engineer an MVP from Ideation to first users",
    summary: "Pranav has 3 years of product management experience.",
  },
  "service-2": {
    name: "Product Management",
    summary: "Pranav has 3 years of product management experience.",
  },
  "service-3": {
    name: "Project Management",
    summary: "Pranav has 3 years of product management experience.",
  },
  "service-4": {
    name: "Sales and Marketing",
    summary: "Pranav has 3 years of product management experience.",
  },
};

const caseStudies: Record<string, Array<{
  name: string;
  duration: string;
  summary: string;
  highlights: string[];
  url: string;
}>> = {
  "service-2": [
    {
      name: "Multimedia Search Tool",
      duration: "12th Sep, 2024 - 13th Nov, 2024",
      summary:
        "Added a search bar to android and web app, allowing user to enter queries and receive suggestions across a wide range of video and text content.",
      highlights: [
        "20% increase in content activation",
        "10x more time spent on application",
      ],
      url: "https://example.com",
    },
    {
      name: "Seat Reservation System",
      duration: "12th Sep, 2024 - 13th Nov, 2024",
      summary:
        "Built a seat reservation system that allows learners to enter their preferences for selections and receive services immediately.",
      highlights: [
        "30% increase in users with same demand",
        "40% reduction in refund requests",
      ],
      url: "https://example.com",
    },
  ],
  "service-1": [
    {
      name: "Multimedia Search Tool",
      duration: "12th Sep, 2024 - 13th Nov, 2024",
      summary:
        "Added a search bar to android and web app, allowing user to enter queries and receive suggestions across a wide range of video and text content.",
      highlights: [
        "20% increase in content activation",
        "10x more time spent on application",
      ],
      url: "https://example.com",
    },
  ],
  "service-3": [
    {
      name: "Seat Reservation System",
      duration: "12th Sep, 2024 - 13th Nov, 2024",
      summary:
        "Built a seat reservation system that allows learners to enter their preferences for selections and receive services immediately.",
      highlights: [
        "30% increase in users with same demand",
        "40% reduction in refund requests",
      ],
      url: "https://example.com",
    },
  ],
  "service-4": [
    {
      name: "Multimedia Search Tool",
      duration: "12th Sep, 2024 - 13th Nov, 2024",
      summary:
        "Added a search bar to android and web app, allowing user to enter queries and receive suggestions across a wide range of video and text content.",
      highlights: [
        "20% increase in content activation",
        "10x more time spent on application",
      ],
      url: "https://example.com",
    },
  ],
};

export default function RelevantWorkPage({
  selectedServiceId,
  onConnect,
}: RelevantWorkPageProps) {
  const service = selectedServiceId
    ? serviceData[selectedServiceId] || serviceData["service-2"]
    : serviceData["service-2"];

  const studies =
    selectedServiceId && caseStudies[selectedServiceId]
      ? caseStudies[selectedServiceId]
      : caseStudies["service-2"];

  const handleCardClick = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Selection Label */}
      <p className="mb-2 text-sm text-gray-500">You Selected</p>

      {/* Service Title */}
      <h1 className="mb-2 text-3xl font-bold text-gray-900 md:text-4xl">
        {service.name}
      </h1>

      {/* Service Summary */}
      <p className="mb-6 text-base text-gray-700">{service.summary}</p>

      {/* Suggestion Text */}
      <p className="mb-6 text-base text-gray-700">
        I suggest going through following case studies from past work
      </p>

      {/* Case Study Cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {studies.map((study, index) => (
          <div
            key={index}
            onClick={() => handleCardClick(study.url)}
            className="cursor-pointer rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-400 hover:shadow-md"
          >
            <h3 className="mb-2 text-xl font-bold text-gray-900">
              {study.name}
            </h3>
            <p className="mb-3 text-sm text-gray-500">{study.duration}</p>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              {study.summary}
            </p>
            <div className="space-y-2">
              {study.highlights.map((highlight, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                  <span className="text-sm text-gray-700">{highlight}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Connect CTA Button */}
      <div className="flex justify-end">
        <button
          onClick={onConnect}
          className="rounded-lg bg-gray-800 px-8 py-3 font-semibold text-white transition-colors hover:bg-gray-900"
        >
          CONNECT WITH PRANAV
        </button>
      </div>
    </div>
  );
}

