import express from 'express'
import { Request, Response } from 'express';
import zod, { number } from 'zod' //for data validation
import { PrismaClient } from './db/src/generated/prisma';
import cors from 'cors';
const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.get('/', async (req: Request, res: Response): Promise<any> => {
    return res.status(200).json({ message: "Working!" })
})

/**Route to List all the Expenses */
app.get('/expenses', async (req: Request, res: Response): Promise<any> => {
    const expenses = await prisma.expense.findMany();
    if (expenses.length === 0) {
        return res.status(200).json({ message: "No Expenses Found" });
    }
    return res.status(200).json({
        success: true,
        data: expenses,
        message: "Expenses Returned Successfully."
    })
});

/* Schema for Split Data Validation */
export const splitSchema = zod.object({
    name: zod.string().min(1, "Name is required"),
    splitType: zod.enum(['equal', 'percentage', 'exact']),
    value: zod.number().nonnegative("Split value must be non-negative"),
})

/* Schema for ExpenseData Validation */
const expenseData = zod.object({
    amount: zod.number().positive("Amount must be greater than 0"),
    description: zod.string().min(1, "Description is required"),
    paid_by: zod.string().min(1, "Payer name is required"),
    category: zod.enum(['Food', 'Travel', 'Rent', 'Utilities', 'Entertainment', 'Groceries', 'Other']),
    split: zod.array(splitSchema).min(1, "At least one Split is Required")
})


/** Route to add new Expense */
app.post('/expenses', async (req: Request, res: Response): Promise<any> => {
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
        const paidByPerson = await prisma.person.upsert({
            where: { name: paid_by },
            update: {},
            create: { name: paid_by }
        });

        //entering the expense data in the db
        const expense = await prisma.expense.create({
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
            const splitPerson = await prisma.person.upsert({
                where: { name: item.name },
                update: {},
                create: { name: item.name }
            });

            await prisma.expenseSplit.create({
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

    } catch (error) {
        console.log(error);
        return res.status(400).json({
            success: false,
            message: 'Error Adding the Expense',
        });
    }
});

//schema for validating the expense update Data
const expenseUpdateSchema = zod.object({
    amount: zod.number().positive("Amount must be greater than 0"),
    description: zod.string().min(1, "Description is required"),
    paid_by: zod.string().min(1, "Payer name is required"),
    category: zod.enum(['Food', 'Travel', 'Rent', 'Utilities', 'Entertainment', 'Groceries', 'Other']),
    split: zod.array(splitSchema).min(1, "At least one Split is Required")
})


/** Route to update an expense */
app.put('/expenses/:id', async (req: Request, res: Response): Promise<any> => {
    // getting the expense ID from the params
    const expenseId = parseInt(req.params.id);
    if (!expenseId) return res.status(400).json({ success: false, message: "Invalid Expense ID" });

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
        const existingExpense = await prisma.expense.findUnique({
            where: { id: expenseId }
        });
        if (!existingExpense) return res.status(404).json({ success: false, message: "Expense Does Not exist." })

        const paidByPerson = await prisma.person.upsert({
            where: { name: paid_by },
            update: {},
            create: { name: paid_by },
        });

        //updating expense
        const updatedExpense = await prisma.expense.update({
            where: { id: expenseId },
            data: {
                amount,
                description,
                category,
                paidById: paidByPerson.id,
            },
        });

        //deleting the previous split
        await prisma.expenseSplit.deleteMany({
            where: { expenseId },
        });

        // Creating new splits
        for (const item of split) {
            const splitPerson = await prisma.person.upsert({
                where: { name: item.name },
                update: {},
                create: { name: item.name },
            });

            await prisma.expenseSplit.create({
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
    } catch (error) {
        console.error("Update error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

/** Route to delete an expense */
app.delete('/expenses/:id', async (req: Request, res: Response): Promise<any> => {
    //getting the expense ID from the Params
    const expenseId = parseInt(req.params.id);
    if (!expenseId) return res.status(400).json({ success: false, message: "Invalid Expense ID" });

    try {
        //deleting the expense
        const deletedExpense = await prisma.expense.delete({
            where: { id: expenseId }
        });

        return res.status(201).json({ success: true, message: "Expense Deleted Successfully." })
    } catch (error) {
        console.error("Update error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
})

/** Route to get Current Settlement Summary */
app.get('/settlements', async (req: Request, res: Response): Promise<any> => {
    try {
        //getting the data to calculate the settlements
        const people = await prisma.person.findMany({
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
                } else if (split.splitType === "percentage") {
                    share = (split.value.toNumber() / 100) * total;
                } else if (split.splitType === "exact") {
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

        const settlements: { from: string; to: string; amount: number }[] = [];

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

            if (Math.abs(debtor.balance) < 0.01) i++;
            if (Math.abs(creditor.balance) < 0.01) j++;
        }

        return res.status(200).json({
            success: true,
            summary: balances,
            settlements,
        });
    } catch (error) {
        console.error("Settlement error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});


/** Route to Show each person's balances (owes/owed) */
app.get('/balances', async (req: Request, res: Response): Promise<any> => {
    try {
        const people = await prisma.person.findMany({
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
                } else if (split.splitType === "percentage") {
                    share = (split.value.toNumber() / 100) * total;
                } else if (split.splitType === "exact") {
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

    } catch (error) {
        console.error("Settlement error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

app.get('/category-expenses', async (req: Request, res: Response): Promise<any> => {
    try {
        const grouped = await prisma.expense.groupBy({
            by: ['category'],
            _sum: {
                amount: true,
            },
        });

        const total = grouped.reduce((acc, group) => acc + group._sum.amount!.toNumber(), 0);

        const result = grouped.map(group => ({
            category: group.category,
            total: +group._sum.amount!.toFixed(2),
            percentage: +((group._sum.amount!.toNumber() / total) * 100).toFixed(2),
        }));

        return res.status(200).json({
            success: true,
            total: +total.toFixed(2),
            breakdown: result,
        });
    } catch (error) {
        console.error("Category analytics error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});


/** Route to get list of all people derived from expenses */
app.get('/people', async (req: Request, res: Response): Promise<any> => {
    try {
        const people = await prisma.person.findMany();
        return res.status(200).json({ success: true, data: people, message: "List received Successfully" });
    } catch (error) {
        console.error("Settlement error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
})

app.get('/monthly-spendings', async (req: Request, res: Response): Promise<any> => {
    try {
        const endDate = new Date(); // today
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        const recentExpenses = await prisma.expense.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });

        const grouped = await prisma.expense.groupBy({
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

    } catch (error) {
        console.error("Settlement error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

app.listen(port, () => {
    console.log(`App is listening on Port ${port}`);
});