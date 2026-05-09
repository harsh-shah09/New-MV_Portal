import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getAdminSettings } from "@/lib/admin-settings";

async function getS3Client() {
  const settings = await getAdminSettings();
  
  const region = settings.AWS_REGION || process.env.AWS_REGION || "us-east-1";
  const accessKeyId = settings.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "";
  const secretAccessKey = settings.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "";

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

async function getS3BucketName(): Promise<string> {
  const settings = await getAdminSettings();
  const bucketName = settings.S3_BUCKET_NAME || process.env.S3_BUCKET_NAME;
  
  if (!bucketName) {
    throw new Error("S3_BUCKET_NAME is not defined");
  }
  
  return bucketName;
}

async function getS3Region(): Promise<string> {
  const settings = await getAdminSettings();
  return settings.AWS_REGION || process.env.AWS_REGION || "us-east-1";
}

export const uploadFileToS3 = async (
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
  folderPath: string = "uploads"
): Promise<string> => {
  const s3Client = await getS3Client();
  const bucketName = await getS3BucketName();
  const region = await getS3Region();

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
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
};

export const uploadPayslipToS3 = async (
  pdfBuffer: Buffer,
  employeeId: string,
  month: string,
  year: number
): Promise<string> => {
  const s3Client = await getS3Client();
  const bucketName = await getS3BucketName();
  const region = await getS3Region();

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
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
};

export const deletePayslipFromS3 = async (
  employeeId: string,
  month: string,
  year: number
): Promise<void> => {
  const s3Client = await getS3Client();
  const bucketName = await getS3BucketName();

  const fileName = `Payslip_${employeeId}_${month}_${year}.pdf`;
  const key = `Payrolls/${fileName}`;

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await s3Client.send(command);
};
