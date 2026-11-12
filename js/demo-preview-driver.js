(() => {
'use strict';
const chapters=[
 ['Переклад слова','Подивіться, як натискання слова відкриває його переклад. Після показу натискайте інші слова самостійно.',4],
 ['Переклад речення','Розширюємо виділення штатною кнопкою до цілого речення. Спробуйте вибрати інше слово й розширити його контекст.',5],
 ['Граматика в контексті','Відкриваємо розбір вибраного речення. Роздивіться доступні пояснення та керування.',6],
 ['Запит AI','Відкриваємо запит щодо вибраного тексту. Для живої відповіді потрібен доступний AI-сервіс.',7],
 ['Правила','Перегляньте каталог правил і приклади. Можна відкрити інше правило самостійно.',8],
 ['Практика','Відкриваємо штатну Практику. Спробуйте вправу; якщо сервіс недоступний, рідер покаже його справжнє повідомлення.',9],
 ['Письмо на сторінці','Практику закрито. Показуємо штрих на сторінці книги. Спробуйте перо, скасування та повторення.',10],
 ['Аудіо книги та плеєр','Підключаємо приклад запису через штатний імпорт. Натисніть відтворення у плеєрі, спробуйте паузу, швидкість і перемотування.',null],
 ['Кругове меню','Відкриваємо меню швидких дій. Спробуйте вибрати дію й повернутися до книги.',null],
 ['Бічне меню','Відкриваємо основне меню. Роздивіться його розділи й спробуйте повернутися до читання.',null]
];
let chapter=-1,busy=false,started=false,token=0,previousRate=null;
const style=document.createElement('style');style.textContent='#demo-tour{display:none!important}';document.head.appendChild(style);
const send=data=>window.postMessage({type:'reader-preview',...data},location.origin);
const pulse=document.createElement('div');pulse.className='preview-tap-indicator';pulse.setAttribute('aria-hidden','true');document.body.appendChild(pulse);
const normalTap=demoRealTap;
demoRealTap=target=>{const r=target.getBoundingClientRect();pulse.style.left=(r.left+r.width/2)+'px';pulse.style.top=(r.top+r.height/2)+'px';pulse.getAnimations().forEach(a=>a.cancel());pulse.animate([{opacity:1,transform:'translate(-50%,-50%) scale(.6)'},{opacity:0,transform:'translate(-50%,-50%) scale(1.5)'}],{duration:750});normalTap(target);};
const normalTarget=demoVisibleTextTarget;
demoVisibleTextTarget=()=>{const b=els.container.getBoundingClientRect();const visible=el=>{if(!el)return false;const r=el.getBoundingClientRect();return r.width>2&&r.height>2&&r.top>=b.top+6&&r.bottom<=b.bottom-6&&r.left>=b.left&&r.right<=b.right;};const original=normalTarget();return visible(original)?original:[...els.pages.querySelectorAll('.pdf-text-layer span')].find(el=>el.textContent.trim().length>=3&&visible(el))||null;};

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(test){const end=Date.now()+20000;while(!test()){if(Date.now()>end)throw new Error('Дія не завершилася. Спробуйте повторити показ.');await sleep(80);}}
function cleanup(){stopBookAudio();stopTooltipSpeech();stopGlobalTTS();closePractice();closeRulesPanel();els.askPanel.classList.remove('expanded');els.grammarPanel.classList.remove('expanded');closeFullMenu();if(!document.getElementById('quick-menu')?.hidden)document.getElementById('qm-launcher')?.click();if(state.inkMode)document.getElementById('ink-done')?.click();}
async function show(index,restart=false){if(busy)return;busy=true;const generation=++token;const item=chapters[index];send({busy:true,started:true,phase:`Показ · ${index+1} із ${chapters.length}`,title:item[0],copy:item[1],status:'Спостерігайте за діями у книзі…'});
 try{
  cleanup();
  if(!started)previousRate=bookAudioRate();
  if(!started||restart||!state.demoMode||(item[2]&&demoTour.step>item[2])){closeDemoTextbook();await openDemoTextbook();await waitFor(()=>!demoTour.busy&&state.pdfDoc);if(generation!==token)return;started=true;}
  if(item[2]){
   if(index===6){closePractice();await waitFor(()=>document.getElementById('practice-panel')?.hidden!==false);}
   while(demoTour.step<item[2]){const before=demoTour.step;await demoRunRoute();if(generation!==token)return;if(demoTour.step===before)throw new Error('Не вдалося перейти до потрібної дії.');}
   if(index===chapter&&demoTour.step===item[2]){if(index===0&&demoTour.target?.isConnected)demoRealTap(demoTour.target);else if(index===6)demoDrawInk();}
  }else if(index===7){
   const response=await fetch(DEMO_TEXTBOOK_AUDIO);if(!response.ok)throw new Error('Не вдалося завантажити демонстраційне аудіо.');
   const file=new File([await response.blob()],'Unit 1 - Track 12.mp3',{type:'audio/mpeg'});
   if(generation!==token)return;
   if(!bookAudio.tracks.length)await importBookAudio([file]);
   if(generation!==token)return;
   const record=bookAudio.tracks[0];if(!record)throw new Error('Запис не підключився.');
   await playBookTrack(record,'Демонстраційний діалог');pauseBookAudio();
  }else if(index===8){document.getElementById('qm-launcher')?.click();}
  else{openFullMenu();}
  if(generation!==token)return;chapter=index;started=true;
  send({busy:false,started:true,phase:`Спробуйте самі · ${index+1} із ${chapters.length}`,status:index===5&&document.getElementById('practice-panel')?.hidden!==false?'Практика не відкрилася: перегляньте повідомлення сервісу. Можна повторити показ або продовжити.':index===7?'Плеєр справжній. Прив’язка запуску до позначки діалогу ще потребує окремого доопрацювання.':'Керуйте рідером самостійно. Перехід до наступної функції — лише за вашим бажанням.',next:index===chapters.length-1?'Завершити огляд':'Далі'});
 }catch(error){if(generation===token)send({busy:false,started:true,status:error.message,next:'Повторити крок'});}
 finally{if(generation===token)busy=false;}
}
window.readerPreview={
 async next(){if(busy)return;if(chapter===chapters.length-1){this.exit();return;}await show(chapter+1);},
 async again(){if(!busy&&chapter>=0)await show(chapter,true);},
 exit(){token++;busy=false;cleanup();stopBookAudio();closeDemoTextbook();if(previousRate!==null)setBookAudioRate(previousRate);previousRate=null;chapter=-1;started=false;send({busy:false,started:false,phase:'Огляд завершено',title:'Поверніться, коли захочете',copy:'Це окремий попередній перегляд. Основний застосунок не змінювався.',status:'',next:'Почати знову'});}
};
const announceReady=()=>send({busy:false,started:false,status:'Рідер готовий. Запустіть показ, потім пробуйте самостійно.'});
if(document.readyState==='complete'&&!document.body.inert)announceReady();else window.addEventListener('load',announceReady,{once:true});
})();
