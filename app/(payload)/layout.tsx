import { RootLayout, handleServerFunctions } from '@payloadcms/next/layouts';
import type { ReactNode } from 'react';
import config from '../../payload.config';
import { importMap } from './admin/importMap';

export default function Layout({ children }: { children: ReactNode }) {
    return RootLayout({
        children,
        config: Promise.resolve(config),
        importMap,
        serverFunction: handleServerFunctions
    });
}
