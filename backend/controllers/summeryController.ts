import { Request, Response } from "express";
import { getSummeryData } from "../utils/summeryServices";

export const getSummery = async (req: Request, res: Response) => {
  const { timePeriod } = req.query as { timePeriod?: string };
  try {
    const data = await getSummeryData(timePeriod);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};
