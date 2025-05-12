export const IS_PRODUCTION = false;

export const DOMAIN_TYPE = IS_PRODUCTION ? 'production' : 'test';

export const BASE_URL = `https://webtracker${IS_PRODUCTION ? 'prod' : ''}.infoware.xyz`;

export const API_BASE_URL = `${BASE_URL}/api`;

export const APP_DOWNLOAD_URL = IS_PRODUCTION
  ? `https://infowarewebtrackerprod.s3.ap-south-1.amazonaws.com/a2ee38f6-507a-41ae-bbb4-72d2e17b29ed/System%20Tracker%20Setup%201.0.0%20${DOMAIN_TYPE}.exe`
  : `https://infowarewebtracker.s3.ap-south-1.amazonaws.com/2420feae-a698-4de9-9679-332bfbe1ba68/System%20Tracker%20Setup%201.0.0%20${DOMAIN_TYPE}.exe`;

export const TRACKER_VERSION = '1.0.1';
