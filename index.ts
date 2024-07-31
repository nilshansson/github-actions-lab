import express, { Request, Response, NextFunction } from "express";
import logger from "./logger";
import { db, outboxTable, paymentTable } from "./drizzle";

const app = express();
const router = express.Router();

const port = 8080;
app.use(express.json());

router.use((req: Request, res: Response, next: NextFunction) => {
  logger.info({ message: "/" + req.method });
  next();
});

router.get("/status", (req: Request, res: Response) => {
  logger.info("status checked");
  res.status(200).send();
});

app.post("/payments", async (req: Request, res: Response) => {
  const { carId, amount } = req.body;

  logger.info({ message: "info", carId, amount });
  logger.warn({ message: "warning ", carId, amount });
  if (typeof amount !== "number" || !Number.isInteger(amount)) {
    logger.log({
      message: "Invalid amount. It must be an integer.",
      level: "error",
    });
    return res
      .status(400)
      .json({ error: "Invalid amount. It must be an integer." });
  }

  const newOrder = await db
    .insert(paymentTable)
    .values({ carId: carId, amount: amount })
    .returning();
  const newOutbox = await db
    .insert(outboxTable)
    .values({ data: JSON.stringify(newOrder) });
  logger.info({
    level: "info",
    message: "Payment processed successfully",
    carId,
    amount,
  });
  res
    .status(201)
    .json({ message: "Payment processed successfully", carId, amount });
});

app.use("/", router);

app.listen(port, () => {
  logger.info({
    message: "Example app listening on port 8080!",
  });
});
