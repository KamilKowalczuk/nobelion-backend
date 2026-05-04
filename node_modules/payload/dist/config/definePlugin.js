function buildPluginsMap(plugins) {
    const map = {};
    if (plugins) {
        for (const p of plugins){
            if (p.slug) {
                map[p.slug] = p;
            }
        }
    }
    return map;
}
export function definePlugin(descriptor) {
    return (options)=>{
        const pluginFn = (config)=>{
            const plugins = buildPluginsMap(config.plugins);
            const args = {
                ...options,
                config,
                plugins
            };
            return descriptor.plugin(args);
        };
        pluginFn.options = options;
        if (descriptor.slug !== undefined) {
            pluginFn.slug = descriptor.slug;
        }
        if (descriptor.order !== undefined) {
            pluginFn.order = descriptor.order;
        }
        return pluginFn;
    };
}

//# sourceMappingURL=definePlugin.js.map