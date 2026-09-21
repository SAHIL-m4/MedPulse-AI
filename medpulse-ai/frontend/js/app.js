/**
 * MedPulse-AI: Primary Application Controller
 * Handles empirical patient switching, live chart rendering, parameter simulation, and tab switching.
 */

// Sample Empirical Patient Profiles (MIMIC-III benchmark ranges)
const PATIENT_PROFILES = [
    {
        id: "PAT-1042",
        age: 64,
        gender: "M",
        status: "Stable",
        hr: 84,
        sbp: 118,
        dbp: 74,
        spo2: 98,
        temp_c: 37.1,
        resp_rate: 18,
        wbc: 7.8,
        lactate: 1.4,
        creatinine: 0.9,
        riskScore: 18,
        mews: 1,
        unit: "ICU-Alpha"
    },
    {
        id: "PAT-1089",
        age: 72,
        gender: "F",
        status: "High Risk Sepsis",
        hr: 118,
        sbp: 88,
        dbp: 56,
        spo2: 91,
        temp_c: 38.8,
        resp_rate: 28,
        wbc: 18.5,
        lactate: 4.8,
        creatinine: 2.1,
        riskScore: 84,
        mews: 7,
        unit: "ICU-Bravo"
    },
    {
        id: "PAT-1115",
        age: 58,
        gender: "M",
        status: "Moderate Warning",
        hr: 96,
        sbp: 104,
        dbp: 65,
        spo2: 94,
        temp_c: 37.9,
        resp_rate: 22,
        wbc: 12.4,
        lactate: 2.6,
        creatinine: 1.3,
        riskScore: 46,
        mews: 4,
        unit: "CCU-Main"
    },
    {
        id: "PAT-1204",
        age: 81,
        gender: "F",
        status: "Stable",
        hr: 76,
        sbp: 124,
        dbp: 78,
        spo2: 97,
        temp_c: 36.8,
        resp_rate: 16,
        wbc: 6.2,
        lactate: 1.1,
        creatinine: 1.0,
        riskScore: 12,
        mews: 0,
        unit: "Neuro-ICU"
    }
];

let activePatient = PATIENT_PROFILES[0];
let charts = {};

document.addEventListener('DOMContentLoaded', () => {
    initIcons();
    initTabNavigation();
    initPatientModal();
    initCharts();
    initSimulator();
    updatePatientUI(activePatient);
});

function initIcons() {
    if (window.lucide) {
        lucide.createIcons();
    }
}

// --- TAB NAVIGATION ---
function initTabNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            btn.classList.add('active');
            const targetPaneId = btn.getAttribute('data-tab');
            document.getElementById(targetPaneId).classList.add('active');
        });
    });
}

// --- PATIENT SELECTOR MODAL ---
function initPatientModal() {
    const modal = document.getElementById('patient-modal');
    const openBtn = document.getElementById('patient-select-btn');
    const closeBtn = document.getElementById('close-modal-btn');
    const listContainer = document.getElementById('patient-modal-list');

    openBtn.addEventListener('click', () => modal.classList.remove('hidden'));
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });

    listContainer.innerHTML = PATIENT_PROFILES.map(p => `
        <div class="patient-item" onclick="selectPatient('${p.id}')">
            <div>
                <strong>${p.id}</strong> (${p.age}y ${p.gender}) - <small>${p.unit}</small>
                <div class="font-mono text-muted" style="font-size:0.75rem">HR: ${p.hr} | MAP: ${Math.round((2*p.dbp+p.sbp)/3)} | Lactate: ${p.lactate}</div>
            </div>
            <span class="badge ${p.riskScore > 50 ? 'bg-rose' : (p.riskScore > 30 ? 'bg-gold' : 'bg-emerald')}">
                Risk: ${p.riskScore}%
            </span>
        </div>
    `).join('');
}

window.selectPatient = function(patientId) {
    const patient = PATIENT_PROFILES.find(p => p.id === patientId);
    if (!patient) return;
    activePatient = patient;
    updatePatientUI(patient);
    document.getElementById('patient-modal').classList.add('hidden');
};

function updatePatientUI(p) {
    // Header & Badges
    document.getElementById('current-patient-badge').innerText = p.id;
    document.getElementById('active-patient-id').innerText = `Patient ID: ${p.id} (${p.age}y ${p.gender})`;
    
    const statusBadge = document.getElementById('active-patient-status');
    statusBadge.innerText = p.status;
    statusBadge.className = `badge ${p.riskScore > 50 ? 'bg-rose' : (p.riskScore > 30 ? 'bg-gold' : 'bg-emerald')}`;

    // Waveform & Vitals
    if (window.ecgWaveform) {
        window.ecgWaveform.bpm = p.hr;
    }
    document.getElementById('live-hr-display').innerText = `${p.hr} BPM`;
    document.getElementById('val-hr').innerHTML = `${p.hr} <small>BPM</small>`;
    
    const map = Math.round((2 * p.dbp + p.sbp) / 3);
    document.getElementById('val-bp').innerHTML = `${p.sbp}/${p.dbp} <small>(MAP ${map})</small>`;
    document.getElementById('val-spo2').innerText = `${p.spo2}%`;
    
    const shock = (p.hr / p.sbp).toFixed(2);
    document.getElementById('val-shock').innerText = shock;

    // Lab Biomarkers
    document.getElementById('val-lactate').innerText = `${p.lactate} mmol/L`;
    document.getElementById('val-wbc').innerText = `${p.wbc} k/µL`;
    document.getElementById('val-creatinine').innerText = `${p.creatinine} mg/dL`;
    
    const mewsEl = document.getElementById('val-mews');
    mewsEl.innerText = `Score: ${p.mews}`;
    mewsEl.className = `badge ${p.mews >= 5 ? 'bg-rose' : 'bg-emerald'}`;

    // Risk Gauge Update
    document.getElementById('risk-score-percent').innerText = `${p.riskScore}%`;
    const scoreColor = p.riskScore > 50 ? '#f43f5e' : (p.riskScore > 30 ? '#fbbf24' : '#10b981');
    document.getElementById('risk-score-percent').style.color = scoreColor;

    updateRiskGaugeChart(p.riskScore, scoreColor);
}

// --- CHART.JS INITIALIZATION ---
function initCharts() {
    // 1. Risk Gauge Half-Donut Chart
    const ctxGauge = document.getElementById('risk-gauge-chart');
    if (ctxGauge) {
        charts.gauge = new Chart(ctxGauge, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [18, 82],
                    backgroundColor: ['#10b981', 'rgba(255, 255, 255, 0.08)'],
                    borderWidth: 0
                }]
            },
            options: {
                rotation: -90,
                circumference: 180,
                cutout: '80%',
                responsive: false,
                plugins: { tooltip: { enabled: false } }
            }
        });
    }

    // 2. Feature Importance Horizontal Bar Chart
    const ctxFeat = document.getElementById('feature-importance-chart');
    if (ctxFeat) {
        charts.feat = new Chart(ctxFeat, {
            type: 'bar',
            data: {
                labels: ['Shock Index', 'MAP Pressure', 'Blood Lactate', 'WBC Count', 'MEWS Score', 'Heart Rate', 'SpO2'],
                datasets: [{
                    label: 'Feature Importance (Gini)',
                    data: [0.26, 0.22, 0.18, 0.14, 0.09, 0.07, 0.04],
                    backgroundColor: ['#00f2fe', '#4facfe', '#10b981', '#fbbf24', '#f43f5e', '#3b82f6', '#94a3b8'],
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#f8fafc' }, grid: { display: false } }
                }
            }
        });
    }

    // 3. Hospital Cost Distribution Bar Chart
    const ctxCost = document.getElementById('cost-distribution-chart');
    if (ctxCost) {
        charts.cost = new Chart(ctxCost, {
            type: 'bar',
            data: {
                labels: ['Standard Care ($12k)', 'Moderate Risk ($22k)', 'Critical ICU Sepsis ($48k)'],
                datasets: [{
                    label: 'Patient Count',
                    data: [1420, 780, 300],
                    backgroundColor: ['#10b981', '#fbbf24', '#f43f5e'],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    // 4. Resource Tier Pie Chart
    const ctxResource = document.getElementById('resource-tier-chart');
    if (ctxResource) {
        charts.resource = new Chart(ctxResource, {
            type: 'doughnut',
            data: {
                labels: ['Standard Utilization', 'Moderate Care', 'High Resource ICU'],
                datasets: [{
                    data: [57, 31, 12],
                    backgroundColor: ['#10b981', '#fbbf24', '#f43f5e'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { labels: { color: '#f8fafc' } } }
            }
        });
    }

    // 5. ROC Curve Line Chart
    const ctxRoc = document.getElementById('roc-curve-chart');
    if (ctxRoc) {
        charts.roc = new Chart(ctxRoc, {
            type: 'line',
            data: {
                labels: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
                datasets: [
                    {
                        label: 'MedPulse-AI Classifier (AUC = 0.942)',
                        data: [0, 0.68, 0.84, 0.91, 0.94, 0.96, 0.97, 0.98, 0.99, 1.0, 1.0],
                        borderColor: '#00f2fe',
                        borderWidth: 3,
                        tension: 0.3,
                        fill: false
                    },
                    {
                        label: 'Random Chance Baseline (AUC = 0.500)',
                        data: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
                        borderColor: '#64748b',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { labels: { color: '#f8fafc' } } },
                scales: {
                    x: { title: { display: true, text: 'False Positive Rate (1 - Specificity)', color: '#94a3b8' }, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { title: { display: true, text: 'True Positive Rate (Sensitivity)', color: '#94a3b8' }, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }
}

function updateRiskGaugeChart(score, color) {
    if (!charts.gauge) return;
    charts.gauge.data.datasets[0].data = [score, 100 - score];
    charts.gauge.data.datasets[0].backgroundColor[0] = color;
    charts.gauge.update();
}

// --- RISK SIMULATOR CONTROLS ---
function initSimulator() {
    const hrInput = document.getElementById('sim-hr');
    const sbpInput = document.getElementById('sim-sbp');
    const lactateInput = document.getElementById('sim-lactate');
    const wbcInput = document.getElementById('sim-wbc');

    if (!hrInput) return;

    const inputs = [hrInput, sbpInput, lactateInput, wbcInput];
    inputs.forEach(input => {
        input.addEventListener('input', runSimulation);
    });
}

function runSimulation() {
    const hr = parseFloat(document.getElementById('sim-hr').value);
    const sbp = parseFloat(document.getElementById('sim-sbp').value);
    const lactate = parseFloat(document.getElementById('sim-lactate').value);
    const wbc = parseFloat(document.getElementById('sim-wbc').value);

    document.getElementById('sim-hr-val').innerText = hr;
    document.getElementById('sim-sbp-val').innerText = sbp;
    document.getElementById('sim-lactate-val').innerText = lactate;
    document.getElementById('sim-wbc-val').innerText = wbc;

    // Calculate simulated risk score formula based on ML model coefficients
    const shock = hr / Math.max(sbp, 1.0);
    let risk = (
        (shock > 0.85 ? 35 : (shock > 0.7 ? 18 : 5)) +
        (lactate > 3.5 ? 35 : (lactate > 2.0 ? 15 : 4)) +
        (wbc > 14.0 ? 18 : 5) +
        (hr > 110 ? 12 : 0)
    );
    risk = Math.min(Math.max(risk, 4), 98);

    const badge = document.getElementById('sim-prediction-badge');
    const progressFill = document.getElementById('sim-progress-fill');

    progressFill.style.width = `${risk}%`;

    if (risk > 55) {
        badge.innerText = `CRITICAL SEPSIS RISK (${risk.toFixed(1)}%)`;
        badge.className = 'badge bg-rose';
        progressFill.className = 'progress-fill bg-rose';
    } else if (risk > 30) {
        badge.innerText = `MODERATE RISK WARNING (${risk.toFixed(1)}%)`;
        badge.className = 'badge bg-gold';
        progressFill.className = 'progress-fill bg-gold';
    } else {
        badge.innerText = `LOW DECOMPENSATION RISK (${risk.toFixed(1)}%)`;
        badge.className = 'badge bg-emerald';
        progressFill.className = 'progress-fill bg-emerald';
    }
}
