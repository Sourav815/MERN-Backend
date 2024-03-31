import { Router } from "express";
import { userRegister, userFetch } from "../controllers/user.controller.js";
import upload from "../middlewares/multer.middleware.js";
const router = Router();

const cpUpload = upload.fields([
  { name: "avatar", maxCount: 1 },
  { name: "coverImage", maxCount: 1 },
]);
router.route("/registration").post(cpUpload, userRegister);
router.route("/getUser").get(userFetch);
export default router;
