// === LINK MODEL SUDAH BENAR ===
const URL = "https://teachablemachine.withgoogle.com/models/bsc2_-vUS/";

let model, webcam, ctx, labelContainer, maxPredictions;

const workspace = document.getElementById("workspace");
const statusText = document.getElementById("status-text");
const videoElem = document.getElementById("learning-video");

// --- VARIABEL STATISTIK WAKTU (Sinkronisasi UI) ---
let waktuAktifDetik = 0;
let intervalWaktuAktif = null;

// --- VARIABEL ALARM POSTUR ---
const alarmSound = new Audio('alarm.mp3');
alarmSound.loop = true;
let alarmTimer = null;         
let isPostureBad = false;      
const waktuTungguAlarm = 5000; // 5000 = 5 detik tunggu sebelum alarm bunyi

// --- VARIABEL STRETCHING ---
const stretchOverlay = document.getElementById("stretch-overlay");
const stretchTimerText = document.getElementById("stretch-timer");

// SETTING PEREGANGAN: Muncul setiap 10 detik, selama 15 detik
const intervalPeregangan = 10000; // 10 Detik (10 x 1000 milidetik)
const durasiPaksa = 15; // 15 Detik pop-up muncul

async function init() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    // Matikan tombol sementara saat loading model
    const btn = document.querySelector("button");
    if(btn) {
        btn.innerText = "Memuat Model...";
        btn.disabled = true;
    }

    try {
        model = await tmPose.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        const size = 300;
        const flip = true; 
        webcam = new tmPose.Webcam(size, size, flip);
        await webcam.setup(); 
        await webcam.play();
        window.requestAnimationFrame(loop);

        const canvas = document.getElementById("canvas");
        if(canvas) {
            canvas.width = size; canvas.height = size;
            ctx = canvas.getContext("2d");
        }
        
        statusText.innerText = "Sistem Aktif - Aman";
        statusText.className = "status-aman";
        if(btn) {
            btn.innerText = "Pengawasan Aktif";
        }

        // Mulai hitung stopwatch sesi & jadwal peregangan
        mulaiWaktuAktif();
        mulaiJadwalPeregangan();
        
    } catch (error) {
        console.error("Gagal memuat model:", error);
        statusText.innerText = "Gagal memuat model. Cek Console (F12).";
        statusText.className = "status-bahaya";
        if(btn) {
            btn.innerText = "Mulai Pengawasan";
            btn.disabled = false;
        }
    }
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

    // Mengambil elemen "Ya/Tidak" dari panel Statistik
    const statPosturElem = document.querySelector(".stats-card ul li:nth-child(2) span:last-child");

    // --- LOGIKA INTERVENSI ---
    if (currentPosture === "normal") {
        statusText.innerText = "Normal - Aman";
        statusText.className = "status-aman";
        workspace.classList.remove("blur-effect");
        
        // Update statistik sinkron ke "Ya"
        if(statPosturElem) {
            statPosturElem.innerText = "Ya";
            statPosturElem.style.color = "#166534";
        }
        
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
        
        // Update statistik sinkron ke "Tidak"
        if(statPosturElem) {
            statPosturElem.innerText = "Tidak";
            statPosturElem.style.color = "#991b1b";
        }
        
        if (!videoElem.paused) {
            videoElem.pause();
        }

        // Mulai hitung mundur 5 detik untuk membunyikan alarm
        if (!isPostureBad) {
            isPostureBad = true; 
            alarmTimer = setTimeout(() => {
                if (alarmSound.paused) {
                    alarmSound.play().catch(e => console.log("Auto-play alarm dicegah browser."));
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

// --- FUNGSI STOPWATCH SESI ---
function mulaiWaktuAktif() {
    const sessionTimeText = document.getElementById("session-time");
    if(!sessionTimeText) return;
    
    waktuAktifDetik = 0;
    if (intervalWaktuAktif) clearInterval(intervalWaktuAktif);

    intervalWaktuAktif = setInterval(() => {
        waktuAktifDetik++;
        let menit = Math.floor(waktuAktifDetik / 60);
        let detik = waktuAktifDetik % 60;
        
        let stringMenit = menit < 10 ? "0" + menit : menit;
        let stringDetik = detik < 10 ? "0" + detik : detik;
        
        sessionTimeText.innerText = `${stringMenit}:${stringDetik}`;
    }, 1000); 
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