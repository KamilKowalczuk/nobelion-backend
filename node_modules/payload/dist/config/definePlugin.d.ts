import type { Config, Plugin, PluginsMap } from './types.js';
/**
 * Helper for authoring plugins with order, slug, and typed options.
 * Eliminates boilerplate and ensures metadata is always set consistently.
 *
 * The `plugin` function receives a single object containing `config`, `plugins`
 * (a slug-keyed map of other plugins), and any user-provided options spread in.
 *
 * @experimental
 *
 * @example
 * // With options:
 * export const seoPlugin = definePlugin<SEOPluginOptions>({
 *   slug: 'plugin-seo',
 *   order: 10,
 *   plugin: ({ config, plugins, collections }) => ({ ...config }),
 * })
 *
 * // Without options:
 * export const myPlugin = definePlugin({
 *   slug: 'my-plugin',
 *   plugin: ({ config }) => ({ ...config }),
 * })
 */
export declare function definePlugin(descriptor: {
    order?: number;
    plugin: (args: {
        config: Config;
        plugins: PluginsMap;
    }) => Config | Promise<Config>;
    slug?: string;
}): () => Plugin;
export declare function definePlugin<TOptions extends Record<string, unknown>>(descriptor: {
    order?: number;
    plugin: (args: {
        config: Config;
        plugins: PluginsMap;
    } & TOptions) => Config | Promise<Config>;
    slug?: string;
}): (options: TOptions) => Plugin;
//# sourceMappingURL=definePlugin.d.ts.map