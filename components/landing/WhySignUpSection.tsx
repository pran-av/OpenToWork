import { landingTheme } from "./landing-tokens";

const BLOCKS = [
  {
    title: "Pitch even better soon",
    points: [
      "Video Pitches",
      "Organise Case Studies in better ways",
      "Ways to get opportunities via Referrals",
      "AI Assistant to help you Plan your Campaigns",
      "Assistant to help you track your Career",
    ],
  },
  {
    title: "Stay productive",
    points: ["Track and Store Resumes", "Compare Resume Fit to JD"],
  },
  {
    title: "Become a Believer",
    points: ["We are in Public Beta and Free to Use until we figure the Target Market"],
  },
  {
    title: "Launch perks",
    points: ["Discounted Offers for Believers when we Launch"],
  },
];

export function WhySignUpSection() {
  return (
    <section
      className="relative z-10 py-14 md:py-20 px-4 sm:px-6 lg:px-8 border-t border-[#E8E4DC]/80"
      style={{ backgroundColor: landingTheme.creamDark }}
    >
      <div className="max-w-7xl mx-auto">
        <h2 className="font-poppins font-semibold text-2xl sm:text-3xl md:text-4xl text-center" style={{ color: landingTheme.ink }}>
          Why Should I Sign Up
        </h2>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {BLOCKS.map((block) => (
            <div
              key={block.title}
              className="rounded-2xl border bg-white p-6 shadow-sm"
              style={{ borderColor: "#E8E4DC" }}
            >
              <h3 className="font-poppins font-semibold text-lg" style={{ color: landingTheme.ink }}>
                {block.title}
              </h3>
              <ul className="mt-4 space-y-2">
                {block.points.map((p) => (
                  <li key={p} className="font-inter text-sm sm:text-base flex gap-2" style={{ color: landingTheme.muted }}>
                    <span className="font-bold shrink-0" style={{ color: landingTheme.brown }} aria-hidden>
                      ·
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
