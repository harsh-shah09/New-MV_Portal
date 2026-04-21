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

    // Store onboarding-completed marker so we never re-show the wizard
    const putCompleted = new PutCommand({
        TableName: "MV_Portal",
        Item: {
            Employee_Id: employeeId,
            SortKey: "ONBOARDING_COMPLETED",
            completed: true,
            completed_at: new Date().toISOString(),
        }
    });

    await Promise.all([
        db.send(deleteFirstTime),
        db.send(deleteSteps),
        db.send(putCompleted),
    ]);
};

// ─── Onboarding Completed flag ─────────────────────────────────────────────

/**
 * Returns true when the employee has fully finished onboarding.
 */
export const getOnboardingCompleted = async (employeeId: string): Promise<boolean> => {
    const getCmd = new GetCommand({
        TableName: "MV_Portal",
        Key: {
            Employee_Id: employeeId,
            SortKey: "ONBOARDING_COMPLETED"
        }
    });
    const result = await db.send(getCmd);
    return result.Item?.completed === true;
};

/**
 * Manually mark onboarding as completed (useful for document-rejection re-open
 * flow where we keep FIRST_TIME_LOGIN but need to flip the completion back).
 */
export const setOnboardingCompleted = async (employeeId: string, completed: boolean) => {
    if (completed) {
        const putCmd = new PutCommand({
            TableName: "MV_Portal",
            Item: {
                Employee_Id: employeeId,
                SortKey: "ONBOARDING_COMPLETED",
                completed: true,
                completed_at: new Date().toISOString(),
            }
        });
        await db.send(putCmd);
    } else {
        // Remove the flag so the wizard can be re-opened
        const deleteCmd = new DeleteCommand({
            TableName: "MV_Portal",
            Key: {
                Employee_Id: employeeId,
                SortKey: "ONBOARDING_COMPLETED"
            }
        });
        await db.send(deleteCmd);
    }
};


// ─── App Tour State ───────────────────────────────────────────────────────────

/**
 * Store that the app tour has been completed (but Google auth not yet done).
 * The popup should keep showing on refresh until Google auth succeeds.
 */
export const setAppTourPendingGoogleAuth = async (employeeId: string) => {
    const putCmd = new PutCommand({
        TableName: "MV_Portal",
        Item: {
            Employee_Id: employeeId,
            SortKey: "APP_TOUR_GOOGLE_PENDING",
            pending: true,
            created_at: new Date().toISOString(),
        }
    });
    await db.send(putCmd);
};

/**
 * Returns true if tour is done but Google auth is still pending.
 */
export const getAppTourPendingGoogleAuth = async (employeeId: string): Promise<boolean> => {
    const getCmd = new GetCommand({
        TableName: "MV_Portal",
        Key: {
            Employee_Id: employeeId,
            SortKey: "APP_TOUR_GOOGLE_PENDING"
        }
    });
    const result = await db.send(getCmd);
    return result.Item?.pending === true;
};

/**
 * Call after a successful Google auth to remove the pending flag.
 */
export const clearAppTourPendingGoogleAuth = async (employeeId: string) => {
    const deleteCmd = new DeleteCommand({
        TableName: "MV_Portal",
        Key: {
            Employee_Id: employeeId,
            SortKey: "APP_TOUR_GOOGLE_PENDING"
        }
    });
    await db.send(deleteCmd);
};
