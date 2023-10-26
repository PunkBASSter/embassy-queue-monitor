import { APIGatewayProxyHandler } from 'aws-lambda';
import fs from 'fs';

export const handler: APIGatewayProxyHandler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello from Lambda!' }),
  };
};