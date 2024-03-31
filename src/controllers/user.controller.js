import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import User from "../model/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";

// const userRegister = (req, res, next) => {
//   Promise.resolve((req, res) => {
//     res.status(200).json({ message: "OK" });
//   }).catch((err) => next(err));
// };

const userRegister = asyncHandler(async (req, res) => {
  // getting data from frontend user
  const { username, fullname, email, password } = req.body;

  // validating the data
  // if ([username, email, fullname, password].some((field) => field?.trim() === "")) {
  //   throw new apiError(400, "All fields are required");
  // }
  if (!fullname || !username || !email || !password) {
    throw new apiError(400, "All fields are required");
  }

  // check user already exits ?
  const userExisted = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (userExisted) {
    throw new apiError(409, "Username and Email already exists");
  }

  // check for coverImage and avatar
  // upload in cloudinary
  // check for correct url response from cloudinary after successfull upload
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar Image required");
  }
  const avatarCloud = await uploadOnCloudinary(avatarLocalPath);
  const coverImageCloud = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatarCloud) {
    throw new apiError(400, "Avatar Image cloudinary url required");
  }

  // create user object in db
  const user = await User.create({
    fullname,
    email,
    username,
    avatar: avatarCloud.url,
    coverImage: coverImageCloud?.url || "",
    password,
  });

  // create a user object to respond, except password and refeshToken
  const createUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // check for user creation
  if (!createUser)
    throw new apiError(
      500,
      "Something went wrong while creating user in database"
    );

  // return response
  return res
    .status(201)
    .json(new apiResponse(200, createUser, "User registration successfull"));
});

const userFetch = asyncHandler(async(req,res)=>{
  const allUser = await User.find().select("-password");
  return res.status(201).json(allUser);
});

export {userRegister, userFetch};
