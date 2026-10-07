const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const events={},cacheStores=new Map();let failNetwork=false,claims=0;
const scope='https://example.github.io/karori-keisan/';
const normalize=r=>new URL(typeof r==='string'?r:r.url,scope).href;
const caches={async open(name){if(!cacheStores.has(name))cacheStores.set(name,new Map());const data=cacheStores.get(name);return {async addAll(paths){for(const p of paths)data.set(normalize(p),new Response('shell:'+p));},async put(request,response){data.set(normalize(request),response);},async match(request){return data.get(normalize(request))?.clone();}}},async keys(){return [...cacheStores.keys()]},async delete(key){return cacheStores.delete(key)}};
const sandbox={URL,caches,self:{registration:{scope},addEventListener:(type,handler)=>events[type]=handler,skipWaiting:async()=>{},clients:{claim:async()=>{claims++}}},fetch:async()=>{if(failNetwork)throw Error('offline');return new Response('latest-html')}};
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'../sw.js'),'utf8'),sandbox);
async function dispatch(type,request){let response;const waits=[];events[type]({request,waitUntil:p=>waits.push(p),respondWith:p=>response=p});const result=await response;await Promise.all(waits);return result;}
(async()=>{
 await dispatch('install');assert.equal(cacheStores.size,1);
 const prefix='nutrilog-shell-'+scope;cacheStores.set(prefix+'old',new Map());cacheStores.set('other-app',new Map());await dispatch('activate');assert.ok(!cacheStores.has(prefix+'old'));assert.ok(cacheStores.has('other-app'));assert.equal(claims,1);
 const request={url:scope,method:'GET',mode:'navigate'};assert.equal(await (await dispatch('fetch',request)).text(),'latest-html');
 failNetwork=true;assert.equal(await (await dispatch('fetch',request)).text(),'latest-html');
 assert.equal(await (await dispatch('fetch',{url:scope+'icon-192.png',method:'GET',mode:'cors'})).text(),'shell:./icon-192.png');
 assert.equal(await dispatch('fetch',{url:'https://fonts.googleapis.com/test',method:'GET',mode:'cors'}),undefined);
 assert.equal(await dispatch('fetch',{url:'https://example.github.io/other/',method:'GET',mode:'navigate'}),undefined);
 const manifest=JSON.parse(fs.readFileSync(require('path').join(__dirname,'../manifest.json'),'utf8'));assert.equal(manifest.scope,'./');for(const icon of manifest.icons)assert.ok(fs.existsSync(require('path').join(__dirname,'..',icon.src)));
 console.log('PASS install, scoped cleanup, online freshness, offline navigation, cached icons, external exclusion, manifest paths');
})();
