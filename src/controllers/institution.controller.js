import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Institution } from "../models/institution.model.js"; 
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async(userId) => {
    try{
        const user = await Institution.findById(userId)
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

const loginInstitute = asyncHandler(async (req,res) => {
    // Problem here is to make the institute login with a unique id like email in student and faculty
})

const registerInstitute = asyncHandler( async (req,res) => {
    // get details from frontend
    console.log(req.body);
    const {name, location, password} = req.body
    
    if(
        [name, location, password].some((field) => String(field || "").trim() === "")
    ) {
        throw new ApiError(400,"All fields are required");
    }
    //Verify using OTP.
    const user = await Institution.create({
        name: name,
        location: location,
        password
    })

   const CreatedUser = await Institution.findById(user._id).select(
    "-password -refreshToken"
   )
   if (!CreatedUser) {
     throw new ApiError(500,"Something went wrong while registering Institute !")
   }

   return res.status(201).json(
    new ApiResponse(200, CreatedUser, "Institute registered successfully")
   )
})

const logoutInstitute = asyncHandler(async (req,res) => {
    await Institution.findByIdAndUpdate(
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
    .json(new ApiResponse(200, {}, "Institute logged out successfully"))
})

const refreshAccessToken = asyncHandler(async(req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await Institution.findById(decodedToken?._id)
    
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

const changeInstitutePassword = asyncHandler(async(req,res) => {
    const {oldPassword, newPassword} = req.body

    const user = await Institution.findById(req.user?._id)
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

const getCurrentInstitute = asyncHandler(async(req,res) => {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Institute fetched successfully"))
})

export {
    registerInstitute,
    loginInstitute,
    logoutInstitute,
    refreshAccessToken,
    changeInstitutePassword,
    getCurrentInstitute

};