import "dotenv/config";
import express from "express";
import cors from "cors";
import authRouter from "./modules/auth/auth.router";
import userRouter from "./modules/user/user.router";
import profileRouter from "./modules/profile/profile.router";
import organizerRouter from "./modules/organizer/organizer.router";
import ticketsRouter from "./modules/tickets/tickets.router";
import transactionsRouter from "./modules/transactions/transactions.router";

import { errorMiddleware } from "./middlewares/error.middleware";

const app = express();


// MIDDLEWARE GLOBAL

app.use(cors());
app.use(express.json());

// ROUTES
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/profile", profileRouter);
app.use("/api/organizer", organizerRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/transactions", transactionsRouter);



// ERROR HANDLER (PALING BAWAH)
app.use(errorMiddleware);

// RUN SERVER
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// REGISTER STATIC FOLDER
app.use("/uploads", express.static("uploads"));
