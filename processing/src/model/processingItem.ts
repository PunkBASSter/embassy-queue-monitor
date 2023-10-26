interface ProcessingItem {
    url: string;
    form: {
        csrf: string;
        id: string;
        code: string;
        url: string;
    };
    headers: [
        {
            key: string;
            value: string;
        }
    ];
    captchas: [ Captcha ];
}

interface Captcha {
    id: string;
    s3Key: string; //may correspond to the pipeline ID 
    isValid: boolean | null;
    responses: [ string ];
}