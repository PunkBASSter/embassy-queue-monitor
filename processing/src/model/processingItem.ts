export default interface ProcessingItem {
    partitionKey: string;
    url: string;
    formFields: { };
    headers: { [key: string]: string; };
    captchas: Captcha[];
    timeUtc: string;
}

interface Captcha {
    s3Key: string; //may correspond to the pipeline ID 
    isValid: boolean | null;
    response: string | null;
}