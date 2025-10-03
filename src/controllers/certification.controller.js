import { Certification } from "../models/certification.model.js";
import { Student } from "../models/student.model.js";
import { Faculty } from "../models/faculty.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const uploadCertification = asyncHandler(async(req,res) => {
    const {title, isUnderFaculty, faculty} = req.body;
    const certificateLocalPath = req.files?.certificate?.[0]?.path;

    if(!certificateLocalPath)
        throw new ApiError(400, "Certificate is required !");
    
    const certificate = await uploadOnCloudinary(certificateLocalPath);

    if(!certificate)
        throw new ApiError(400, "Certificate not found !");

    const student = await Student.findById(req.user?._id);
    const uploadCertificate = await Certification.create(
        {
            title: title,
            uploaded_by: student._id,
            isUnderFaculty: isUnderFaculty,
            faculty: await Faculty.findById(faculty),
            isApproved: false,
            certificate: certificate.url
        }
    )

    const updatedStudent = await Student.findByIdAndUpdate(
        student._id,
        {
            $push: {
                certifications: uploadCertificate._id
            }
        },
        {
            new: true
        }
    )

    /* Can be solved by: When student uploads his certificate and chooses a faculty,
    as he types the name, it gets searched in faculty database with institution name same as student 
    and the student chooses the faculty needed, from there we can get his id if possible */
    if(faculty)
    {
        const facultyMember = await Faculty.findById(faculty);
        const updatedFaculty = await Faculty.findByIdAndUpdate(
            faculty,
            {
                $push: {
                    pendingCertifications: uploadCertificate._id
                }
            },
            {
                new: true
            }
        )
    }

    if(!uploadCertificate)
        throw new ApiError(500, "Something went wrong while uploading the certification !");

    return res
    .status(201)
    .json(new ApiResponse(201, {_id: uploadCertificate._id, certificate: certificate.url, uploaded_by: student._id, faculty: faculty}, "Your Certificate is uploaded successfully !"));
})

const deleteCertification = asyncHandler(async(req,res) => {
    const {certificateId} = req.query;
    const certificate = await Certification.findById(certificateId);
    if(certificate.isApproved)
        throw new ApiError(400, "Approved certificate cannot be deleted!");
    const deletedCertificate = await Certification.findByIdAndDelete(certificateId)
    
    if(!deletedCertificate)
        throw new ApiError(404, "Certificate not found !");

    const student = await Student.findByIdAndUpdate(
        deletedCertificate.uploaded_by,
        {
            $pull: {
                certifications: certificateId
            }
        },
        {
            new: true
        }
    )
    if(deletedCertificate.isUnderFaculty)
    {
        const faculty = await Faculty.findByIdAndUpdate(
            deletedCertificate.faculty,
            {
                $pull: {
                    pendingCertifications: certificateId
                }
            },
            {
                new: true
            }
        )
    }

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Certificate deleted successfully !"))
})

const getCertificationById = asyncHandler(async (req,res) => {
    const {certificateId} = req.query;
    const certificate = await Certification.findById(certificateId);
    if(!certificate)
        throw new ApiError(404, "Certificate not found !");

    return res
    .status(200)
    .json(new ApiResponse(200, certificate, "Certificate fetched successfully !"));
})

const approveCertification = asyncHandler(async (req,res) => {
    const {id} = req.query;
    const cert = await Certification.findById(id);
    if(!cert)
        throw new ApiError(404, "Certificate not found !");

    if(cert.isApproved)
        throw new ApiError(400, "This certificate is already approved !");

    //Authorization
    const faculty = await Faculty.findById(cert?.faculty._id);
    
    if(req.user._id.toString() != faculty._id.toString())
        throw new ApiError(403, "This Certification is not under you !");

    const certificate = await Certification.findByIdAndUpdate(
        id,
        {
            $set: {
                isApproved: true
            }
        },
        {
            new: true
        }
    )
    const updatedFaculty = await Faculty.findByIdAndUpdate(
        req.user._id,
        {
            $push: {
                approvedCertifications: certificate._id
            },
            $pull: {
                pendingCertifications: certificate._id
            }
        },
        {
            new: true
        }
    )

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Certificate approved successfully !"));
})

export {
    uploadCertification,
    deleteCertification,
    getCertificationById,
    approveCertification,
}