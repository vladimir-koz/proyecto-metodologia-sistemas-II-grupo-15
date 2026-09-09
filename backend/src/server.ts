import 'dotenv/config';
import app from './app';
import { sequelize } from './models';

const PORT = process.env.PORT || 3001;

async function startServer(): Promise<void> {
  await sequelize.authenticate();
  console.log('Database connection established successfully.');

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Unable to start server:', error);
  process.exit(1);
});