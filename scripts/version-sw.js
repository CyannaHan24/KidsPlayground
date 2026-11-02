import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=createHash('sha256');
for(const file of readdirSync('dist/assets').sort())hash.update(readFileSync('dist/assets/'+file));
const path='dist/sw.js';
writeFileSync(path,readFileSync(path,'utf8').replace('little-market-v1','little-market-'+hash.digest('hex').slice(0,12)).replace('const BUILD_ASSETS=[];', 'const BUILD_ASSETS='+JSON.stringify(readdirSync('dist/assets').sort().map(file=>'./assets/'+file))+';'));
