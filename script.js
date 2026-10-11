const gate = document.getElementById('gate');
const frontClosed = document.getElementById('frontClosed');
const frontCouple = document.getElementById('frontCouple');
const frontHint = document.getElementById('frontHint');
document.body.style.overflow = 'hidden';

// Front sequence: invitation card flips open -> couple illustration -> unchanged second page.
let openingStarted = false;
function startOpening(){
  if(openingStarted) return;
  openingStarted = true;
  startMusic();
  gate.classList.add('card-opening');

  // The two cover halves swing outward like a real invitation book.
  // Reveal the full-screen illustrated couple once the cover has opened.
  window.setTimeout(()=>{
    gate.classList.add('show-couple');
    if(frontHint) frontHint.textContent = 'Rishi ♥ Ramya';
  }, 900);

  // Hold the couple portrait, then fade to the untouched second page.
  window.setTimeout(()=>{
    gate.classList.add('front-finished');
    document.body.style.overflow = '';
    window.setTimeout(()=>{ gate.style.display='none'; },750);
  }, 3500);
}
gate.addEventListener('click', startOpening);
gate.addEventListener('keydown', e=>{
  if(e.key==='Enter' || e.key===' '){e.preventDefault();startOpening();}
});

// ---------------- Countdown ----------------
const weddingDate = new Date('2026-11-11T09:05:00');
function updateCountdown(){
  let d = weddingDate.getTime() - Date.now();
  if(d < 0) d = 0;
  const days = Math.floor(d/86400000);
  const hours = Math.floor((d%86400000)/3600000);
  const mins = Math.floor((d%3600000)/60000);
  const secs = Math.floor((d%60000)/1000);
  document.getElementById('days').textContent=String(days).padStart(2,'0');
  document.getElementById('hours').textContent=String(hours).padStart(2,'0');
  document.getElementById('mins').textContent=String(mins).padStart(2,'0');
  document.getElementById('secs').textContent=String(secs).padStart(2,'0');
}
updateCountdown();
setInterval(updateCountdown,1000);

// ---------------- Background music ----------------
// Add your music file here:
// assets/music/background-music.mpeg
// The opening-gate click is used to start music because browsers commonly
// block audible autoplay until the visitor interacts with the page.
const bgm = document.getElementById('bgm');
const musicBtn = document.getElementById('musicBtn');
let bgmFailed = false;
let usingSynth = false;
let audioCtx = null;
let current = null;

bgm.addEventListener('error', () => { bgmFailed = true; });

function startMusic(){
  if(!bgmFailed){
    const p = bgm.play();
    if(p && p.then){
      p.then(()=>{
        usingSynth = false;
        musicBtn.setAttribute('aria-pressed','true');
        musicBtn.textContent='♫ Pause music';
      }).catch(()=>startSynthChime());
    }
    return;
  }
  startSynthChime();
}

function stopMusic(){
  if(usingSynth){ stopSynthChime(); return; }
  bgm.pause();
  musicBtn.setAttribute('aria-pressed','false');
  musicBtn.textContent='♪ Play music';
}

function startSynthChime(){
  if(usingSynth) return;
  usingSynth = true;
  try{
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if(audioCtx.state === 'suspended') audioCtx.resume();

    const master = audioCtx.createGain();
    master.gain.value = 0.0001;
    master.connect(audioCtx.destination);
    master.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 2);

    const freqs = [261.63,329.63,392.00,523.25];
    const oscs = freqs.map((f,i)=>{
      const o=audioCtx.createOscillator();
      o.type='sine';
      o.frequency.value=f;
      const g=audioCtx.createGain();
      g.gain.value=i===0 ? 0.4 : 0.22;
      o.connect(g); g.connect(master); o.start();
      return o;
    });
    const lfo=audioCtx.createOscillator();
    lfo.frequency.value=0.15;
    const lfoGain=audioCtx.createGain();
    lfoGain.gain.value=0.015;
    lfo.connect(lfoGain); lfoGain.connect(master.gain); lfo.start();
    oscs.push(lfo);
    current={oscs,master};
    musicBtn.setAttribute('aria-pressed','true');
    musicBtn.textContent='♫ Pause music';
  }catch(e){
    usingSynth=false;
    musicBtn.textContent='Audio unavailable';
  }
}

function stopSynthChime(){
  if(!current) return;
  const {oscs,master}=current;
  const t=audioCtx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value,t);
  master.gain.linearRampToValueAtTime(0.0001,t+1);
  setTimeout(()=>oscs.forEach(o=>{try{o.stop()}catch(e){}}),1050);
  current=null;
  usingSynth=false;
  musicBtn.setAttribute('aria-pressed','false');
  musicBtn.textContent='♪ Play music';
}

function isPlaying(){ return usingSynth ? !!current : !bgm.paused; }
musicBtn.addEventListener('click',()=>{ isPlaying() ? stopMusic() : startMusic(); });

// ---------------- Photo carousel ----------------
// Automatic slideshow: advances every 4 seconds and restarts after manual navigation.
const photoSlides = Array.from(document.querySelectorAll('.photo-slide'));
const photoTrack = document.getElementById('photoTrack');
const dotsWrap = document.getElementById('carouselDots');
const prevBtn = document.querySelector('.carousel-arrow.prev');
const nextBtn = document.querySelector('.carousel-arrow.next');
let currentPhoto = 0;
let autoPhotoTimer = null;
const AUTO_PHOTO_MS = 4000;

function syncCarouselHeight(){
  if(!photoTrack) return;
  photoTrack.style.height = '';
  const active = photoSlides[currentPhoto];
  const frame = active?.querySelector('.photo-frame');
  if(frame){
    photoTrack.style.height = frame.offsetHeight + 'px';
  }
}


function showPhoto(index, animate = true){
  if(!photoSlides.length || !photoTrack) return;
  currentPhoto = (index + photoSlides.length) % photoSlides.length;
  photoTrack.style.transition = animate ? 'transform .65s ease' : 'none';
  photoTrack.style.transform = `translate3d(-${currentPhoto * 100}%,0,0)`;
  photoSlides.forEach((slide,i)=>slide.classList.toggle('is-active', i === currentPhoto));
  syncCarouselHeight();
  if(dotsWrap){
    dotsWrap.querySelectorAll('.carousel-dot').forEach((dot,i)=>{
      dot.classList.toggle('active', i === currentPhoto);
      dot.setAttribute('aria-current', i === currentPhoto ? 'true' : 'false');
    });
  }
}

function startAutoPhoto(){
  clearInterval(autoPhotoTimer);
  if(photoSlides.length > 1){
    autoPhotoTimer = setInterval(() => {
      showPhoto(currentPhoto + 1);
    }, AUTO_PHOTO_MS);
  }
}

function restartAutoPhoto(){ startAutoPhoto(); }

if(photoSlides.length){
  photoSlides.forEach((slide,i)=>{
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Show photo ${i + 1}`);
    dot.setAttribute('aria-current', i === 0 ? 'true' : 'false');
    dot.addEventListener('click', () => {
      showPhoto(i);
      restartAutoPhoto();
    });
    if(dotsWrap) dotsWrap.appendChild(dot);
  });

  prevBtn?.addEventListener('click', () => {
    showPhoto(currentPhoto - 1);
    restartAutoPhoto();
  });

  nextBtn?.addEventListener('click', () => {
    showPhoto(currentPhoto + 1);
    restartAutoPhoto();
  });

  let touchStartX = 0;
  photoTrack.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  }, {passive:true});

  photoTrack.addEventListener('touchend', e => {
    const distance = e.changedTouches[0].screenX - touchStartX;
    if(Math.abs(distance) > 45){
      showPhoto(currentPhoto + (distance < 0 ? 1 : -1));
      restartAutoPhoto();
    }
  }, {passive:true});

  showPhoto(0, false);
  startAutoPhoto();
  window.addEventListener('resize', syncCarouselHeight);
}

// Keep the slideshow alive after returning to the browser tab.
document.addEventListener('visibilitychange', () => {
  if(document.hidden){
    clearInterval(autoPhotoTimer);
  } else {
    startAutoPhoto();
  }
});
