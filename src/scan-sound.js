// Unlock during a button tap so camera callbacks can play sound on mobile browsers.
let audio;
export function prepareScanSound(){
 try{
  const AudioContext=window.AudioContext||window.webkitAudioContext;
  if(!AudioContext)return;
  if(!audio||audio.state==='closed')audio=new AudioContext();
  if(audio.state==='suspended')audio.resume().catch(()=>{});
 }catch{/* Visual confirmation remains available when audio is unavailable. */}
}
export function playScanDing(){
 try{
  if(!audio||audio.state!=='running')return;
  const oscillator=audio.createOscillator();
  const gain=audio.createGain();
  const now=audio.currentTime;
  oscillator.type='sine';
  oscillator.frequency.setValueAtTime(1318.51,now);
  gain.gain.setValueAtTime(0,now);
  gain.gain.linearRampToValueAtTime(0.16,now+0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001,now+0.4);
  oscillator.connect(gain);gain.connect(audio.destination);
  oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()};
  oscillator.start(now);oscillator.stop(now+0.42);
 }catch{/* Audio failure must never interrupt checkout. */}
}
