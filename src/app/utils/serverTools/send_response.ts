import { Response } from "express";

interface IMeta {
  total_item: number;
  total_page: number;
  limit: number;
  page: number;
}

interface IResponse<T> {
  success: boolean;
  message: string;
  status_code: number;
  data: T;
  meta?: IMeta;
}

const send_response = <T>(res: Response, data: IResponse<T>): void => {
  res.status(data.status_code).send({
    success: data.success,
    message: data.message,
    status_code: data.status_code,
    data: data.data,
    meta: data.meta,
  });
};

export default send_response;
