import express from "express";
import cors from "cors";
import subjectsRouter from "./routes/subject";

const app = express();
const PORT = 8000;

if (!process.env.FRONTEND_URL){
  throw new Error('FRONTEND_URL is not set in .env file')
}

app.use(cors({
  origin: process.env.FRONTEND_URL, 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}))

// JSON middleware
app.use(express.json());

app.use('/api/subjects', subjectsRouter)
// Root route
app.get("/", (req, res) => {
 res.send("Hello from Express + TypeScript!");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
