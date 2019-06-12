import request from "request";
import { JSDOM } from "jsdom";

const generateURL = (word: string) => {
    return `https://eow.alc.co.jp/search?q=${word.replace(" ", "+")}`;
};

const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:24.0) Gecko/20100101 Firefox/24.0',
};

const get = (url: string) => new Promise<string>((resolve, reject) => {
    request({
        url,
        headers,
    }, (error, response, body) => {
        if (error) reject(error);
        resolve(body);
    });
});
const searchDictionary = (words: string[]) => {
    return words.map(async w => {
        const url = generateURL(w);
        const html = await get(url);
        const dom = new JSDOM(html);
        
        const elem = dom.window.document.querySelector("#resultsList > ul > li > div") as Element;
        return [w, elem.textContent];
    });
};

export default searchDictionary