export class AppError extends Error {
    statusCode:number;
    code:string;
    isOperational:boolean;

    constructor(message:string,statusCode:number,code:string,isOperational:boolean=true){
        super(message);
        this.statusCode=statusCode;
        this.code=code;
        this.isOperational=isOperational;
    }
}