import { useCallback, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CategoryBudgets, Expense, Income, MonthlyData } from '@/types/expense';

const STORAGE_KEY = 'expenses_data';
const INCOME_KEY = 'income_settings';

const getNextMonth = (monthStr: string) => {
  const [year, month] = monthStr.split('-').map((v) => parseInt(v, 10));
  const date = new Date(year, month - 1 + 1);
  const nextYear = date.getFullYear();
  const nextMonth = date.getMonth() + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
};

const DEFAULT_INCOME: Income = {
  salary: 0,
  vale: 0,
  other: 0,
};

export function useExpenses(month: string) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income>(DEFAULT_INCOME);
  const [loading, setLoading] = useState(true);
  const isInitialized = useRef(false);
  const [budget, setBudget] = useState<number>(0);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudgets>({});

  // Load data from storage
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [expensesRaw, incomeRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(INCOME_KEY),
      ]);

      if (expensesRaw) {
        const allData: Record<string, MonthlyData> = JSON.parse(expensesRaw);

        // Migration: if income_settings doesn't exist yet, migrate from the most
        // recent month that has income saved and persist it globally
        if (!incomeRaw) {
          const sorted = Object.keys(allData).sort().reverse();
          for (const m of sorted) {
            const inc = allData[m]?.income;
            if (inc && (inc.salary > 0 || inc.vale > 0 || inc.other > 0)) {
              await AsyncStorage.setItem(INCOME_KEY, JSON.stringify(inc));
              setIncome(inc);
              break;
            }
          }
        } else {
          setIncome(JSON.parse(incomeRaw));
        }

        const monthData = allData[month];

        if (monthData) {
          setExpenses(monthData.expenses || []);
          setBudget(monthData.budget ?? 0);
          setCategoryBudgets(monthData.categoryBudgets || {});
        } else {
          setExpenses([]);
          setBudget(0);
          setCategoryBudgets({});
        }
      } else {
        // No expenses data at all
        if (incomeRaw) {
          setIncome(JSON.parse(incomeRaw));
        } else {
          setIncome(DEFAULT_INCOME);
        }
        setExpenses([]);
        setBudget(0);
        setCategoryBudgets({});
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
      setExpenses([]);
      setIncome(DEFAULT_INCOME);
    } finally {
      setLoading(false);
    }
  }, [month]);

  // Save monthly data to storage (income is global, not saved here)
  const saveData = useCallback(async (newExpenses: Expense[], _income: Income, newBudget: number = budget, newCategoryBudgets: CategoryBudgets = categoryBudgets) => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      let allData: Record<string, MonthlyData> = {};

      if (data) {
        try {
          allData = JSON.parse(data);
        } catch (e) {
          console.error('Error parsing existing data:', e);
          allData = {};
        }
      }

      allData[month] = {
        month,
        expenses: newExpenses,
        budget: newBudget,
        categoryBudgets: newCategoryBudgets,
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
    } catch (error) {
      console.error('Error saving expenses:', error);
    }
  }, [month]);

  // Add expense
  const addExpense = useCallback(async (expense: Omit<Expense, 'id' | 'date' | 'month'>) => {
    const newExpense: Expense = {
      ...expense,
      id: Date.now().toString(),
      date: new Date().toISOString(),
      month,
    };
    const newExpenses = [...expenses, newExpense];
    setExpenses(newExpenses);
    await saveData(newExpenses, income);
  }, [expenses, income, saveData]);

  // Update expense
  const updateExpense = useCallback(async (id: string, updates: Partial<Omit<Expense, 'id' | 'date' | 'month'>>) => {
    const newExpenses = expenses.map(exp =>
      exp.id === id ? { ...exp, ...updates } : exp
    );
    setExpenses(newExpenses);
    await saveData(newExpenses, income);
  }, [expenses, income, saveData]);

  // Delete expense
  const deleteExpense = useCallback(async (id: string) => {
    const newExpenses = expenses.filter(exp => exp.id !== id);
    setExpenses(newExpenses);
    await saveData(newExpenses, income);
  }, [expenses, income, saveData]);

  // Move expense (typically parcelada) to next month,
  // mantendo a despesa atual no mês corrente
  const moveExpenseToNextMonth = useCallback(async (id: string) => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      let allData: Record<string, MonthlyData> = {};

      if (data) {
        try {
          allData = JSON.parse(data);
        } catch (e) {
          console.error('Error parsing existing data while moving expense:', e);
          allData = {};
        }
      }

      const currentMonthData: MonthlyData = allData[month] || {
        month,
        expenses: [],
        income: DEFAULT_INCOME,
      };

      const expenseToMove = currentMonthData.expenses.find((exp) => exp.id === id);
      if (!expenseToMove) {
        return;
      }

      const nextMonth = getNextMonth(month);
      const nextMonthData: MonthlyData = allData[nextMonth] || {
        month: nextMonth,
        expenses: [],
        income: DEFAULT_INCOME,
      };

      // Atualiza o texto de quantidade/parcelas, se estiver no formato "atual/total"
      let nextQuantity = expenseToMove.quantity;
      if (expenseToMove.quantity) {
        const match = expenseToMove.quantity.match(/^(\d+)\s*\/\s*(\d+)$/);
        if (match) {
          const current = parseInt(match[1], 10);
          const total = parseInt(match[2], 10);
          if (!isNaN(current) && !isNaN(total) && current < total) {
            nextQuantity = `${current + 1}/${total}`;
          }
        }
      }

      // Cria uma nova despesa para o próximo mês (próxima parcela),
      // mantendo a despesa original no mês atual
      const nextExpense: Expense = {
        ...expenseToMove,
        id: Date.now().toString(),
        month: nextMonth,
        date: new Date().toISOString(),
        paid: false,
        quantity: nextQuantity,
      };

      const updatedNextExpenses = [...nextMonthData.expenses, nextExpense];

      allData[month] = {
        ...currentMonthData,
        expenses: currentMonthData.expenses,
      };

      allData[nextMonth] = {
        ...nextMonthData,
        expenses: updatedNextExpenses,
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allData));

      // Mês atual continua igual (mas garantimos o estado atualizado)
      setExpenses(currentMonthData.expenses);
    } catch (error) {
      console.error('Error moving expense to next month:', error);
    }
  }, [month]);

  // Generate all remaining installments for a parcelled expense
  const generateRemainingInstallments = useCallback(async (id: string) => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) return;

      const allData: Record<string, MonthlyData> = JSON.parse(data);

      const currentMonthData: MonthlyData = allData[month] || {
        month,
        expenses: [],
        income: DEFAULT_INCOME,
      };

      const originalExpense = currentMonthData.expenses.find((exp) => exp.id === id);
      if (!originalExpense || !originalExpense.quantity) {
        return;
      }

      const match = originalExpense.quantity.match(/^(\d+)\s*\/\s*(\d+)$/);
      if (!match) return;

      const current = parseInt(match[1], 10);
      const total = parseInt(match[2], 10);
      if (isNaN(current) || isNaN(total) || current >= total) {
        return;
      }

      let targetMonth = month;
      let updatedAllData = { ...allData };

      for (let nextIndex = current + 1; nextIndex <= total; nextIndex++) {
        targetMonth = getNextMonth(targetMonth);
        const nextMonthData: MonthlyData = updatedAllData[targetMonth] || {
          month: targetMonth,
          expenses: [],
          income: DEFAULT_INCOME,
        };

        const nextQuantity = `${nextIndex}/${total}`;

        const alreadyExists = nextMonthData.expenses.some(
          (exp) =>
            exp.name === originalExpense.name &&
            exp.value === originalExpense.value &&
            exp.quantity === nextQuantity
        );

        if (alreadyExists) {
          updatedAllData[targetMonth] = nextMonthData;
          continue;
        }

        const clonedExpense: Expense = {
          ...originalExpense,
          id: `${originalExpense.id}-${nextIndex}`,
          month: targetMonth,
          date: new Date().toISOString(),
          paid: false,
          quantity: nextQuantity,
        };

        updatedAllData[targetMonth] = {
          ...nextMonthData,
          expenses: [...nextMonthData.expenses, clonedExpense],
        };
      }

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAllData));
    } catch (error) {
      console.error('Error generating remaining installments:', error);
    }
  }, [month]);

  // Update income — saved globally, not per month
  const updateIncome = useCallback(async (newIncome: Income) => {
    setIncome(newIncome);
    await AsyncStorage.setItem(INCOME_KEY, JSON.stringify(newIncome));
  }, []);

  // Update global budget
  const updateBudget = useCallback(async (newBudget: number) => {
    setBudget(newBudget);
    await saveData(expenses, income, newBudget, categoryBudgets);
  }, [expenses, income, categoryBudgets, saveData]);

  // Update category budgets
  const updateCategoryBudgets = useCallback(async (newCategoryBudgets: CategoryBudgets) => {
    setCategoryBudgets(newCategoryBudgets);
    await saveData(expenses, income, budget, newCategoryBudgets);
  }, [expenses, income, budget, saveData]);

  // Load data on mount or when month changes
  useEffect(() => {
    // Only load once per month to avoid unnecessary re-renders
    if (!isInitialized.current || month) {
      isInitialized.current = true;
      loadData();
    }
  }, [month, loadData]);

  const totalIncome = income.salary + income.vale + income.other;
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.value, 0);
  const balance = totalIncome - totalExpenses;

  return {
    expenses,
    income,
    loading,
    budget,
    categoryBudgets,
    totalIncome,
    totalExpenses,
    balance,
    addExpense,
    updateExpense,
    deleteExpense,
    moveExpenseToNextMonth,
    generateRemainingInstallments,
    updateIncome,
    updateBudget,
    updateCategoryBudgets,
    reload: loadData,
  };
}
