import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import authRouter from "./authRouter";
import tracksRouter from "./tracksRouter";
import modernTrackRouter from "./modernTrackRouter";
import fusionRouter from "./fusionRouter";
import transactionRouter from "./transactionRouter";
import systemConfigRouter from "./systemConfiglRouter";

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : "*";

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.status(200).send('{ "Heritage in Code API is running."}');
});

app.use("/api/auth", authRouter);
app.use("/api/tracks", tracksRouter);
app.use("/api/modern", modernTrackRouter);
app.use("/api/fusion", fusionRouter);
app.use("/api/transactions", transactionRouter);

app.use("/api/tracks/admin", systemConfigRouter);
app.use("/api/payment", systemConfigRouter);

app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Allowed Origins: ${allowedOrigins}`);
});