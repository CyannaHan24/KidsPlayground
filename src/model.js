export const initialProducts = [
 {id:'P001',zh:'牛奶',en:'Milk',price:1000,unitZh:'瓶',unitEn:'bottle',art:'milk',emoji:'🥛',color:'blue'},
 {id:'P002',zh:'水',en:'Water',price:200,unitZh:'瓶',unitEn:'bottle',art:'water',emoji:'💧',color:'aqua'},
 {id:'P003',zh:'可乐',en:'Coke',price:300,unitZh:'瓶',unitEn:'bottle',art:'cola',emoji:'🥤',color:'pink'},
 {id:'P004',zh:'面条',en:'Noodles',price:1000,unitZh:'包',unitEn:'pack',art:'noodles',emoji:'🍜',color:'yellow'}
];
export const total = (products,basket) => products.reduce((sum,p)=>sum+p.price*(basket[p.id]||0),0);
export function validateProducts(data){
 if(!Array.isArray(data)||!data.length||data.length>200) throw Error('Invalid catalog');
 const ids=new Set();
 for(const p of data){if(!p||typeof p.id!=='string'||!/^P\d{3,6}$/.test(p.id)||ids.has(p.id)||typeof p.zh!=='string'||!p.zh.trim()||typeof p.en!=='string'||!p.en.trim()||!Number.isSafeInteger(p.price)||p.price<0||p.price>10000000||!['unitZh','unitEn','emoji'].every(k=>typeof p[k]==='string'))throw Error('Invalid product');if(p.art!==undefined&&p.art!==''&&!['milk','water','cola','noodles'].includes(p.art))throw Error('Invalid product art');ids.add(p.id);}
 return data;
}

export const productArtChoices=['milk','water','cola','noodles'];
// Recognize the old starter catalog without changing saved products or binding art to IDs.
export function productArtwork(product){
 if(product.art!==undefined)return productArtChoices.includes(product.art)?product.art:null;
 return initialProducts.find(p=>p.zh===product.zh&&p.en===product.en&&p.emoji===product.emoji)?.art||null;
}
