// ==========================================
// ANESTHESIA MASTER DASHBOARD - UNIFIED LOGIC
// ==========================================

// --- GLOBAL STATE ---
let gender = 'male';
let ibw = 0, abw = 0, ptWeight = 0;

let nmbTotalMg = 0, nmbCalculatedIntubationMg = 0; 
let nmbInterval = null, nmbEndTime = 0, nmbDuration = 0, nmbWarningStart = 0, nmbNotified = false;

let currentSevoBaseline = 0;
let sevoZones = [];
let ghostVal = 0;
let currentFGF = 1.5;

let fentTotal = 0;
let propTotal = 0;
let fluidCryst = 0;
let fluidBlood = 0;
let fluidLoss = 0;

let givenAnalgin = false;
let givenPara = false;
let givenDex = false;

// --- NAVIGATION LOGIC ---
function setMainTab(tabId) {
    document.querySelectorAll('.master-nav .nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.container > .tab-panel').forEach(panel => panel.classList.remove('active'));
    
    const navBtn = document.getElementById(`nav-${tabId}`);
    const mainTab = document.getElementById(`main-${tabId}`);
    if (navBtn) navBtn.classList.add('active');
    if (mainTab) mainTab.classList.add('active');

    // Auto-calculate Sevo when switching to Maintenance tab
    if (tabId === 'maintenance' && typeof calculateSevo === 'function') {
        setTimeout(calculateSevo, 100);
    }
}

function setSubTab(parent, subId) {
    if (parent === 'induction') {
        document.querySelectorAll('#sub-nav-dosing').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.induction-sub').forEach(p => p.classList.remove('active'));
    } else if (parent === 'maintenance') {
        document.querySelectorAll('#sub-nav-sevo, #sub-nav-remi').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.maintenance-sub').forEach(p => p.classList.remove('active'));
    } else if (parent === 'log') {
        document.querySelectorAll('#log-nav-std, #log-nav-neuro, #log-nav-lap, #log-nav-vasc').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.log-sub').forEach(p => p.classList.remove('active'));
    }
    
    const subNavBtn = document.getElementById(`sub-nav-${subId}`);
    const subTabPanel = document.getElementById(`sub-${subId}`);
    if (subNavBtn) subNavBtn.classList.add('active');
    if (subTabPanel) subTabPanel.classList.add('active');
}

// --- SAFETY & INDUCTION ---
function checkSafety() {
    const card = document.getElementById('safety-stop-card');
    const header = document.getElementById('safety-header');
    if(!card || !header) return;
    
    if (document.getElementById('consent-toggle').checked) {
        card.style.borderColor = 'var(--alert-green)';
        header.style.color = 'var(--alert-green)';
        header.innerHTML = '✅ Safety Checks Cleared';
    } else {
        card.style.borderColor = 'var(--iso-relaxant)';
        header.style.color = 'var(--iso-relaxant)';
        header.innerHTML = '⚠️ Critical Safety Stop';
    }
}

function resetChecklist() {
    document.querySelectorAll('.checklist-item input[type="checkbox"]').forEach(cb => cb.checked = false);
}

function setGender(g) {
    gender = g;
    document.getElementById('btn-male').classList.toggle('active', g === 'male');
    document.getElementById('btn-female').classList.toggle('active', g === 'female');
}

function calculate() {
    const consentToggle = document.getElementById('consent-toggle');
    if (consentToggle && !consentToggle.checked) {
        alert("🛑 HARD STOP: Written consent not verified!\n\nPlease check the patient's documentation for signed consent before proceeding.");
        return;
    }

    const height = parseFloat(document.getElementById('pt-height').value);
    ptWeight = parseFloat(document.getElementById('pt-weight').value);

    if (!height || !ptWeight || height <= 0 || ptWeight <= 0) { 
        alert('Please enter valid Height and Weight values.'); 
        return; 
    }

    ibw = gender === 'male' ? 50 + 0.91 * (height - 152.4) : 45.5 + 0.91 * (height - 152.4);
    if (ibw < 0) ibw = 0;
    abw = ibw + 0.4 * (ptWeight - ibw);
    const dosingWeight = (ptWeight > 1.2 * ibw) ? abw : ptWeight;

    document.getElementById('out-ibw').innerText = Math.round(ibw) + ' kg';
    document.getElementById('out-abw').innerText = Math.round(abw) + ' kg';
    
    nmbCalculatedIntubationMg = Math.round(ptWeight * 0.5);
    const btnIntub = document.getElementById('btn-intub-ml');
    if(btnIntub) btnIntub.innerText = (nmbCalculatedIntubationMg / 10).toFixed(1);

    const fentMinMg = Math.round(ptWeight * 1);
    const fentMaxMg = Math.round(ptWeight * 2);
    const fentMinMl = (fentMinMg / 50).toFixed(1);
    const fentMaxMl = (fentMaxMg / 50).toFixed(1);

    const propMg = Math.round(dosingWeight * 2.0);
    const propMl = (propMg / 10).toFixed(1);

    const ketMinMg = Math.round(ptWeight * 1.0);
    const ketMaxMg = Math.round(ptWeight * 1.5);
    const ketMinMl = (ketMinMg / 50).toFixed(1);
    const ketMaxMl = (ketMaxMg / 50).toFixed(1);

    const html = `
        <div class="result-section" style="border-top:none; padding-top:0;">
            <div class="result-title">Airway & Ventilation</div>
            <div class="result-row"><div class="result-name">ETT Size<small>${gender === 'male' ? '22-24 cm at lips' : '20-22 cm at lips'}</small></div><div class="result-val">${gender === 'male' ? '8.0' : '7.0 - 7.5'}</div></div>
            <div class="result-row"><div class="result-name">Tidal Volume<small>6 - 8 mL/kg IBW</small></div><div class="result-val">${Math.round(ibw * 6 / 10)*10} - ${Math.round(ibw * 8 / 10)*10} mL</div></div>
        </div>
        <div class="result-section">
            <div class="result-title" style="color: var(--iso-hypnotic);">Induction Dosing</div>
            <div class="result-row">
                <div class="result-name" style="color: var(--iso-opioid); font-weight:bold;">Fentanyl <span style="font-size:0.8em; font-weight:normal; color:var(--text-main);">(50 mcg/mL)</span><small style="color: var(--text-muted); font-weight:normal;">1-2 mcg/kg (${fentMinMg}-${fentMaxMg} mcg)</small></div>
                <div class="result-val">${fentMinMl} - ${fentMaxMl} mL</div>
            </div>
            <div class="result-row">
                <div class="result-name" style="color: var(--iso-hypnotic); font-weight:bold;">Propofol <span style="font-size:0.8em; font-weight:normal; color:var(--text-main);">(10 mg/mL)</span><small style="color: var(--text-muted); font-weight:normal;">2.0 mg/kg (${propMg} mg)</small></div>
                <div class="result-val">${propMl} mL</div>
            </div>
            <div class="result-row">
                <div class="result-name" style="color: var(--iso-hypnotic); font-weight:bold;">Ketamine <span style="font-size:0.8em; font-weight:normal; color:var(--text-main);">(50 mg/mL)</span><small style="color: var(--text-muted); font-weight:normal;">1-1.5 mg/kg (${ketMinMg}-${ketMaxMg} mg)</small></div>
                <div class="result-val">${ketMinMl} - ${ketMaxMl} mL</div>
            </div>
        </div>
        <div class="result-section">
            <div class="result-title" style="color: var(--iso-relaxant);">Neuromuscular Blockade (10 mg/mL)</div>
            <div class="result-row"><div class="result-name" style="color: var(--iso-relaxant); font-weight:bold;">Atracurium<small style="color: var(--text-muted); font-weight:normal;">0.5 mg/kg TBW</small></div><div class="result-val">${(ptWeight * 0.5 / 10).toFixed(1)} mL</div></div>
            <div class="result-row"><div class="result-name" style="color: var(--iso-relaxant); font-weight:bold;">Rocuronium<small style="color: var(--text-muted); font-weight:normal;">0.6 mg/kg IBW</small></div><div class="result-val">${(ibw * 0.6 / 10).toFixed(1)} mL</div></div>
        </div>
    `;
    const resultsDiv = document.getElementById('induction-results');
    if(resultsDiv) resultsDiv.innerHTML = html;

    // Update Remi slider limits based on new IBW
    const remiSlider = document.getElementById('remi-slider');
    if(remiSlider) {
        remiSlider.max = Math.ceil(((0.30 * ibw * 60) / 50) / 5) * 5;
        remiSlider.value = ((0.15 * ibw * 60) / 50).toFixed(1);
        updateRemi();
    }
}

// --- MAINTENANCE: SEVOFLURANE & FGF ---
function handleFGF(val) {
    currentFGF = parseFloat(val);
    document.querySelectorAll('.fgf-sync').forEach(s => s.value = currentFGF);
    document.querySelectorAll('.fgf-disp-text, #fgf-disp').forEach(el => el.innerText = currentFGF.toFixed(1));
    
    const tauTotal = 3.5 + (5.0 / currentFGF);
    document.querySelectorAll('.tau-disp-text, #tau-disp').forEach(el => el.innerText = tauTotal.toFixed(1));
    
    calculateWashout();
}

// Fallback just in case old HTML calls it
function updateFGF() {
    const slider = document.getElementById('fgf-slider');
    if(slider) handleFGF(slider.value);
}

function calculateSevo() {
    const ageInput = document.getElementById('pt-age');
    if(!ageInput || !ageInput.value) return; 
    const age = parseFloat(ageInput.value);

    let mac = 2.0 * Math.pow(10, -0.00269 * (age - 40));
    let band = `Adult (Mapleson age ${age})`;

    currentSevoBaseline = mac;
    const baseValEl = document.getElementById('baseline-value');
    const bandSubEl = document.getElementById('band-sub');
    if(baseValEl) baseValEl.innerText = mac.toFixed(1) + ' vol%';
    if(bandSubEl) bandSubEl.innerText = band;

    let oAwake = 1.0, oUnc = 1.0, oImm = 1.0, oBar = 1.0;
    const opToggle = document.getElementById('opioid-toggle');
    if (opToggle && opToggle.checked) {
        oAwake = 0.85; oUnc = 0.85; oImm = 0.50; oBar = 0.25;   
    }

    let t = [
        { id: 'awake', name: 'MAC-Awake',   val: mac * 0.33 * oAwake, color: '#17a2b8', desc: 'Extubation Threshold' },
        { id: 'unc',   name: 'Unconscious', val: mac * 0.70 * oUnc,   color: 'var(--alert-green)', desc: 'Awareness Prevention Floor' },
        { id: 'mac1',  name: 'MAC 1',       val: mac * 1.00 * oImm,   color: 'var(--iso-hypnotic)', desc: '50% Immobility' },
        { id: 'sd2',   name: '+2 SD',       val: mac * 1.20 * oImm,   color: 'var(--iso-relaxant)', desc: '95% Immobility' },
        { id: 'sd3',   name: '+3 SD',       val: mac * 1.30 * oImm,   color: '#b52a1f', desc: '99.7% Immobility' },
        { id: 'bar',   name: 'MAC-BAR',     val: mac * 1.45 * oBar,   color: 'var(--iso-pressor)', desc: 'Blunts Adrenergic Tone' }
    ];
    
    t.sort((a,b) => a.val - b.val);
    sevoZones = t;

    let listHtml = '';
    for(let z of t) {
        listHtml += `
            <div class="target" style="border-left-color: ${z.color};">
                <div><div style="font-weight:bold; color: var(--text-main);">${z.name}</div><div style="font-size:0.7em; color:var(--text-muted);">${z.desc}</div></div>
                <div class="target-value" style="color:${z.color};">${z.val.toFixed(2)}<small>vol%</small></div>
            </div>`;
    }
    const targetList = document.getElementById('target-list');
    if(targetList) targetList.innerHTML = listHtml;
    
    const headerEl = document.getElementById('sevo-results-header');
    const sliderCard = document.getElementById('sevo-slider-card');
    if(headerEl) headerEl.style.display = 'flex';
    if(sliderCard) sliderCard.style.display = 'block';

    const slider = document.getElementById('sevo-slider');
    const ghost = document.getElementById('sevo-ghost-slider');
    if(slider && ghost) {
        const newMax = (t[t.length-1].val * 1.15).toFixed(1);
        slider.max = newMax; 
        ghost.max = newMax;
        
        let defaultVal = (mac * 1.00 * oImm).toFixed(1);
        slider.value = defaultVal; 
        ghostVal = parseFloat(defaultVal);
        ghost.value = ghostVal;
        
        updateSevoSlider();
    }
}

function updateSevoSlider() {
    if (!sevoZones || sevoZones.length === 0) return;
    const slider = document.getElementById('sevo-slider');
    if(!slider) return;

    const vol = parseFloat(slider.value);
    const maxVol = parseFloat(slider.max);
    
    document.getElementById('sevo-vol-disp').innerText = vol.toFixed(1);
    document.getElementById('sevo-mac-disp').innerText = (vol / currentSevoBaseline).toFixed(2);

    let active = sevoZones[sevoZones.length - 1];
    for (let i = 0; i < sevoZones.length; i++) {
        if (vol <= sevoZones[i].val + 0.05) { active = sevoZones[i]; break; }
    }

    const badge = document.getElementById('sevo-badge');
    badge.innerText = active.name;
    badge.style.backgroundColor = active.color;
    badge.style.color = (active.color === 'var(--iso-hypnotic)') ? '#000' : '#fff';

    let gradStops = [];
    let lastPct = 0;

    for(let i=0; i<sevoZones.length; i++) {
        let pct = (sevoZones[i].val / maxVol) * 100;
        if(pct > 100) pct = 100;
        gradStops.push(`${sevoZones[i].color} ${lastPct}% calc(${pct}% - 2px)`);
        gradStops.push(`#000 calc(${pct}% - 2px) calc(${pct}% + 2px)`);
        lastPct = pct;
        if(pct === 100) break;
    }
    if(lastPct < 100) gradStops.push(`#444 ${lastPct}% 100%`);
    
    const bgString = `linear-gradient(to right, ${gradStops.join(', ')})`;
    const trackBg = document.getElementById('sevo-track-bg');
    if(trackBg) trackBg.style.backgroundImage = bgString;

    const etLabel = document.getElementById('label-et');
    let pctActive = (vol / maxVol) * 100;
    if(etLabel) etLabel.style.left = `calc(${pctActive}% + ${22 - (pctActive * 0.44)}px)`;
}

function animateGhostSlider() {
    if(!sevoZones || sevoZones.length === 0) return;
    const slider = document.getElementById('sevo-slider');
    const ghost = document.getElementById('sevo-ghost-slider');
    if(!slider || !ghost) return;

    const active = parseFloat(slider.value);
    const maxVol = parseFloat(ghost.max);
    if(maxVol <= 0) return;
    
    const tauTotal = 3.5 + (5.0 / currentFGF); 
    const k = 1 - Math.exp(-0.1 / (60 * tauTotal)); 
    
    if(Math.abs(active - ghostVal) > 0.001) {
        ghostVal += (active - ghostVal) * k;
        ghost.value = ghostVal;
        
        const brainLabel = document.getElementById('label-brain');
        let pctGhost = (ghostVal / maxVol) * 100;
        if(brainLabel) brainLabel.style.left = `calc(${pctGhost}% + ${22 - (pctGhost * 0.44)}px)`;
    }
}
setInterval(animateGhostSlider, 100);

function logSevoChange() {
    const vol = document.getElementById('sevo-vol-disp').innerText;
    const fmac = document.getElementById('sevo-mac-disp').innerText;
    addLog(`EtSevo targeted to ${vol} vol% (fMAC: ${fmac}).`);
    alert("Sent to Event Log!");
}

function calculateWashout() {
    if(!sevoZones || sevoZones.length === 0) return; 
    const washoutInput = document.getElementById('washout-current');
    if(!washoutInput) return;

    const currentVol = parseFloat(washoutInput.value);
    const resultDiv = document.getElementById('washout-result');
    
    if(isNaN(currentVol) || currentVol <= 0) {
        if(resultDiv) resultDiv.style.display = 'none';
        return; 
    }
    
    const awakeTarget = sevoZones.find(z => z.id === 'awake').val;

    if(currentVol <= awakeTarget) { 
        document.getElementById('washout-time').innerText = "0";
        const clock = document.getElementById('washout-clock');
        if(clock) clock.innerText = "[Safe to Extubate]";
        if(resultDiv) resultDiv.style.display = 'block';
        return; 
    }

    const tauTotal = 3.5 + (5.0 / currentFGF); 
    const timeMins = -tauTotal * Math.log(awakeTarget / currentVol);
    
    document.getElementById('washout-time').innerText = Math.round(timeMins);
    
    const targetDate = new Date(Date.now() + (timeMins * 60000));
    const hh = targetDate.getHours().toString().padStart(2, '0');
    const mm = targetDate.getMinutes().toString().padStart(2, '0');
    
    const clock = document.getElementById('washout-clock');
    if(clock) clock.innerText = `[${hh}:${mm}]`;
    if(resultDiv) resultDiv.style.display = 'block';
}

// --- MAINTENANCE: REMIFENTANIL ---
function updateRemi() {
    const workingIbw = ibw > 0 ? ibw : 70; 
    const slider = document.getElementById('remi-slider');
    if(!slider) return;

    const rate = parseFloat(slider.value);
    document.getElementById('remi-ml-h').innerText = rate.toFixed(1);
    
    const dose = (rate * 50) / (workingIbw * 60);
    document.getElementById('remi-mcg-kg-min').innerText = dose.toFixed(2);
    
    const zones = [
        { limit: 0.05, label: 'Sub-Analgesic', color: '#444' },
        { limit: 0.10, label: 'Analgesic', color: '#17a2b8' },
        { limit: 0.15, label: 'Light Maint.', color: 'var(--alert-green)' },
        { limit: 0.20, label: 'Standard Maint.', color: 'var(--iso-hypnotic)' },
        { limit: 0.25, label: 'Deep Maint.', color: 'var(--iso-relaxant)' },
        { limit: Infinity, label: 'High Stimulus', color: '#b52a1f' }
    ];

    let activeZone = zones[zones.length - 1];
    for(let z of zones) { if(dose <= z.limit + 0.001) { activeZone = z; break; } }
    
    const badge = document.getElementById('remi-badge');
    badge.innerText = activeZone.label;
    badge.style.backgroundColor = activeZone.color;
    badge.style.color = (activeZone.color === 'var(--iso-hypnotic)') ? '#000' : '#fff';
    
    const maxRate = parseFloat(slider.max);
    let gradStops = [];
    let lastPct = 0;
    
    for(let i=0; i<zones.length; i++) {
        if (zones[i].limit === Infinity) { gradStops.push(`${zones[i].color} ${lastPct}% 100%`); break; }
        const bndRate = (zones[i].limit * workingIbw * 60) / 50;
        let pct = (bndRate / maxRate) * 100;
        if(pct > 100) pct = 100;
        
        gradStops.push(`${zones[i].color} ${lastPct}% calc(${pct}% - 2px)`);
        gradStops.push(`#000 calc(${pct}% - 2px) calc(${pct}% + 2px)`);
        lastPct = pct;
        if(pct === 100) break;
    }
    slider.style.backgroundImage = `linear-gradient(to right, ${gradStops.join(', ')})`;
}

function logRemiChange() {
    const mlh = document.getElementById('remi-ml-h').innerText;
    const mcg = document.getElementById('remi-mcg-kg-min').innerText;
    addLog(`Remifentanil adjusted to ${mlh} mL/h (${mcg} mcg/kg/min).`);
    alert("Remifentanil rate sent to Event Log!");
}

// --- NMB TRACKER ---
function updateNMBSumUI() {
    document.getElementById('nmb-total-mg').innerText = nmbTotalMg;
    document.getElementById('nmb-total-ml').innerText = (nmbTotalMg / 10).toFixed(1);
}

function startNMB(type) {
    if (ptWeight === 0) { alert("Please calculate Patient Parameters in the Induction tab first."); return; }
    if ("Notification" in window && Notification.permission !== "granted") Notification.requestPermission(); 
    clearInterval(nmbInterval);
    nmbNotified = false;
    
    if (type === 'intubation') {
        if (nmbTotalMg === 0) nmbTotalMg += nmbCalculatedIntubationMg; 
        nmbDuration = 35 * 60; nmbWarningStart = 33 * 60;
        addLog(`Intubation NMB dose administered.`);
    } else {
        nmbTotalMg += 10; nmbDuration = 15 * 60; nmbWarningStart = 13 * 60;
        addLog(`NMB Top-Up (10 mg) administered.`);
    }
    updateNMBSumUI();
    
    nmbEndTime = Date.now() + (nmbDuration * 1000);
    nmbInterval = setInterval(() => {
        let timeLeft = Math.ceil((nmbEndTime - Date.now()) / 1000);
        if(timeLeft <= 0) timeLeft = 0;
        updateNMBTimerUI(timeLeft);
    }, 1000);
    updateNMBTimerUI(nmbDuration);
}

function stopNMB() {
    clearInterval(nmbInterval);
    const bar = document.getElementById('nmb-bar');
    const clock = document.getElementById('nmb-clock');
    const inst = document.getElementById('nmb-instruction');
    if(bar) bar.style.width = '0%';
    if(clock) { clock.innerText = "--:--"; clock.classList.remove('flashing'); }
    if(inst) inst.innerText = "Reversal / Emergence phase active.";
    addLog("NMB dosing stopped (Emergence/Reversal).");
}

function updateNMBTimerUI(timeLeft) {
    const bar = document.getElementById('nmb-bar');
    const text = document.getElementById('nmb-clock');
    const inst = document.getElementById('nmb-instruction');
    if(!bar || !text || !inst) return;

    let elapsed = nmbDuration - timeLeft;
    bar.style.width = ((timeLeft / nmbDuration) * 100) + '%';
    
    let mins = Math.floor(timeLeft / 60); let secs = timeLeft % 60;
    text.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    
    if (elapsed < nmbWarningStart) {
        bar.style.backgroundColor = 'var(--alert-green)'; text.classList.remove('flashing'); inst.innerText = "Patient paralyzed. Stable.";
    } else if (elapsed >= nmbWarningStart && timeLeft > 0) {
        bar.style.backgroundColor = 'var(--warning-yellow)'; text.classList.remove('flashing'); inst.innerText = "Watch for VT drops or curare clefts.";
    } else {
        bar.style.backgroundColor = 'var(--iso-relaxant)'; text.classList.add('flashing'); inst.innerText = "TOP-UP DUE NOW. (Patient may move)";
        if (!nmbNotified && "Notification" in window && Notification.permission === "granted") {
            new Notification("NMB Top-Up Due", { body: "Patient may begin to move." });
            nmbNotified = true;
        }
    }
}

// --- FLUIDS (ABL & 4-2-1) ---
function calcABL() {
    const startHgb = parseFloat(document.getElementById('hgb-start').value);
    const targetHgb = parseFloat(document.getElementById('hgb-target').value);
    
    if (!startHgb || !targetHgb || ibw === 0) { 
        alert("Please calculate the patient in the Induction tab first, and ensure Hgb values are entered."); 
        return; 
    }
    
    const ebv = gender === 'male' ? (ibw * 75) : (ibw * 65);
    const abl = ebv * ((startHgb - targetHgb) / startHgb);
    document.getElementById('abl-result').innerText = `ABL: ${Math.round(abl)} mL`;
}

function updateFluids(amount, isBlood, isLoss) {
    if (isLoss) fluidLoss += amount;
    else if (isBlood) fluidBlood += amount;
    else fluidCryst += amount;
    
    const net = (fluidCryst + fluidBlood) - fluidLoss;
    document.getElementById('net-balance').innerText = net;
    addLog(`Fluid Updated: ${isLoss ? '-' : '+'}${amount} mL ${isBlood ? 'Blood' : (isLoss ? 'Loss/Urine' : 'Crystalloid/Med')}.`);
}

function calcMaintenance() {
    if (ptWeight === 0) {
        alert("Please enter the patient's weight and calculate in the Induction tab first.");
        return;
    }
    
    const npoInput = document.getElementById('npo-hours');
    const npoHours = npoInput ? (parseFloat(npoInput.value) || 0) : 0;
    
    let hourlyRate = 0;
    if (ptWeight > 20) hourlyRate = ptWeight + 40; 
    else if (ptWeight > 10) hourlyRate = 40 + ((ptWeight - 10) * 2);
    else hourlyRate = ptWeight * 4;
    
    const deficit = hourlyRate * npoHours;
    const firstHourSuggestion = hourlyRate + (deficit / 2); 
    
    const rateEl = document.getElementById('maint-rate');
    const defEl = document.getElementById('maint-deficit');
    const firstHrEl = document.getElementById('maint-first-hr');
    const resEl = document.getElementById('maint-result');
    
    if(rateEl) rateEl.innerText = Math.round(hourlyRate);
    if(defEl) defEl.innerText = Math.round(deficit);
    if(firstHrEl) firstHrEl.innerText = Math.round(firstHourSuggestion);
    if(resEl) resEl.style.display = 'block';
}

// --- LOGGING & TALLIES ---
function addFentanyl(mcg) { 
    fentTotal += mcg; 
    const el = document.getElementById('fentanyl-total');
    if(el) el.innerText = fentTotal; 
    addLog(`Fentanyl ${mcg}mcg given.`); 
}

function addPropofol(mg) { 
    propTotal += mg; 
    const el = document.getElementById('propofol-total');
    if(el) el.innerText = propTotal; 
    addLog(`Propofol ${mg}mg given.`); 
}

function giveAnalgin() { givenAnalgin = true; addLog('Analgin 1g given.'); }
function givePara() { givenPara = true; addLog('Paracetamol 1g given.'); }
function giveDex() { givenDex = true; addLog('Dexketoprofen (2 ampoules) given.'); }

function checkAnalgesia() {
    if (givenAnalgin || givenPara || givenDex) {
        addLog("✅ Non-opioid analgesia confirmed. Safe to taper Sevoflurane/Remifentanil.");
        alert("✅ Analgesia is on board.");
    } else {
        addLog("⚠️ WARNING: No non-opioid analgesia recorded yet!");
        alert("⚠️ WARNING: No Paracetamol, Analgin, or Dexketoprofen has been given yet!");
    }
}

function getTime() { 
    const now = new Date(); 
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`; 
}

function addLog(text) { 
    const ta = document.getElementById('log-output'); 
    if(!ta) return;
    ta.value += `[${getTime()}] ${text}\n`; 
    ta.scrollTop = ta.scrollHeight; 
}

function addCustomLog() { 
    const input = document.getElementById('custom-text'); 
    if (input && input.value.trim() !== "") { 
        addLog(input.value.trim()); 
        input.value = ""; 
    } 
}
const customInput = document.getElementById('custom-text');
if(customInput) {
    customInput.addEventListener('keypress', e => { 
        if (e.key === 'Enter') addCustomLog(); 
    });
}

function promptHeparin() { 
    let units = prompt("Enter Heparin dose (Units):", "5000"); 
    if (units) addLog(`Heparin ${units} units administered.`); 
}

function copyLog() { 
    const ta = document.getElementById('log-output'); 
    if(!ta || ta.value.trim() === "") return; 
    ta.select(); 
    document.execCommand('copy'); 
    window.getSelection().removeAllRanges(); 
    alert("Record copied to clipboard!"); 
}

function clearLog() { 
    if(confirm("Clear the entire record?")) {
        const ta = document.getElementById('log-output');
        if(ta) ta.value = ""; 
    }
}

function downloadRecord() {
    const ta = document.getElementById('log-output');
    if (!ta || !ta.value) { alert("Log is empty. Nothing to save."); return; }
    const blob = new Blob([ta.value], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Anesthesia_Record_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

function endCase() {
    const netFluid = (fluidCryst + fluidBlood) - fluidLoss;
    const summary = `
\n--- END OF CASE SUMMARY ---
Total Fentanyl: ${fentTotal} mcg
Total Propofol: ${propTotal} mg
Total NMB (Relaxant): ${nmbTotalMg} mg
Net Fluid Balance: ${netFluid} mL
---------------------------
🛑 Case ended.`;
    addLog(summary);
}

function hardReset() {
    if (confirm("Are you sure you want to clear all data, timers, and start a new case?")) {
        localStorage.clear();
        window.location.reload(true);
    }
}
