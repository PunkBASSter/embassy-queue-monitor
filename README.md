# Infrastructure deployment steps
1. processing/src/deploy-buckets.yml* - Creates S3 bucket for Lambda zip files; a bucket for Captcha images; a bucket for CloudTrail logs from Captchas bucket. CloudTrail events are later used to launch Captcha solving lambda.
2. processing/src/create-processing-sqs.yml* - Creates SQS queue with URL processing tasks.
3. Item processing resources:
- processing/src/captchaSolving/create-captcha-table.yml* - Creates DDB table to track captcha solving results
- processing/src/captchaSolving/create-captcha-lambda.yml - Creates Lambda solving captchas and all necessary permissions: Read from S3 Captchas bucket, read/write access to Rekognition, access to Rekognition for image text extraction, CloudTrail is provided with permission to trigger lambda. 

???
"*" - deployed manually before CI/CD automation established.

profit...