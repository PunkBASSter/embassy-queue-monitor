import cheerio from 'cheerio';
import { SNSEvent, SNSHandler } from 'aws-lambda';
import { S3, PutObjectCommandInput } from '@aws-sdk/client-s3'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import ProcessingItem from '../model/processingItem';
import { putDdbItem } from '../captchaSolving/rekognition-lambda';


const s3 = new S3();
const dynamoDB = new DynamoDBClient();
const tableArn = process.env.DB_TABLE_ARN;
const tableName = tableArn?.split('/').pop() || "ProcessingItems";
const bucketName = process.env.S3_BUCKET_NAME;

//export const handler: SQSHandler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
export const handler: SNSHandler = async (event: SNSEvent): Promise<any> => {

    //or for SQS: event.Records[0].messageAttributes?.<STR_ATTR_NAME>.StringValue;
    const URL = event.Records[0].Sns.MessageAttributes?.url.Value;
    const sessionId = event.Records[0].Sns.MessageAttributes?.sessionId.Value;
    const processingAttempt = event.Records[0].Sns.MessageAttributes?.processingAttempt.Value;

    const response = await fetchContent(URL, { headers: browserHeaders });
    if (!browserHeaders.Referer){
        browserHeaders.Referer = URL;
    }
    
    if (response.cookieHeaderValue){
        browserHeaders.Cookie = response.cookieHeaderValue.toString();
    }

    const $ = cheerio.load(Buffer.from(response.bodyBytes));
    const captchaImgUrl = getCaptchaUrl(URL,$);

    const captchaImgResponse = await fetch(captchaImgUrl, { headers: browserHeaders });
    const imgBlob = await captchaImgResponse.blob();
    const s3Key = `${sessionId}_${processingAttempt}.jpg`;

    const s3UploadData: PutObjectCommandInput  = {
        Bucket: bucketName,
        Key: s3Key,
        Body: imgBlob,
        ContentType: 'image/jpeg',
        Metadata: {
            sessionId: sessionId,
            captchaAttempt: processingAttempt
        }
    }

    const item: ProcessingItem = {
        partitionKey: sessionId,
        url: URL,
        formFields: parsePageExtractFormFields($),
        headers: browserHeaders,
        captchas: [{
            s3Key: s3Key,
            isValid: null,
            response: null
          }],
        timeUtc: new Date().toUTCString()
    };
    await putDdbItem(tableName, item);
    
    const s3res = await s3.putObject(s3UploadData);
};

export interface Response{
    bodyBytes: Uint8Array;
    cookieHeaderValue: CookieValue;
}

export class CookieValue{
    private dictionary: { [key: string]: string } = {};
    constructor(cookieString: string) {
        const pairs = cookieString.split(';').map(pair => pair.trim());

        for (let pair of pairs) {
            const [key, value] = pair.split('=').map(part => part.trim());
            if (key.toLowerCase() !== 'expires' && key.toLowerCase() !== 'domain' && key.toLowerCase() !== 'secure')
                this.dictionary[key] = value;
        }
    }
    get(key: string): string | undefined {
        return this.dictionary[key];
    }
    set(key: string, value: string): void {
        this.dictionary[key] = value;
    }
    getAll(): { [key: string]: string } {
        return this.dictionary;
    }
    toString(): string {
        let result: string[] = [];
        for (let key in this.dictionary) {
            result.push(`${key}=${this.dictionary[key]}`);
        }
        return result.join('; ');
    }
    unionWithOverwrite(cookie: CookieValue): CookieValue {
        return new CookieValue(cookie.toString()+this.toString())
    }
}

export const fetchContent = async (url: string, options: RequestInit): Promise<Response> => {
    
    const response = await fetch(url, options);
    const resHeaders: Headers = response.headers;
    const bodyByteResult = await response.body?.getReader().read();
    if (!bodyByteResult){
        throw new Error('Unable to read response body');
    }
    
    let cookie = new CookieValue('');
    for (let [key, value] of response.headers){
        if (key.toLowerCase() === 'set-cookie') {
            cookie = new CookieValue(value).unionWithOverwrite(cookie)
        }
    }
    
    return {
        bodyBytes: bodyByteResult.value!,
        cookieHeaderValue: cookie
    };
};

export const browserHeaders: {[key: string]: string;} = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en,en-US;q=0.9,en-GB;q=0.8,ru;q=0.7',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Chromium";v="116", "Not)A;Brand";v="24", "Microsoft Edge";v="116"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36 Edg/116.0.1938.81'
};

const parsePageExtractFormFields = (root: cheerio.Root) : object =>{
    const $ = root;
    const jsonFields = {
        '__EVENTTARGET': $('#__EVENTTARGET').attr('value'),
        '__EVENTARGUMENT': $('#__EVENTARGUMENT').attr('value'),
        '__VIEWSTATE': $('#__VIEWSTATE').attr('value'),
        '__VIEWSTATEGENERATOR': $('#__VIEWSTATEGENERATOR').attr('value'),
        '__EVENTVALIDATION': $('#__EVENTVALIDATION').attr('value'),
        'ctl00$MainContent$txtID': $('#ctl00_MainContent_txtID').attr('value'),
        'ctl00$MainContent$txtUniqueID': $('#ctl00_MainContent_txtUniqueID').attr('value'),
        //CAPTCHA value to be resolved by another Lambda:
        'ctl00$MainContent$txtCode': '',
        'ctl00$MainContent$ButtonA': $('#ctl00_MainContent_ButtonA').attr('value')
    }

    return jsonFields;
}

const getCaptchaUrl = (url: string, root: cheerio.Root) : string => {
    const splitted = url.split('/')[2]; //URL validation must be done on saving.
    const relativeImgUrl = root('#ctl00_MainContent_imgSecNum').attr('src') || '';

    return `${splitted[0]}//${splitted[2]}/${relativeImgUrl}`;
}