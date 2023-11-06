export default interface CaptchaItem {
    partitionKey: string; //guid, session Id
    sortKey: number; //int, attempt number
    detectedTexts: string[];
    s3key: string, //name of the file in the bucket
    timeUtc: string; 
}