import 'dotenv/config';
import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`WMS 3PL Backend running on port ${PORT}`);
  console.log(`Swagger docs: http://localhost:${PORT}/api/docs`);
});
