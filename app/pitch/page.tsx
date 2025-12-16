"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronUp, Music, Music2 } from "lucide-react";
import Link from "next/link";
import { useElevatorMusic } from "../useElevatorMusic";

// Floor data
const floors = [
  { id: "ground", label: "G", title: "Introduction", name: "Ground Floor" },
  { id: "first", label: "1", title: "Under Construction", name: "First Floor" },
  { id: "second", label: "2", title: "Under Construction", name: "Second Floor" },
  { id: "third", label: "3", title: "Under Construction", name: "Third Floor" },
  { id: "fourth", label: "4", title: "Under Construction", name: "Fourth Floor" },
  { id: "fifth", label: "5", title: "Under Construction", name: "Fifth Floor" },
  { id: "sixth", label: "6", title: "Under Construction", name: "Sixth Floor" },
  { id: "seventh", label: "7", title: "Under Construction", name: "Seventh Floor" },
];

export default function PitchPage() {
  const [currentFloor, setCurrentFloor] = useState("ground");
  const [expandedButton, setExpandedButton] = useState<string | null>(null);
  const { isMusicOn, toggleMusic } = useElevatorMusic();
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<{ [key: string]: HTMLElement | null }>({});

  // Initialize scroll position to bottom (Ground Floor)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  // Handle scroll to update current floor
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const scrollTop = containerRef.current.scrollTop;
      const windowHeight = window.innerHeight;
      const scrollBottom = containerRef.current.scrollHeight - windowHeight;
      const scrollPosition = scrollBottom - scrollTop;
      const currentSection = Math.floor(scrollPosition / windowHeight);

      const floorKeys = ["ground", "first", "second", "third", "fourth", "fifth", "sixth", "seventh"];
      if (floorKeys[currentSection] !== undefined) {
        setCurrentFloor(floorKeys[currentSection]);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      handleScroll();
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const scrollToFloor = (floorId: string) => {
    const section = sectionsRef.current[floorId];
    if (section && containerRef.current) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  const getCurrentFloorName = () => {
    const floor = floors.find((f) => f.id === currentFloor);
    return floor ? floor.name : "Ground Floor";
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Fixed Background Image with Overlay */}
      <div className="fixed inset-0 z-0">
        <picture className="absolute inset-0">
          <source srcSet="/elevator-background-avif.avif" type="image/avif" />
          <source srcSet="/elevator-background-webp.webp" type="image/webp" />
          <img
            src="/elevator-background-browser-jpeg.jpg"
            alt="Elevator background"
            className="absolute inset-0 w-full h-full object-cover object-center"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </picture>
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "#FFE4B9", opacity: 0.64 }}
        />
      </div>

      {/* Fixed Elements */}
      <div className="fixed inset-0 z-10 pointer-events-none">
        {/* Elevator Music Toggle - Top Right */}
        <button
          onClick={toggleMusic}
          className="absolute top-6 right-6 z-20 pointer-events-auto w-6 h-6 flex items-center justify-center"
          aria-label={isMusicOn ? "Turn off music" : "Turn on music"}
        >
          {isMusicOn ? (
            <Music className="w-6 h-6 text-black" />
          ) : (
            <Music2 className="w-6 h-6 text-black" />
          )}
        </button>

        {/* Floor Indicator - Center Bottom */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[203px] h-[45px] bg-[#FFFED3] border-2 border-black rounded-t-[25px] flex items-center justify-center pointer-events-none z-50">
          <span className="font-inter text-base text-black">{getCurrentFloorName()}</span>
        </div>

        {/* Elevator Buttons - Left Side */}
        <div className="absolute left-0 bottom-[15%] flex flex-col-reverse gap-[25px] pointer-events-auto">
          {floors.map((floor) => (
            <div key={floor.id} className="relative">
              <button
                onClick={() => scrollToFloor(floor.id)}
                onMouseEnter={() => setExpandedButton(floor.id)}
                onMouseLeave={() => setExpandedButton(null)}
                className={`relative bg-[#FFFED3] border-2 border-black rounded-r-[15px] transition-all duration-300 ${
                  expandedButton === floor.id ? "pr-[25px] pl-[25px]" : "w-12"
                } h-12 flex items-center justify-center font-inter font-bold text-base text-black`}
              >
                <span>{floor.label}</span>
                {expandedButton === floor.id && (
                  <span className="ml-2 whitespace-nowrap">{floor.title}</span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable Content Container */}
      <div
        ref={containerRef}
        className="relative h-full w-full pl-4 pb-4 overflow-y-auto"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black calc(100% - 85px), transparent 98%)",
          maskImage: "linear-gradient(to bottom, black 0%, black calc(100% - 85px), transparent 98%)",
        }}
      >
        {/* First Floor - Dummy content for testing */}
        {/* Commented out for release
        <section
          ref={(el: HTMLElement | null) => {
            sectionsRef.current.first = el;
          }}
          className="min-h-screen flex items-center justify-center p-4"
        >
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4 text-black">First Floor</h2>
            <p className="text-lg text-black">Dummy content for testing upward scroll</p>
          </div>
        </section>
        */}

        {/* Ground Floor - Hero Section */}
        <section
          ref={(el: HTMLElement | null) => {
            sectionsRef.current.ground = el;
          }}
          className="min-h-screen flex flex-col items-center p-4 relative"
          style={{ paddingBottom: "0x", justifyContent: "flex-start", paddingTop: "5rem" }}
        >
          {/* Hero Content - Ordered: Title, How to Cards, CTA, Scroll Up indicator */}
          <div className="flex flex-col items-center text-center w-full max-w-4xl">
            {/* Title Section - 277px width, Pitch on new line, Beta after Pitch */}
            <div className="flex flex-col items-center space-y-2 mb-8" style={{ width: "277px" }}>
              <span className="font-inter font-bold text-xl text-black">create your own</span>
              <div className="relative flex flex-col items-center gap-2">
                <h1 className="font-comic-neue font-bold text-[64px] text-[#2F0057] leading-tight text-center">
                  Elevator
                  <br />
                  Pitch
                </h1>
                <span className="absolute top-[80%] right-[-13%] -translate-y-1/2 bg-[#FFF6AC] px-3 py-1 rounded-[10px] font-inter font-bold text-xl text-black">
                  BETA
                </span>
              </div>
              <span className="font-inter font-bold text-xl text-black">in minutes</span>
            </div>

            {/* How to Use Cards - Tablet + Desktop: static, only original 3 cards centered without diffusion effect*/}
            <div className="hidden sm:flex gap-4 justify-center">
              {/* Card 1 */}
              <div className="shrink-0 shadow-2xl w-[177px] h-[207px] md:w-[208px] md:h-[265px] bg-[#FFE3E3] rounded-[10px] flex flex-col relative overflow-hidden">
                <div className="p-4 relative z-10">
                  <h3 className="font-inter font-semibold text-xl text-black text-center mb-2">
                    Create a
                    <br />
                    Pitch
                  </h3>
                </div>
                <div className="absolute inset-x-0 bottom-4 h-[120px] md:h-[180px]">
                  <Image
                    src="/case_study_cta_modified_3d.png"
                    alt="Create a Pitch"
                    fill
                    className="object-cover w-full h-full"
                    sizes="(max-width: 768px) 177px, 208px"
                    quality={90}
                  />
                </div>
              </div>

              {/* Card 2 */}
              <div className="shrink-0 shadow-2xl w-[177px] h-[207px] md:w-[208px] md:h-[265px] bg-[#FFE3E3] rounded-[10px] flex flex-col relative overflow-hidden">
                <div className="p-4 relative z-10">
                  <h3 className="font-inter font-semibold text-xl text-black text-center mb-2">
                    Publish the<br />Pitch
                  </h3>
                </div>
                <div className="absolute inset-x-0 bottom-4 h-[120px] md:h-[180px]">
                  <Image
                    src="/publish_cta_3d.png"
                    alt="Publish the Pitch"
                    fill
                    className="object-cover w-full h-full"
                    sizes="(max-width: 768px) 177px, 208px"
                    quality={90}
                  />
                </div>
              </div>

              {/* Card 3 */}
              <div className="shrink-0 shadow-2xl w-[177px] h-[207px] md:w-[208px] md:h-[265px] bg-[#FFE3E3] rounded-[10px] flex flex-col relative overflow-hidden">
                <div className="p-4 relative z-10">
                  <h3 className="font-inter font-semibold text-xl text-black text-center mb-2">
                    Copy and Share Pitch
                  </h3>
                </div>
                <div className="absolute inset-x-0 bottom-4 h-[120px] md:h-[180px]">
                  <Image
                    src="/copy_share_url_3d.png"
                    alt="Copy and Share Pitch"
                    fill
                    className="object-cover w-full h-full"
                    sizes="(max-width: 768px) 177px, 208px"
                    quality={90}
                  />
                </div>
              </div>
            </div>

            {/* How to Use Cards - Mobile: Horizontal Autoscroll with gradient mask + blur */}
            <div
              className="absolute bottom-[200px] overflow-hidden mb-4 sm:hidden"
              style={{
                left: "15px",
                height: "207px",
                width: "calc(100% - 10px)",
              }}
            >
              {/* Mask wrapper with blur effect - matches .gradient-mask pattern */}
              <div
                className="h-full w-full"
                style={{
                  position: "relative",
                  backdropFilter: "blur(5px)",
                  WebkitBackdropFilter: "blur(5px)",
                  WebkitMaskImage: "linear-gradient(to left, black 0%, black 90%, transparent 98%)",
                  maskImage: "linear-gradient(to left, black 0%, black 90%, transparent 98%)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {/* Mobile only: autoscroll with duplicates */}
                <div className="flex gap-4 animate-scroll">
                  {/* Card 1 */}
                  <div className="drop-shadow-2xl shrink-0 w-[177px] h-[207px] bg-[#FFE3E3] rounded-[10px] flex flex-col relative overflow-hidden">
                    <div className="p-4 relative z-10">
                      <h3 className="font-inter font-semibold text-xl text-black text-center mb-2">
                        Create a
                        <br />
                        Pitch
                      </h3>
                    </div>
                    <div className="absolute inset-x-0 bottom-4 h-[120px]">
                      <Image
                        src="/case_study_cta_modified_3d.png"
                        alt="Create a Pitch"
                        fill
                        className="object-cover w-full h-full"
                        sizes="177px"
                        quality={90}
                      />
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="shrink-0 drop-shadow-2xl w-[177px] h-[207px] bg-[#FFE3E3] rounded-[10px] flex flex-col relative overflow-hidden">
                    <div className="p-4 relative z-10">
                      <h3 className="font-inter font-semibold text-xl text-black text-center mb-2">
                        Publish the Pitch
                      </h3>
                    </div>
                    <div className="absolute inset-x-0 bottom-4 h-[120px]">
                      <Image
                        src="/publish_cta_3d.png"
                        alt="Publish the Pitch"
                        fill
                        className="object-cover w-full h-full"
                        sizes="177px"
                        quality={90}
                      />
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="shrink-0 drop-shadow-2xl w-[177px] h-[207px] bg-[#FFE3E3] rounded-[10px] flex flex-col relative overflow-hidden">
                    <div className="p-4 relative z-10">
                      <h3 className="font-inter font-semibold text-xl text-black text-center mb-2">
                        Copy and Share Pitch
                      </h3>
                    </div>
                    <div className="absolute inset-x-0 bottom-4 h-[120px]">
                      <Image
                        src="/copy_share_url_3d.png"
                        alt="Copy and Share Pitch"
                        fill
                        className="object-cover w-full h-full"
                        sizes="177px"
                        quality={90}
                      />
                    </div>
                  </div>

                  {/* Duplicate cards for infinite scroll */}
                  <div className="shrink-0 drop-shadow-2xl w-[177px] h-[207px] bg-[#FFE3E3] rounded-[10px] flex flex-col relative overflow-hidden">
                    <div className="p-4 relative z-10">
                      <h3 className="font-inter font-semibold text-xl text-black text-center mb-2">
                        Create a
                        <br />
                        Pitch
                      </h3>
                    </div>
                    <div className="absolute inset-x-0 bottom-4 h-[120px]">
                      <Image
                        src="/case_study_cta_modified_3d.png"
                        alt="Create a Pitch"
                        fill
                        className="object-cover w-full h-full"
                        sizes="177px"
                        quality={90}
                      />
                    </div>
                  </div>

                  <div className="shrink-0 drop-shadow-2xl w-[177px] h-[207px] bg-[#FFE3E3] rounded-[10px] flex flex-col relative overflow-hidden">
                    <div className="p-4 relative z-10">
                      <h3 className="font-inter font-semibold text-xl text-black text-center mb-2">
                        Publish the Pitch
                      </h3>
                    </div>
                    <div className="absolute inset-x-0 bottom-4 h-[120px]">
                      <Image
                        src="/publish_cta_3d.png"
                        alt="Publish the Pitch"
                        fill
                        className="object-cover w-full h-full"
                        sizes="177px"
                        quality={90}
                      />
                    </div>
                  </div>

                  <div className="shrink-0 drop-shadow-2xl w-[177px] h-[207px] bg-[#FFE3E3] rounded-[10px] flex flex-col relative overflow-hidden">
                    <div className="p-4 relative z-10">
                      <h3 className="font-inter font-semibold text-xl text-black text-center mb-2">
                        Copy and Share Pitch
                      </h3>
                    </div>
                    <div className="absolute inset-x-0 bottom-4 h-[120px]">
                      <Image
                        src="/copy_share_url_3d.png"
                        alt="Copy and Share Pitch"
                        fill
                        className="object-cover w-full h-full"
                        sizes="177px"
                        quality={90}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scroll Up Indicator - Mobile/Tablet: center, Desktop: bottom right */}
            {/* Commented out for release
            <div className="absolute bottom-[40px] flex flex-col items-center left-1/2 -translate-x-1/2 lg:left-auto lg:right-8 lg:translate-x-0">
              {[0, 1, 2].map((index) => (
                <ChevronUp
                  key={index}
                  className={`w-12 h-12 text-black/60 animate-bounce ${index !== 0 ? "-mt-[27px]" : ""}`}
                  style={{
                    animationDelay: `${index * 0.1}s`,
                    animationDuration: "2.5s",
                  }}
                />
              ))}
              <span className="font-inter text-xs text-black -mt-[10px]">scroll up</span>
            </div>
            */}
          </div>

          {/* CTA Button - Aligned with Ground button level (bottom 20% of viewport) */}
          <Link
            href="https://elevateyourpitch.netlify.app/auth"
            className="uppercase font-inter font-semibold text-lg text-black bg-white border-2 border-black rounded-[5px] px-6 py-3 hover:bg-gray-100 transition-colors mb-8"
            style={{ position: "absolute", bottom: "10%", left: "50%", transform: "translateX(-50%)" }}
          >
            Create Pitch
          </Link>
        </section>
      </div>
    </div>
  );
}
