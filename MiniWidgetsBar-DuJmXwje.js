import{d as s,aH as r,aG as l,aL as d,bW as g,bX as c,o as p,c as f,h as m,b as t,bY as u}from"./index-Nl43J8ZV.js";const w={class:"flex flex-col items-center justify-center w-full h-full p-2 rounded-md bg-slate-600/50"},b=s({__name:"MiniWidgetsBar",props:{widget:{}},setup(o){const e=r(o).widget,a=l();return d(()=>{Object.keys(e.value.options).length===0&&(e.value.options={miniWidgetsContainer:{name:`${g(c.random()||"Plankton")} floating container`,widgets:[]}})}),(v,n)=>(p(),f("div",w,[m(u,{container:t(e).options.miniWidgetsContainer,wrap:!0,"allow-editing":t(a).editingMode,onChooseMiniWidget:n[0]||(n[0]=i=>t(e).managerVars.allowMoving=!1),onUnchooseMiniWidget:n[1]||(n[1]=i=>t(e).managerVars.allowMoving=!0)},null,8,["container","allow-editing"])]))}});export{b as default};