import morgan from "morgan";
import { morgan_stream } from "../utils/serverTools/logger";

export default morgan(
  ":remote-addr :method :url :status :res[content-length] - :response-time ms",
  { stream: morgan_stream }
);
