import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
//   credentials: {
//         accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
//         secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
//     },
});

export const db = DynamoDBDocumentClient.from(client);
export const getIsFirstTimeLogin = async (employeeId: string) => {
    const getCmd = new GetCommand({
        TableName: "MV_Portal",
        Key: {
            Employee_Id: employeeId,
            SortKey: "FIRST_TIME_LOGIN"
        }
    });

    const result = await db.send(getCmd);
    // If no record exists, default to false (safeguard). Logic might be "if record exists and true".
    // Or if RECORD doesn't exist, maybe it IS first time? 
    // User requirement: "on reset passwrd link click it should make a track record in dynamo db as is_first_time_login true"
    // So we check if this record exists and is true.
    return result.Item?.is_first_time_login === true;
};

export const setFirstTimeLogin = async (employeeId: string, isFirstTime: boolean) => {
    const putCmd = new PutCommand({
        TableName: "MV_Portal",
        Item: {
            Employee_Id: employeeId,
            SortKey: "FIRST_TIME_LOGIN",
            is_first_time_login: isFirstTime,
            updated_time: new Date().toISOString()
        }
    });
    await db.send(putCmd);
};

export const getOnboardingStep = async (employeeId: string) => {
    const getCmd = new GetCommand({
        TableName: "MV_Portal",
        Key: {
            Employee_Id: employeeId,
            SortKey: "ONBOARDING_STEP"
        }
    });
    const result = await db.send(getCmd);
    return result.Item?.current_step || 0;
};

export const setOnboardingStep = async (employeeId: string, step: number) => {
    const putCmd = new PutCommand({
        TableName: "MV_Portal",
        Item: {
            Employee_Id: employeeId,
            SortKey: "ONBOARDING_STEP",
            current_step: step,
            updated_time: new Date().toISOString()
        }
    });
    await db.send(putCmd);
};

export const clearOnboardingData = async (employeeId: string) => {
     // Clear first time login flag
    const deleteFirstTime = new DeleteCommand({
        TableName: "MV_Portal",
        Key: {
            Employee_Id: employeeId,
            SortKey: "FIRST_TIME_LOGIN"
        }
    });
     // Clear steps
    const deleteSteps = new DeleteCommand({
        TableName: "MV_Portal",
        Key: {
            Employee_Id: employeeId,
            SortKey: "ONBOARDING_STEP"
        }
    });

    await Promise.all([db.send(deleteFirstTime), db.send(deleteSteps)]);
};
