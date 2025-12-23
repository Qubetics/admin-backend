import { Router } from "express";

export interface IESResponse {
  error?: boolean;
  data?: object | object[];
  message?: string;
  status?: number;
}

export interface Controller {
  router: Router;
}

export type Status = "PENDING" | "APPROVED" | "REJECTED" | "undefined";

export type RequestType = "Link" | "Unlink";

export interface ActivityMeta {
  provAddress?: string;
  bandwidth?: string | number;
  plan?: any;
  [key: string]: any;
}
