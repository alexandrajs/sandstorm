declare module 'exterror' {
    class ExtError extends Error {
        constructor(code?: string, message?: string,_original?: Error | null, ...params : any[]);
        static stringify(value : any) : string;
        static log(error : Error | ExtError) : void;
        static register(code : string, message : string) : void;
        static unregister(code : string) : void;
        static registered(code : string) : boolean;
        code? : string;
        original? : Error | null;
    }
    export = ExtError;
}

declare module 'amule' {
    class AMule {
        constructor(options?: any);
        use(plugin: any): void;
        get(key: string | Record<string, any>, callback: (err: any, value: any) => void): void;
        set(key: string | Record<string, any>, value: any, ttl: number, callback: (err: any) => void): void;
        delete(key: string | Record<string, any>, callback: (err: any) => void): void;
        pop(): any; // Add methods that are used
        // Add other methods as needed
    }
    export = AMule;
}

declare module 'amule-aim' {
    class Aim {
        constructor(options?: any);
        // Define methods/properties if known and used
    }
    export = Aim;
}

declare module 'amule-rush' {
    class Rush {
        constructor(options?: any);
        client?: { // Assuming a client property that might have a disconnect method
            disconnect?: () => void;
        };
        // Define methods/properties if known and used
    }
    export = Rush;
}

declare module 'amule-more' {
    class More {
        constructor(db: any, options?: any); // db is likely MongoDB Db instance
        // Define methods/properties if known and used
    }
    export = More;
}
