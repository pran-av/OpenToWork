import Image from "next/image";

const SAGE_MASCOT_SVG = "/sage_mascot.svg";
const SAGE_MASCOT_PNG = "/sage_mascot.png";

export type SageMascotPictureProps = {
  width: number;
  height: number;
  alt: string;
  className?: string;
  priority?: boolean;
};

/**
 * Prefers vector `sage_mascot.svg`; `sage_mascot.png` is the fallback for agents that skip SVG.
 */
export function SageMascotPicture({ width, height, alt, className, priority }: SageMascotPictureProps) {
  return (
    <picture>
      <source srcSet={SAGE_MASCOT_SVG} type="image/svg+xml" />
      <Image src={SAGE_MASCOT_PNG} alt={alt} width={width} height={height} className={className} priority={priority} />
    </picture>
  );
}
