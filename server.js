const express = require('express');
const cron = require('node-cron');
const app = express();
const port = 3000;

app.use(express.json()); // Middleware to parse JSON request bodies

let expenses = []; // In-memory array to store expenses

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Add Expense (POST /expenses)
app.post('/expenses', (req, res) => {
    const { category, amount, date } = req.body;

    // Validate the input
    if (!category || !amount || !date) {
        return res.status(400).json({ status: 'error', error: 'Missing required fields' });
    }

    if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ status: 'error', error: 'Amount must be a positive number' });
    }

    // Predefined categories for validation
    const validCategories = ['Food', 'Travel', 'Shopping', 'Entertainment', 'Bills', 'Others'];
    if (!validCategories.includes(category)) {
        return res.status(400).json({ status: 'error', error: 'Invalid category' });
    }

    // Store the expense
    const expense = { id: expenses.length + 1, category, amount, date };
    expenses.push(expense);

    return res.status(201).json({ status: 'success', data: expense });
});

// Get Expenses (GET /expenses)
app.get('/expenses', (req, res) => {
    const { category, startDate, endDate } = req.query;
    
    let filteredExpenses = expenses;

    // Filter by category
    if (category) {
        filteredExpenses = filteredExpenses.filter(expense => expense.category === category);
    }

    // Filter by date range
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        filteredExpenses = filteredExpenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= start && expenseDate <= end;
        });
    }

    return res.status(200).json({ status: 'success', data: filteredExpenses });
});

// Analyze Spending (GET /expenses/analysis)
app.get('/expenses/analysis', (req, res) => {
    const { timePeriod } = req.query; // 'daily', 'monthly', 'category'

    if (!timePeriod || !['daily', 'monthly', 'category'].includes(timePeriod)) {
        return res.status(400).json({ status: 'error', error: 'Invalid time period' });
    }

    let analysisData = [];

    if (timePeriod === 'category') {
        // Group expenses by category and calculate totals
        analysisData = expenses.reduce((acc, expense) => {
            if (!acc[expense.category]) {
                acc[expense.category] = 0;
            }
            acc[expense.category] += expense.amount;
            return acc;
        }, {});
    } else if (timePeriod === 'daily') {
        // Group expenses by day and calculate totals
        analysisData = expenses.reduce((acc, expense) => {
            const date = new Date(expense.date).toISOString().split('T')[0]; // Get date in YYYY-MM-DD format
            if (!acc[date]) {
                acc[date] = 0;
            }
            acc[date] += expense.amount;
            return acc;
        }, {});
    } else if (timePeriod === 'monthly') {
        // Group expenses by month and calculate totals
        analysisData = expenses.reduce((acc, expense) => {
            const month = new Date(expense.date).toISOString().slice(0, 7); // Get month in YYYY-MM format
            if (!acc[month]) {
                acc[month] = 0;
            }
            acc[month] += expense.amount;
            return acc;
        }, {});
    }

    return res.status(200).json({ status: 'success', data: analysisData });
});

// Automate Summary Report with Cron Jobs
cron.schedule('0 0 * * *', () => { // Every day at midnight
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    console.log(`Daily Summary Report: Total Expenses Today - $${totalExpenses}`);
});

cron.schedule('0 0 * * 0', () => { // Every Sunday at midnight
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Get start of the week (Sunday)
    const weeklyExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startOfWeek;
    });

    const totalWeeklyExpenses = weeklyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    console.log(`Weekly Summary Report: Total Expenses This Week - $${totalWeeklyExpenses}`);
});

cron.schedule('0 0 1 * *', () => { // Every first day of the month at midnight
    const startOfMonth = new Date();
    startOfMonth.setDate(1); // Set to the 1st of the month
    const monthlyExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startOfMonth;
    });

    const totalMonthlyExpenses = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    console.log(`Monthly Summary Report: Total Expenses This Month - $${totalMonthlyExpenses}`);
});
