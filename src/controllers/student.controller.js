import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Student } from "../models/student.model.js"; 
import { Institution } from "../models/institution.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { decrypt } from "../utils/crypto.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import axios from "axios";


const generateAccessAndRefreshTokens = async(userId) => {
    try{
        const user = await Student.findById(userId)
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

const registerStudent = asyncHandler( async (req,res) => {
    // get details from frontend
    console.log(req.body);
    const {name, roll, password, institution, programme, department, email} = req.body

    if(
        [name, roll, password, institution, programme, department, email].some((field) => String(field || "").trim() === "")
    ) {
        throw new ApiError(400,"All fields are required");
    }

    const user = await Student.create({
        name: name,
        roll: roll,
        institution: await Institution.findById(institution),
        programme: programme,
        department: department,
        email: email,
        password: password
    })

   const CreatedUser = await Student.findById(user._id).select(
    "-password -refreshToken"
   )
   if (!CreatedUser) {
     throw new ApiError(500,"Something went wrong while registering Student !")
   }

   return res.status(201).json(
    new ApiResponse(200, CreatedUser, "Student registered successfully")
   )
})

const loginStudent = asyncHandler(async (req,res) => {

    const {email, password} = req.body

    if(!email) {
        throw new ApiError(400, "Email is required !")
    }

    const user = await Student.findOne({email})

    if(!user) {
        throw new ApiError(404, "Student not found !")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid)
        throw new ApiError(401, "Invalid credentials !")

    const {refreshToken, accessToken} = await generateAccessAndRefreshTokens(user._id)
    const loggedInUser = await Student.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {user: loggedInUser, accessToken, refreshToken} , "Student logged in Successfully"))
})

const logoutStudent = asyncHandler(async (req,res) => {
    await Student.findByIdAndUpdate(
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
    .json(new ApiResponse(200, {}, "Student logged out successfully"))
})

const refreshAccessToken = asyncHandler(async(req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await Student.findById(decodedToken?._id)
    
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

const changeStudentPassword = asyncHandler(async(req,res) => {
    const {oldPassword, newPassword} = req.body

    const user = await Student.findById(req.user?._id)
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

const getCurrentStudent = asyncHandler(async(req,res) => {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Student fetched successfully"))
})

const syncWithPortal = asyncHandler(async(req,res) => {
    const student = await Student.findById(req.user?._id);

    if(!student)
        throw new ApiError(404, "Student not found !");

    if(!student.institution.apiUrl)
        throw new ApiError(500, "Error fetching institute API URL !");

    const studentRollNumber = student.roll;
    if(!studentRollNumber)
        throw new ApiError(500, "Error fetching roll number !");

    const decryptedApiKey = decrypt(student.institution.encryptedApiKey);
    if(!decryptedApiKey)
        throw new ApiError(500, "Error fetching API key !");

    const API_URL = `${student.institution.apiUrl}/${studentRollNumber}`;

    const response = await axios.get(API_URL, {
        headers: {
            'Authorization': `Bearer ${decryptedApiKey}`
        }
    })

    const instituteData = response.data;
    if(!instituteData)
        throw new ApiError(500, "Error fetching institute data !");

    const updatedStudent = await Student.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                instituteData: instituteData,
                isPortalSynced: true,
                lastSyncedAt: new Date()
            }
        },
        {
            new: true
        }
    );

    return res
    .status(200)
    .json(new ApiResponse(200, updatedStudent, "Student Synced with Portal Successfully !"));
})

export {
    registerStudent,
    loginStudent,
    logoutStudent,
    refreshAccessToken,
    changeStudentPassword,
    getCurrentStudent,
    syncWithPortal
};