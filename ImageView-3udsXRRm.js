import{d as p,bG as c,b as s,aH as f,aL as m,k as V,o as g,c as _,a as d,h as t,B as l,V as v,C as x,N as i,F as w,bH as C,aR as b,J as I,M as y,O as S,as as B,at as h,_ as k}from"./index-Nl43J8ZV.js";const M=n=>(B("data-v-a2ebf738"),n=n(),h(),n),O={class:"w-full h-full"},N=["src"],R=M(()=>d("span",{class:"text-xs font-semibold leading-3 text-slate-600"},"Fit style",-1)),T=p({__name:"ImageView",props:{widget:{}},setup(n){c(u=>({"12c15ec0":s(e).options.fitStyle}));const e=f(n).widget;m(()=>{Object.keys(e.value.options).length===0&&(e.value.options={src:"",fitStyle:"cover"})});const r=V(()=>e.value.options.src??"");return(u,a)=>(g(),_("div",O,[d("img",{src:r.value,draggable:"false"},null,8,N),t(S,{modelValue:s(e).managerVars.configMenuOpen,"onUpdate:modelValue":a[3]||(a[3]=o=>s(e).managerVars.configMenuOpen=o),"min-width":"400","max-width":"35%"},{default:l(()=>[t(v,{class:"pa-2"},{default:l(()=>[t(x,null,{default:l(()=>[i("Image URL")]),_:1}),t(w,null,{default:l(()=>[t(C,{label:"Image URL","model-value":s(e).options.src,outlined:"",onChange:a[0]||(a[0]=o=>s(e).options.src=o.srcElement.value)},null,8,["model-value"]),d("div",null,[R,t(b,{modelValue:s(e).options.fitStyle,"onUpdate:modelValue":a[1]||(a[1]=o=>s(e).options.fitStyle=o),options:["cover","fill","contain"],class:"max-w-[144px]"},null,8,["modelValue"])])]),_:1}),t(I,null,{default:l(()=>[t(y,{color:"primary",onClick:a[2]||(a[2]=o=>s(e).managerVars.configMenuOpen=!1)},{default:l(()=>[i("Close")]),_:1})]),_:1})]),_:1})]),_:1},8,["modelValue"])]))}}),L=k(T,[["__scopeId","data-v-a2ebf738"]]);export{L as default};