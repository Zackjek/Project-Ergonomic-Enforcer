// GANTI LINK DI BAWAH INI DENGAN LINK MODELMU SENDIRI
const URL = "https://teachablemachine.withgoogle.com/models/bsc2_-vUS/"; // <--

let model, webcam, ctx, labelContainer, maxPredictions;

const workspace = document.getElementById("workspace");
const statusText = document.getElementById("status-text");
const videoElem = document.getElementById("learning-video");

// --- VARIABEL ALARM POSTUR ---
const alarmSound = new Audio('alarm.mp3');
alarmSound.loop = true;
let alarmTimer = null;         
let isPostureBad = false;      
const waktuTungguAlarm = 5000; // 5000 = 5 detik tunggu sebelum alarm bunyi

// --- VARIABEL STRETCHING ---
const stretchOverlay = document.getElementById("stretch-overlay");
const stretchTimerText = document.getElementById("stretch-timer");
// Kalau mau ngetes pop-upnya cepet, ubah angka di bawah jadi 10000 (10 detik)
const intervalPeregangan = 5000; // 5 detik dalam milidetik
const durasiPaksa = 15; // 15 Detik pop-up muncul

async function init() {
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

    // Mulai hitung waktu untuk Pop-up Peregangan
    mulaiJadwalPeregangan();
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

    // --- LOGIKA INTERVENSI ---
    // Pastikan nama kelas sesuai dengan model aslimu ("normal", "bungkuk", "terlaludekat")
    if (currentPosture === "normal") {
        statusText.innerText = "Normal - Aman";
        statusText.className = "status-aman";
        workspace.classList.remove("blur-effect");
        
        // Batalkan alarm jika kembali normal sebelum 5 detik
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

        // Mulai hitung mundur 5 detik untuk membunyikan alarm
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

// --- FUNGSI STRETCHING ENFORCER ---
function mulaiJadwalPeregangan() {
    setInterval(() => {
        aktifkanPereganganPaksa();
    }, intervalPeregangan);
}

function aktifkanPereganganPaksa() {
    let sisaWaktu = durasiPaksa; 
    stretchTimerText.innerText = sisaWaktu;
    
    // Munculkan Pop-up
    stretchOverlay.classList.remove("hidden");
    
    // Matikan video 
    if (!videoElem.paused) {
        videoElem.pause();
    }

    const hitungMundur = setInterval(() => {
        sisaWaktu--;
        stretchTimerText.innerText = sisaWaktu;

        // Tutup Pop-up jika 15 detik selesai
        if (sisaWaktu <= 0) {
            clearInterval(hitungMundur); 
            stretchOverlay.classList.add("hidden"); 
        }
    }, 1000); 
}