export const IS_PRODUCTION = false;

export const DOMAIN_TYPE = IS_PRODUCTION ? 'production' : 'test';

export const BASE_URL = `https://webtracker${IS_PRODUCTION ? 'prod' : ''}.infoware.xyz`;

export const API_BASE_URL = `${BASE_URL}/api`;

export const TRACKER_VERSION = '1.0.2';

export const APP_DOWNLOAD_URL = (domainId, version) =>
  `https://infowarewebtracker${IS_PRODUCTION ? 'prod' : ''}.s3.ap-south-1.amazonaws.com/${domainId}/System%20Tracker%20Setup%20${version}%20${DOMAIN_TYPE}.exe`;
