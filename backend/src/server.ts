import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

export const prisma = new PrismaClient();