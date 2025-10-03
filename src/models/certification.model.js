import mongoose from "mongoose";

const CertificationSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true
        },
        uploaded_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true
        },
        isUnderFaculty: {
            type: Boolean,
            required: true
        },
        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Faculty",
            required: function() {
                return this.isUnderFaculty;
            }
        },
        isApproved: {
            type: Boolean,
            default: false
        },
        certificate: {
            type: String,
            required: true
        }
    },
{timestamps: true}
);

export const Certification = mongoose.model("Certification", CertificationSchema);