import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const StudentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        roll: {
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
        institution: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Institution",
            required: true
        },
        programme: {
            type: String,
            required: true
        },
        department: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            unique: true
        },
        certifications: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Certification"
        }]
    },
    {timestamps: true}
);

StudentSchema.pre("save", async function (next) {
    if(!this.isModified("password"))    return next();
    this.password = await bcrypt.hash(this.password, 10)
    next()
})
StudentSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password);
}

StudentSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            roll: this.roll
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

StudentSchema.methods.generateRefreshToken = function() {
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

export const Student = mongoose.model("Student", StudentSchema);