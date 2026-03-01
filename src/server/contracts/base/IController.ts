export interface IController {
  init: () => Promise<void>;
  start: () => Promise<void>;
}
