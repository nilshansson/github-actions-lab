import winston from "winston";

const { combine, timestamp, label, printf, colorize, json, prettyPrint } =
  winston.format;

const logger = winston.createLogger({
  level: "info", // Set the default log level
  format: winston.format.json(),
  transports: [
    // Log to the console
    new winston.transports.Console({
      format: colorize(),
    }),
  ],
});

export default logger;
