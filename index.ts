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

  if (!carId || typeof amount !== "number" || !Number.isInteger(amount)) {
    logger.error({
      message:
        "Invalid request data. Car ID and amount are required, and amount must be an integer.",
    });
    return res.status(400).json({ error: "Invalid input data." });
  }

  logger.info({ message: "/payment requested", carId, amount });

  try {
    await db.transaction(async (tx) => {
      const newOrder = await tx
        .insert(paymentTable)
        .values({
          carId: carId,
          amount: amount,
          paymentStatus: "pending", // Set the initial payment status
        })
        .returning();

      if (!newOrder[0]) {
        logger.error("Failed to insert payment record");
        await tx.rollback();
        return res
          .status(500)
          .json({ error: "Failed to create payment record." });
      }

      logger.info({ message: "New payment order created", newOrder });

      const newOutbox = await tx
        .insert(outboxTable)
        .values({ data: JSON.stringify(newOrder) })
        .returning();

      if (!newOutbox[0]) {
        logger.error("Failed to insert outbox record");
        await tx.rollback();
        return res
          .status(500)
          .json({ error: "Failed to create outbox record." });
      }

      logger.info({ message: "New outbox record created", newOutbox });

      const newId = newOutbox[0].id;

      await tx.transaction(async (tx2) => {
        try {
          const response = await fetch(
            "https://warehouseapp-ynorbbawua-uc.a.run.app/car",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ carId }),
            },
          );

          logger.info({
            message: "Warehouse response received",
            status: response.status,
          });

          if (response.status !== 200) {
            logger.error(`Warehouse API error! status: ${response.status}`);
            await tx2.rollback();
            return res
              .status(response.status)
              .json({ error: "Warehouse API error." });
          }

          // If successful, delete the outbox entry
          await tx2.delete(outboxTable).where(eq(outboxTable.id, newId));
          logger.info("Payment process completed successfully");
          return res
            .status(200)
            .json({ message: "Payment processed successfully" });
        } catch (error) {
          logger.error("Failed to complete fetch request", error);
          await tx2.rollback();
          return res.status(500).json({ error: "External API request failed" });
        }
      });
    });
  } catch (error) {
    logger.error("Transaction failed", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.use("/", router);

app.listen(port, () => {
  logger.info({
    message: "Example app listening on port 8080!",
  });
});
