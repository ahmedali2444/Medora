import{c as i,r as t,j as s}from"./index-B5T7Rub2.js";/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=[["path",{d:"M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z",key:"emmmcr"}],["path",{d:"M7 10v12",key:"1qc93n"}]],d=i("thumbs-up",u),n=t.createContext({showToast:()=>{}});function x(){return t.useContext(n)}function m({children:r}){const[e,o]=t.useState(null),c=t.useCallback(a=>{o(a)},[]);return t.useEffect(()=>{if(!e)return;const a=setTimeout(()=>o(null),3e3);return()=>clearTimeout(a)},[e]),s.jsxs(n.Provider,{value:{showToast:c},children:[r,e&&s.jsxs("div",{dir:"rtl",style:{fontFamily:"Cairo, sans-serif",background:"#14b8a6"},className:"fixed top-4 right-4 z-[9999] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-fadeInUp",children:[s.jsx("span",{className:"font-bold text-lg",children:"✓"}),s.jsx("span",{className:"text-[14px] font-medium",children:e})]})]})}export{d as T,m as a,x as u};
