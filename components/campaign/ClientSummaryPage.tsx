"use client";

interface ClientSummaryPageProps {
  onServiceSelect: (serviceId: string) => void;
}

// Hardcoded data from wireframes
const clientData = {
  name: "Pranav",
  summary: [
    "Pranav has 3 years of experience working as a product manager on B2C edtech product. He led monetization roadmap at Infinity Learn, where his focus was to improve sale conversions and create new revenue streams.",
    "Pranav has additional 1.5 years experience as a sales consultant where he managed lead generation flows and interacted with founders selling them digital products and services.",
    "Pranav has been bootstrapping ideas since the last 6 months.",
  ],
};

const services = [
  {
    id: "service-1",
    name: "Engineer an MVP from Ideation to first users",
  },
  {
    id: "service-2",
    name: "Product Management",
  },
  {
    id: "service-3",
    name: "Project Management",
  },
  {
    id: "service-4",
    name: "Sales and Marketing",
  },
];

export default function ClientSummaryPage({
  onServiceSelect,
}: ClientSummaryPageProps) {
  return (
    <div className="mx-auto max-w-2xl">
      {/* Greeting */}
      <p className="mb-2 text-sm text-gray-500">Hello! I am Nora - your guide to</p>

      {/* Main Title */}
      <h1 className="mb-6 text-4xl font-bold text-gray-900 md:text-5xl">
        Hire {clientData.name}!
      </h1>

      {/* Client Summary */}
      <div className="mb-8 space-y-4">
        {clientData.summary.map((paragraph, index) => (
          <p key={index} className="text-base leading-relaxed text-gray-700">
            {paragraph}
          </p>
        ))}
      </div>

      {/* Service Selection Prompt */}
      <p className="mb-6 text-base text-gray-700">
        {clientData.name} offers following services, select as per your requirements, so I can guide you further
      </p>

      {/* Service Selection Buttons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => onServiceSelect(service.id)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-4 text-left transition-all hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm"
          >
            <span className="text-base font-medium text-gray-900">
              {service.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

