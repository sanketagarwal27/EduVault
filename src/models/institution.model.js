import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const InstitutionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        location: {
            type: String,
            required: true
        },
        password: {
            type: String,
            required: [true, "Password is required !"]
        },
        refreshToken: {
            type: String
        },
        apiUrl: {
            type: String,
            default: null
        },
        encryptedApiKey: {
            type: String,
            default: null
        }
    },
    {timestamps: true}
);

InstitutionSchema.pre("save", async function (next) {
    if(!this.isModified("password"))    return next();
    this.password = await bcrypt.hash(this.password, 10)
    next()
})
InstitutionSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password);
}

InstitutionSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            name: this.name
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

InstitutionSchema.methods.generateRefreshToken = function() {
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

export const Institution = mongoose.model("Institution", InstitutionSchema);