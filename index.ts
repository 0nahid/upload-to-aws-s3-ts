import AWS from "aws-sdk";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import multer from "multer";

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME;

const s3 = new AWS.S3({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY,
});

const bucketParams: AWS.S3.CreateBucketRequest = {
  Bucket: AWS_BUCKET_NAME || "",
};

// Create S3 bucket function
const createBucket = () => {
  s3.createBucket(bucketParams, (err, data) => {
    if (err) {
      console.log(err);
    } else {
      console.log(`Bucket ${AWS_BUCKET_NAME} created successfully`);
    }
  });
};

// Uncomment the line below to create the S3 bucket
// createBucket();

app.get("/", (_req: Request, res: Response) =>
  res.send("AWS S3 is running successfully")
);

app.post("/upload", (req: Request, res: Response) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // no larger than 10MB
    },
  }).single("file");

  upload(req, res, (err: any) => {
    if (err) {
      console.log(err);
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(422).send({
          message: "File size is too large. Max limit is 10MB",
        });
      }
      return res.status(422).send({
        message: "File upload failed",
      });
    }

    // Upload file to S3
    const file = req.file;
    if (!file) {
      return res.status(422).send({
        message: "No file provided",
      });
    }

    const uniqueFileName = Date.now() + "-" + file.originalname; // unique file name

    const params: AWS.S3.PutObjectRequest = {
      Bucket: AWS_BUCKET_NAME || "",
      Key: uniqueFileName,
      Body: file.buffer,
      ACL: "public-read",
    };

    s3.upload(
      params,
      (uploadErr: Error, data: AWS.S3.ManagedUpload.SendData) => {
        if (uploadErr) {
          console.log(uploadErr);
          return res.status(500).send({
            message: "File upload failed",
          });
        } else {
          console.log(data);
          const fileUrl = data.Location;
          return res.status(200).send({
            message: "File uploaded successfully",
            data,
            fileUrl,
          });
        }
      }
    );
  });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
