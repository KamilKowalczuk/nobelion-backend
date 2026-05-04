import { buildFolderField } from './buildFolderField.js';
export const addFolderFieldToCollection = ({ collection, collectionSpecific, folderFieldName, folderSlug })=>{
    collection.fields.push(buildFolderField({
        collectionSpecific,
        folderFieldName,
        folderSlug,
        overrides: {
            admin: {
                allowCreate: false,
                allowEdit: false,
                components: {
                    Cell: '@payloadcms/next/rsc#FolderTableCell',
                    Field: '@payloadcms/next/rsc#FolderField'
                }
            }
        }
    }));
};

//# sourceMappingURL=addFolderFieldToCollection.js.map