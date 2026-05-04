export const baseAuthFields = [
    {
        name: 'resetPasswordToken',
        type: 'text',
        access: {
            create: ()=>false,
            update: ()=>false
        },
        hidden: true
    },
    {
        name: 'resetPasswordExpiration',
        type: 'date',
        access: {
            create: ()=>false,
            update: ()=>false
        },
        hidden: true
    },
    {
        name: 'salt',
        type: 'text',
        access: {
            create: ()=>false,
            update: ()=>false
        },
        hidden: true
    },
    {
        name: 'hash',
        type: 'text',
        access: {
            create: ()=>false,
            update: ()=>false
        },
        hidden: true
    }
];

//# sourceMappingURL=auth.js.map