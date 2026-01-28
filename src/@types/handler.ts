import axios, { Axios } from "axios";

export type TAction = <T>() => Promise<T>;
export type THandler = <T>(action: TAction, axios: Axios) => Promise<T | any>;

export interface IHandlerChain {
  next: (handler: THandler) => IHandlerChain;
}
