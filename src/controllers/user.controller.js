import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import User from "../model/user.model.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

// Generate accessToken and refreshToken using userID
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById({ _id: userId });

    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { refreshToken, accessToken };
  } catch (error) {
    console.log(error);
    throw new apiError(500, "Error while generating ACCESS and REFRESH token!");
  }
};

// Get public ID from image url
const getCloudinaryPublicId = (avatarLink) => {
  // extract public Id from avatar cloudinary url
  const splitBySlash = avatarLink.split("/");
  const splitBydot = splitBySlash[splitBySlash.length - 1];
  const publicId = splitBydot.split(".")[0];
  return publicId;
};

// User Registration method
const userRegister = asyncHandler(async (req, res) => {
  // getting data from frontend user
  const { username, fullname, email, password } = req.body;

  // console.log(req.files)

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

// User LogIn method
const userLogin = asyncHandler(async (req, res) => {
  // Request data from user and extract
  const { username, email, password } = req.body;

  // Validate username and password
  if (!username || !email || !password) {
    throw new apiError(400, "Username , email and Password are required");
  }

  // fetch user object from DB if user exists or response a error if user not exists
  const user = await User.findOne({
    $and: [{ username }, { email }],
  });

  // check user exists or not
  if (!user) {
    throw new apiError(400, "Invalid username or password");
  }

  // verify using password [****Note: all the method written in model.js like isVerified, generateAccessToken etc are the method of user(return object using findOne) not User(Model). Whereas findOne , findById these are the User's(Model) method provided by mongoose in mongoDB]
  if (!(await user.isVerified(password))) {
    throw new apiError(401, "Invalid Password");
  }

  // Generate refreshToken & accessToken
  const { refreshToken, accessToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedIn = await User.findById(user._id).select("-password");

  // Send those token to user using secure cookie and save to DB also
  return res
    .status(200)
    .cookie("accessToken", accessToken, { secure: true, httpOnly: true })
    .cookie("refreshToken", refreshToken, { secure: true, httpOnly: true })
    .json(
      new apiResponse(201, "User Successfully loggedIn", {
        user: loggedIn,
        refreshToken,
        accessToken,
      })
    );
});

// Logged Out user
const userLogOut = asyncHandler(async (req, res) => {
  // as new: true , it will return updated document
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    { new: true }
  );

  const option = { secure: true, httpOnly: true };

  // Clear the access token and refresh token cookies
  // Return a success response
  return res
    .status(200)
    .clearCookie("refreshToken", option)
    .clearCookie("accessToken", option)
    .json(new apiResponse(200, {}, "User successfully logged out"));
});

// Regenerate access token and reinitialized using refesh token because access token exp duration is shorter than refresh token which is stored in DB
const refeshAccessToken = asyncHandler(async (req, res) => {
  try {
    const oldRefeshToken = req.cookie.refreshToken || req.body.refreshToken;

    if (!oldRefeshToken) {
      throw new apiError(400, "Not found access token!");
    }

    const decodedToken = jwt.verify(
      oldRefeshToken,
      process.env.REFRESH_TOKEN_EXPIRY
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new apiError(401, "Invalid refesh token");
    }

    if (oldRefeshToken !== user.refreshToken) {
      throw new apiError(401, "refesh token not matched");
    }

    const { refreshToken, accessToken } = await generateAccessAndRefreshToken(
      user._id
    );

    return res
      .cookie("refreshToken", refreshToken, option)
      .cookie("accessToken", accessToken, option)
      .json(
        new apiResponse(
          200,
          { refreshToken, accessToken },
          "Recreated access and refesh token"
        )
      );
  } catch (error) {
    throw new apiError(401, error?.message || "Invalid refesh Token");
  }
});

// change password of current user
const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!oldPassword || !newPassword || !confirmPassword) {
    throw new apiError(
      401,
      "Old Password, New Password, Confirm Password required"
    );
  }

  if (newPassword !== confirmPassword) {
    throw new apiError(
      401,
      "New Password and Confirm Password should be matched"
    );
  }

  const user = await User.findById(req.user?._id);

  if (!(await user.isVerified(oldPassword))) {
    throw new apiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new apiResponse(201, {}, "Password Changed Successfully"));
});

// Get current user
const getCurrentUser = asyncHandler(async (req, res) => {
  const getUser = req.user;
  return res
    .status(200)
    .json(new apiResponse(201, getUser, "Current User fetched Successfully"));
});

// user details field update [ username, full name]
const userDetailsUpdate = asyncHandler(async (req, res) => {
  const { username, fullname } = req.body;
  if (!username || !fullname) {
    throw new apiError(400, "Invalid username or fullname");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        username,
        fullname,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");
  return res
    .status(200)
    .json(new apiResponse(201, user, "User details updated successfull"));
});

// update avatar of cover image
const userAvatarUpdate = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar Image missing");
  }

  const avatarCloudObject = await uploadOnCloudinary(avatarLocalPath);

  if (!avatarCloudObject.url) {
    throw new apiError(400, "Error: Not found avatar cloud link");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatarCloudObject.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  // Delete old avatar image after uploading new avatar
  const publicId = getCloudinaryPublicId(req.user.avatar);
  await deleteOnCloudinary(publicId, req.user.avatar);

  return res
    .status(200)
    .json(new apiResponse(201, user, "Avatar Image updated successfull"));
});

// update avatar of cover image
const userCoverImageUpdate = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new apiError(400, "Avatar Image missing");
  }

  const coverImageCloudObject = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImageCloudObject.url) {
    throw new apiError(400, "Error: Not found avatar cloud link");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImageCloudObject.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  const publicId = getCloudinaryPublicId(req.user.coverImage);
  await deleteOnCloudinary(publicId);

  return res
    .status(200)
    .json(new apiResponse(201, user, "Cover Image updated successfull"));
});

// Get channel profile of an user
const getUserChannelProfileDetails = asyncHandler(async (req, res) => {
  const { username } = param.username;

  if (!username) {
    throw new apiError(400, "Username not found in param");
  }

  const channel = await User.aggregate([
    {
      $match: { username: username },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscriberCount: {
          $size: "$subscribers",
        },
        subscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        avatar: 1,
        email: 1,
        subscriberCount: 1,
        subscriberCount: 1,
        coverImage: 1,
        isSubscribed: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new apiError(404, "Channel does not exists");
  }

  return res
    .status(200)
    .json(
      new apiResponse(201, channel[0], "User's channel fetched successfully")
    );
});

export {
  userRegister,
  userLogin,
  userLogOut,
  refeshAccessToken,
  changePassword,
  getCurrentUser,
  userDetailsUpdate,
  userAvatarUpdate,
  userCoverImageUpdate,
};
