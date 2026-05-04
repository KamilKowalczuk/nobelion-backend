/**
 * Resolves the target key when the client sends the temporary `pending` marker.
 */ export async function resolvePendingTargetKey(args) {
    const { collectionSlug, orderableFieldName, req, targetDoc, targetID, targetKey } = args;
    if (targetKey !== 'pending') {
        return targetKey;
    }
    const targetDocKey = targetDoc?.[orderableFieldName];
    if (typeof targetDocKey === 'string') {
        return targetDocKey;
    }
    const beforeDoc = await req.payload.findByID({
        id: targetID,
        collection: collectionSlug,
        depth: 0,
        req,
        select: {
            [orderableFieldName]: true
        }
    });
    return beforeDoc?.[orderableFieldName] || null;
}

//# sourceMappingURL=resolvePendingTargetKey.js.map