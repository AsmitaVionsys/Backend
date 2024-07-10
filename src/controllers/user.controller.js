import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js';

const registerUser = asyncHandler (async (req, res) => {
    
    //Get user details from Frontend
    const {fullname, email, username, password} = req.body;
    console.log("Email: ", email);

    if(
        [fullname, email, username, password].some((field) =>  // if(fullname === "") { --------------For 1 by 1 approach
            field?.trim() === "")                             //     throw new ApiError(400, "Full Name is required") }
    ){
        // ------------------------- Validation check --------------
        throw new ApiError(400, "All fields are required")  
    }


    //Check user already exists in database
    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    })
    if(existedUser) {
        throw new ApiError(409, "User with Email or username already exists")
    }


    // Check for images/ Avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if(!avatarLocalPath) {
        throw new ApiError(400, "Please upload an avatar")
    }
    if(!coverImageLocalPath) {
        throw new ApiError(400, "Please upload an Cover Image")
    }


    //Uload Images/ Avatar on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar) {
        throw new ApiError(500, "Failed to upload avatar to cloudinary")
    }
    if(!coverImage) {
        throw new ApiError(500, "Failed to upload avatar to cloudinary")
    }


    //Create user object -- Create entry in DB
    const user = await User.create({
        fullname,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage.url || ""
    })


    //Removed password and refreshToken fireld from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    //Check for user created successfully
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }


    //Return Response object
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User created/ registerd successfully")
    )

})

export { registerUser }