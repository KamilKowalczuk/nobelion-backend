import { describe, it, expect } from 'vitest';
import { traverseFields } from './traverseFields.js';
describe('traverseFields', ()=>{
    const tabsField = {
        type: 'tabs',
        tabs: [
            {
                label: 'Tab 1',
                name: 'tab1',
                fields: [
                    {
                        type: 'tabs',
                        tabs: [
                            {
                                label: 'Ui Only Tab',
                                fields: [
                                    {
                                        type: 'group',
                                        name: 'group1',
                                        label: 'Group 1',
                                        fields: [
                                            {
                                                type: 'text',
                                                name: 'text1',
                                                label: 'Text 1'
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    };
    describe('tabs traversal', ()=>{
        it('should return correct dot notation in parentPath', ()=>{
            traverseFields({
                fields: [
                    tabsField
                ],
                callback: ({ field, parentPath })=>{
                    if (field.type === 'text' && field.name === 'text1') {
                        expect(parentPath).toEqual('tab1.group1.');
                    }
                }
            });
        });
    });
});

//# sourceMappingURL=traverseFields.spec.js.map