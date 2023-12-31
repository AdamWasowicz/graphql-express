import dotenv from "dotenv";
import dotenvExpand from 'dotenv-expand';
import express, { Express } from 'express';
import bodyParser from 'body-parser';
import useDevCORS from "./middleware/use-dev-cors";
import { graphqlHTTP } from "express-graphql";
import schema from "./graphql/schema";
import resolvers, { ExpanedError } from './graphql/resolvers';
import mongoose from "mongoose";
import useAuth from "./middleware/use-jwt-auth";
import postRouter from './routes/post';
import authRouter from './routes/auth';
import useErrorHandler from "./middleware/use-error-handling";
import swaggerDocs from "./utils/swagger";

// Config env
const envConfig = dotenv.config();
dotenvExpand.expand(envConfig)


const app: Express = express();
// Services
app.use(bodyParser.json());
app.use(useDevCORS);
app.use(useAuth);

//  GraphQL
app.use('/graphql', graphqlHTTP({
    schema: schema,
    rootValue: resolvers,
    graphiql: true,
    customFormatErrorFn(error) {
        if (!error.originalError){
            return error;
        }

        // Return custom error
        const oError = (error.originalError) as ExpanedError
        const data = oError.data;
        const message = oError.message || 'An error occured';
        const status = oError.status || 500;

        return { message: message, status: status, data: data }
    }
}));

// REST
app.use(postRouter);
app.use(authRouter);

// Middleware
app.use(useErrorHandler);

// Connect to mongo
if (process.env.APP_NO_MONGO == 'TRUE') {
    const appPort = +process.env.APP_PORT_INSIDE!;

    app.listen(appPort, '0.0.0.0', () => {
        console.log('Express working...');
        swaggerDocs(app, appPort);
    });
}

mongoose.connect(process.env.APP_MONGO_URL!)
.then(_ => {
    const appPort = +process.env.APP_PORT_INSIDE!;

    app.listen(appPort, '0.0.0.0', () => {
        console.log('Express working...');
        swaggerDocs(app, appPort);
    });
})
.catch(error => {
    console.log(error)
})
