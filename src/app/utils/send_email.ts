/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import nodemailer from "nodemailer";
import HttpStatus from "http-status";
import { app_config } from "../config";
import logger from "./serverTools/logger";
import AppError from "../errors/AppError";

interface IEmailOptions {
  to: string;
  subject: string;
  code?: string;
  project_name?: string;
  expire_time?: number;
  supportUrl?: string;
  purpose?: string; // new field for dynamic verification purpose
}

export async function sendEmail({
  to,
  subject,
  code,
  project_name,
  expire_time = 10,
  purpose, // default if not provided
}: IEmailOptions) {
  try {
    const transporter = nodemailer.createTransport({
      host: app_config.email.host,
      port: Number(app_config.email.port),
      secure: false,
      auth: {
        user: app_config.email.user,
        pass: app_config.email.pass,
      },
    });

    const html = `
<html>
<head>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #eef2f7;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 480px;
      margin: 50px auto;
      padding: 40px 30px;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      text-align: center;
      color: #333333;
    }
    h1 {
      font-size: 26px;
      margin-bottom: 10px;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      margin: 12px 0;
    }
    .code {
      display: inline-block;
      font-size: 28px;
      font-weight: 700;
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: #ffffff;
      padding: 14px 28px;
      border-radius: 8px;
      margin: 20px 0;
      letter-spacing: 2px;
    }
    .footer {
      margin-top: 25px;
      font-size: 13px;
      color: #888888;
    }
    .footer a {
      color: #888888;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${purpose} Code</h1>
    <p>Use the code below to ${purpose?.toLowerCase()} for your <strong>${project_name}</strong> account.</p>
    <div class="code">${code}</div>
    <p>This code expires in ${expire_time} minutes.</p>

  </div>
</body>
</html>
`;

    const info = await transporter.sendMail({
      from: `"${project_name}" <${app_config.email.from}>`,
      to,
      subject,
      html,
    });

    return info;
  } catch (error: any) {
    logger.error("Error sending email", error);
    throw new AppError(HttpStatus.INTERNAL_SERVER_ERROR, "Error sending email");
  }
}
