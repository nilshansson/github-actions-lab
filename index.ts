import express, { Request, Response, NextFunction } from "express";
import logger from "./logger";
import { db, outboxTable, paymentTable } from "./drizzle";
import { eq } from "drizzle-orm";
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
  await db.transaction(async (tx) => {
    const newOrder = await db
      .insert(paymentTable)
      .values({ carId: carId, amount: amount })
      .returning();
    logger.info({ message: "New order", newOrder });
    if (!newOrder) {
      throw new Error("no order error");
    }

    const newOutbox = await db
      .insert(outboxTable)
      .values({ data: JSON.stringify(newOrder) })
      .returning();
    logger.info({ message: "New outbox", newOutbox });
    if (!newOutbox[0]) {
      throw new Error("no outbox error");
    }

    const response = await fetch(
      "https://warehouseapp-ynorbbawua-uc.a.run.app/car",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newOutbox[0].data),
      }
    );

    logger.info({ message: "warehouse response", response });
    if (response.status !== 200) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (response.status === 200) {
      await db.delete(outboxTable).where(eq(outboxTable.id, newOutbox[0].id));
      logger.info("Success:", response);
      res.status(200).send("Success");
    }
  });
});

// async function outboxChecker(id: number) {
//   type OutboxType = typeof outboxTable.$inferSelect;

//     try {
//       const data: OutboxType = await db
//       .select()
//       .from(outboxTable)
//       .where(eq(outboxTable.id, id));

//       const response = await fetch(
//         "https://warehouseapp-ynorbbawua-uc.a.run.app/car",
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify(newOutbox[0].data),
//         }

// }

app.use("/", router);

app.listen(port, () => {
  logger.info({
    message: "Example app listening on port 8080!",
  });
});
