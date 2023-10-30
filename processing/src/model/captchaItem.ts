interface CaptchaItem {
    partitionKey: string; //guid, session Id
    sortKey: number; //int, attempt number
    detectedTexts: string[];
    timeUtc: string; 
}