import { prisma } from "./src/lib/prisma";
import { getFinancialSummary } from "./src/actions/finances";

async function test() {
  try {
    const summary = await getFinancialSummary();

    console.log("--- Financial Summary ---");
    console.log(JSON.stringify(summary, null, 2));

    const withdrawals = await prisma.withdrawal.findMany({
      orderBy: { createdAt: "desc" },
    });

    console.log("--- Withdrawals ---");
    console.log(JSON.stringify(withdrawals, null, 2));
  } catch (error) {
    console.error("--- ERROR ---");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

test();