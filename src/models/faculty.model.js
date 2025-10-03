import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const FacultySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        institution: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Institution",
            required: true
        },
        department: {
            type: String,
            required: true
        },
        position: {
            type: String
        },
        email: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
            required: [true, "Password is required !"]
        },
        refreshToken: {
            type: String
        },
        pendingCertifications: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Certification",
            }
        ],
        approvedCertifications: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Certification",
        }]
    },
    {timestamps: true}
);

FacultySchema.pre("save", async function (next) {
    if(!this.isModified("password"))    return next();
    this.password = await bcrypt.hash(this.password, 10)
    next()
})
FacultySchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password);
}

FacultySchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            name: this.name,
            email: this.email
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

FacultySchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

FacultySchema.index({institution: 1, name: 1});

export const Faculty = mongoose.model("Faculty", FacultySchema);