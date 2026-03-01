export interface IController {
  init: () => Promise<void>;
  start: () => void;
}
