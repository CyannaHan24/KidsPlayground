export const initialProducts = [
 {id:'P001',zh:'牛奶',en:'Milk',price:1000,unitZh:'瓶',unitEn:'bottle',emoji:'🥛',color:'blue'},
 {id:'P002',zh:'水',en:'Water',price:200,unitZh:'瓶',unitEn:'bottle',emoji:'💧',color:'aqua'},
 {id:'P003',zh:'可乐',en:'Coke',price:300,unitZh:'瓶',unitEn:'bottle',emoji:'🥤',color:'pink'},
 {id:'P004',zh:'面条',en:'Noodles',price:1000,unitZh:'包',unitEn:'pack',emoji:'🍜',color:'yellow'}
];
export const total = (products,basket) => products.reduce((sum,p)=>sum+p.price*(basket[p.id]||0),0);
export function validateProducts(data){
 if(!Array.isArray(data)||!data.length||data.length>200) throw Error('Invalid catalog');
 const ids=new Set();
 for(const p of data){if(!p||typeof p.id!=='string'||!/^P\d{3,6}$/.test(p.id)||ids.has(p.id)||typeof p.zh!=='string'||!p.zh.trim()||typeof p.en!=='string'||!p.en.trim()||!Number.isSafeInteger(p.price)||p.price<0||p.price>10000000||!['unitZh','unitEn','emoji'].every(k=>typeof p[k]==='string'))throw Error('Invalid product');ids.add(p.id);}
 return data;
}
