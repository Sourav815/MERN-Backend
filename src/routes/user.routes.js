import { Router } from "express";
import {
  userRegister,
  userLogin,
  userLogOut,
  refeshAccessToken,
  changePassword,
  getCurrentUser,
  userDetailsUpdate,
  userAvatarUpdate,
  userCoverImageUpdate,
} from "../controllers/user.controller.js";
import upload from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

const avatarAndCoverImage = upload.fields([
  { name: "avatar", maxCount: 1 },
  { name: "coverImage", maxCount: 1 },
]);

const avatar = upload.single('avatar');
const coverImage = upload.single('coverImage');

router.route("/registration").post(avatarAndCoverImage, userRegister);
router.route("/login").post(userLogin);

// ## secure route, only accessed when user is logged in
router.route("/logout").post(verifyJWT, userLogOut);
router.route("/refesh-accessToken").get(refeshAccessToken);

// user details update
router.route("/password-change").post(verifyJWT, changePassword);
router.route("/update-user-details").post(verifyJWT, userDetailsUpdate);
router.route("/update-avater").post(verifyJWT, avatar, userAvatarUpdate);
router.route("/update-cover-image").post(verifyJWT, coverImage, userCoverImageUpdate);

// fetch current user
router.route("/get-current-user").get(verifyJWT, getCurrentUser);

export default router;
