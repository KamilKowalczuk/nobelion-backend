import { RootPage, generatePageMetadata } from '@payloadcms/next/views';
import config from '../../../../payload.config';
import { importMap } from '../importMap';

export const generateMetadata = ({ params }: { params: Promise<{ segments: string[] }> }) => {
    return generatePageMetadata({
        config: Promise.resolve(config),
        params,
        searchParams: Promise.resolve({})
    });
};

export default function Page({
    params,
    searchParams
}: {
    params: Promise<{ segments: string[] }>;
    searchParams: Promise<{ [key: string]: string | string[] }>;
}) {
    return RootPage({
        config: Promise.resolve(config),
        importMap,
        params,
        searchParams
    });
}
