import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // Uploading on cloudinary on the basis of local file path
    const responseFromCloudinary = await cloudinary.uploader.upload(
      localFilePath,
      { resource_type: "auto" }
    );

    // remove the locally saved temporary file as we got cloud url and now no need to store in public dir.
    if (responseFromCloudinary.url) fs.unlinkSync(localFilePath);

    //now return the response object getting form cloudinary
    return responseFromCloudinary;
  } catch (error) {
    // remove the locally saved temporary file as the upload operation got failed
    fs.unlinkSync(localFilePath);
    console.log(error);
    return null;
  }
};

//
const deleteOnCloudinary = async (publicId, url) => {
  try {
    if (!publicId) return null;

    // delete from cloudinary on the basis of public id
    const responseFromCloudinary = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });

    //now return the response object getting form cloudinary
    return responseFromCloudinary;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export { uploadOnCloudinary, deleteOnCloudinary };
