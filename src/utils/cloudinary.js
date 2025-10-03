import {v2 as cloudinary} from "cloudinary";
import fs from "fs";  //File System

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

const uploadOnCloudinary = async (LocalFilePath) => {
    try {
        if(!LocalFilePath)   return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(LocalFilePath, {
            resource_type: "auto"
        })
        //file has been uploaded
        console.log("FILE has been uploaded successfully! ",response.url)
        fs.unlinkSync(LocalFilePath); //remove the locally saved temp file
        return response;
    }
    catch(err) {
        fs.unlinkSync(LocalFilePath); //remove the locally saved temp file as upload is failed
        console.error(err);
        return null;
    }
}

export {uploadOnCloudinary};