// State variables
let currentInput = '0';
let previousInput = '';
let operator = null;
let shouldResetDisplay = false;
let historyStr = '';

// DOM Elements
const currentDisplay = document.getElementById('current-input');
const historyDisplay = document.getElementById('history');
const themeToggle = document.getElementById('theme-toggle');
const buttons = document.querySelectorAll('.btn');

// Audio Context for click sounds
let audioCtx;
function playSound() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // 800Hz beep
        oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.05);

        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime); // Low volume
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.05);
    } catch (e) {
        // Ignore audio errors (e.g. if blocked by browser)
    }
}

// Theme Handling
function initTheme() {
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
    }
}

themeToggle.addEventListener('click', () => {
    playSound();
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// Calculator Logic
function updateDisplay() {
    // Adjust font size for long numbers
    currentDisplay.className = 'current-input';
    if (currentInput.length > 15) {
        currentDisplay.classList.add('very-long');
    } else if (currentInput.length > 9) {
        currentDisplay.classList.add('long');
    }
    
    // Format output with commas for readability (optional, but requested clean UX)
    currentDisplay.innerText = formatNumber(currentInput);
    historyDisplay.innerText = historyStr;
}

function formatNumber(numStr) {
    if (numStr === 'Error' || numStr === 'Infinity' || numStr === '-Infinity' || numStr === 'NaN') return numStr;
    
    const parts = numStr.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    
    // Add commas to integer part
    const formattedInteger = integerPart === '-' ? '-' : 
                           (integerPart === '' ? '' : Number(integerPart).toLocaleString('en-US'));
    
    if (decimalPart !== undefined) {
        return `${formattedInteger}.${decimalPart}`;
    }
    return formattedInteger;
}

function clearAll() {
    currentInput = '0';
    previousInput = '';
    operator = null;
    historyStr = '';
    shouldResetDisplay = false;
    removeActiveOperator();
}

function clearCurrent() {
    currentInput = '0';
}

function handleNumber(num) {
    if (currentInput === 'Error' || currentInput === 'Infinity' || currentInput === 'NaN') {
        clearAll();
    }
    
    if (shouldResetDisplay) {
        currentInput = num;
        shouldResetDisplay = false;
    } else {
        if (currentInput === '0' && num !== '.') {
            currentInput = num;
        } else {
            // Limit max digits
            if (currentInput.replace(/[^0-9]/g,"").length < 15) {
                currentInput += num;
            }
        }
    }
}

function handleDecimal() {
    if (shouldResetDisplay) {
        currentInput = '0.';
        shouldResetDisplay = false;
        return;
    }
    if (!currentInput.includes('.')) {
        currentInput += '.';
    }
}

function handleOperator(op) {
    if (currentInput === 'Error' || currentInput === 'Infinity' || currentInput === 'NaN') return;

    if (operator && !shouldResetDisplay) {
        calculate();
    } else if (!operator && previousInput === '') {
        // Just chaining after equals or first operation
        previousInput = currentInput;
    }

    operator = op;
    shouldResetDisplay = true;
    historyStr = `${formatNumber(previousInput)} ${operator}`;
    
    // Highlight operator button
    removeActiveOperator();
    const activeBtn = Array.from(buttons).find(b => b.dataset.operator === op);
    if (activeBtn) activeBtn.classList.add('is-active');
}

function removeActiveOperator() {
    buttons.forEach(b => b.classList.remove('is-active'));
}

function handlePercent() {
    if (currentInput === 'Error') return;
    const num = parseFloat(currentInput);
    if (!isNaN(num)) {
        currentInput = String(num / 100);
        
        // Prevent floating point weirdness
        if(currentInput.includes('.')) {
            // Trim trailing zeros after decimal
            currentInput = parseFloat(currentInput).toString();
        }
    }
}

function calculate() {
    if (!operator || shouldResetDisplay) return;

    const prev = parseFloat(previousInput);
    const curr = parseFloat(currentInput);

    if (isNaN(prev) || isNaN(curr)) return;

    let result;

    switch (operator) {
        case '+':
            result = prev + curr;
            break;
        case '-':
            result = prev - curr;
            break;
        case '×':
        case '*':
            result = prev * curr;
            break;
        case '÷':
        case '/':
            if (curr === 0) {
                result = 'Error';
            } else {
                result = prev / curr;
            }
            break;
        default:
            return;
    }

    if (result !== 'Error') {
        // Fix floating point errors (e.g. 0.1 + 0.2 = 0.30000000000000004)
        result = Math.round(result * 100000000000000) / 100000000000000;
        historyStr = `${formatNumber(previousInput)} ${operator} ${formatNumber(currentInput)} =`;
    } else {
        historyStr = `${formatNumber(previousInput)} ÷ 0 =`;
    }

    currentInput = String(result);
    operator = null;
    shouldResetDisplay = true;
    previousInput = currentInput; // Chain calculations
    removeActiveOperator();
}

// Event Listeners
buttons.forEach(button => {
    button.addEventListener('click', (e) => {
        playSound();
        
        // Add subtle animation via class
        const target = e.target;
        target.classList.add('pressed');
        setTimeout(() => target.classList.remove('pressed'), 100);

        if (target.dataset.number) {
            if (target.dataset.number === '.') {
                handleDecimal();
            } else {
                handleNumber(target.dataset.number);
            }
        } else if (target.dataset.operator) {
            if (target.dataset.operator === '%') {
                handlePercent();
            } else {
                handleOperator(target.dataset.operator);
            }
        } else if (target.dataset.action) {
            if (target.dataset.action === 'clear-all') clearAll();
            if (target.dataset.action === 'clear') clearCurrent();
            if (target.dataset.action === 'calculate') calculate();
        }

        updateDisplay();
    });
});

// Keyboard Support
document.addEventListener('keydown', (e) => {
    let key = e.key;
    
    // Ignore if holding modifier keys (except shift for + and *)
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    // Numbers
    if (/[0-9]/.test(key)) {
        e.preventDefault();
        triggerButton(`[data-number="${key}"]`);
    }
    
    // Decimal
    if (key === '.') {
        e.preventDefault();
        triggerButton(`[data-number="."]`);
    }
    
    // Operators
    if (key === '+') { e.preventDefault(); triggerButton(`[data-operator="+"]`); }
    if (key === '-') { e.preventDefault(); triggerButton(`[data-operator="-"]`); }
    if (key === '*') { e.preventDefault(); triggerButton(`[data-operator="×"]`); }
    if (key === '/') { e.preventDefault(); triggerButton(`[data-operator="÷"]`); }
    if (key === '%') { e.preventDefault(); triggerButton(`[data-operator="%"]`); }
    
    // Actions
    if (key === 'Enter' || key === '=') {
        e.preventDefault();
        triggerButton(`[data-action="calculate"]`);
    }
    if (key === 'Escape') {
        e.preventDefault();
        triggerButton(`[data-action="clear-all"]`);
    }
    if (key === 'Backspace' || key === 'Delete') {
        e.preventDefault();
        triggerButton(`[data-action="clear"]`);
    }
});

function triggerButton(selector) {
    const btn = document.querySelector(selector);
    if (btn) {
        btn.click();
    }
}

// Initialize
initTheme();
updateDisplay();
