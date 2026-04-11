import { useEffect, useRef } from "react";
import {
  MAX_PASSWORD_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "../../../../../shared/constants/sharedConstants.js";
import type { UsersSectionColumnErrs } from "./UsersSection.js";

export interface UsersSectionBannerProps {
  columnErrs: UsersSectionColumnErrs;
  numPls: number;
}

export function UsersSectionBanner({
  columnErrs,
  numPls,
}: UsersSectionBannerProps) {
  const { usernameErr, passwordErr, allowedPlsErr, usernameClashesErr } =
    columnErrs;
  const sectionBannerRef = useRef<HTMLDivElement | null>(null);

  const columnErrsVisible = Object.values(columnErrs).some((e) => e === true);
  const prevColumnErrsVisibleRef = useRef<boolean>(columnErrsVisible);

  //Scroll to the error banner if it has gone from not visible to visible:
  useEffect(() => {
    if (
      !prevColumnErrsVisibleRef.current &&
      columnErrsVisible &&
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
    prevColumnErrsVisibleRef.current = columnErrsVisible;
  }, [columnErrsVisible]);

  return (
    <div
      className={`users-section-banner section-banner error${columnErrsVisible ? " visible" : ""}`}
      ref={sectionBannerRef}
    >
      <div className="section-banner-error-icon">🚫</div>
      <div className="section-banner-text">
        <p className="section-banner-title">Field Errors</p>
        <ul className="section-banner-messages">
          {usernameErr && (
            <li>{`Username must be 1-${MAX_USERNAME_LENGTH} characters`}</li>
          )}
          {passwordErr && (
            <li>{`Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters`}</li>
          )}
          {allowedPlsErr && (
            <li>{`Allowed PLs must be 1-${numPls} in format '2, 4-6, 8'`}</li>
          )}
          {usernameClashesErr && <li>{"Usernames must be unique"}</li>}
        </ul>
      </div>
    </div>
  );
}
