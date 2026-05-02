const API = "http://localhost:8080/api";

// ─── AUTH HELPERS ───────────────────────────────────────────
function getToken() {
    return localStorage.getItem("token");
}

function getEmail() {
    return localStorage.getItem("email");
}

function isLoggedIn() {
    return !!getToken();
}

// ─── PAGE: login.html ────────────────────────────────────────
if (document.getElementById("loginForm")) {
    const footerLink = document.querySelector("#footer a");
    if (footerLink) footerLink.href = "register.html";

    document.getElementById("loginForm").addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("Password").value.trim();

        if (!email || !password) {
            alert("Please fill in all fields.");
            return;
        }

        try {
            const res = await fetch(`${API}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (data.token) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("email", data.email);
                window.location.href = "index.html";
            } else {
                alert(data.error || "Login failed.");
            }
        } catch (err) {
            alert("Server error. Make sure the backend is running.");
        }
    });
}

// ─── PAGE: register.html ─────────────────────────────────────
if (document.getElementById("registerForm") ||
    (document.getElementById("loginForm") && document.querySelector("header") &&
     document.querySelector("header").textContent.trim() === "REGISTER")) {

    const footerLink = document.querySelector("#footer a");
    if (footerLink) footerLink.href = "login.html";

    const form = document.getElementById("loginForm") || document.getElementById("registerForm");

    if (form) {
        form.addEventListener("submit", async function (e) {
            e.preventDefault();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("Password").value.trim();

            if (!email || !password) {
                alert("Please fill in all fields.");
                return;
            }

            try {
                const res = await fetch(`${API}/auth/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();

                if (data.message) {
                    alert("Registered successfully! Please log in.");
                    window.location.href = "login.html";
                } else {
                    alert(data.error || "Registration failed.");
                }
            } catch (err) {
                alert("Server error. Make sure the backend is running.");
            }
        });
    }
}

// ─── PAGE: index.html ────────────────────────────────────────
if (document.getElementById("expenseTable")) {

    if (!isLoggedIn()) {
        window.location.href = "login.html";
    }

    let expenses = [];
    let catChartInstance = null;
    let monthChartInstance = null;

    loadExpenses();

    async function loadExpenses() {
        try {
            const res = await fetch(`${API}/expenses`, {
                headers: { "Authorization": "Bearer " + getToken() }
            });

            if (res.status === 403) {
                localStorage.clear();
                window.location.href = "login.html";
                return;
            }

            expenses = await res.json();
            renderTable();
            updateSummary();
            renderCharts();
        } catch (err) {
            console.error("Failed to load expenses:", err);
        }
    }

    function renderTable() {
        const tbody = document.getElementById("expenseTable");
        const emptyState = document.getElementById("emptyState");

        tbody.innerHTML = "";

        if (expenses.length === 0) {
            emptyState.style.display = "block";
            return;
        }

        emptyState.style.display = "none";

        expenses.forEach(exp => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${exp.title}</td>
                <td>₹${exp.amount.toFixed(2)}</td>
                <td>${exp.category}</td>
                <td>${exp.date}</td>
                <td><button class="deleteBtn" onclick="deleteExpense(${exp.id})">Delete</button></td>
            `;
            tbody.appendChild(tr);
        });
    }

    function updateSummary() {
        const total = expenses.reduce((sum, e) => sum + e.amount, 0);
        document.getElementById("total").textContent = total.toFixed(2);
        document.getElementById("count").textContent = expenses.length;

        const now = new Date();
        const monthly = expenses
            .filter(e => {
                const d = new Date(e.date);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            })
            .reduce((sum, e) => sum + e.amount, 0);

        document.getElementById("monthly").textContent = monthly.toFixed(2);
    }

    // ─── CHARTS ─────────────────────────────────────────────────
    function renderCharts() {
        const catColors = {
            Food:     '#9CE963',
            Travel:   '#3ddc84',
            Bills:    '#0E6E56',
            Shopping: '#2a9d8f',
            Other:    '#264653'
        };
        const cats = ['Food', 'Travel', 'Bills', 'Shopping', 'Other'];
        const catTotals = cats.map(c =>
            expenses.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0)
        );
        const grandTotal = catTotals.reduce((a, b) => a + b, 0);

        // Build legend
        const legend = document.getElementById('catLegend');
        legend.innerHTML = '';
        cats.forEach((c, i) => {
            const pct = grandTotal ? Math.round(catTotals[i] / grandTotal * 100) : 0;
            const row = document.createElement('span');
            row.style.cssText = 'display:flex;align-items:center;gap:8px;';
            row.innerHTML = `
                <span style="width:12px;height:12px;border-radius:3px;background:${catColors[c]};flex-shrink:0;"></span>
                <span style="color:#aaa;font-family:Outfit,sans-serif;">${c}</span>
                <span style="margin-left:auto;color:#9CE963;font-weight:600;font-family:Outfit,sans-serif;">${pct}%</span>
            `;
            legend.appendChild(row);
        });

        // Doughnut chart
        if (catChartInstance) catChartInstance.destroy();
        catChartInstance = new Chart(document.getElementById('catChart'), {
            type: 'doughnut',
            data: {
                labels: cats,
                datasets: [{
                    data: catTotals,
                    backgroundColor: cats.map(c => catColors[c]),
                    borderColor: '#0d1f15',
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ₹${ctx.parsed.toLocaleString('en-IN')}`
                        }
                    }
                },
                cutout: '65%'
            }
        });

        // Monthly bar chart
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const monthTotals = Array(12).fill(0);
        expenses.forEach(e => {
            const m = new Date(e.date).getMonth();
            monthTotals[m] += e.amount;
        });

        if (monthChartInstance) monthChartInstance.destroy();
        monthChartInstance = new Chart(document.getElementById('monthChart'), {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Expenses',
                    data: monthTotals,
                    backgroundColor: '#0E6E56',
                    hoverBackgroundColor: '#9CE963',
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ₹${ctx.parsed.y.toLocaleString('en-IN')}`
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#aaa', autoSkip: false, maxRotation: 0, font: { family: 'Outfit' } },
                        grid: { color: 'rgba(42,90,58,0.3)' }
                    },
                    y: {
                        ticks: {
                            color: '#aaa',
                            font: { family: 'Outfit' },
                            callback: v => '₹' + v.toLocaleString('en-IN')
                        },
                        grid: { color: 'rgba(42,90,58,0.3)' }
                    }
                }
            }
        });
    }
    // ─── END CHARTS ─────────────────────────────────────────────

    window.addExpense = async function () {
        const title = document.getElementById("title").value.trim();
        const amount = parseFloat(document.getElementById("amount").value);
        const category = document.getElementById("category").value;
        const date = document.getElementById("date").value;

        if (!title || !amount || !date) {
            alert("Please fill in all fields.");
            return;
        }

        try {
            const res = await fetch(`${API}/expenses`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + getToken()
                },
                body: JSON.stringify({ title, amount, category, date })
            });

            const newExpense = await res.json();
            expenses.push(newExpense);
            renderTable();
            updateSummary();
            renderCharts();

            document.getElementById("title").value = "";
            document.getElementById("amount").value = "";
            document.getElementById("date").value = "";
        } catch (err) {
            alert("Failed to add expense.");
        }
    };

    window.deleteExpense = async function (id) {
        try {
            await fetch(`${API}/expenses/${id}`, {
                method: "DELETE",
                headers: { "Authorization": "Bearer " + getToken() }
            });

            expenses = expenses.filter(e => e.id !== id);
            renderTable();
            updateSummary();
            renderCharts();
        } catch (err) {
            alert("Failed to delete expense.");
        }
    };
}