import { REST_DELETE, REST_GET, REST_OPTIONS, REST_PATCH, REST_POST, REST_PUT } from '@payloadcms/next/routes';
import config from '../../../../payload.config';

export const OPTIONS = REST_OPTIONS(Promise.resolve(config));
export const GET = REST_GET(Promise.resolve(config));
export const POST = REST_POST(Promise.resolve(config));
export const DELETE = REST_DELETE(Promise.resolve(config));
export const PATCH = REST_PATCH(Promise.resolve(config));
export const PUT = REST_PUT(Promise.resolve(config));
