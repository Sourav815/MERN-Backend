import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import User from "../model/user.model.js";

const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new apiError(401, "Unauthorized access!");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new apiError(401, "Invalid ACCESS_TOKEN");
    }

    req.user = user;

    next();
  } catch (error) {
    throw new apiError(
      401,
      error?.message || "Invalid json token (not matched)"
    );
  }
});

export { verifyJWT };
