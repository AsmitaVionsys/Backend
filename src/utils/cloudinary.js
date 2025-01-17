import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables from.env file

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_KEY,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null; 

        // Upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        //file has been successfully uploaded
        console.log("File is uploaded on Cloudinary", response.url);
        fs.unlinkSync(localFilePath) ;
        return response;
    } catch (error) {
        console.log(error)
        fs.unlinkSync(localFilePath) // Remove the locally saved temporary file as the upload operation got failed
    }
}

export { uploadOnCloudinary };