import '@payloadcms/next/css';
import { RootLayout, handleServerFunctions } from '@payloadcms/next/layouts';
import type { ServerFunctionClient } from 'payload';
import type { ReactNode } from 'react';
import config from '../../payload.config';
import { importMap } from './admin/importMap';

// Server functions panelu admina. KRYTYCZNE: handleServerFunctions musi dostać
// config + importMap — bez nich każda interakcja panelu kończy się błędem
// "the payload config is required for getPayload to work".
const serverFunction: ServerFunctionClient = async function (args) {
    'use server';
    return handleServerFunctions({
        ...args,
        config: Promise.resolve(config),
        importMap,
    });
};

export default function Layout({ children }: { children: ReactNode }) {
    return RootLayout({
        children,
        config: Promise.resolve(config),
        importMap,
        serverFunction
    });
}
