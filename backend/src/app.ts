import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN || "http://localhost:5173",
        credentials: true,
    
}));

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        message: 'Backend funcionando',
    });
});


app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
