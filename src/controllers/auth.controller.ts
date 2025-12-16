import { Request, Response } from "express";
import { registerService } from "../services/auth.service";

export const registerController = async (req: Request, res: Response) => {
    const result = await registerService(req.body);

    return res.status(201).json({
        message: "Register successful",
        data: result
    });
};
