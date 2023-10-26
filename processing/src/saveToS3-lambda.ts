import { S3 } from 'aws-sdk';
import { APIGatewayProxyHandler } from 'aws-lambda';

const s3 = new S3();
const BUCKET_NAME = 'your-s3-bucket-name'; // Replace with your bucket name

export const handler: APIGatewayProxyHandler = async (event) => {
    const body = JSON.parse(event.body as string);
    
    // Assuming the body contains a base64 encoded file and metadata
    const fileContent = Buffer.from(body.fileContent, 'base64');
    const metadata = body.metadata || {};

    try {
        const putObjectResponse = await s3.putObject({
            Bucket: BUCKET_NAME,
            Key: 'your-file-key', // Provide a key (path/filename) for your file
            Body: fileContent,
            Metadata: metadata
        }).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'File uploaded successfully!',
                data: putObjectResponse
            })
        };
    } catch (error) {
        console.error('Error saving to S3:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error saving to S3'
            })
        };
    }
};