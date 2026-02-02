import { useCallback } from "react";

import type { ExpenseReport, IncomeReport } from "@/types";

export const useTransaction = () => {
  const addIncome = useCallback(async (income: IncomeReport) => {
    try {
      const response = await fetch(`/api/create-income-report`, {
        method: "POST",
        body: JSON.stringify({ ...income }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.error);
      }

      return data.successMessage;
    } catch (err) {
      console.log(err);
    }
  }, []);

  const addExpense = useCallback(async (expense: ExpenseReport) => {
    try {
      const response = await fetch(`/api/create-expense-report`, {
        method: "POST",
        body: JSON.stringify({ ...expense }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.error);
      }

      return data.successMessage;
    } catch (err) {
      console.log(err);
    }
  }, []);

  const getTransactions = useCallback(async (page: number, limit: number) => {
    try {
      const response = await fetch(
        `/api/get-transaction-data?page=${page}&limit=${limit}`,
        { method: "GET" }
      );

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error);
      }
      return {
        ...data,
      };
    } catch (err) {}
  }, []);

  return { addIncome, addExpense, getTransactions };
};
