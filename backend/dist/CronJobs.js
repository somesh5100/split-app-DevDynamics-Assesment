"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = require("./db/src/generated/prisma"); // ✅ import SplitType enum
const prisma = new prisma_1.PrismaClient();
//cron job to automatically add the split of rent on the 1st of every month
node_cron_1.default.schedule("1 0 * * *", () => __awaiter(void 0, void 0, void 0, function* () {
    const date = new Date();
    // Convert to IST
    const istDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    // Check if it's the 1st of the month
    if (istDate.getDate() === 1) {
        const rentAmount = 30000;
        const description = `Room Rent - ${istDate.toLocaleString("default", { month: 'long', year: 'numeric' })}`;
        const split = [
            { name: "Shantanu", splitType: prisma_1.SplitType.equal, value: 0 }, // ✅ use enum here
            { name: "Sanket", splitType: prisma_1.SplitType.equal, value: 0 },
            { name: "Om", splitType: prisma_1.SplitType.equal, value: 0 }
        ];
        try {
            const paidByPerson = yield prisma.person.upsert({
                where: { name: "Shantanu" },
                update: {},
                create: { name: "Shantanu" },
            });
            const expense = yield prisma.expense.create({
                data: {
                    amount: rentAmount,
                    description,
                    category: "Rent",
                    paidBy: {
                        connect: { id: paidByPerson.id },
                    },
                },
            });
            for (const item of split) {
                const person = yield prisma.person.upsert({
                    where: { name: item.name },
                    update: {},
                    create: { name: item.name },
                });
                yield prisma.expenseSplit.create({
                    data: {
                        expenseId: expense.id,
                        personId: person.id,
                        splitType: item.splitType, // ✅ now correct type
                        value: item.value,
                    },
                });
            }
            console.log("✅ Room rent split added successfully on 1st of the month.");
        }
        catch (error) {
            console.error("❌ Error adding recurring rent:", error);
        }
    }
}), {
    timezone: "Asia/Kolkata"
});
