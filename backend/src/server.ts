import express from 'express';
import cors from 'cors';
import academicRoutes from './routes/academic.routes';
import peopleRoutes from './routes/people.routes';
import authUserRoutes from './routes/auth-users.routes';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/v1/academic', academicRoutes);
app.use('/api/v1/people', peopleRoutes);
app.use('/api/v1/auth', authUserRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'EduERP Express Backend', timestamp: new Date().toISOString() });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[EduERP Backend] Express Server running on port ${PORT}`);
  });
}

export default app;
