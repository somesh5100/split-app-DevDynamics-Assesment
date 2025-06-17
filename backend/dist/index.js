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
exports.splitSchema = void 0;
const express_1 = __importDefault(require("express"));
const zod_1 = __importDefault(require("zod")); //for data validation
const prisma_1 = require("./db/src/generated/prisma");
const cors_1 = __importDefault(require("cors"));
const prisma = new prisma_1.PrismaClient();
const app = (0, express_1.default)();
const port = 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return res.status(200).json({ message: "Working!" });
}));
/**Route to List all the Expenses */
app.get('/expenses', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const expenses = yield prisma.expense.findMany();
    if (expenses.length === 0) {
        return res.status(200).json({ message: "No Expenses Found" });
    }
    return res.status(200).json({
        success: true,
        data: expenses,
        message: "Expenses Returned Successfully."
    });
}));
/* Schema for Split Data Validation */
exports.splitSchema = zod_1.default.object({
    name: zod_1.default.string().min(1, "Name is required"),
    splitType: zod_1.default.enum(['equal', 'percentage', 'exact']),
    value: zod_1.default.number().nonnegative("Split value must be non-negative"),
});
/* Schema for ExpenseData Validation */
const expenseData = zod_1.default.object({
    amount: zod_1.default.number().positive("Amount must be greater than 0"),
    description: zod_1.default.string().min(1, "Description is required"),
    paid_by: zod_1.default.string().min(1, "Payer name is required"),
    category: zod_1.default.enum(['Food', 'Travel', 'Rent', 'Utilities', 'Entertainment', 'Groceries', 'Other']),
    split: zod_1.default.array(exports.splitSchema).min(1, "At least one Split is Required")
});
/** Route to add new Expense */
app.post('/expenses', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        //validating the input data
        const parseResult = expenseData.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid data",
                errors: parseResult.error.format(),
            });
        }
        const { amount, description, paid_by, category, split } = parseResult.data;
        // adding new people automatically in the db
        const paidByPerson = yield prisma.person.upsert({
            where: { name: paid_by },
            update: {},
            create: { name: paid_by }
        });
        //entering the expense data in the db
        const expense = yield prisma.expense.create({
            data: {
                amount,
                description,
                category,
                paidBy: {
                    connect: { id: paidByPerson.id },
                },
            },
        });
        for (const item of split) {
            const splitPerson = yield prisma.person.upsert({
                where: { name: item.name },
                update: {},
                create: { name: item.name }
            });
            yield prisma.expenseSplit.create({
                data: {
                    expenseId: expense.id,
                    personId: splitPerson.id,
                    splitType: item.splitType,
                    value: item.value
                }
            });
        }
        return res.status(201).json({
            success: true,
            message: "Expense Added Successfully!",
            data: expense
        });
    }
    catch (error) {
        console.log(error);
        return res.status(400).json({
            success: false,
            message: 'Error Adding the Expense',
        });
    }
}));
//schema for validating the expense update Data
const expenseUpdateSchema = zod_1.default.object({
    amount: zod_1.default.number().positive("Amount must be greater than 0"),
    description: zod_1.default.string().min(1, "Description is required"),
    paid_by: zod_1.default.string().min(1, "Payer name is required"),
    category: zod_1.default.enum(['Food', 'Travel', 'Rent', 'Utilities', 'Entertainment', 'Groceries', 'Other']),
    split: zod_1.default.array(exports.splitSchema).min(1, "At least one Split is Required")
});
/** Route to update an expense */
app.put('/expenses/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // getting the expense ID from the params
    const expenseId = parseInt(req.params.id);
    if (!expenseId)
        return res.status(400).json({ success: false, message: "Invalid Expense ID" });
    //validating the update data
    const parseResult = expenseUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid data",
            errors: parseResult.error.format(),
        });
    }
    const { amount, description, paid_by, category, split } = parseResult.data;
    try {
        //checking if the expense exists
        const existingExpense = yield prisma.expense.findUnique({
            where: { id: expenseId }
        });
        if (!existingExpense)
            return res.status(404).json({ success: false, message: "Expense Does Not exist." });
        const paidByPerson = yield prisma.person.upsert({
            where: { name: paid_by },
            update: {},
            create: { name: paid_by },
        });
        //updating expense
        const updatedExpense = yield prisma.expense.update({
            where: { id: expenseId },
            data: {
                amount,
                description,
                category,
                paidById: paidByPerson.id,
            },
        });
        //deleting the previous split
        yield prisma.expenseSplit.deleteMany({
            where: { expenseId },
        });
        // Creating new splits
        for (const item of split) {
            const splitPerson = yield prisma.person.upsert({
                where: { name: item.name },
                update: {},
                create: { name: item.name },
            });
            yield prisma.expenseSplit.create({
                data: {
                    expenseId,
                    personId: splitPerson.id,
                    splitType: item.splitType,
                    value: item.value,
                },
            });
        }
        return res.status(200).json({
            success: true,
            message: "Expense updated successfully",
            data: updatedExpense,
        });
    }
    catch (error) {
        console.error("Update error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}));
/** Route to delete an expense */
app.delete('/expenses/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //getting the expense ID from the Params
    const expenseId = parseInt(req.params.id);
    if (!expenseId)
        return res.status(400).json({ success: false, message: "Invalid Expense ID" });
    try {
        //deleting the expense
        const deletedExpense = yield prisma.expense.delete({
            where: { id: expenseId }
        });
        return res.status(201).json({ success: true, message: "Expense Deleted Successfully." });
    }
    catch (error) {
        console.error("Update error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}));
/** Route to get Current Settlement Summary */
app.get('/settlements', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        //getting the data to calculate the settlements
        const people = yield prisma.person.findMany({
            include: {
                paid: true,
                splits: {
                    include: {
                        expense: {
                            include: {
                                splits: true,
                            },
                        },
                    },
                },
            },
        });
        // Validate each expense for invalid splits
        for (const person of people) {
            for (const split of person.splits) {
                const expense = split.expense;
                const splitType = split.splitType;
                if (splitType === "exact") {
                    const totalSplit = expense.splits.reduce((sum, s) => sum + s.value.toNumber(), 0);
                    const total = expense.amount.toNumber();
                    if (totalSplit > total + 0.01) {
                        return res.status(400).json({
                            success: false,
                            message: `Invalid 'exact' splits for expense ID ${expense.id}: sum (${totalSplit}) exceeds total amount (${total})`,
                        });
                    }
                }
                if (splitType === "percentage") {
                    const totalPercentage = expense.splits.reduce((sum, s) => sum + s.value.toNumber(), 0);
                    if (totalPercentage > 100.01) {
                        return res.status(400).json({
                            success: false,
                            message: `Invalid 'percentage' splits for expense ID ${expense.id}: total percentage (${totalPercentage}%) exceeds 100%`,
                        });
                    }
                }
            }
        }
        //calculating the balances of each person
        const balances = people.map((person) => {
            const paid = person.paid.reduce((sum, exp) => sum + exp.amount.toNumber(), 0);
            const owes = person.splits.reduce((sum, split) => {
                const total = split.expense.amount.toNumber();
                const numPeople = split.expense.splits.length || 1;
                let share = 0;
                if (split.splitType === "equal") {
                    share = total / numPeople;
                }
                else if (split.splitType === "percentage") {
                    share = (split.value.toNumber() / 100) * total;
                }
                else if (split.splitType === "exact") {
                    share = split.value.toNumber();
                }
                return sum + share;
            }, 0);
            return {
                name: person.name,
                paid: +paid.toFixed(2),
                owes: +owes.toFixed(2),
                balance: +(paid - owes).toFixed(2), // Net balance
            };
        });
        // Split into creditors and debtors
        const creditors = balances.filter(p => p.balance > 0).sort((a, b) => b.balance - a.balance);
        const debtors = balances.filter(p => p.balance < 0).sort((a, b) => a.balance - b.balance);
        const settlements = [];
        let i = 0, j = 0;
        //generating the array of summary of who should pay to whom (minimizing the transactions)
        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];
            const amount = Math.min(-debtor.balance, creditor.balance);
            if (amount > 0.01) {
                settlements.push({
                    from: debtor.name,
                    to: creditor.name,
                    amount: +amount.toFixed(2),
                });
                debtor.balance += amount;
                creditor.balance -= amount;
            }
            if (Math.abs(debtor.balance) < 0.01)
                i++;
            if (Math.abs(creditor.balance) < 0.01)
                j++;
        }
        return res.status(200).json({
            success: true,
            summary: balances,
            settlements,
        });
    }
    catch (error) {
        console.error("Settlement error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}));
/** Route to Show each person's balances (owes/owed) */
app.get('/balances', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const people = yield prisma.person.findMany({
            include: {
                paid: true,
                splits: {
                    include: {
                        expense: {
                            include: {
                                splits: true,
                            },
                        },
                    },
                },
            },
        });
        // Validate each expense for invalid splits
        for (const person of people) {
            for (const split of person.splits) {
                const expense = split.expense;
                const splitType = split.splitType;
                if (splitType === "exact") {
                    const totalSplit = expense.splits.reduce((sum, s) => sum + s.value.toNumber(), 0);
                    const total = expense.amount.toNumber();
                    if (totalSplit > total + 0.01) {
                        return res.status(400).json({
                            success: false,
                            message: `Invalid 'exact' splits for expense ID ${expense.id}: sum (${totalSplit}) exceeds total amount (${total})`,
                        });
                    }
                }
                if (splitType === "percentage") {
                    const totalPercentage = expense.splits.reduce((sum, s) => sum + s.value.toNumber(), 0);
                    if (totalPercentage > 100.01) {
                        return res.status(400).json({
                            success: false,
                            message: `Invalid 'percentage' splits for expense ID ${expense.id}: total percentage (${totalPercentage}%) exceeds 100%`,
                        });
                    }
                }
            }
        }
        //calculating the balance
        const balances = people.map((person) => {
            const paid = person.paid.reduce((sum, exp) => sum + exp.amount.toNumber(), 0);
            const owes = person.splits.reduce((sum, split) => {
                const total = split.expense.amount.toNumber();
                const numPeople = split.expense.splits.length || 1;
                let share = 0;
                if (split.splitType === "equal") {
                    share = total / numPeople;
                }
                else if (split.splitType === "percentage") {
                    share = (split.value.toNumber() / 100) * total;
                }
                else if (split.splitType === "exact") {
                    share = split.value.toNumber();
                }
                return sum + share;
            }, 0);
            return {
                name: person.name,
                paid: +paid.toFixed(2), // the amount paid by the person
                owes: +owes.toFixed(2), // the amount he need to pay 
                balance: +(paid - owes).toFixed(2), // balance [if -ve then they owed the money] [if +ve they owe the money]
            };
        });
        return res.status(200).json({
            success: true,
            message: "Balances calculated successfully",
            data: balances,
        });
    }
    catch (error) {
        console.error("Settlement error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}));
app.get('/category-expenses', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const grouped = yield prisma.expense.groupBy({
            by: ['category'],
            _sum: {
                amount: true,
            },
        });
        const total = grouped.reduce((acc, group) => acc + group._sum.amount.toNumber(), 0);
        const result = grouped.map(group => ({
            category: group.category,
            total: +group._sum.amount.toFixed(2),
            percentage: +((group._sum.amount.toNumber() / total) * 100).toFixed(2),
        }));
        return res.status(200).json({
            success: true,
            total: +total.toFixed(2),
            breakdown: result,
        });
    }
    catch (error) {
        console.error("Category analytics error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}));
/** Route to get list of all people derived from expenses */
app.get('/people', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const people = yield prisma.person.findMany();
        return res.status(200).json({ success: true, data: people, message: "List received Successfully" });
    }
    catch (error) {
        console.error("Settlement error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}));
app.get('/monthly-spendings', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const endDate = new Date(); // today
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        const recentExpenses = yield prisma.expense.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        const grouped = yield prisma.expense.groupBy({
            by: ['category'],
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            _sum: {
                amount: true,
            },
        });
        return res.status(201).json({
            success: true,
            MonthlyExpenseData: recentExpenses,
            CategorywiseMonthlyData: grouped
        });
    }
    catch (error) {
        console.error("Settlement error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}));
app.listen(port, () => {
    console.log(`App is listening on Port ${port}`);
});
