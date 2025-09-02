/* eslint-disable @typescript-eslint/no-unused-vars */
import { RequestHandler } from "express";

export const no_route_found: RequestHandler = (req, res, next) => {
  res.status(404).send({
    success: false,
    status_code: 404,
    message: "API not found!",
  });
};
