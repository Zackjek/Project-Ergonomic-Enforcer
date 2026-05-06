// GANTI LINK DI BAWAH INI DENGAN LINK MODELMU
const URL = "https://teachablemachine.withgoogle.com/models/bsc2_-vUS/";

let model, webcam, ctx, maxPredictions;

const workspace = document.getElementById("workspace");
const statusText = document.getElementById("status-text");
const videoElem = document.getElementById("learning-video");

// --- VARIABEL ALARM POSTUR ---
const alarmSound = new Audio('alarm.mp3');
alarmSound.loop = true;
let alarmTimer = null;         
let isPostureBad = false;      
const waktuTungguAlarm = 5000; 

// --- VARIABEL DASHBOARD WAKTU ---
const sessionText = document.getElementById("session-timer");
const countdownText = document.getElementById("countdown-timer");
let waktuMulaiKerja = null;
let waktuPereganganBerikutnya = null;

// --- VARIABEL STRETCHING ---
const stretchOverlay = document.getElementById("stretch-overlay");
const stretchTimerText = document.getElementById("stretch-timer");
const intervalPeregangan = 30 * 60 * 1000; // 30 Menit 
const durasiPaksa = 15; // 15 Detik pop-up

async function init() {
    // Sembunyikan tombol mulai setelah diklik
    document.getElementById("start-btn").style.display = "none";

    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    model = await tmPose.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    const size = 300;
    const flip = true; 
    webcam = new tmPose.Webcam(size, size, flip);
    await webcam.setup(); 
    await webcam.play();
    window.requestAnimationFrame(loop);

    const canvas = document.getElementById("canvas");
    canvas.width = size; canvas.height = size;
    ctx = canvas.getContext("2d");
    
    statusText.innerText = "Sistem Aktif";

    // --- MULAI PERHITUNGAN WAKTU ---
    waktuMulaiKerja = Date.now();
    waktuPereganganBerikutnya = Date.now() + intervalPeregangan;
    
    // Update tampilan jam setiap 1 detik
    setInterval(updateDashboardWaktu, 1000);
}

async function loop(timestamp) {
    webcam.update(); 
    await predict(); 
    window.requestAnimationFrame(loop); 
}

async function predict() {
    const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
    const prediction = await model.predict(posenetOutput);

    let highestProbability = 0;
    let currentPosture = "";

    for (let i = 0; i < maxPredictions; i++) {
        if (prediction[i].probability > highestProbability) {
            highestProbability = prediction[i].probability;
            currentPosture = prediction[i].className; 
        }
    }

    if (currentPosture === "normal") {
        statusText.innerText = "Normal - Aman";
        statusText.className = "status-aman";
        workspace.classList.remove("blur-effect");
        
        if (isPostureBad) {
            isPostureBad = false;         
            clearTimeout(alarmTimer);     
            alarmSound.pause();           
            alarmSound.currentTime = 0;   
        }
        
    } else if (currentPosture === "bungkuk" || currentPosture === "terlaludekat") {
        statusText.innerText = `${currentPosture} - Perbaiki Posisi!`;
        statusText.className = "status-bahaya";
        workspace.classList.add("blur-effect");
        
        if (!videoElem.paused) {
            videoElem.pause();
        }

        if (!isPostureBad) {
            isPostureBad = true; 
            alarmTimer = setTimeout(() => {
                if (alarmSound.paused) {
                    alarmSound.play();
                }
            }, waktuTungguAlarm);
        }
    }

    drawPose(pose);
}

function drawPose(pose) {
    if (webcam.canvas) {
        ctx.drawImage(webcam.canvas, 0, 0);
        if (pose) {
            const minPartConfidence = 0.5;
            tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
            tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
        }
    }
}

// --- FUNGSI UPDATE DASHBOARD WAKTU ---
function updateDashboardWaktu() {
    const sekarang = Date.now();

    // 1. Hitung Durasi Kerja (Jam:Menit:Detik)
    const selisihKerja = Math.floor((sekarang - waktuMulaiKerja) / 1000);
    const jamKerja = String(Math.floor(selisihKerja / 3600)).padStart(2, '0');
    const menitKerja = String(Math.floor((selisihKerja % 3600) / 60)).padStart(2, '0');
    const detikKerja = String(selisihKerja % 60).padStart(2, '0');
    sessionText.innerText = `${jamKerja}:${menitKerja}:${detikKerja}`;

    // 2. Hitung Mundur Peregangan (Menit:Detik)
    const selisihPeregangan = Math.floor((waktuPereganganBerikutnya - sekarang) / 1000);
    
    if (selisihPeregangan <= 0) {
        countdownText.innerText = "Sekarang!";
        aktifkanPereganganPaksa();
    } else {
        const menitPeregangan = String(Math.floor(selisihPeregangan / 60)).padStart(2, '0');
        const detikPeregangan = String(selisihPeregangan % 60).padStart(2, '0');
        countdownText.innerText = `${menitPeregangan}:${detikPeregangan}`;
    }
}

// --- FUNGSI STRETCHING ENFORCER ---
function aktifkanPereganganPaksa() {
    // Reset waktu peregangan berikutnya agar tidak memicu pop-up terus menerus
    waktuPereganganBerikutnya = Date.now() + intervalPeregangan + (durasiPaksa * 1000);

    let sisaWaktu = durasiPaksa; 
    stretchTimerText.innerText = sisaWaktu;
    stretchOverlay.classList.remove("hidden");
    
    if (!videoElem.paused) {
        videoElem.pause();
    }

    const hitungMundur = setInterval(() => {
        sisaWaktu--;
        stretchTimerText.innerText = sisaWaktu;

        if (sisaWaktu <= 0) {
            clearInterval(hitungMundur); 
            stretchOverlay.classList.add("hidden"); 
        }
    }, 1000); 
}