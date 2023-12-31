import { S3 } from '@aws-sdk/client-s3';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { Rekognition } from '@aws-sdk/client-rekognition';
import { EventBridgeEvent } from 'aws-lambda';
import sharp from 'sharp'
import CaptchaItem from '../model/captchaItem';

const s3 = new S3();
const rekognition = new Rekognition();
const dynamoDB = new DynamoDBClient();
const tableArn = process.env.DB_TABLE_ARN;
const tableName = tableArn?.split('/').pop() || "RekognitionResults";

export const handler = async (event: EventBridgeEvent<any, any>) => {
    try {
        // Assuming the CloudTrail event is for an S3 PutObject
        const bucketName = event.detail.requestParameters.bucketName;
        const objectKey = event.detail.requestParameters.key;
        
        // Get the image from S3
        const s3Response = await s3.getObject({
            Bucket: bucketName,
            Key: objectKey,
        });

        const imageBytes = await s3Response.Body?.transformToByteArray()!;
        const preprocessedImage = await preprocessImage(imageBytes);
        const metadata = s3Response.Metadata || {};
        
        const sessionId = metadata.sessionId || "00000000-0000-0000-0000-000000000000";
        const captchaAttempt = metadata.captchaAttempt || "0";

        // Detect text in the image using Rekognition
        const rekognitionResponse = await rekognition.detectText({ Image: { Bytes: preprocessedImage } });

        // Extract the detected text
        const detectedTexts = rekognitionResponse.TextDetections?.map(t => t.DetectedText || '') || [];       
        const item: CaptchaItem = {
            partitionKey: sessionId,
            sortKey: +captchaAttempt,
            detectedTexts: detectedTexts,
            s3key: objectKey,
            timeUtc: new Date().toUTCString()
        };

        await putDdbItem(tableName, item);

        console.log(`Saved detected texts for ${objectKey} to DynamoDB.`);
        return detectedTexts;
    } catch (error) {
        console.error('Error processing image:', error);
        throw error;
    }
};

//TODO extract to common util functions
export async function putDdbItem(tableName: string, item: { [key: string]: any }) {
    const convertedItem = convertToAttributeValue(item);

    try {
        const command = new PutItemCommand({
            TableName: tableName,
            Item: convertedItem
        });
        
        const response = await dynamoDB.send(command);
        console.log("Item inserted successfully:", response);
    } catch (error) {
        console.error("Error inserting item:", error);
    }
}

function convertToAttributeValue(item: { [key: string]: any }): { [key: string]: any } {
    let attributeValue: { [key: string]: any } = {};

    for (const key in item) {
        const value = item[key];

        if (typeof value === "string") {
            attributeValue[key] = { S: value };
        } else if (typeof value === "number") {
            attributeValue[key] = { N: value.toString() };
        } else if (Array.isArray(value)) {
            attributeValue[key] = { L: value.map(v => convertToAttributeValue({ temp: v }).temp) }; 
            // Wrap each array element in a temp object to recursively convert
        } 
        // ... add other types as needed, such as BOOL, M (Map), etc.
    }

    return attributeValue;
}

//possibly will need to check metadata and input image size
async function preprocessImage(buffer: Uint8Array) : Promise<Uint8Array>{
    const outputImage = await sharp(buffer)
            .resize(200, 81, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .toBuffer();

    return outputImage;
}