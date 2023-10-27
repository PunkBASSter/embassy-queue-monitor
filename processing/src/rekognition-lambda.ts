import { S3, Rekognition, DynamoDB  } from 'aws-sdk';
import { S3ObjectCreatedNotificationEvent } from 'aws-lambda';

const s3 = new S3();
const rekognition = new Rekognition();
const dynamoDB = new DynamoDB.DocumentClient();
const tableName = "RekognitionResults";

//key format is <session_guid>_<captcha_attempt_num>.jpg?

//TODO maybe pass session data via object metadata or tags.
export const handler = async (event: S3ObjectCreatedNotificationEvent) => {
    try {
        // Assuming the CloudTrail event is for an S3 PutObject
        const bucketName = event.detail.bucket.name;
        const objectKey = event.detail.object.key;
        const objName = objectKey.split('/').pop();
        const captchaAttempt = objName?.split('_').pop()?.split('.')[0] ?? 0;

        // Get the image from S3
        const s3Response = await s3.getObject({
            Bucket: bucketName,
            Key: objectKey,
        }).promise();

        const imageBytes = s3Response.Body as Buffer;

        // Detect text in the image using Rekognition
        const rekognitionResponse = await rekognition.detectText({
            Image: {
                Bytes: imageBytes
            }
        }).promise();

        // Extract the detected text
        const detectedTexts = rekognitionResponse.TextDetections?.map(t => t.DetectedText) || [];

        // Save results to DynamoDB
        await dynamoDB.put({
            TableName: tableName,
            Item: {
                objectKey: objectKey,
                sortKey: +captchaAttempt,
                detectedTexts: detectedTexts,
                timestamp: new Date().toISOString()
            }
        }).promise();

        console.log(`Saved detected texts for ${objectKey} to DynamoDB.`);
        return detectedTexts;
    } catch (error) {
        console.error('Error processing image:', error);
        throw error;
    }
};
