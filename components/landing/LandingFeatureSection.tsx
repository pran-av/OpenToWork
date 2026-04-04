import type { ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  visual: ReactNode;
  /** When true, visual column appears on the left on large screens. */
  visualFirst?: boolean;
};

export function LandingFeatureSection({ title, description, visual, visualFirst }: Props) {
  const copy = (
    <div>
      <h2 className="font-poppins font-semibold text-2xl sm:text-3xl md:text-4xl text-gray-900 leading-tight">
        {title}
      </h2>
      <p className="font-inter text-base sm:text-lg text-[#74777F] mt-4 leading-relaxed max-w-xl">
        {description}
      </p>
    </div>
  );

  const viz = <div className="min-h-[200px]">{visual}</div>;

  return (
    <section className="relative z-10 py-14 md:py-20 px-4 sm:px-6 lg:px-8 border-t border-orange-100/80">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {visualFirst ? (
            <>
              <div className="order-2 lg:order-1">{viz}</div>
              <div className="order-1 lg:order-2">{copy}</div>
            </>
          ) : (
            <>
              <div>{copy}</div>
              <div>{viz}</div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
