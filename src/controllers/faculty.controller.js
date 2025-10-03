import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Faculty } from "../models/faculty.model.js"; 
import { Institution } from "../models/institution.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async(userId) => {
    try{
        const user = await Faculty.findById(userId)
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {
            accessToken,
            refreshToken
        }
    }
    catch(err) {
        throw new ApiError(500, err?.message || "Something went wrong while generating tokens")
    }
}

const registerFaculty = asyncHandler( async (req,res) => {
    // get details from frontend
    const {name, institution, department, position, email, password} = req.body

    if(
        [name, institution, department, email, password].some((field) => String(field || "").trim() === "")
    ) {
        throw new ApiError(400,"All fields are required");
    }

    const user = await Faculty.create({
        name: name,
        institution: await Institution.findById(institution),
        department: department,
        position: position,
        email: email,
        password: password
    })

   const CreatedUser = await Faculty.findById(user._id).select(
    "-password -refreshToken"
   )
   if (!CreatedUser) {
     throw new ApiError(500,"Something went wrong while registering Faculty !")
   }

   return res.status(201).json(
    new ApiResponse(200, CreatedUser, "Faculty registered successfully")
   )
})

const loginFaculty = asyncHandler(async (req,res) => {

    const {email, password} = req.body

    if(!email) {
        throw new ApiError(400, "Email is required !")
    }

    const user = await Faculty.findOne({email})

    if(!user) {
        throw new ApiError(404, "Faculty not found !")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid)
        throw new ApiError(401, "Invalid credentials !")

    const {refreshToken, accessToken} = await generateAccessAndRefreshTokens(user._id)
    const loggedInUser = await Faculty.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {user: loggedInUser, accessToken, refreshToken} , "Faculty logged in Successfully"))
})

const logoutFaculty = asyncHandler(async (req,res) => {
    await Faculty.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Faculty logged out successfully"))
})

const refreshAccessToken = asyncHandler(async(req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await Faculty.findById(decodedToken?._id)
    
        if(!user) {
            throw new ApiError(401, "Invalid Refresh Token !")
        }
        if(user?.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Invalid Refresh Token !")
        }
        const options  = {
            httpOnly: true,
            secure: true
        }
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken: newRefreshToken
                },
                "Access Token Refreshed !"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }
})

const changeFacultyPassword = asyncHandler(async(req,res) => {
    const {oldPassword, newPassword} = req.body

    const user = await Faculty.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect) {
        throw new ApiError(400, "Invalid Old Password")
    }
    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentFaculty = asyncHandler(async(req,res) => {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Faculty fetched successfully"))
})

const searchFaculty = asyncHandler(async(req, res) => {
    const { name } = req.query;
    //Preventing ReDoS
    function escapeRegex(string) {
        return string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }

    if (!name || name.trim() === "") {
        return res
            .status(200)
            .json(new ApiResponse(200, [], "Search query is empty."));
    }

    const searchString = escapeRegex(name);
    const faculty = await Faculty.find({
        name: {
            $regex: searchString,
            $options: "i"
        },
        institution: req.user.institution
    }).select("-password -refreshToken -approvedCertifications -pendingCertifications -createdAt -updatedAt -__v")
    .sort({name: 1})
    .limit(10);

    return res
    .status(200)
    .json(new ApiResponse(200, faculty, "Search Successful !"));
});

export {
    registerFaculty,
    loginFaculty,
    logoutFaculty,
    refreshAccessToken,
    changeFacultyPassword,
    getCurrentFaculty,
    searchFaculty,

};