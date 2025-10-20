/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import express from "express";
import cors from "cors";
import router from "./app/routes";
import http from "http";
import { global_error_handler } from "./app/middleware/global_error_handler";

import cookie_parser from "cookie-parser";
import path from "path";
import compression from "compression";

import helmet from "helmet";
import morgan from "morgan";

import { no_route_found } from "./app/utils/serverTools/no_route_found";
import { limiter } from "./app/utils/serverTools/rate_limit";
import { StripeController } from "./app/modules/stripe/stripe.controller";

const app = express();

const allowedOrigins = [
  "http://10.10.12.62:3000",
  "http://192.168.50.85:3000",
  "http://10.10.12.62:3001",
  "https://01t71ck4-3000.inc1.devtunnels.ms",
  "https://connect-to-class-dashboard.vercel.app",
  // Add your production domain here
];

const cors_options = {
  origin: function (origin: string | undefined, callback: Function) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
  credentials: true,
};

app.use(helmet());
app.use(morgan("combined"));
app.use(compression());
app.use(cors(cors_options));
app.use(cookie_parser());
//app.set("trust proxy", true);
app.use(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  StripeController.stripe_webhook
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(limiter);

app.use("/api", router);

app.get("/", (req, res) => {
  res.send("Hello World! This app name is TEST");
});

app.use(express.static(path.join(process.cwd(), "uploads")));

app.use(global_error_handler);
app.use(no_route_found);

const server = http.createServer(app);

export default server;
