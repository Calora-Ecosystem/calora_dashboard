export type TAction = <T>() => Promise<T | void>;
export type THandler = <T>(action: TAction) => Promise<T | any>;

export interface IHandlerChain {
  next: (handler: THandler) => IHandlerChain;
}
