export const accountLockFields = [
    {
        name: 'loginAttempts',
        type: 'number',
        access: {
            create: ()=>false,
            update: ()=>false
        },
        defaultValue: 0,
        hidden: true
    },
    {
        name: 'lockUntil',
        type: 'date',
        access: {
            create: ()=>false,
            update: ()=>false
        },
        hidden: true
    }
];

//# sourceMappingURL=accountLock.js.map