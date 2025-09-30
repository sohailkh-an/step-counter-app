import { Router, Request, Response } from "express";
import Step, { IStep } from "../models/Step";

const router = Router();

router.get("/health", (req: Request, res: Response) => {
  console.log("Health api endpoint hit");
  res.status(200).json({ message: "Healthy..API ready to accept requests" });
});

router.post("/steps", async (req: Request, res: Response) => {
  try {
    const stepData: Partial<IStep> = {
      userId: req.body.userId,
      timestamp: new Date(req.body.timestamp),
      steps: req.body.steps,
    };

    console.log("Recieved request: ", stepData);

    if (!stepData.userId || !stepData.steps || !stepData.timestamp) {
      return res
        .status(400)
        .json({ error: "userId, steps, and timestamp are required" });
    }

    const newStep = new Step(stepData);
    const savedStep = await newStep.save();

    res.status(201).json({ message: "Step data saved", data: savedStep });
  } catch (error) {
    console.error("Error saving step:", error);
    res.status(500).json({ error: "Failed to save step data" });
  }
});

router.get("/steps", async (req: Request, res: Response) => {
  console.log("Steps endpoint got hit!");
  try {
    const { userId, startDate, endDate, aggregate, limit, sort } = req.query;
    let query: any = { userId };

    if (startDate) {
      query.timestamp = query.timestamp || {};
      query.timestamp.$gte = new Date(startDate as string);
    }
    if (endDate) {
      query.timestamp = query.timestamp || {};
      query.timestamp.$lte = new Date(endDate as string);
    }

    if (aggregate === "sum") {
      const pipeline = [
        { $match: query },
        { $group: { _id: null, totalSteps: { $sum: "$steps" } } },
      ];
      const result = await Step.aggregate(pipeline);
      res.json({ total: result[0]?.totalSteps || 0 });
    } else {
      const stepsQuery = Step.find(query);
      if (sort === "-timestamp") {
        stepsQuery.sort({ timestamp: -1 });
      } else {
        stepsQuery.sort({ timestamp: 1 });
      }
      if (limit) {
        stepsQuery.limit(parseInt(limit as string));
      }
      const steps = await stepsQuery.exec();
      res.json({ data: steps });
    }
  } catch (error) {
    console.error("Error fetching steps:", error);
    res.status(500).json({ error: "Failed to fetch steps" });
  }
});

export default router;
