export type PortAvailabilityResult =
  | {
      isAvailable: true;
    }
  | {
      isAvailable: false;
      err: Error;
    };
