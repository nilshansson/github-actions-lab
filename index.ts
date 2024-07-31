import express, { Request, Response, NextFunction } from "express";
import logger from "./logger";
import { db, outboxTable, paymentTable } from "./drizzle";
import { eq } from "drizzle-orm";
const app = express();
const router = express.Router();

const port = 8081;
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
  const newIds = await db.transaction(async (tx) => {
    const newOrder = await tx
      .insert(paymentTable)
      .values({ carId: carId, amount: amount })
      .returning();
    logger.info({ message: "New order", newOrder });
    if (!newOrder) {
      throw new Error("no order error");
    }

    const newOutbox = await tx
      .insert(outboxTable)
      .values({ data: JSON.stringify(newOrder) })
      .returning();
    logger.info({ message: "New outbox", newOutbox });
    if (!newOutbox[0]) {
      throw new Error("no outbox error");
    }
    if (!newOrder[0]) {
      throw new Error("no order error");
    }

    const newCarId = newOrder[0].carId;
    const newId = newOutbox[0].id;
    return { newCarId, newId };
  });

  try {
    const response = await fetch(
      "https://warehouseapp-ynorbbawua-uc.a.run.app/car",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: newIds.newCarId,
      },
    );

    logger.info({ message: "warehouse response", response });
    if (response.status !== 200) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (response.status === 200) {
      await db.delete(outboxTable).where(eq(outboxTable.id, newIds.newId));
      logger.info("Success:", response);
      res.status(200).send("Success");
    }
  } catch {
    throw new Error("fetch failed");
  }
});

app.use("/", router);

app.listen(port, () => {
  logger.info({
    message: "Example app listening on port 8080!",
  });
});
