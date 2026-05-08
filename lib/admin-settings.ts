import { GetCommand, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '@/lib/dynamodb';

export interface AdminSettings {
  INFO_USERNAME?: string;
  INFO_GMAIL_APP_PASSWORD?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
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
