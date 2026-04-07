import {
  MAX_PASSWORD_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "../../../shared/constants/sharedConstants.js";
import { dataIsType } from "../../../shared/helpers.js";
import type { IClientLogger } from "../../shared/contracts/index.js";

export function sanitizeUsername(name: string): string {
  return name.trim();
}

export function validateUsername(name: string): boolean {
  return name.length > 0 && name.length <= MAX_USERNAME_LENGTH;
}

//No password is also valid here (an admin doesn't have to type a password into the field, the field can be blank)
export function validatePassword(password: string): boolean {
  return (
    (password.length === 0 || password.length >= MIN_PASSWORD_LENGTH) &&
    password.length <= MAX_PASSWORD_LENGTH
  );
}

export function createAllowedPlsString(
  allowedPls: number[],
  logger: IClientLogger,
): string {
  if (allowedPls.length === 0) return "";

  const pls = Array.from(new Set(allowedPls))
    .filter((n) => n >= 0)
    .sort((a, b) => a - b);

  const plRanges: number[][] = [];

  let currentRange: number[] = [];

  pls.forEach((pl) => {
    const lastValInRange = currentRange.at(-1);
    //If currentRange is empty, add in the pl to it:
    if (lastValInRange === undefined) {
      currentRange.push(pl);
      return;
    }
    //If currentRange has something in, if the pl is one more than the last value, add it to the currentRange array:
    if (pl === lastValInRange + 1) {
      currentRange.push(pl);
      return;
    }
    //Otherwise, push the currentRange array into plRanges, and initialize the currentRange arr with pl:
    plRanges.push(currentRange);
    currentRange = [pl];
  });
  plRanges.push(currentRange);

  let result = "";
  plRanges.forEach((plRange, i) => {
    const firstVal = plRange[0];
    if (firstVal === undefined) {
      logger.error(
        `createAllowedPlsString: Invariant violation: firstVal is undefined for plRange and index ${i}`,
      );
      return;
    }
    if (i !== 0) {
      result += ", ";
    }
    //+1 because Pls start at index 1 for the user!:
    result += String(firstVal + 1);

    if (plRange.length <= 1) return;

    const lastVal = plRange.at(-1);
    if (lastVal !== undefined) {
      //+1 because Pls start at index 1 for the user!:
      result += "-" + String(lastVal + 1);
    }
  });
  return result;
}

export function createAllowedPlsSetOrNull(
  inputStr: string,
  numPls: number,
  logger: IClientLogger,
): Set<number> | null {
  const trimmedInputStr = inputStr.trim();
  if (trimmedInputStr === "") return new Set();
  const ranges: string[] = trimmedInputStr.split(",");
  const output: Set<number> = new Set();
  let rangeArr: string[];
  for (const range of ranges) {
    rangeArr = range.split("-");
    let lastVal: number | null = null;
    for (const val of rangeArr) {
      const trimmed = val.trim();
      if (trimmed === "") continue;
      //Take one away from the user provided value, because pls are indexed as 1 for the user, and as 0 for the backend:
      const numVal = Number(trimmed) - 1;
      if (!isPlValid(numVal, numPls)) {
        return null;
      }
      if (lastVal === null) {
        output.add(numVal);
        lastVal = numVal;
        continue;
      }
      const amountToAdd = numVal - lastVal;
      if (amountToAdd <= 0) {
        logger.warn(
          `createAllowedPlsSetOrNull: Invalid value: the last value in a range needs to be greater than the first value`,
        );
        return null;
      }
      for (let i = 0; i < amountToAdd; i++) {
        output.add(lastVal + i + 1);
      }
      lastVal = numVal;
    }
  }
  return output;
}

export function doAllowedPlsMatch(
  aPlA: Set<number> | "INVALID",
  aPlB: Set<number> | "INVALID",
): boolean {
  // INVALID never matches, even with another INVALID
  // (similar to how NaN !== NaN)
  if (aPlA === "INVALID" || aPlB === "INVALID") {
    return false;
  }
  if (aPlA.size !== aPlB.size) {
    return false;
  }
  for (const value of aPlA) {
    if (!aPlB.has(value)) {
      return false;
    }
  }
  return true;
}

export function isPlValid(pl: number, numPls: number): boolean {
  const isValid = dataIsType("safeIntegerNum", pl) && pl >= 0 && pl < numPls;
  return isValid;
}
