export const buildAfterOperation = async (operationArgs)=>{
    const { args, collection, operation, overrideAccess, result } = operationArgs;
    let newResult = result;
    if (args.collection.config.hooks?.afterOperation?.length) {
        for (const hook of args.collection.config.hooks.afterOperation){
            const hookResult = await hook({
                args,
                collection,
                operation,
                overrideAccess,
                req: args.req,
                result: newResult
            });
            if (hookResult !== undefined) {
                newResult = hookResult;
            }
        }
    }
    return newResult;
};

//# sourceMappingURL=buildAfterOperation.js.map