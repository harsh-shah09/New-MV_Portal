import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export const uploadFileToS3 = async (
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
  folderPath: string = "uploads"
): Promise<string> => {
  const bucketName = process.env.S3_BUCKET_NAME;
  if (!bucketName) throw new Error("S3_BUCKET_NAME is not defined");

  // Cleanup folder path - remove trailing slash if present
  const cleanFolder = folderPath.replace(/\/$/, "");
  
  const key = `${cleanFolder}/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
    // ACL: "public-read", // Optional: depending on bucket settings
  });

  await s3Client.send(command);

  // Construct public URL (assuming public bucket or cloudfront, or just standard s3 url)
  // For now, standard S3 URL
  return `https://${bucketName}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;
};

export const uploadPayslipToS3 = async (
  pdfBuffer: Buffer,
  employeeId: string,
  month: string,
  year: number
): Promise<string> => {
  const bucketName = process.env.S3_BUCKET_NAME;
  if (!bucketName) throw new Error("S3_BUCKET_NAME is not defined");

  const fileName = `Payslip_${employeeId}_${month}_${year}.pdf`;
  const key = `Payrolls/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: pdfBuffer,
    ContentType: "application/pdf",
  });

  await s3Client.send(command);

  // Return the S3 URL
  return `https://${bucketName}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;
};

export const deletePayslipFromS3 = async (
  employeeId: string,
  month: string,
  year: number
): Promise<void> => {
  const bucketName = process.env.S3_BUCKET_NAME;
  if (!bucketName) throw new Error("S3_BUCKET_NAME is not defined");

  const fileName = `Payslip_${employeeId}_${month}_${year}.pdf`;
  const key = `Payrolls/${fileName}`;

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await s3Client.send(command);
};
