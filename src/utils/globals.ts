import * as crypto from 'crypto';
import * as path from 'path';

// export const HTML_ELEMENT_TYPE_UNKNOWN = 0;
// export const HTML_ELEMENT_TYPE_PRODUCT = 1;
// export const HTML_ELEMENT_TYPE_CATEGORY = 2;
// export const HTML_ELEMENT_TYPE_PAGINATION = 3;

export function hashString(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

export function entitiesMatch(entity1, entity2, options = { exclude: [] }) {
  const { exclude } = options;

  for (let key in entity1) {
    // Skip any excluded fields and undefined properties
    if (
      exclude.includes(key) ||
      entity1[key] === undefined ||
      entity2[key] === undefined
    ) {
      continue;
    }

    // Check if the values are different
    if (entity1[key] !== entity2[key]) {
      console.log("no match: " + key);
      return false;
    }
  }
  return true;
}

export function removeTrailingSlash(url) {
  return url.replace(/\/$/, '');
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function copyExistingFields(source, target) {
  Object.keys(target).forEach((key) => {
    if (source.hasOwnProperty(key)) {
      target[key] = source[key];
    }
  });
}

export function getFormattedUrl(websiteUrl: string, pathUrl: string) {
  const url = new URL(websiteUrl);
  const protocol = url.protocol; // "https:"
  const domain = url.hostname; // "www.example.com"
  const domainUrl = protocol + '//' + domain;
  let path = pathUrl;

  const websiteUrlLastSlashIndex = websiteUrl.lastIndexOf('/');
  let websiteUrlPartBeforeLastSlash =
    websiteUrl === domainUrl
      ? domainUrl
      : websiteUrl.substring(0, websiteUrlLastSlashIndex);

  if (!path) {
    return null;
  }

  if(path.startsWith("data:")){
    return path;
  }
  
  if (path.startsWith('/')) {
    websiteUrlPartBeforeLastSlash = domainUrl;
  }

  if (!path.startsWith(protocol)) {
    // it's a relative url, not absolute
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    path = websiteUrlPartBeforeLastSlash + path;
  }

  path = path.replace(/&amp;/g, '&');
  return path;
}

export function parseNum(num){
  return parseFloat(num.toString().replace(",","."));
}

export function getClientDir(){
  return path.join(process.cwd(), 'client');
}

export function getClientPublicDir(){
  return path.join(getClientDir(), 'public');
}