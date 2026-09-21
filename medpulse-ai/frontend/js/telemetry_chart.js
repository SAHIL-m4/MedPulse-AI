/**
 * MedPulse-AI: Live ECG Waveform & Gauge Canvas Renderer
 * Renders smooth 60fps lead II ECG pulse waveforms and vital sign indicators.
 */

class ECGWaveformRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.x = 0;
        this.speed = 2.2;
        this.yOffset = this.canvas.height / 2;
        this.gridColor = 'rgba(0, 242, 254, 0.05)';
        this.lineColor = '#00f2fe';
        this.glowColor = 'rgba(0, 242, 254, 0.6)';
        this.dataBuffer = new Array(this.canvas.width).fill(this.yOffset);
        this.bpm = 84;
        this.phase = 0;
        
        this.init();
    }

    init() {
        this.resize();
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = this.canvas.parentElement.clientWidth || 800;
        this.canvas.height = 160;
        this.yOffset = this.canvas.height / 2;
    }

    getECGSample() {
        // Generate ECG P-Q-R-S-T wave complex
        this.phase += (this.bpm / 60) * 0.08;
        if (this.phase > Math.PI * 2) this.phase -= Math.PI * 2;
        
        let p = this.phase;
        let y = 0;

        // P Wave
        if (p > 0.4 && p < 0.8) {
            y = -12 * Math.sin((p - 0.4) * Math.PI / 0.4);
        }
        // Q Wave
        else if (p >= 1.0 && p < 1.1) {
            y = 10 * Math.sin((p - 1.0) * Math.PI / 0.1);
        }
        // R Wave (Tall Spike)
        else if (p >= 1.1 && p < 1.3) {
            y = -65 * Math.sin((p - 1.1) * Math.PI / 0.2);
        }
        // S Wave
        else if (p >= 1.3 && p < 1.45) {
            y = 18 * Math.sin((p - 1.3) * Math.PI / 0.15);
        }
        // T Wave
        else if (p >= 1.8 && p < 2.3) {
            y = -22 * Math.sin((p - 1.8) * Math.PI / 0.5);
        }
        // Baseline noise
        y += (Math.random() - 0.5) * 2;

        return this.yOffset + y;
    }

    drawGrid() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        this.ctx.strokeStyle = this.gridColor;
        this.ctx.lineWidth = 1;

        for (let x = 0; x < width; x += 25) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
        for (let y = 0; y < height; y += 25) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }

    animate() {
        if (!this.canvas) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawGrid();

        // Advance sweep line
        this.x = (this.x + this.speed) % this.canvas.width;
        const sampleY = this.getECGSample();
        this.dataBuffer[Math.floor(this.x)] = sampleY;

        // Draw waveform path
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.lineColor;
        this.ctx.lineWidth = 2.2;
        this.ctx.shadowColor = this.glowColor;
        this.ctx.shadowBlur = 10;

        for (let i = 0; i < this.canvas.width; i++) {
            const y = this.dataBuffer[i] || this.yOffset;
            if (i === 0) {
                this.ctx.moveTo(i, y);
            } else {
                this.ctx.lineTo(i, y);
            }
        }
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        // Draw sweep cursor dot
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(this.x, sampleY, 3.5, 0, Math.PI * 2);
        this.ctx.fill();

        requestAnimationFrame(this.animate);
    }
}

// Global renderer instance
window.ecgWaveform = null;
document.addEventListener('DOMContentLoaded', () => {
    window.ecgWaveform = new ECGWaveformRenderer('ecg-canvas');
});
