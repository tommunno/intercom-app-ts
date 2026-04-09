import { useEffect, useRef } from "react";
import { MAX_PARTYLINE_NAME_LENGTH } from "../../../../../shared/constants/sharedConstants.js";

export interface PlsSectionBannerProps {
  plNameColumnErr: boolean;
}

export function PlsSectionBanner({ plNameColumnErr }: PlsSectionBannerProps) {
  const sectionBannerRef = useRef<HTMLDivElement | null>(null);

  const prevPlNameColumnErrRef = useRef(plNameColumnErr);

  //Scroll to the error banner if it has gone from not visible to visible:
  useEffect(() => {
    if (
      !prevPlNameColumnErrRef.current &&
      plNameColumnErr &&
      sectionBannerRef.current
    ) {
      const offset = 20;
      const top =
        sectionBannerRef.current.getBoundingClientRect().top +
        window.pageYOffset -
        offset;

      window.scrollTo({
        top,
        behavior: "smooth",
      });
    }
    prevPlNameColumnErrRef.current = plNameColumnErr;
  }, [plNameColumnErr]);

  return (
    <div
      className={`pls-section-banner section-banner error${plNameColumnErr ? " visible" : ""}`}
      ref={sectionBannerRef}
    >
      <div className="section-banner-error-icon">🚫</div>
      <div className="section-banner-text">
        <p className="section-banner-title">Field Errors</p>
        <ul className="section-banner-messages">
          <li>{`Partyline name needs to be 1-${MAX_PARTYLINE_NAME_LENGTH} characters`}</li>
        </ul>
      </div>
    </div>
  );
}
