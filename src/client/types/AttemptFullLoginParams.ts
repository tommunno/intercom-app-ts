export type AttemptFullLoginParams =
  | {
      username: string;
      password: string;
      hideGuiErrors?: boolean;
    }
  | {
      username: null;
      password: null;
      hideGuiErrors?: boolean;
    };
