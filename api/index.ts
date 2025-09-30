import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import stepsRouter from "./routes/steps";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use("/api", stepsRouter);

app.get("/", (req, res) => {
  res.json({ message: "Step Counter API is live!" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
