import express from "express";
import { errorMiddleware } from "./middlewares/error.middleware";
import userRouter from "./routes/user.router";
import authRouter from "./routes/auth.router";

const app = express();
const PORT = 8000;

// middleware
app.use(express.json());

// health check
app.get("/api", (req, res) => {
  res.send("Welcome to My API");
});

// routes
app.use("/users", userRouter); //ini buka profiles
app.use("/auth", authRouter);

// global error handler (HARUS PALING BAWAH)
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
