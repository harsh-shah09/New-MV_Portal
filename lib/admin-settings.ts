import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '@/lib/dynamodb';

export interface AdminSettings {
  INFO_USERNAME?: string;
  INFO_GMAIL_APP_PASSWORD?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  S3_BUCKET_NAME?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  NEXTAUTH_SECRET?: string;
  NEXTAUTH_URL?: string;
  NEXT_PUBLIC_APP_URL?: string;
  ENCRYPTION_KEY?: string;
  SESSION_SECRET?: string;
  companyBranchCode?: string;
  companyAccountNumber?: string;
  currencyCode?: string;
  leaveGuideUrl?: string;
  updated_at?: string;
}

const SETTINGS_KEY = 'ADMIN_SETTINGS';

/**
 * Get all admin settings from DynamoDB
 */
export async function getAdminSettings(): Promise<AdminSettings> {
  try {
    const result = await db.send(
      new GetCommand({
        TableName: 'MV_Portal',
        Key: {
          Employee_Id: 'SYSTEM',
          SortKey: SETTINGS_KEY,
        },
      })
    );

    if (!result.Item) {
      return {};
    }

    const item = result.Item as any;
    return {
      INFO_USERNAME: item.INFO_USERNAME,
      INFO_GMAIL_APP_PASSWORD: item.INFO_GMAIL_APP_PASSWORD,
      GOOGLE_CLIENT_ID: item.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: item.GOOGLE_CLIENT_SECRET,
      S3_BUCKET_NAME: item.S3_BUCKET_NAME,
      AWS_ACCESS_KEY_ID: item.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: item.AWS_SECRET_ACCESS_KEY,
      AWS_REGION: item.AWS_REGION,
      NEXTAUTH_SECRET: item.NEXTAUTH_SECRET,
      NEXTAUTH_URL: item.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_APP_URL: item.NEXT_PUBLIC_APP_URL,
      ENCRYPTION_KEY: item.ENCRYPTION_KEY,
      SESSION_SECRET: item.SESSION_SECRET,
      companyBranchCode: item.companyBranchCode,
      companyAccountNumber: item.companyAccountNumber,
      currencyCode: item.currencyCode,
      leaveGuideUrl: item.leaveGuideUrl,
      updated_at: item.updated_at,
    };
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    return {};
  }
}

/**
 * Update admin settings in DynamoDB
 */
export async function updateAdminSettings(settings: AdminSettings): Promise<void> {
  try {
    const updateExpression: string[] = [];
    const expressionAttributeValues: Record<string, any> = {
      ':updated_at': new Date().toISOString(),
    };
    let attrIndex = 0;

    if (settings.INFO_USERNAME !== undefined) {
      updateExpression.push(`INFO_USERNAME = :attr${attrIndex}`);
      expressionAttributeValues[`:attr${attrIndex}`] = settings.INFO_USERNAME;
      attrIndex++;
    }

    if (settings.INFO_GMAIL_APP_PASSWORD !== undefined) {
      updateExpression.push(`INFO_GMAIL_APP_PASSWORD = :attr${attrIndex}`);
      expressionAttributeValues[`:attr${attrIndex}`] = settings.INFO_GMAIL_APP_PASSWORD;
      attrIndex++;
    }

    if (settings.GOOGLE_CLIENT_ID !== undefined) {
      updateExpression.push(`GOOGLE_CLIENT_ID = :attr${attrIndex}`);
      expressionAttributeValues[`:attr${attrIndex}`] = settings.GOOGLE_CLIENT_ID;
      attrIndex++;
    }

    if (settings.GOOGLE_CLIENT_SECRET !== undefined) {
      updateExpression.push(`GOOGLE_CLIENT_SECRET = :attr${attrIndex}`);
      expressionAttributeValues[`:attr${attrIndex}`] = settings.GOOGLE_CLIENT_SECRET;
      attrIndex++;
    }

    if (settings.S3_BUCKET_NAME !== undefined) {
      updateExpression.push(`S3_BUCKET_NAME = :attr${attrIndex}`);
      expressionAttributeValues[`:attr${attrIndex}`] = settings.S3_BUCKET_NAME;
      attrIndex++;
    }

    if (settings.AWS_ACCESS_KEY_ID !== undefined) {
      updateExpression.push(`AWS_ACCESS_KEY_ID = :attr${attrIndex}`);
      expressionAttributeValues[`:attr${attrIndex}`] = settings.AWS_ACCESS_KEY_ID;
      attrIndex++;
    }

    if (settings.AWS_SECRET_ACCESS_KEY !== undefined) {
      updateExpression.push(`AWS_SECRET_ACCESS_KEY = :attr${attrIndex}`);
      expressionAttributeValues[`:attr${attrIndex}`] = settings.AWS_SECRET_ACCESS_KEY;
      attrIndex++;
    }

    if (settings.AWS_REGION !== undefined) {
      updateExpression.push(`AWS_REGION = :attr${attrIndex}`);
      expressionAttributeValues[`:attr${attrIndex}`] = settings.AWS_REGION;
      attrIndex++;
    }

    if (settings.NEXTAUTH_SECRET !== undefined) {
      updateExpression.push(`NEXTAUTH_SECRET = :attr${attrIndex}`);
      expressionAttributeValues[`:attr${attrIndex}`] = settings.NEXTAUTH_SECRET;
      attrIndex++;
    }

    if (settings.NEXTAUTH_URL !== undefined) {
      updateExpression.push(`NEXTAUTH_URL = :attr${attrIndex}`);
      expressionAttributeValues[`:attr${attrIndex}`] = settings.NEXTAUTH_URL;
      attrIndex++;
    }

    if (settings.NEXT_PUBLIC_APP_URL !== undefined) {
      updateExpression.push(`NEXT_PUBLIC_APP_URL = :attr${attrIndex}`);
      expressionAttributeValues[`:attr${attrIndex}`] = settings.NEXT_PUBLIC_APP_URL;
      attrIndex++;
    }

    if (settings.ENCRYPTION_KEY !== undefined) {
      updateExpression.push(`ENCRYPTION_KEY = :attr${attrIndex}`);
      expressionAttributeValues[`:attr${attrIndex}`] = settings.ENCRYPTION_KEY;
      attrIndex++;
    }

    if (settings.SESSION_SECRET !== undefined) {
      updateExpression.push(`SESSION_SECRET = :attr${attrIndex}`);
      expressionAttributeValues[`:attr${attrIndex}`] = settings.SESSION_SECRET;
      attrIndex++;
    }

    if (settings.companyBranchCode !== undefined) {
      updateExpression.push(`companyBranchCode = :attr${attrIndex}`);
      expressionAttributeValues[`:attr${attrIndex}`] = settings.companyBranchCode;
      attrIndex++;
    }

    if (settings.companyAccountNumber !== undefined) {
      updateExpression.push(`companyAccountNumber = :attr${attrIndex}`);
      expressionAttributeValues[`:attr${attrIndex}`] = settings.companyAccountNumber;
      attrIndex++;
    }

    if (settings.currencyCode !== undefined) {
      updateExpression.push(`currencyCode = :attr${attrIndex}`);
      expressionAttributeValues[`:attr${attrIndex}`] = settings.currencyCode;
      attrIndex++;
    }

    if (settings.leaveGuideUrl !== undefined) {
      updateExpression.push(`leaveGuideUrl = :attr${attrIndex}`);
      expressionAttributeValues[`:attr${attrIndex}`] = settings.leaveGuideUrl;
      attrIndex++;
    }

    if (updateExpression.length === 0) {
      return;
    }

    updateExpression.push('updated_at = :updated_at');

    await db.send(
      new UpdateCommand({
        TableName: 'MV_Portal',
        Key: {
          Employee_Id: 'SYSTEM',
          SortKey: SETTINGS_KEY,
        },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );
  } catch (error) {
    console.error('Error updating admin settings:', error);
    throw error;
  }
}

/**
 * Get a specific setting value
 */
export async function getAdminSettingValue(key: keyof AdminSettings): Promise<string | undefined> {
  const settings = await getAdminSettings();
  return settings[key];
}
