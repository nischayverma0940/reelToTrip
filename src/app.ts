import express from "express";
import healthRoute from "./api/health.route";
import interpretRoute from "./api/interpret.route";
import researchRoute from "./api/research.route";
import tripRoute from "./api/trip.route";
import budgetRoute from "./api/budget.route";
import pipelineRoute from "./api/pipeline.route";
import conversationRoute from "./api/conversation.route";

const app = express();

app.use(express.json());
app.use("/health", healthRoute);
app.use("/interpret", interpretRoute);
app.use("/research", researchRoute);
app.use("/trip", tripRoute);
app.use("/budget", budgetRoute);
app.use("/pipeline", pipelineRoute);
app.use("/conversation", conversationRoute);

export default app;
