import cron from "node-cron";
import { PrismaClient, SplitType } from './db/src/generated/prisma'; // ✅ import SplitType enum

const prisma = new PrismaClient();

//cron job to automatically add the split of rent on the 1st of every month
cron.schedule("1 0 * * *", async () => {
  const date = new Date();

  // Convert to IST
  const istDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

  // Check if it's the 1st of the month
  if (istDate.getDate() === 1) {
    const rentAmount = 30000;
    const description = `Room Rent - ${istDate.toLocaleString("default", { month: 'long', year: 'numeric' })}`;

    const split = [
      { name: "Shantanu", splitType: SplitType.equal, value: 0 }, // ✅ use enum here
      { name: "Sanket", splitType: SplitType.equal, value: 0 },
      { name: "Om", splitType: SplitType.equal, value: 0 }
    ];

    try {
      const paidByPerson = await prisma.person.upsert({
        where: { name: "Shantanu" },
        update: {},
        create: { name: "Shantanu" },
      });

      const expense = await prisma.expense.create({
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
        const person = await prisma.person.upsert({
          where: { name: item.name },
          update: {},
          create: { name: item.name },
        });

        await prisma.expenseSplit.create({
          data: {
            expenseId: expense.id,
            personId: person.id,
            splitType: item.splitType, // ✅ now correct type
            value: item.value,
          },
        });
      }

      console.log("✅ Room rent split added successfully on 1st of the month.");
    } catch (error) {
      console.error("❌ Error adding recurring rent:", error);
    }
  }
}, {
  timezone: "Asia/Kolkata"
});
