import { S3Client, ListObjectsV2Command, CopyObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid'

const BUCKET_NAME = 'eqm-captchas-dev';

const s3Client = new S3Client();  // Change to your region

export const handler = async (event: any): Promise<any> => {
    try {
        // 1. Get the last modified object from the S3 bucket
        const listObjectsResponse = await s3Client.send(new ListObjectsV2Command({
            Bucket: BUCKET_NAME
        }));

        if (!listObjectsResponse.Contents || listObjectsResponse.Contents.length === 0) {
            return {
                statusCode: 404,
                body: 'No objects found in the bucket'
            };
        }

        const lastModifiedObject = listObjectsResponse.Contents.sort((a, b) => {
            return (b.LastModified as Date).getTime() - (a.LastModified as Date).getTime();
        })[0];

        // 2. Copy the object with a new name and metadata
        const keyAndExt = lastModifiedObject.Key!.split('.');
        const ext = keyAndExt?.pop() || '';
        const mainAndNum = keyAndExt.pop()!.split('_');
        const num = +(mainAndNum.pop()|| 0)+1;
        const main = mainAndNum;

        const newKey = `${main}_${num}.${ext}`;
        const copySource = encodeURIComponent(`${BUCKET_NAME}/${lastModifiedObject.Key}`);
        
        const metadata = {
            sessionId: uuidv4(),
            captchaAttempt: num.toString() // Assuming a fixed number for this example; adjust as needed
        };

        await s3Client.send(new CopyObjectCommand({
            Bucket: BUCKET_NAME,
            CopySource: copySource,
            Key: newKey,
            Metadata: metadata,
            MetadataDirective: 'REPLACE' // Required to replace metadata
        }));

        return {
            statusCode: 200,
            body: `Object copied to ${newKey} with new metadata`
        };

    } catch (error) {
        console.error('Error processing Lambda function:', error);
        return {
            statusCode: 500,
            body: 'Internal Server Error'
        };
    }
};
