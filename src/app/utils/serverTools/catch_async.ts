/* eslint-disable no-console */
import { RequestHandler } from "express";

const catch_async =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) => {
    console.time();
    Promise.resolve(fn(req, res, next)).catch(next);
    console.timeEnd();
  };

export default catch_async;
