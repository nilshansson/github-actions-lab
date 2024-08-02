import express, { Request, Response, NextFunction } from "express";
import logger from "./logger";
import { db, outboxTable, orderTable } from "./drizzle";
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

app.post("/orders", async (req: Request, res: Response) => {
  const { carId, orderStatus } = req.body;

  if (!carId || !orderStatus) {
    logger.error({
      message: "Invalid request data. Car ID or/and car status is not entered",
    });
    return res.status(400).json({ error: "Invalid input data." });
  }

  logger.info({ message: "/order requested", carId, orderStatus });

  try {
    await db.transaction(async (tx) => {
      const newOrder = await tx
        .insert(orderTable)
        .values({
          carId: carId,
          orderDate: new Date(Date.now()),
          orderStatus: orderStatus,
        })
        .returning();

      if (!newOrder[0]) {
        logger.error("Failed to insert order record");
        await tx.rollback();
        return res
          .status(500)
          .json({ error: "Failed to create order record." });
      }

      logger.info({ message: "New order order created", newOrder });

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
            "https://warehouse-app-ynorbbawua-uc.a.run.app/car",
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

          await tx2.delete(outboxTable).where(eq(outboxTable.id, newId));
          logger.info("order process completed successfully");
          return res
            .status(200)
            .json({ message: "order processed successfully" });
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
