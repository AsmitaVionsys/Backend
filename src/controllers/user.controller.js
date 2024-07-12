import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from "mongoose";

const registerUser = asyncHandler(async (req, res) => {
  //Get user details from Frontend
  const { fullname, email, username, password } = req.body;
  console.log("Email: ", email);

  if (
    [fullname, email, username, password].some(
      (
        field, // if(fullname === "") { --------------For 1 by 1 approach
      ) => field?.trim() === "",
    ) //     throw new ApiError(400, "Full Name is required") }
  ) {
    // ------------------------- Validation check --------------
    throw new ApiError(400, "All fields are required");
  }

  //Check user already exists in database
  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with Email or username already exists");
  }

  // Check for images/ Avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  console.log(avatarLocalPath);
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Please upload an avatar");
  }
  // if(!coverImageLocalPath) {
  //     throw new ApiError(400, "Please upload an Cover Image")
  // } --------- Option

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  //Uload Images/ Avatar on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(500, "Failed to upload avatar to cloudinary");
  }
  if (!coverImage) {
    throw new ApiError(500, "Failed to upload avatar to cloudinary");
  }

  //Create user object -- Create entry in DB
  const user = await User.create({
    fullname,
    email,
    username: username.toLowerCase(),
    password,
    avatar: avatar.url,
    coverImage: coverImage.url || "",
  });

  //Removed password and refreshToken fireld from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  //Check for user created successfully
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  //Return Response object
  return res
    .status(201)
    .json(
      new ApiResponse(200, createdUser, "User created/ registerd successfully"),
    );
});

const loginUser = asyncHandler(async (req, res) => {
  //req body -> data
  const { email, username, password } = req.body;

  // username or email
  if (!username && !email) {
    throw new ApiError(400, "Email or Username is required");
  }

  // find the user
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }
  console.log(user.password)

  // validate password or check password
  const isPasswordCorrect = await bcrypt.compare(password, user.password)
  
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Password incorrect/ Invalid user credentials");
  }

  // generate access & refresh token
  const generateAccessAndRefreshToken = async (userId) => {
    try {
      const user = await User.findById(userId);
      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken; // refresh token save in database
      await user.save({ validateBeforeSave: false });

      return { accessToken, refreshToken };
    } catch (error) {
      throw new ApiError(500, "Failed to generate access and refresh token");
    }
  };
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id,
  );

  // return token in the form of cookie
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          // user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully",
      ),
    );
});

const logoutUser = asyncHandler(async(req, res) => {
  User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      }
    },
    {
      new: true
    }
  ) 

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res.status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200, null, "User logged out successfully"))  // clear cookies
})

const refreshAccessToken = asyncHandler(async(req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken) {
    throw new ApiError(401, "No refresh token provided / unauthorized request")
  }

  try{
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )
  
    const user = await User.findById(decodedToken?._id)
  
    if(!user) {
      throw new ApiError(401, "Invalid refresh token")
    }
  
    if(incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used")
    }
  
    const options = {
      httpOnly: true,
      secure: true,
    }
  
    const {accessToken, newrefreshToken } = await generateAccessAndRefreshToken(user._id)
  
    return res
    .status(200)
    .cookie("accessToken", user.accessToken(), options)
    .cookie("refreshToken", user.newrefreshToken(), options)
    .json(
      new ApiResponse(200, 
        { accessToken, newrefreshToken }, 
        "Access token refreshed successfully"
      )
    )
  } catch (err) {
    throw new ApiError(401, error?.message || "Invalid refresh token")  // refresh token is invalid or expired
  }
})

const changeCurrentPassword = asyncHandler(async(req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body

  if(!(newPassword === confirmPassword)) {
    throw new ApiError(400, "Passwords do not match")
  }

  const user = await User.findById(req.user._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect) {
    throw new ApiError(400, "Old password is incorrect")
  }

  user.password = newPassword;
  await user.save({validateBeforeSave: false});

  return res
  .status(200)
  .json(
    new ApiResponse(200, {}, "Password updated successfully")
  )

})

const getCurrentUser = asyncHandler(async(res, req) => {
  return res
  .status(200)
  .json(200, req.user, "current user fetched successfully")
})

// Update user profile
const updateAccountDetails = asyncHandler(async(req, res) => {
  const { fullname, email } = req.body;

  if(!fullname || !email){
    throw new ApiError(400, "All fields are required")
  }

  const userUpdate = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      }
    },
    {new: true}
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200, userUpdate, "Account details updated successfully"))
})

// Update avatar
const updateUserAvatar = asyncHandler(async(req, res) => {
  const avatarLocalPath = req.file?.path;

  if(!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if(!avatar.url) {
    throw new ApiError(500, "Failed to upload avatar to cloudinary")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      }
    },
    {new: true}
  ).select("-password")

  return res
  .status(200)
  .json(
    new ApiResponse(200, user, "Avatar updated successfully"))
 
})

//Update CoverImage
const updateUserCoverImage = asyncHandler(async(req, res) => {
  const coverImageLocalPath = req.file?.path;

  if(!coverImageLocalPath) {
    throw new ApiError(400, "Avatar file is missing")
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if(!coverImage.url) {
    throw new ApiError(500, "Failed to upload Cover Image to cloudinary")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: coverImage.url,
      }
    },
    {new: true}
  ).select("-password")

  return res
  .status(200)
  .json(
    new ApiResponse(200, user, "Cover Image updated successfully"))
})

// Get user channel profile
const getUserChannelProfile = asyncHandler(async(req, res) => {
  const { username } = req.params

  if(!username?.trim()) {
    throw new ApiError(400, "Username is required/ missing")
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase() 
      }
    },
    {
      $lookup: {
        from: "Subscription",
        localField: "_id",
        foreignField: "channel",
        as: "subscriber",
      }
    },
    {
      $lookup: {
        from: "Subscription",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      }
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscriber" //count the subscriber
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo" //count the subscribedTo
        }
      }
    }, {
      isSubscribed: {
        //count the subscriber
        $cond: {
          if: {$in: [req.user?._id, "subscribers.subscriber"]},
          then: true,
          else: false
        }
      }
    }, 
    {
      $project: {
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      }
    }
  ])

  if(!channel?.length) {
    throw new ApiError(404, "Channel does not exists")
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200, channel[0], "User channel profile fetched successfully")
  )
})

// Get user's video list
const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id)
      }
    }, 
    {
      $lookup: { 
        from: "video",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  }
                }
              ]
            }
          },
          {
            $addFields: {
              owner: {
                $first: $owner
              }
            }
          }
        ]
      }
    }
  ])

  return res
  .status(200)
  .json(
    new ApiResponse(200, user[0]?.watchHistory, "User's watch history fetched successfully")
  )
})

export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory };
